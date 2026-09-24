-- ===========================================================================
-- Chapa pass-through fee model: financial ledger records the gateway split.
-- ===========================================================================
-- Business rule ("pass-through"): buyers pay a +2% checkout fee on top of the
-- listed price so the business nets the full listed price and Chapa's
-- transaction fee is covered by the fee — not by the marketplace commission.
--
-- Ledger semantics after this migration:
--   amount           = GROSS charged to the buyer (what Chapa received)
--   base_amount      = listed price the business nets (amount - fee)
--   gateway_fee      = checkout fee portion covering Chapa's cut
--
-- All reporting (Revenue monitor, Analytics, CSV exports, digests) must use
-- base_amount for revenue and gateway_fee for costs. `amount` stays the
-- buyer-facing gross for reconciliation with Chapa statements.
-- ===========================================================================

-- 1) New columns -----------------------------------------------------------------
alter table public.subscription_payments
  add column if not exists base_amount numeric(12, 2),
  add column if not exists gateway_fee numeric(12, 2);

comment on column public.subscription_payments.amount is
  'Gross amount charged to the buyer (includes the pass-through checkout fee)';
comment on column public.subscription_payments.base_amount is
  'Listed price netted by the business (amount - gateway_fee)';
comment on column public.subscription_payments.gateway_fee is
  'Pass-through checkout fee covering the Chapa transaction fee';

-- 2) Backfill existing rows (pre-fee era: amount == listed price, no fee). -------
--    Legacy rows were the plan price with no added fee, so base = amount.
update public.subscription_payments
   set base_amount = amount,
       gateway_fee = 0
 where base_amount is null;

alter table public.subscription_payments
  alter column base_amount set default 0,
  alter column gateway_fee set default 0;

-- 3) Helper: canonical fee split for a tier (single source of truth in SQL too). --
--    Mirrors src/lib/fees.ts: gross = ceil(base / 0.98), fee = gross - base.
create or replace function public.checkout_fee_split(p_base numeric)
returns numeric[]
language plpgsql
immutable
set search_path = public
as $$
declare
  v_gross numeric;
begin
  if p_base is null or p_base < 0 then
    return array[coalesce(p_base, 0), 0::numeric, coalesce(p_base, 0)]::numeric[];
  end if;
  v_gross := ceil((p_base / 0.98) * 100) / 100;
  return array[p_base, v_gross - p_base, v_gross]::numeric[];
end;
$$;

-- 4) activate_subscription: record the split on every new ledger row. ------------
--    The gross charged is computed from the tier's listed price via
--    checkout_fee_split, matching what the buyer actually saw at checkout.
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
begin
  if p_reference is null or btrim(p_reference) = '' then
    return jsonb_build_object('success', false, 'error', 'Missing payment reference');
  end if;

  if p_gateway = 'chapa' then
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

  -- Pass-through split: listed price + 2% checkout fee (buyer pays the fee).
  v_amount := (checkout_fee_split(case when v_tier = 'pro' then 1000 else 500 end))[3];
  v_fee    := (checkout_fee_split(case when v_tier = 'pro' then 1000 else 500 end))[2];

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
                        'fee_model', 'pass_through_2pct'))
  on conflict (reference) do nothing;

  return jsonb_build_object(
    'success', true,
    'subscription_id', v_subscription_id,
    'user_id', v_user_id,
    'tier', v_tier
  );
end;
$$;

-- 5) Admin reconciliation RPC: same split semantics. ------------------------------
create or replace function public.admin_activate_subscription(
  p_reference text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    return jsonb_build_object('success', false, 'error', 'Admin privileges required');
  end if;

  v_result := public.activate_subscription(p_reference, 'chapa');

  if coalesce((v_result->>'success')::boolean, false) and p_note is not null then
    insert into moderation_log (actor_id, action, target_id, detail)
    values (auth.uid(), 'payment_reconciled',
            (v_result->>'subscription_id')::uuid,
            jsonb_build_object('reference', p_reference, 'note', p_note));
  end if;

  return v_result;
end;
$$;

-- 6) Reporting view: one canonical revenue view with the fee split. ---------------
create or replace view public.v_subscription_revenue as
select
  sp.id,
  sp.created_at,
  sp.reference,
  sp.status,
  sp.method,
  sp.currency,
  sp.metadata,
  sp.amount                                   as gross_amount,
  coalesce(sp.base_amount, sp.amount)         as base_amount,
  coalesce(sp.gateway_fee, 0)                 as gateway_fee,
  u.full_name                                 as payer_name,
  u.email                                     as payer_email
from public.subscription_payments sp
left join public.users u on u.id = sp.user_id;

grant select on public.v_subscription_revenue to authenticated;

-- 7) RLS on the view inherits from the base table via the security_invoker
--    pragma (Postgres 15+), so admins see everything and users only their rows.
alter view public.v_subscription_revenue set (security_invoker = true);
