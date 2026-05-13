/*
  YeBetWeg Seed Update: User Profiles, Admin Accounts, and Premium + Pro Subscription Seed Data

  This seed migration populates the new `users` table with sample local accounts including
  two admin users, one premium user, and one pro user. It also creates subscription and
  payment records for both paid tiers.
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'Admin123' OR email = 'admin1@yebetweg.com') THEN
    INSERT INTO users (username, email, full_name, phone, role, provider, password_hash, language_preference, status)
    VALUES ('Admin123', 'admin1@yebetweg.com', 'Admin User One', '+251911000123', 'admin', 'local', crypt('BYG123', gen_salt('bf')), 'en', 'active');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'AdminTwo' OR email = 'admin2@yebetweg.com') THEN
    INSERT INTO users (username, email, full_name, phone, role, provider, password_hash, language_preference, status)
    VALUES ('AdminTwo', 'admin2@yebetweg.com', 'Admin User Two', '+251911000124', 'admin', 'local', crypt('Admin@456', gen_salt('bf')), 'en', 'active');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'PremiumUser' OR email = 'premium@yebetweg.com') THEN
    INSERT INTO users (username, email, full_name, phone, role, provider, password_hash, language_preference, status)
    VALUES ('PremiumUser', 'premium@yebetweg.com', 'Premium Tester', '+251911000125', 'premium', 'local', crypt('Premium123!', gen_salt('bf')), 'en', 'active');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'ProUser' OR email = 'pro@yebetweg.com') THEN
    INSERT INTO users (username, email, full_name, phone, role, provider, password_hash, language_preference, status)
    VALUES ('ProUser', 'pro@yebetweg.com', 'Pro Tester', '+251911000126', 'pro', 'local', crypt('Pro123!', gen_salt('bf')), 'en', 'active');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM premium_subscriptions s
    JOIN users u ON s.user_id = u.id
    WHERE u.username = 'PremiumUser' AND s.tier = 'premium'
  ) THEN
    INSERT INTO premium_subscriptions (user_id, tier, payment_method, chapa_reference, starts_at, expires_at, is_active, status)
    SELECT u.id, 'premium', 'chapa', 'CHAPA-TEST-0001', now(), now() + interval '30 days', true, 'active'
    FROM users u
    WHERE u.username = 'PremiumUser';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM premium_subscriptions s
    JOIN users u ON s.user_id = u.id
    WHERE u.username = 'ProUser' AND s.tier = 'pro'
  ) THEN
    INSERT INTO premium_subscriptions (user_id, tier, payment_method, chapa_reference, starts_at, expires_at, is_active, status)
    SELECT u.id, 'pro', 'chapa', 'CHAPA-TEST-0002', now(), now() + interval '30 days', true, 'active'
    FROM users u
    WHERE u.username = 'ProUser';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM subscription_payments p
    JOIN premium_subscriptions s ON p.subscription_id = s.id
    JOIN users u ON p.user_id = u.id
    WHERE u.username = 'PremiumUser' AND p.reference = 'CHAPA-PAY-0001'
  ) THEN
    INSERT INTO subscription_payments (user_id, subscription_id, amount, currency, method, reference, status)
    SELECT u.id, s.id, 1200, 'ETB', 'chapa', 'CHAPA-PAY-0001', 'completed'
    FROM users u
    JOIN premium_subscriptions s ON s.user_id = u.id
    WHERE u.username = 'PremiumUser';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM subscription_payments p
    JOIN premium_subscriptions s ON p.subscription_id = s.id
    JOIN users u ON p.user_id = u.id
    WHERE u.username = 'ProUser' AND p.reference = 'TELEBIRR-PAY-0001'
  ) THEN
    INSERT INTO subscription_payments (user_id, subscription_id, amount, currency, method, reference, status)
    SELECT u.id, s.id, 1800, 'ETB', 'telebirr', 'TELEBIRR-PAY-0001', 'completed'
    FROM users u
    JOIN premium_subscriptions s ON s.user_id = u.id
    WHERE u.username = 'ProUser';
  END IF;
END $$;

UPDATE market_prices
SET access_level = 'premium'
WHERE material_en IN (
  'Grade 60 Rebar 12mm',
  'Grade 60 Rebar 16mm',
  'Grade 40 Rebar 10mm',
  'Grade 60 Rebar 20mm',
  'Crushed Stone (Concrete)',
  'Plywood Sheet 18mm',
  'Porcelain Tile 60x60cm',
  'Electrical Wiring (2.5mm²)'
);
