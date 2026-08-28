-- Phase 3: Market price premium gating (RPC) + freshness automation + admin ads fix
-- These are additive, non-destructive — permissive policies OR-combine, so existing anon policies stay untouched.

-- 1) Premium-gated market prices: free users see only access_level='free' (or null), premium/pro see all.
--    Called from useMarketPrices; falls back to direct table select if migration pending.
create or replace function public.get_visible_market_prices()
returns setof public.market_prices
language sql
security definer
set search_path = public
as $$
  select * from public.market_prices
  where
    case
      when auth.uid() is null then coalesce(access_level, 'free') = 'free'
      when exists (
        select 1 from public.users u
        join public.premium_subscriptions ps on ps.user_id = u.id
        where u.auth_uid = auth.uid()
          and ps.is_active = true
          and ps.expires_at > now()
          and ps.tier in ('premium','pro')
      ) then true
      else coalesce(access_level, 'free') = 'free'
    end
  order by category asc, updated_at desc;
$$;

grant execute on function public.get_visible_market_prices() to anon, authenticated;

-- Same for tips (tips.is_premium boolean) — free sees only is_premium = false
create or replace function public.get_visible_tips()
returns setof public.tips
language sql
security definer
set search_path = public
as $$
  select * from public.tips
  where
    case
      when auth.uid() is null then coalesce(is_premium, false) = false
      when exists (
        select 1 from public.users u
        join public.premium_subscriptions ps on ps.user_id = u.id
        where u.auth_uid = auth.uid()
          and ps.is_active = true
          and ps.expires_at > now()
          and ps.tier in ('premium','pro')
      ) then true
      else coalesce(is_premium, false) = false
    end
  order by created_at desc;
$$;

grant execute on function public.get_visible_tips() to anon, authenticated;

-- 2) Freshness automation: mark stale prices as expired (7-day threshold).
--    Call this from a cron or from the client after fetching prices.
create or replace function public.refresh_market_price_freshness()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.market_prices
  set freshness_status = 'expired',
      updated_at = now()
  where freshness_status is distinct from 'expired'
    and last_verified_at is not null
    and last_verified_at < now() - interval '7 days';
end;
$$;

grant execute on function public.refresh_market_price_freshness() to anon, authenticated;

-- 3) Admin ads policy fix: real admins live in public.users.role, not raw_app_meta_data.
--    Add correct permissive policies (OR-combined, so old ones staying is harmless).
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='ads' and policyname='Admins can manage ads via users role'
  ) then
    create policy "Admins can manage ads via users role"
    on public.ads for all
    to authenticated
    using (exists (select 1 from public.users where users.auth_uid = auth.uid() and users.role = 'admin'))
    with check (exists (select 1 from public.users where users.auth_uid = auth.uid() and users.role = 'admin'));
  end if;
end $$;
