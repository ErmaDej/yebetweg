-- ============================================================================
-- Payment activation hardening
-- ============================================================================
-- Problems fixed (Sep 2026):
--   1. vercel.json lacked an SPA rewrite for /payment/success, so the return
--      page 404'd at the edge and activateChapaPayment never ran — users paid,
--      stayed "free", and their subscription row was stuck at status='pending'.
--   2. activate_subscription returned an error ("Subscription not found or
--      already active") when called twice (return page + webhook race), which
--      surfaced as a failed payment to the user even when money had moved.
--   3. No payment ledger row was recorded on activation, so revenue reporting
--      had no trustworthy per-payment history.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Idempotent activation — safe to call from BOTH the return page and the
--    webhook, any number of times. Also writes the subscription_payments
--    ledger row (tier→amount per canonical pricing: premium 500 / pro 1000).
-- ---------------------------------------------------------------------------
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
begin
  if p_reference is null or btrim(p_reference) = '' then
    return jsonb_build_object('success', false, 'error', 'Missing payment reference');
  end if;

  -- Look the subscription up by reference regardless of current status, so
  -- repeat calls converge instead of erroring.
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
    -- Already activated previously — converge silently.
    return jsonb_build_object(
      'success', true,
      'already_active', true,
      'subscription_id', v_subscription_id,
      'user_id', v_user_id,
      'tier', v_tier
    );
  end if;

  v_amount := case when v_tier = 'pro' then 1000 else 500 end;

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
    (user_id, subscription_id, amount, currency, method, reference, status, metadata)
  values
    (v_user_id, v_subscription_id, v_amount, 'ETB',
     p_gateway, p_reference, 'completed',
     jsonb_build_object('tier', v_tier, 'source', 'activate_subscription'))
  on conflict (reference) do nothing;

  return jsonb_build_object(
    'success', true,
    'subscription_id', v_subscription_id,
    'user_id', v_user_id,
    'tier', v_tier
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Admin reconciliation: manually activate a payment whose Chapa webhook
--    AND return-page activation both failed (e.g. the pre-fix 404 era).
--    Admin-verified via is_admin(); recorded with an audit trail note.
-- ---------------------------------------------------------------------------
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
  v_admin uuid;
begin
  if not coalesce(public.is_admin(), false) then
    return jsonb_build_object('success', false, 'error', 'Admin access required');
  end if;

  if p_reference is null or btrim(p_reference) = '' then
    return jsonb_build_object('success', false, 'error', 'Missing payment reference');
  end if;

  select id into v_admin from public.users where auth_uid = auth.uid() limit 1;

  -- Delegate to the idempotent activator.
  v_result := public.activate_subscription(btrim(p_reference), 'chapa');

  if v_result ->> 'success' is not true then
    return v_result;
  end if;

  -- Mark the ledger row as admin-reconciled.
  update subscription_payments
     set metadata = coalesce(metadata, '{}'::jsonb)
                   || jsonb_build_object(
                        'reconciled_by', v_admin,
                        'reconciled_at', now(),
                        'note', p_note
                      )
   where reference = btrim(p_reference);

  return v_result;
end;
$$;

revoke execute on function public.admin_activate_subscription(text, text) from public, anon;
grant execute on function public.admin_activate_subscription(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Admin read on the payment ledger (for the revenue dashboard + CSV export).
-- ---------------------------------------------------------------------------
drop policy if exists "Admins can read payment ledger" on subscription_payments;
create policy "Admins can read payment ledger"
  on subscription_payments
  for select
  to authenticated
  using (coalesce(public.is_admin(), false));

drop policy if exists "Admins can manage payment ledger" on subscription_payments;
create policy "Admins can manage payment ledger"
  on subscription_payments
  for all
  to authenticated
  using (coalesce(public.is_admin(), false))
  with check (coalesce(public.is_admin(), false));
