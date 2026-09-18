-- ============================================================================
-- ADMIN LOGIN FIX — CANONICAL SCRIPT (v4, consolidated)
-- ============================================================================
-- Purpose: create/repair the two admin accounts (admin1@ / admin2@yebetweg.com)
-- in Supabase Auth + public.users, using the exact pattern proven by the seed
-- migration 20260730000000_seed_real_auth_test_accounts.sql (premium@/pro@
-- accounts log in successfully with this pattern).
--
-- Run: Supabase Dashboard → SQL Editor → paste entire file → Run.
-- Idempotent: safe to run repeatedly. Verify with the checks at the bottom.
--
-- Credentials created (rotate before production launch):
--   admin1@yebetweg.com / Admin123
--   admin2@yebetweg.com / Admin@456
--
-- History:
--   v1 (scripts/fix-admin-login.sql)          BROKEN — never inserted the
--                                             public.users profile (UPDATE
--                                             no-ops on missing rows) and
--                                             built auth.identities wrongly
--                                             (id != user_id, provider_id =
--                                             email, missing last_sign_in_at).
--   v2/v3 (fix-admin-login-v2/-v3)            Fixed inserts; matched seed
--                                             pattern incl. placeholder
--                                             instance_id '00000000-…' which
--                                             the working seed also uses.
--   v4 (this file)                            Consolidated + hardened: unique
--                                             stable UUIDs, metadata merge,
--                                             diagnostics, NULL-instance guard.
--
-- Root-cause note: memory/notes/admin-login-fix-v2.md wrongly blamed the
-- instance_id placeholder — the working seed uses the same placeholder. The
-- actual v1 defects are listed above.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- admin1 — auth.users + auth.identities + public.users
-- ----------------------------------------------------------------------------
DELETE FROM auth.identities WHERE user_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM auth.users      WHERE id       = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM users           WHERE auth_uid = 'a0000000-0000-0000-0000-000000000001';

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, confirmation_token, recovery_token,
  email_change, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',  -- placeholder; identical to working seed
  'a0000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'admin1@yebetweg.com',
  crypt('Admin123', gen_salt('bf')),
  now(), '', '', '', '',
  jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
  jsonb_build_object('full_name', 'Admin One', 'username', 'admin1', 'role', 'admin'),
  now(), now()
);

INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  jsonb_build_object(
    'sub', 'a0000000-0000-0000-0000-000000000001',
    'email', 'admin1@yebetweg.com',
    'email_verified', true
  ),
  'email', now(), now(), now()
);

INSERT INTO public.users (
  auth_uid, username, email, full_name, phone,
  role, provider, password_hash, language_preference, status, metadata
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'admin1', 'admin1@yebetweg.com', 'Admin One', '+251911000001',
  'admin', 'supabase', crypt('Admin123', gen_salt('bf')), 'en', 'active',
  jsonb_build_object('seeded_admin_account', true)
)
ON CONFLICT (email) DO UPDATE SET
  auth_uid            = EXCLUDED.auth_uid,
  username            = EXCLUDED.username,
  full_name           = EXCLUDED.full_name,
  phone               = EXCLUDED.phone,
  role                = EXCLUDED.role,
  provider            = 'supabase',
  password_hash       = EXCLUDED.password_hash,
  status              = 'active',
  metadata            = COALESCE(public.users.metadata, '{}'::jsonb)
                        || jsonb_build_object('seeded_admin_account', true),
  updated_at          = now();

-- ----------------------------------------------------------------------------
-- admin2 — auth.users + auth.identities + public.users
-- ----------------------------------------------------------------------------
DELETE FROM auth.identities WHERE user_id = 'a0000000-0000-0000-0000-000000000002';
DELETE FROM auth.users      WHERE id       = 'a0000000-0000-0000-0000-000000000002';
DELETE FROM users           WHERE auth_uid = 'a0000000-0000-0000-0000-000000000002';

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, confirmation_token, recovery_token,
  email_change, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000002',
  'authenticated', 'authenticated', 'admin2@yebetweg.com',
  crypt('Admin@456', gen_salt('bf')),
  now(), '', '', '', '',
  jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
  jsonb_build_object('full_name', 'Admin Two', 'username', 'admin2', 'role', 'admin'),
  now(), now()
);

INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000002',
  jsonb_build_object(
    'sub', 'a0000000-0000-0000-0000-000000000002',
    'email', 'admin2@yebetweg.com',
    'email_verified', true
  ),
  'email', now(), now(), now()
);

INSERT INTO public.users (
  auth_uid, username, email, full_name, phone,
  role, provider, password_hash, language_preference, status, metadata
) VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'admin2', 'admin2@yebetweg.com', 'Admin Two', '+251911000002',
  'admin', 'supabase', crypt('Admin@456', gen_salt('bf')), 'en', 'active',
  jsonb_build_object('seeded_admin_account', true)
)
ON CONFLICT (email) DO UPDATE SET
  auth_uid            = EXCLUDED.auth_uid,
  username            = EXCLUDED.username,
  full_name           = EXCLUDED.full_name,
  phone               = EXCLUDED.phone,
  role                = EXCLUDED.role,
  provider            = 'supabase',
  password_hash       = EXCLUDED.password_hash,
  status              = 'active',
  metadata            = COALESCE(public.users.metadata, '{}'::jsonb)
                        || jsonb_build_object('seeded_admin_account', true),
  updated_at          = now();

-- ----------------------------------------------------------------------------
-- GUARD: if GoTrue rejects login with "Database error querying schema" /
-- 500 on /auth/v1/token, a NULL/invalid instance_id may be the cause in YOUR
-- environment. Diagnose, then if needed re-run the two INSERTs below after
-- replacing the placeholder with the real instance id.
-- ----------------------------------------------------------------------------
SELECT 'NULL instance rows (should be 0)' AS check,
       count(*) AS offenders
FROM auth.users
WHERE id LIKE 'a0000000-%' AND instance_id IS NULL;

-- ----------------------------------------------------------------------------
-- VERIFICATION (run automatically as part of this script)
-- Expected: 2 rows, identity_count = 1 each, confirmed = true.
-- Then test login in the app with both accounts.
-- ----------------------------------------------------------------------------
SELECT
  u.email, u.username, u.role, u.auth_uid, u.provider, u.status,
  au.instance_id,
  au.email_confirmed_at IS NOT NULL AS confirmed,
  (SELECT count(*) FROM auth.identities i WHERE i.user_id = au.id) AS identity_count
FROM users u
JOIN auth.users au ON au.id = u.auth_uid
WHERE u.email IN ('admin1@yebetweg.com', 'admin2@yebetweg.com');

NOTIFY pgrst, 'reload schema';
