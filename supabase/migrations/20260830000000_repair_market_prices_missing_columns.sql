-- Repair: Add missing columns to market_prices that were in market_price_intelligence migration
-- but were not pushed to the remote before the migration was split into boq + gating files.
-- All statements are idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS patterns).

-- City column
DO $$ BEGIN
  ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT 'Addis Ababa';
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- Specification column
DO $$ BEGIN
  ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS specification text NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- Source type column
DO $$ BEGIN
  ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'admin_verified';
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- Source name column
DO $$ BEGIN
  ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS source_name text NOT NULL DEFAULT 'YeBetWeg Market Desk';
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- VAT included column
DO $$ BEGIN
  ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS vat_included boolean NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- Confidence score column
DO $$ BEGIN
  ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS confidence_score integer NOT NULL DEFAULT 70;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- Last verified at column
DO $$ BEGIN
  ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS last_verified_at timestamptz NOT NULL DEFAULT now();
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- Trend direction column
DO $$ BEGIN
  ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS trend_direction text NOT NULL DEFAULT 'stable';
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- Freshness status column
DO $$ BEGIN
  ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS freshness_status text NOT NULL DEFAULT 'verified';
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- Add check constraint for source_type enum (idempotent)
DO $$ BEGIN
  ALTER TABLE market_prices ADD CONSTRAINT market_prices_source_type_enum
    CHECK (source_type IN ('admin_verified', 'supplier_quoted', 'community_reported', 'telegram_observed'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add check constraint for confidence_score range (idempotent)
DO $$ BEGIN
  ALTER TABLE market_prices ADD CONSTRAINT market_prices_confidence_score_range
    CHECK (confidence_score >= 0 AND confidence_score <= 100);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add check constraint for trend_direction enum (idempotent)
DO $$ BEGIN
  ALTER TABLE market_prices ADD CONSTRAINT market_prices_trend_direction_enum
    CHECK (trend_direction IN ('up', 'down', 'stable'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add check constraint for freshness_status enum (idempotent)
DO $$ BEGIN
  ALTER TABLE market_prices ADD CONSTRAINT market_prices_freshness_status_enum
    CHECK (freshness_status IN ('verified', 'supplier_quoted', 'community_reported', 'expired', 'needs_confirmation'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Seed sensible defaults for any rows that have nulls or defaults
UPDATE market_prices
SET
  city = COALESCE(city, 'Addis Ababa'),
  specification = COALESCE(specification, ''),
  source_type = COALESCE(source_type, CASE WHEN category IN ('cement', 'steel') THEN 'supplier_quoted' ELSE 'admin_verified' END),
  source_name = COALESCE(source_name, CASE WHEN category IN ('cement', 'steel') THEN 'Sample supplier quote' ELSE 'YeBetWeg Market Desk' END),
  vat_included = COALESCE(vat_included, CASE WHEN category IN ('cement', 'steel', 'electrical') THEN true ELSE false END),
  confidence_score = COALESCE(confidence_score, CASE WHEN category IN ('cement', 'steel') THEN 86 WHEN category IN ('finishing', 'electrical') THEN 74 ELSE 68 END),
  trend_direction = COALESCE(trend_direction, CASE WHEN change_percent > 0 THEN 'up' WHEN change_percent < 0 THEN 'down' ELSE 'stable' END),
  freshness_status = COALESCE(freshness_status, CASE WHEN category IN ('cement', 'steel') THEN 'supplier_quoted' ELSE 'verified' END),
  last_verified_at = COALESCE(last_verified_at, now())
WHERE city IS NULL
   OR specification IS NULL
   OR source_type IS NULL
   OR source_name IS NULL
   OR vat_included IS NULL
   OR confidence_score IS NULL
   OR trend_direction IS NULL
   OR freshness_status IS NULL
   OR last_verified_at IS NULL;

-- Create indexes for the new columns (idempotent)
CREATE INDEX IF NOT EXISTS idx_market_prices_city ON market_prices(city);
CREATE INDEX IF NOT EXISTS idx_market_prices_freshness_status ON market_prices(freshness_status);
CREATE INDEX IF NOT EXISTS idx_market_prices_last_verified_at ON market_prices(last_verified_at DESC);

-- Also fix: ensure RLS policies on market_prices allow admins to INSERT/UPDATE/DELETE
-- First, check if there are any restrictive policies that would block admins
-- The existing "Public can read market prices" policy allows SELECT for anon/authenticated
-- We need admin INSERT/UPDATE/DELETE policies using current_user_is_admin()

DO $$
BEGIN
  -- Drop any overly restrictive admin policies that check wrong fields
  DROP POLICY IF EXISTS "Admins can insert market prices (legacy)" ON market_prices;
  DROP POLICY IF EXISTS "Admins can update market prices (legacy)" ON market_prices;
  DROP POLICY IF EXISTS "Admins can delete market prices (legacy)" ON market_prices;
END $$;

-- Add admin INSERT policy
DO $$
BEGIN
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='market_prices' and policyname='Admins can insert market prices'
  ) then
    create policy "Admins can insert market prices"
    on market_prices for insert
    to authenticated
    with check (public.current_user_is_admin() = true);
  end if;
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- Add admin UPDATE policy
DO $$
BEGIN
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='market_prices' and policyname='Admins can update market prices'
  ) then
    create policy "Admins can update market prices"
    on market_prices for update
    to authenticated
    using (public.current_user_is_admin() = true)
    with check (public.current_user_is_admin() = true);
  end if;
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- Add admin DELETE policy
DO $$
BEGIN
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='market_prices' and policyname='Admins can delete market prices'
  ) then
    create policy "Admins can delete market prices"
    on market_prices for delete
    to authenticated
    using (public.current_user_is_admin() = true);
  end if;
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- Notify PostgREST to reload schema cache so new columns/policies are visible immediately
NOTIFY pgrst, 'reload schema';
