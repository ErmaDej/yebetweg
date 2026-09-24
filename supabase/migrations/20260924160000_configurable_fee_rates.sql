-- ============================================================================
-- Configurable pass-through fee rates per payment method
-- ============================================================================
-- The checkout fee was hard-coded at 2% everywhere (src/lib/fees.ts CHAPA_FEE_RATE
-- and checkout_fee_split's 0.98). Chapa's real schedule differs per payment
-- method (mobile money/bank vs international cards), so the rate now lives in
-- configuration:
--
--   app_settings key 'fee_config' =
--   {
--     "default_rate": 0.02,
--     "methods": { "chapa": 0.02, "telebirr": 0.02, "chapa_card": 0.01 }
--   }
--
--   • 'chapa'      — domestic channels (Telebirr, CBE Birr, M-Pesa, bank): 2%
--   • 'chapa_card' — international cards: lower negotiated rate (EDIT to the
--                    business's actual Chapa contract figure)
--   • unknown methods fall back to default_rate
--
-- Charging rule: at initiate time the buyer's method isn't known yet (Chapa
-- shows the channel chooser), so the checkout computes the gross with the
-- DEFAULT rate — the higher of the configured rates. A buyer paying through a
-- cheaper channel therefore over-pays the fee slightly (windfall to the
-- business), never under-pays. The ledger split (gross − base = fee) stays
-- exactly consistent because activate_subscription computes base from the
-- listed price, not from the method.
--
-- Client pricing visibility: get_fee_config() is SECURITY DEFINER and public —
-- anon needs the rate to display the fee breakdown at checkout (app_settings
-- itself is admin-only by RLS).
-- ============================================================================

-- 1) Seed the configuration (only if absent — admins may already have tuned it).
insert into public.app_settings (key, value)
values (
  'fee_config',
  jsonb_build_object(
    'default_rate', 0.02,
    'methods', jsonb_build_object(
      'chapa', 0.02,
      'telebirr', 0.02,
      'chapa_card', 0.01
    )
  )
)
on conflict (key) do nothing;

-- 2) Rate resolver: per-method with default fallback, clamped to [0, 0.10).
create or replace function public.checkout_fee_rate(p_method text default 'chapa')
returns numeric
language sql
stable
set search_path = public
as $$
  select least(greatest(
    coalesce(
      (select (value->'methods'->>p_method)::numeric
         from public.app_settings where key = 'fee_config'),
      (select (value->>'default_rate')::numeric
         from public.app_settings where key = 'fee_config'),
      0.02
    ),
    0
  ), 0.10);
$$;

-- 3) Split, method-aware: gross = ceil(base / (1 - rate)), fee = gross - base.
--    Mirrors src/lib/fees.ts withCheckoutFee(base, rate) exactly. STABLE (not
--    IMMUTABLE) because the rate is read from app_settings; never use this in
--    an index or generated column.
create or replace function public.checkout_fee_split(p_base numeric, p_method text default 'chapa')
returns numeric[]
language plpgsql
stable
set search_path = public
as $$
declare
  v_rate numeric;
  v_gross numeric;
begin
  if p_base is null or p_base < 0 then
    return array[coalesce(p_base, 0), 0::numeric, coalesce(p_base, 0)]::numeric[];
  end if;
  v_rate := public.checkout_fee_rate(coalesce(p_method, 'chapa'));
  v_gross := ceil((p_base / (1 - v_rate)) * 100) / 100;
  return array[p_base, v_gross - p_base, v_gross]::numeric[];
end;
$$;

-- 4) activate_subscription: resolve the split by the gateway/method recorded
--    on the payment (p_gateway: 'chapa' | 'telebirr' | 'chapa_card', …).
create or replace function public.activate_subscription(
  p_reference text,
  p_gateway text default 'chapa'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscription_id uuid;
  v_user_id uuid;
  v_tier text;
  v_was_active boolean;
  v_amount numeric;
  v_fee numeric;
  v_base numeric;
begin
  if p_reference is null or btrim(p_reference) = '' then
    return jsonb_build_object('success', false, 'error', 'Missing payment reference');
  end if;

  -- Any chapa-* gateway (chapa, chapa_card, …) looks up the Chapa reference;
  -- telebirr keeps its own branch.
  if p_gateway like 'chapa%' then
    select id, user_id, tier, is_active
      into v_subscription_id, v_user_id, v_tier, v_was_active
      from premium_subscriptions
      where chapa_reference = p_reference
      order by created_at desc
      limit 1;
  else
    select id, user_id, tier, is_active
      into v_subscription_id, v_user_id, v_tier, v_was_active
      from premium_subscriptions
      where telebirr_reference = p_reference
      order by created_at desc
      limit 1;
  end if;

  if v_subscription_id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Subscription not found for this payment reference',
      'reference', p_reference
    );
  end if;

  if v_was_active then
    return jsonb_build_object(
      'success', true,
      'already_active', true,
      'subscription_id', v_subscription_id,
      'user_id', v_user_id,
      'tier', v_tier
    );
  end if;

  -- Pass-through split by method rate; the base is the listed price.
  v_base  := case when v_tier = 'pro' then 1000 else 500 end;
  v_amount := (checkout_fee_split(v_base, coalesce(p_gateway, 'chapa')))[3];
  v_fee    := (checkout_fee_split(v_base, coalesce(p_gateway, 'chapa')))[2];

  update premium_subscriptions
     set is_active = true,
         status = 'active',
         updated_at = now(),
         starts_at = coalesce(starts_at, now()),
         expires_at = case
           when expires_at is null or expires_at < now()
             then now() + interval '30 days'
           else expires_at
         end
   where id = v_subscription_id;

  update users
     set role = case
           when v_tier = 'pro' then 'pro'
           when v_tier = 'premium' then 'premium'
           else role
         end,
         updated_at = now()
   where id = v_user_id
     and role in ('user', 'premium', 'pro');

  -- Payment ledger row for revenue reporting (idempotent on reference).
  insert into subscription_payments
    (user_id, subscription_id, amount, base_amount, gateway_fee, currency,
     method, reference, status, metadata)
  values
    (v_user_id, v_subscription_id, v_amount, v_amount - v_fee, v_fee, 'ETB',
     p_gateway, p_reference, 'completed',
     jsonb_build_object('tier', v_tier, 'source', 'activate_subscription',
                        'fee_model', 'pass_through_configurable',
                        'fee_method', coalesce(p_gateway, 'chapa')))
  on conflict (reference) do nothing;

  return jsonb_build_object(
    'success', true,
    'subscription_id', v_subscription_id,
    'user_id', v_user_id,
    'tier', v_tier
  );
end;
$$;

-- 5) Public read-only pricing visibility for the checkout UI.
create or replace function public.get_fee_config()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select value from public.app_settings where key = 'fee_config'),
    jsonb_build_object('default_rate', 0.02, 'methods', jsonb_build_object('chapa', 0.02))
  );
$$;

revoke execute on function public.get_fee_config() from public, anon;
grant execute on function public.get_fee_config() to anon, authenticated;
