/*
  YeBetWeg Schema Enhancement: Users, Authentication, and Premium Subscription Model

  This migration introduces a core `users` table for login, role management,
  and profile metadata. It also adds payment history, stronger subscription
  semantics, and ownership references across marketplace content.

  The migration is idempotent: all objects are created only if they do not already exist,
  and constraints/policies are added safely using IF NOT EXISTS patterns.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_uid uuid UNIQUE,
  username text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  full_name text,
  phone text DEFAULT '',
  role text NOT NULL DEFAULT 'user',
  provider text NOT NULL DEFAULT 'local',
  language_preference text NOT NULL DEFAULT 'en',
  status text NOT NULL DEFAULT 'active',
  password_hash text,
  profile_image text DEFAULT '',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES premium_subscriptions(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ETB',
  method text NOT NULL DEFAULT 'chapa',
  reference text UNIQUE,
  status text NOT NULL DEFAULT 'completed',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE listings ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE premium_subscriptions ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE premium_subscriptions ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS access_level text NOT NULL DEFAULT 'free';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'listings' AND constraint_name = 'listings_user_id_fkey'
  ) THEN
    ALTER TABLE listings ADD CONSTRAINT listings_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'inquiries' AND constraint_name = 'inquiries_user_id_fkey'
  ) THEN
    ALTER TABLE inquiries ADD CONSTRAINT inquiries_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'professionals' AND constraint_name = 'professionals_user_id_fkey'
  ) THEN
    ALTER TABLE professionals ADD CONSTRAINT professionals_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'subscribers' AND constraint_name = 'subscribers_user_id_fkey'
  ) THEN
    ALTER TABLE subscribers ADD CONSTRAINT subscribers_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'ads' AND constraint_name = 'ads_user_id_fkey'
  ) THEN
    ALTER TABLE ads ADD CONSTRAINT ads_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'premium_subscriptions' AND constraint_name = 'premium_subscriptions_user_id_fkey'
  ) THEN
    ALTER TABLE premium_subscriptions ADD CONSTRAINT premium_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'users' AND constraint_name = 'users_role_enum'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_role_enum
      CHECK (role IN ('user', 'premium', 'pro', 'admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'users' AND constraint_name = 'users_provider_enum'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_provider_enum
      CHECK (provider IN ('local', 'supabase', 'google', 'facebook'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'premium_subscriptions' AND constraint_name = 'premium_subscriptions_tier_enum'
  ) THEN
    ALTER TABLE premium_subscriptions ADD CONSTRAINT premium_subscriptions_tier_enum
      CHECK (tier IN ('free', 'premium', 'pro'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'premium_subscriptions' AND constraint_name = 'premium_subscriptions_status_enum'
  ) THEN
    ALTER TABLE premium_subscriptions ADD CONSTRAINT premium_subscriptions_status_enum
      CHECK (status IN ('active', 'pending', 'canceled', 'expired'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'market_prices' AND constraint_name = 'market_prices_access_level_enum'
  ) THEN
    ALTER TABLE market_prices ADD CONSTRAINT market_prices_access_level_enum
      CHECK (access_level IN ('free', 'premium'));
  END IF;
END $$;

DROP POLICY IF EXISTS "Public can read market prices" ON market_prices;
DROP POLICY IF EXISTS "Public can read free tips" ON tips;
DROP POLICY IF EXISTS "Public can read all market prices" ON market_prices;
DROP POLICY IF EXISTS "Public can read all tips" ON tips;

CREATE POLICY "Public can read free market prices"
  ON market_prices FOR SELECT TO anon USING (access_level = 'free');

CREATE POLICY "Authenticated users can read market prices"
  ON market_prices FOR SELECT TO authenticated USING (
    access_level = 'free'
    OR EXISTS (
      SELECT 1
      FROM users u
      JOIN premium_subscriptions s ON s.user_id = u.id
      WHERE u.auth_uid::text = auth.uid()
        AND s.is_active
        AND s.starts_at <= now()
        AND s.expires_at >= now()
    )
  );

CREATE POLICY "Public can read free tips"
  ON tips FOR SELECT TO anon USING (is_premium = false);

CREATE POLICY "Authenticated users can read tips"
  ON tips FOR SELECT TO authenticated USING (
    is_premium = false
    OR EXISTS (
      SELECT 1
      FROM users u
      JOIN premium_subscriptions s ON s.user_id = u.id
      WHERE u.auth_uid::text = auth.uid()
        AND s.is_active
        AND s.starts_at <= now()
        AND s.expires_at >= now()
    )
  );

CREATE POLICY "Anonymous users can create local user accounts"
  ON users FOR INSERT TO anon WITH CHECK (
    provider = 'local'
    AND password_hash IS NOT NULL
    AND username IS NOT NULL
    AND email IS NOT NULL
  );

CREATE POLICY "Authenticated users can read own profile"
  ON users FOR SELECT TO authenticated USING (auth_uid::text = auth.uid());

CREATE POLICY "Authenticated users can update own profile"
  ON users FOR UPDATE TO authenticated USING (auth_uid::text = auth.uid()) WITH CHECK (auth_uid::text = auth.uid());

CREATE POLICY "Authenticated users can read own subscription"
  ON premium_subscriptions FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = premium_subscriptions.user_id AND u.auth_uid::text = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can insert payments"
  ON subscription_payments FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = subscription_payments.user_id AND u.auth_uid::text = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can read their payments"
  ON subscription_payments FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = subscription_payments.user_id AND u.auth_uid::text = auth.uid()
    )
  );
