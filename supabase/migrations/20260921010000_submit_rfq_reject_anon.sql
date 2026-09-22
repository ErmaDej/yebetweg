-- ============================================================================
-- SECURITY FIX: submit_rfq must reject anonymous sessions
-- ============================================================================
-- Live probe (Sep 21, 2026) proved an anon session can execute submit_rfq
-- (PostgREST answered 200 + rfq_id) because:
--   1. EXECUTE was never revoked from anon (default PUBLIC grant), and
--   2. the function body only *skips* the free cap when v_user_id IS NULL —
--      it still INSERTs, producing ownerless rows that bypass the 3/month cap.
--
-- Fix, mirroring the audited 2026-09-18 pattern (policy privilege bug class):
--   - REVOKE EXECUTE from PUBLIC/anon; grant to authenticated only.
--   - Harden the body: raise when auth.uid() is null (defense in depth).
--   - Clean up the anon-created probe row from the live probe.
--
-- create_listing needs no change: it requires a users row, so anon calls
-- already fail with 'User not found' (verified live same day).

-- Remove the probe row created during the live verification (no-op if absent)
delete from public.rfq_requests
where requester_email = 'probe@example.com'
  and user_id is null
  and message = 'probe';

create or replace function public.submit_rfq(
  p_requester_name text,
  p_requester_email text,
  p_requester_phone text default '',
  p_city text default 'Addis Ababa',
  p_project_type text default '',
  p_message text default '',
  p_source_type text default 'manual',
  p_source_id uuid default null,
  p_material_name text default '',
  p_specification text default '',
  p_unit text default '',
  p_quantity numeric default null,
  p_target_price numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_rfq_id uuid;
begin
  select u.id into v_user_id
  from users u
  where u.auth_uid = auth.uid();

  -- Defense in depth: with EXECUTE revoked from anon this should never fire,
  -- but the function must not create ownerless rows even if grants drift.
  if v_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Please sign in to submit a quote request.'
    );
  end if;

  -- Free-tier RFQ cap (3 requests this month). Enforced server-side so the
  -- "Quote requests (limited)" benefit cannot be bypassed. Premium/Pro unlimited.
  if not exists (
    select 1 from premium_subscriptions s
    where s.user_id = v_user_id
      and s.is_active
      and s.expires_at > now()
      and s.tier in ('premium', 'pro')
  ) then
    if (
      select count(*) from rfq_requests
      where user_id = v_user_id and created_at >= date_trunc('month', now())
    ) >= 3 then
      return jsonb_build_object(
        'success', false,
        'error', 'Free tier is limited to 3 quote requests per month. Upgrade to premium for unlimited RFQs.'
      );
    end if;
  end if;

  insert into rfq_requests (
    user_id,
    source_type,
    source_id,
    requester_name,
    requester_email,
    requester_phone,
    city,
    project_type,
    message,
    status
  ) values (
    v_user_id,
    p_source_type,
    p_source_id,
    p_requester_name,
    p_requester_email,
    p_requester_phone,
    p_city,
    p_project_type,
    p_message,
    'new'
  )
  returning id into v_rfq_id;

  if coalesce(trim(p_material_name), '') <> '' then
    insert into rfq_items (
      rfq_id,
      material_name,
      specification,
      unit,
      quantity,
      target_price
    ) values (
      v_rfq_id,
      p_material_name,
      p_specification,
      p_unit,
      p_quantity,
      p_target_price
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'rfq_id', v_rfq_id,
    'message', 'RFQ submitted successfully.'
  );
end;
$$;

-- Privilege split (the audited pattern): function owners/invokers run as
-- authenticated; anon gets nothing. Also kill the default PUBLIC grant.
revoke execute on function public.submit_rfq(text, text, text, text, text, text, text, uuid, text, text, text, numeric, numeric) from public;
revoke execute on function public.submit_rfq(text, text, text, text, text, text, text, uuid, text, text, text, numeric, numeric) from anon;
grant execute on function public.submit_rfq(text, text, text, text, text, text, text, uuid, text, text, text, numeric, numeric) to authenticated;
