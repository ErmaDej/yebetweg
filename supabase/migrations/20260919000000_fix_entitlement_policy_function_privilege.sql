-- ============================================================================
-- HOTFIX: entitlement policies broke anon/free reads (probe-caught regression)
-- ============================================================================
-- 20260918000000_market_prices_tips_entitlement_rls.sql closed the premium
-- leak, but live probing then proved a P0 regression: EVERY anon table read
-- on market_prices and tips died with
--
--   42501 permission denied for function user_has_premium_entitlement
--
-- including baseline free rows — logged-out visitors would see an empty
-- marketplace and tips page.
--
-- Root cause: RLS policy expressions are privilege-checked as the querying
-- role. The policies were `TO anon, authenticated` and called
-- user_has_premium_entitlement(), but that helper's EXECUTE had been revoked
-- from anon (to prevent direct RPC probing). When policy evaluation for an
-- anon query reached the function call, the whole statement failed — the
-- probe's premium-gate "passes" were denials-by-error, not correct filtering.
--
-- Fix: role-split policies. anon can never hold an entitlement, so its policy
-- is the pure free-row predicate with NO function call; authenticated already
-- has EXECUTE on the helper (granted in 20260918000000 and re-asserted here).
--
-- Apply: supabase db push (or SQL Editor). Idempotent.
-- ============================================================================

-- Recreate the helper unchanged (self-contained hotfix; keeps grants explicit).
create or replace function public.user_has_premium_entitlement()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.auth_uid = auth.uid()
      and u.status = 'active'
      and (
        u.role in ('premium', 'pro', 'admin')
        or exists (
          select 1
          from public.premium_subscriptions ps
          where ps.user_id = u.id
            and ps.is_active = true
            and ps.status = 'active'
            and ps.starts_at <= now()
            and (ps.expires_at is null or ps.expires_at > now())
            and ps.tier in ('premium', 'pro')
        )
      )
  );
$$;

revoke all on function public.user_has_premium_entitlement() from public, anon, authenticated;
grant execute on function public.user_has_premium_entitlement() to authenticated;

-- Replace ALL SELECT policies with role-split versions -----------------------

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'market_prices'
      AND cmd        = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.market_prices', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "market_prices free read (anon)"
ON public.market_prices
FOR SELECT
TO anon
USING (coalesce(access_level, 'free') = 'free');

CREATE POLICY "market_prices entitlement read (authenticated)"
ON public.market_prices
FOR SELECT
TO authenticated
USING (
  coalesce(access_level, 'free') = 'free'
  OR public.user_has_premium_entitlement()
);

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'tips'
      AND cmd        = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tips', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "tips free read (anon)"
ON public.tips
FOR SELECT
TO anon
USING (coalesce(is_premium, false) = false);

CREATE POLICY "tips entitlement read (authenticated)"
ON public.tips
FOR SELECT
TO authenticated
USING (
  coalesce(is_premium, false) = false
  OR public.user_has_premium_entitlement()
);

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFY AFTER APPLYING (all with the anon key):
--   GET /rest/v1/market_prices?select=id&access_level=eq.free  → rows (baseline)
--   GET /rest/v1/market_prices?select=id&access_level=neq.free → [] (no error!)
--   GET /rest/v1/tips?select=id&is_premium=eq.true             → [] (no error!)
--   npm run probe:rls → exit 0
-- A 42501/permission error on any of these means the policy still references
-- a function anon cannot execute.
-- ============================================================================
