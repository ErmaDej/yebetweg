# YeBetWeg — Production Launch Checklist

Owner-facing gate before public launch. Code-side hardening is done (Phases 6–7 + the Sep 18 readiness pass); the remaining blockers are credentials, data, and deployment — actions that must be performed in live dashboards.

## 1. Secrets rotation (owner — REQUIRED)

Real credentials existed in git history. Files are untracked now, but **every secret below must still be rotated** because history retains them:

- [ ] Supabase DB password (was in `temp_env.sh`): Project Settings → Database → reset password → update `SUPABASE_DB_URL` wherever the migration runner uses it
- [ ] `service_role` JWT: was tracked in `.env.example`. Reset: Project Settings → API → rotate JWT secret (note: this invalidates all current anon/service JWTs — update every environment)
- [ ] Chapa secret key + webhook secret (Chapa dashboard → API keys); set `CHAPA_SECRET_KEY` / `CHAPA_WEBHOOK_SECRET` in the Supabase edge-function secrets (`supabase secrets set ...`)
- [ ] Resend API key (Resend dashboard → API keys)
- [ ] Admin account passwords after running the fix script (below)
- [ ] History purge was **deferred by owner decision** (untrack+rotate only). Revisit: full `git filter-repo`/BFG purge + force-push if the repository will ever be shared.

## 2. Admin login fix (owner — REQUIRED)

- [ ] Run `scripts/fix-admin-login.sql` in the Supabase SQL Editor (idempotent)
- [ ] Verify both admin accounts log in through the app UI (`admin1@yebetweg.com` / `admin2@yebetweg.com`) and reach the admin dashboard
- [ ] If login still fails: run `scripts/diagnose-admin-auth.sql` and compare against the "healthy" comments in that file
- [ ] Change the seeded passwords to real ones

## 3. Security probe (owner — verify against the live project)

Run these in the SQL Editor / with the anon key; **all must return the safe answer**:

```sql
-- anon must NOT read users (RLS on): expect 0 rows
select count(*) from users;                      -- as anon: expect permission denied / 0 rows
-- anon must NOT read payment history: expect denied
select count(*) from subscription_payments;
-- anon must NOT see pending listings: expect 0
select count(*) from listings where status = 'pending';
-- anon must NOT read premium-gated prices: expect 0 premium rows
select count(*) from market_prices where access_level <> 'free';
-- get_active_subscription must not be executable by anon: expect permission denied
select * from get_active_subscription('00000000-0000-0000-0000-000000000000');
```

Also verify in the app with a free account: premium tips/prices rows must never appear in the network tab (server-side gating via `get_visible_*` RPCs).

## 4. Deployment

- [ ] Vercel project env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CHAPA_PUBLIC_KEY`, `VITE_APP_BASEURL=https://yebetweg.com` (secrets stay server-side in Supabase edge-function secrets — never add `VITE_`-less secrets to Vercel)
- [ ] Edge functions deployed with updated secrets: `supabase functions deploy chapa-service chapa-webhook admin_actions`
- [ ] Migrations applied to the production DB (`supabase db push`) — 28 migrations
- [ ] Domain + DNS; sitemap regenerated (`npm run build` runs it) and submitted to Google Search Console
- [ ] Chapa switched from sandbox (`CHAPUBK_TEST_`) to live keys + a real webhook registration pointing at the deployed `chapa-webhook` URL
- [ ] Smoke test end-to-end: sign up → verify email → estimate BOQ → submit RFQ → pay via Chapa sandbox → role upgrade reflected → admin dashboard operational summary shows the events

## 5. Known accepted risks (documented, not blockers)

- `login_attempts` RLS grants anon full access (rate-limit table; by design in the Phase 6 migration)
- Git history retains pre-rotation secrets until the (deferred) history purge
- Telemetry/analytics are minimal; add error reporting budget post-launch
