# Admin Login Fix — Root Cause & Working Pattern

> **Corrected Sep 18, 2026.** An earlier revision of this note wrongly blamed the
> `instance_id` placeholder (`'00000000-0000-0000-0000-000000000000'`). The working
> seed migration `20260730000000_seed_real_auth_test_accounts.sql` uses the **same
> placeholder** and its premium@/pro@ accounts log in fine. The real defects in
> the original `fix-admin-login.sql` v1 were:

1. **No `public.users` profile insert** — v1 only ran an `UPDATE`, which silently
   no-ops when the row doesn't exist. `username` is NOT NULL, so the profile must
   be inserted with full column data.
2. **Malformed `auth.identities` row** — `id` ≠ `user_id`, `provider_id` was the
   email instead of `user_id::text`, and `last_sign_in_at` was missing.
3. **Wrong column types** — `raw_app_meta_data`/`raw_user_meta_data` were plain
   strings instead of JSONB, and GoTrue-required token columns
   (`confirmation_token`, `recovery_token`, `email_change`, `email_change_token_new`)
   were omitted.

## Working pattern (proven by the seed migration)

```sql
-- auth.users (the placeholder instance_id is fine)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, confirmation_token, recovery_token,
  email_change, email_change_token_new,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000', '<uuid>', 'authenticated', 'authenticated',
  '<email>', crypt('<pass>', gen_salt('bf')), now(), '', '', '', '',
  jsonb_build_object('provider','email','providers',ARRAY['email']),
  jsonb_build_object('full_name','<name>','username','<user>','role','<role>'),
  now(), now()
);

-- auth.identities (id = user_id, provider_id = user_id::text, last_sign_in_at set)
INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) VALUES (
  '<uuid>', '<uuid>', '<uuid>::text',
  jsonb_build_object('sub','<uuid>','email','<email>','email_verified',true),
  'email', now(), now(), now()
);

-- public.users profile (INSERT ... ON CONFLICT, not a bare UPDATE)
INSERT INTO public.users (
  auth_uid, username, email, full_name, phone, role,
  provider, password_hash, language_preference, status, metadata
) VALUES (
  '<uuid>', '<user>', '<email>', '<name>', '<phone>', '<role>',
  'supabase', crypt('<pass>', gen_salt('bf')), 'en', 'active',
  jsonb_build_object('seeded_admin_account', true)
)
ON CONFLICT (email) DO UPDATE SET auth_uid = EXCLUDED.auth_uid, ...;
```

## Canonical script

`scripts/fix-admin-login.sql` (v4, consolidated) applies this pattern for both
admins, is idempotent, and includes verification queries. Diagnostics live in
`scripts/diagnose-admin-auth.sql` — run those first whenever a known account
fails to log in. The v2/v3 one-off scripts have been deleted.

## Status

- [x] Consolidated script written and tracked in git
- [ ] **Pending owner action:** run it in the Supabase SQL Editor, then verify
      admin1@yebetweg.com / Admin123 and admin2@yebetweg.com / Admin@456 can log
      in through the app UI
