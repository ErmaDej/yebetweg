-- ============================================================================
-- Admin-governed subscription tier pricing (Premium / Pro)
-- ============================================================================
-- Prices stop being hardcoded in the client/edge code and move to
-- public.app_settings under the 'tier_pricing' key, edited by admins in the
-- dashboard. The client and the lifecycle emails resolve them at render time
-- with hardcoded fallbacks, so a missing/corrupt row degrades to today's
-- 500/1000 rather than breaking checkout.
-- ============================================================================

-- 1) Seed with the current prices so behavior is unchanged on deploy.
insert into public.app_settings (key, value, updated_by)
values ('tier_pricing',
        jsonb_build_object('premium', 500, 'pro', 1000, 'currency', 'ETB'),
        null)
on conflict (key) do nothing;

-- 2) Public read RPC (pricing is not a secret; mirrors get_fee_config()).
create or replace function public.get_tier_pricing()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select value from public.app_settings where key = 'tier_pricing'),
    jsonb_build_object('premium', 500, 'pro', 1000, 'currency', 'ETB')
  );
$$;

revoke all on function public.get_tier_pricing() from public;
grant execute on function public.get_tier_pricing() to anon, authenticated;

-- 3) Admin-only write RPC with validation + audit trail.
create or replace function public.set_tier_pricing(p_pricing jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.users;
  v_clean jsonb;
  v_previous jsonb;
begin
  -- Gate: active admin only (same pattern as other admin RPCs).
  select * into v_user from public.users
  where auth_uid = auth.uid() and role = 'admin' and status = 'active';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Forbidden');
  end if;

  -- Validate shape + ranges: premium/pro must be positive ETB integers ≤ 100000.
  if p_pricing is null
     or jsonb_typeof(p_pricing) <> 'object'
     or jsonb_typeof(p_pricing -> 'premium') <> 'number'
     or jsonb_typeof(p_pricing -> 'pro') <> 'number'
     or (p_pricing ->> 'premium')::numeric <= 0
     or (p_pricing ->> 'pro')::numeric <= 0
     or (p_pricing ->> 'premium')::numeric > 100000
     or (p_pricing ->> 'pro')::numeric > 100000
     or floor((p_pricing ->> 'premium')::numeric) <> (p_pricing ->> 'premium')::numeric
     or floor((p_pricing ->> 'pro')::numeric) <> (p_pricing ->> 'pro')::numeric then
    return jsonb_build_object('ok', false, 'error',
      'Prices must be positive whole numbers (ETB, max 100000)');
  end if;

  v_clean := jsonb_build_object(
    'premium', (p_pricing ->> 'premium')::int,
    'pro', (p_pricing ->> 'pro')::int,
    'currency', coalesce(p_pricing ->> 'currency', 'ETB')
  );

  -- Capture the previous value BEFORE the upsert so the audit shows the delta.
  v_previous := (select value from public.app_settings where key = 'tier_pricing');

  insert into public.app_settings (key, value, updated_by)
  values ('tier_pricing', v_clean, v_user.id)
  on conflict (key) do update
    set value = excluded.value,
        updated_by = excluded.updated_by,
        updated_at = now();

  -- Audit: prices are a business rule; record who changed what.
  insert into public.moderation_log (actor_id, action, target_id, detail)
  values (
    v_user.id,
    'tier_pricing_updated',
    v_user.id,
    jsonb_build_object('new', v_clean, 'previous', v_previous)
  );

  return jsonb_build_object('ok', true, 'pricing', v_clean);
end;
$$;

revoke all on function public.set_tier_pricing(jsonb) from public, anon, authenticated;
grant execute on function public.set_tier_pricing(jsonb) to authenticated;
