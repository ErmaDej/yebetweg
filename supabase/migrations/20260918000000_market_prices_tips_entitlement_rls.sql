-- ============================================================================
-- SECURITY FIX: close the anon read hole on market_prices AND tips
-- ============================================================================
-- Live probe (Sep 18, 2026) proved anon sessions can SELECT premium-gated
-- rows directly from PostgREST:
--
--   GET /rest/v1/market_prices?access_level=neq.free   (anon key) → rows leak
--   GET /rest/v1/tips?is_premium=eq.true               (anon key) → rows leak
--
-- Root cause (same bug class on both tables): 20260827000001 added
-- entitlement-enforcing RPCs (get_visible_market_prices / get_visible_tips),
-- but PostgREST permissive policies OR-combine — the legacy anon policies
-- ("Public can read market prices" / "Public can read free tips" USING(true))
-- still grant full-table reads, bypassing the RPC gates entirely.
--
-- Fix: replace ALL SELECT policies on both tables with ONE entitlement-
-- enforcing policy each (same predicate as the RPCs). Client compatibility:
--   - useMarketPrices prefers get_visible_market_prices RPC (unchanged);
--     its table fallback and useSearch now inherit the same gate
--   - useTips / useSearch read the tables directly (now properly gated)
--   - premium blur UI becomes progressive enhancement only
--
-- Also aligns the two get_visible_* RPCs with the same entitlement predicate
-- (they previously ignored users.status and subscription starts_at).
--
-- Apply: supabase db push (or SQL Editor). Idempotent: re-running drops and
-- recreates the single policy per table.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Shared entitlement predicate helper: premium/pro/admin (by role OR active
-- subscription) → true. anon/free users → false (they only pass the free-row
-- predicate). Mirrors lib/entitlements.ts (planFromRole/isPaidRole + active
-- subscription check).
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- market_prices: single entitlement-enforcing read policy
-- anon / free users → access_level 'free' only (NULL treated as free);
-- entitled users → everything.
-- ----------------------------------------------------------------------------
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

CREATE POLICY "market_prices entitlement read"
ON public.market_prices
FOR SELECT
TO anon, authenticated
USING (
  coalesce(access_level, 'free') = 'free'
  OR public.user_has_premium_entitlement()
);

-- ----------------------------------------------------------------------------
-- tips: single entitlement-enforcing read policy
-- anon / free users → is_premium = false (NULL treated as free);
-- entitled users → everything.
-- ----------------------------------------------------------------------------
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

CREATE POLICY "tips entitlement read"
ON public.tips
FOR SELECT
TO anon, authenticated
USING (
  coalesce(is_premium, false) = false
  OR public.user_has_premium_entitlement()
);

-- ----------------------------------------------------------------------------
-- Align the get_visible_* RPCs with the same predicate (they previously
-- ignored users.status and subscription starts_at). SECURITY DEFINER, so
-- grant back to anon (RLS policies do not constrain security-definer reads).
-- ----------------------------------------------------------------------------
create or replace function public.get_visible_market_prices()
returns setof public.market_prices
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.market_prices
  where coalesce(access_level, 'free') = 'free'
     or public.user_has_premium_entitlement()
  order by category asc, updated_at desc;
$$;

create or replace function public.get_visible_tips()
returns setof public.tips
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.tips
  where coalesce(is_premium, false) = false
     or public.user_has_premium_entitlement()
  order by created_at desc;
$$;

revoke all on function public.get_visible_market_prices() from public;
grant execute on function public.get_visible_market_prices() to anon, authenticated;
revoke all on function public.get_visible_tips() from public;
grant execute on function public.get_visible_tips() to anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFY AFTER APPLYING (probe 4 from PRODUCTION_LAUNCH_CHECKLIST.md):
--   Anon requests (anon key):
--     GET /rest/v1/market_prices?select=id&access_level=neq.free → MUST be []
--     GET /rest/v1/tips?select=id&is_premium=eq.true             → MUST be []
--   Free authenticated session: same two queries → MUST be []
--   Paid session (premium/pro role or active subscription): full row set →
--   policy grants entitlement correctly.
--   Regression check for paid users' table reads (useSearch/useTips paths):
--     GET /rest/v1/market_prices?select=id&limit=1 → paid: ≥1 row, free: free rows only
-- ============================================================================
