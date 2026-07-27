/*
  YeBetWeg Market Price Intelligence

  Adds trust, freshness, source, and location metadata to market_prices so YBW
  can differentiate structured price intelligence from unverified channel posts.
*/

ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT 'Addis Ababa';
ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS specification text NOT NULL DEFAULT '';
ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'admin_verified';
ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS source_name text NOT NULL DEFAULT 'YeBetWeg Market Desk';
ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS vat_included boolean NOT NULL DEFAULT false;
ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS confidence_score integer NOT NULL DEFAULT 70;
ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS last_verified_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS trend_direction text NOT NULL DEFAULT 'stable';
ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS freshness_status text NOT NULL DEFAULT 'verified';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'market_prices' AND constraint_name = 'market_prices_source_type_enum'
  ) THEN
    ALTER TABLE market_prices ADD CONSTRAINT market_prices_source_type_enum
      CHECK (source_type IN ('admin_verified', 'supplier_quoted', 'community_reported', 'telegram_observed'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'market_prices' AND constraint_name = 'market_prices_confidence_score_range'
  ) THEN
    ALTER TABLE market_prices ADD CONSTRAINT market_prices_confidence_score_range
      CHECK (confidence_score >= 0 AND confidence_score <= 100);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'market_prices' AND constraint_name = 'market_prices_trend_direction_enum'
  ) THEN
    ALTER TABLE market_prices ADD CONSTRAINT market_prices_trend_direction_enum
      CHECK (trend_direction IN ('up', 'down', 'stable'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'market_prices' AND constraint_name = 'market_prices_freshness_status_enum'
  ) THEN
    ALTER TABLE market_prices ADD CONSTRAINT market_prices_freshness_status_enum
      CHECK (freshness_status IN ('verified', 'supplier_quoted', 'community_reported', 'expired', 'needs_confirmation'));
  END IF;
END $$;

UPDATE market_prices
SET
  city = 'Addis Ababa',
  source_type = CASE
    WHEN category IN ('cement', 'steel') THEN 'supplier_quoted'
    ELSE 'admin_verified'
  END,
  source_name = CASE
    WHEN category IN ('cement', 'steel') THEN 'Sample supplier quote'
    ELSE 'YeBetWeg Market Desk'
  END,
  vat_included = CASE
    WHEN category IN ('cement', 'steel', 'electrical') THEN true
    ELSE false
  END,
  confidence_score = CASE
    WHEN category IN ('cement', 'steel') THEN 86
    WHEN category IN ('finishing', 'electrical') THEN 74
    ELSE 68
  END,
  trend_direction = CASE
    WHEN change_percent > 0 THEN 'up'
    WHEN change_percent < 0 THEN 'down'
    ELSE 'stable'
  END,
  freshness_status = CASE
    WHEN category IN ('cement', 'steel') THEN 'supplier_quoted'
    ELSE 'verified'
  END,
  last_verified_at = COALESCE(updated_at, now())
WHERE city = 'Addis Ababa'
  AND source_name = 'YeBetWeg Market Desk';

CREATE INDEX IF NOT EXISTS idx_market_prices_city ON market_prices(city);
CREATE INDEX IF NOT EXISTS idx_market_prices_freshness_status ON market_prices(freshness_status);
CREATE INDEX IF NOT EXISTS idx_market_prices_last_verified_at ON market_prices(last_verified_at DESC);
