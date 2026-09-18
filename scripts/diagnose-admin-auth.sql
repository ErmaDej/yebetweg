-- ============================================================================
-- ADMIN AUTH DIAGNOSTICS — CANONICAL SCRIPT
-- ============================================================================
-- Run this FIRST when a seeded/known account fails to log in
-- ("Invalid login credentials" or "Database error querying schema" or
-- /auth/v1/token 500). Every check explains what a healthy result looks like.
-- Use together with scripts/fix-admin-login.sql.
-- ============================================================================

-- 1. Auth users exist with password + confirmation? --------------------------
-- Healthy: 1 row per account, confirmed = true, has_password = true.
SELECT
  id, email, instance_id, aud, role,
  email_confirmed_at IS NOT NULL AS confirmed,
  encrypted_password IS NOT NULL AS has_password,
  raw_app_meta_data,
  raw_user_meta_data
FROM auth.users
WHERE email IN ('admin1@yebetweg.com', 'admin2@yebetweg.com');

-- 2. Email identities complete and well-formed? -------------------------------
-- Healthy: 1 row per account; id = user_id; provider_id = user_id::text.
SELECT
  id, user_id, provider, provider_id, identity_data, last_sign_in_at
FROM auth.identities
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('admin1@yebetweg.com', 'admin2@yebetweg.com')
);

-- 3. NULL / unknown instance_id? ----------------------------------------------
-- Healthy: no rows. If this returns rows, GoTrue may reject the accounts;
-- re-seed using the real instance id from check 4.
SELECT 'NULL instance_id rows' AS check, id, email
FROM auth.users
WHERE email IN ('admin1@yebetweg.com', 'admin2@yebetweg.com')
  AND instance_id IS NULL;

-- 4. Instance table sanity -----------------------------------------------------
SELECT id AS instance_id FROM auth.instances LIMIT 5;

-- 5. public.users profiles linked? --------------------------------------------
-- Healthy: 1 row per account; auth_uid set; provider='supabase';
-- role='admin'; status='active'.
SELECT id, email, username, auth_uid, provider, role, status
FROM users
WHERE email IN ('admin1@yebetweg.com', 'admin2@yebetweg.com');

-- 6. Password hash verification (crypt works + password is what we expect) -----
-- Healthy: hash_valid = true for both rows.
SELECT
  u.email,
  (au.encrypted_password = crypt('Admin123', au.encrypted_password)) AS hash_valid
FROM users u
JOIN auth.users au ON au.id = u.auth_uid
WHERE u.email = 'admin1@yebetweg.com';

SELECT
  u.email,
  (au.encrypted_password = crypt('Admin@456', au.encrypted_password)) AS hash_valid
FROM users u
JOIN auth.users au ON au.id = u.auth_uid
WHERE u.email = 'admin2@yebetweg.com';

-- 7. Orphaned auth users without profiles (profile insert previously no-op'ed) -
-- Healthy: no rows.
SELECT 'orphan auth users' AS check, au.id, au.email
FROM auth.users au
LEFT JOIN users u ON u.auth_uid = au.id
WHERE au.email LIKE '%@yebetweg.com' AND u.id IS NULL;
