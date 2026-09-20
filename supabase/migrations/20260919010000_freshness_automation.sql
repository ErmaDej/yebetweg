-- ============================================================================
-- Freshness automation: cron-flagged expiry + admin stale alerts + Telegram
-- supplier submissions.  Companion edge functions:
--   supabase/functions/freshness_cron   (scheduled — flags expired + emails admins)
--   supabase/functions/telegram-webhook (supplier funnel — /submitprice, /watch)
-- All statements idempotent. Functions are SECURITY DEFINER and executed with
-- the service_role key from the edge functions (EXECUTE revoked from
-- public/anon/authenticated so these are server-only primitives).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Flag stale prices as expired (7-day threshold).
--    Returns the rows it transitioned (empty result = nothing to do).
-- ----------------------------------------------------------------------------
create or replace function public.expire_stale_market_prices()
returns table (id uuid, material_en text, city text, last_verified_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.market_prices mp
  set freshness_status = 'expired',
      updated_at = now()
  where mp.freshness_status is distinct from 'expired'
    and mp.freshness_status is distinct from 'needs_confirmation'
    and mp.last_verified_at is not null
    and mp.last_verified_at < now() - interval '7 days'
  returning mp.id, mp.material_en, mp.city, mp.last_verified_at;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2) List currently-stale prices for admin alerting.
--    min_days filters how stale a row must be to be included (default 0 = all
--    expired rows).
-- ----------------------------------------------------------------------------
create or replace function public.get_stale_market_prices(min_days int default 0)
returns table (
  id uuid,
  material_en text,
  material_am text,
  city text,
  unit text,
  price numeric,
  last_verified_at timestamptz,
  days_stale int
)
language sql
security definer
set search_path = public
as $$
  select
    mp.id,
    mp.material_en,
    mp.material_am,
    mp.city,
    mp.unit,
    mp.price,
    mp.last_verified_at,
    greatest(0, floor(extract(epoch from (now() - mp.last_verified_at)) / 86400))::int as days_stale
  from public.market_prices mp
  where mp.freshness_status = 'expired'
    and mp.last_verified_at is not null
    and mp.last_verified_at < now() - make_interval(days => greatest(min_days, 0))
  order by mp.last_verified_at asc
  limit 200;
$$;

-- ----------------------------------------------------------------------------
-- 3) Telegram supplier funnel: insert-or-update a price observation.
--    Matches an existing row on (lower(material_en), category, lower(city)) —
--    updates price + provenance when found, inserts otherwise. Runs as
--    service_role from the telegram-webhook edge function; not callable by
--    browser sessions (EXECUTE revoked below). Telegram-sourced rows are capped
--    at confidence 75 and marked community_reported pending admin verification.
-- ----------------------------------------------------------------------------
create or replace function public.upsert_market_price_from_telegram(
  p_material_en text,
  p_price numeric,
  p_unit text default null,
  p_city text default 'Addis Ababa',
  p_category text default null,
  p_source_name text default 'Telegram supplier',
  p_change_percent numeric default null,
  p_trend_direction text default 'stable',
  p_confidence_score int default 50
)
returns table (id uuid, replaced boolean, warning text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_material text;
  v_city text;
  v_category text;
  v_unit text;
  v_existing_id uuid;
  v_confidence int;
begin
  -- --- validation ---
  v_material := nullif(btrim(coalesce(p_material_en, '')), '');
  if v_material is null or length(v_material) > 120 then
    raise exception 'invalid material';
  end if;

  if p_price is null or p_price <= 0 or p_price > 1000000000 then
    raise exception 'invalid price';
  end if;

  v_unit := nullif(btrim(coalesce(p_unit, '')), '');
  if v_unit is null then
    v_unit := 'Qtl';
  end if;
  if length(v_unit) > 20 then
    raise exception 'invalid unit';
  end if;

  v_city := nullif(btrim(coalesce(p_city, 'Addis Ababa')), '');
  if v_city is null or length(v_city) > 60 then
    raise exception 'invalid city';
  end if;

  v_category := nullif(btrim(coalesce(p_category, '')), '');
  if v_category is null or length(v_category) > 40 then
    v_category := 'finishing';
  end if;

  if p_trend_direction not in ('up', 'down', 'stable') then
    raise exception 'invalid trend_direction';
  end if;

  v_confidence := least(75, greatest(30, coalesce(p_confidence_score, 50)));

  -- --- match existing row ---
  select mp.id into v_existing_id
  from public.market_prices mp
  where lower(mp.material_en) = lower(v_material)
    and mp.category = v_category
    and lower(mp.city) = lower(v_city)
  order by mp.updated_at desc
  limit 1;

  if v_existing_id is not null then
    update public.market_prices mp
    set price = p_price,
        unit = v_unit,
        change_percent = coalesce(p_change_percent, mp.change_percent, 0),
        trend_direction = p_trend_direction,
        source_type = 'telegram_observed',
        source_name = left(coalesce(p_source_name, 'Telegram supplier'), 120),
        confidence_score = v_confidence,
        freshness_status = 'community_reported',
        last_verified_at = now(),
        updated_at = now()
    where mp.id = v_existing_id;
    return query select v_existing_id, true, null::text;
    return;
  end if;

  -- --- insert new observation ---
  -- material_am mirrors the English name; admins localize via admin panel.
  with ins as (
    insert into public.market_prices (
      material_en, material_am, unit, price, change_percent, category, city,
      specification, source_type, source_name, vat_included,
      confidence_score, trend_direction, freshness_status, access_level,
      last_verified_at, updated_at
    ) values (
      v_material, v_material, v_unit, p_price, coalesce(p_change_percent, 0), v_category, v_city,
      '', 'telegram_observed', left(coalesce(p_source_name, 'Telegram supplier'), 120), false,
      v_confidence, p_trend_direction, 'community_reported', 'free',
      now(), now()
    )
    returning id
  )
  select i.id into v_existing_id from ins i;

  return query select v_existing_id, false, 'new row inserted'::text;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4) Alert log — one row per cron run. Used by freshness_cron to dedupe daily
--    admin emails. RLS enabled with NO policies: only service_role reaches it.
-- ----------------------------------------------------------------------------
create table if not exists public.freshness_alerts (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  newly_expired int not null default 0,
  total_stale int not null default 0,
  notified_count int not null default 0
);
alter table public.freshness_alerts enable row level security;
-- intentionally no policies: anon/authenticated have zero access

-- ----------------------------------------------------------------------------
-- 5) Matching index for the upsert + grants
-- ----------------------------------------------------------------------------
create index if not exists idx_market_prices_telegram_match
  on market_prices (lower(material_en), category, lower(city));

revoke execute on function public.expire_stale_market_prices()
  from public, anon, authenticated;
revoke execute on function public.get_stale_market_prices(int)
  from public, anon, authenticated;
revoke execute on function public.upsert_market_price_from_telegram(text, numeric, text, text, text, text, numeric, text, int)
  from public, anon, authenticated;
grant execute on function public.expire_stale_market_prices() to service_role;
grant execute on function public.get_stale_market_prices(int) to service_role;
grant execute on function public.upsert_market_price_from_telegram(text, numeric, text, text, text, text, numeric, text, int) to service_role;
