# YeBetWeg — Production Launch Checklist (Vercel)

Step-by-step runbook for taking the app live on Vercel with the existing Supabase backend.
Everything code-side is ready; this doc is the owner's sequence for the deploy itself.

---

## 0. Prerequisites (one-time, before Vercel)

- [ ] **Apply the two pending migrations** in Supabase SQL Editor (Dashboard → SQL Editor → paste → Run):
  - `supabase/migrations/20260921010000_submit_rfq_reject_anon.sql` — closes the anon RFQ-creation hole found by the quota probe (anonymous sessions could create RFQ rows and bypass the free cap).
  - `supabase/migrations/20260921020000_boq_share_tokens.sql` — BOQ share-permalink tokens + `saved_collections`.
  - Verify: `npm run verify:deploy` — check [8] should now PASS once `CRON_SECRET`/keys exported (see §5).
- [ ] **Rotate all leaked secrets** (they exist in git history and MUST be rotated before public launch):
  - Supabase **service_role** JWT (Dashboard → Settings → API → Rotate).
  - Supabase **database password** (Settings → Database).
  - **Chapa** secret key + webhook secret (Chapa merchant dashboard).
  - **Resend** API key (resend.com → API Keys).
- [ ] Run `scripts/fix-admin-login.sql` in SQL Editor so the admin account's login + role row are consistent.

---

## 1. Vercel project setup

1. Push the latest `main` (already done — see repo).
2. Vercel → **Add New → Project** → import the GitHub repo.
3. Configure:
   - **Framework Preset:** Vite (auto-detected)
   - **Build Command:** `npm run build` (runs `tsc -b && vite build && sitemap:generate`)
   - **Output Directory:** `dist`
   - **Install Command:** `npm ci`
   - **Node.js Version:** 20.x or 22.x (project engines-compatible)

---

## 2. Environment variables (Vercel → Settings → Environment Variables)

Add to **Production** (and Preview if you want branch deploys to work against prod data — recommended: point Preview at the same Supabase project):

| Variable | Value | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://jxyavtdmcloxnhuavokc.supabase.co` | Same as local |
| `VITE_SUPABASE_ANON_KEY` | (anon/public key) | Safe to expose; RLS is the security layer |
| `VITE_CHAPA_PUBLIC_KEY` | (Chapa public key) | Client-side checkout init |
| `VITE_APP_BASEURL` | `https://<your-domain>` | Used for share permalinks, RFQ deep links, SEO canonicals — **must be the final domain, no trailing slash** |

**Not needed on Vercel** (they are server-side only, already set as Supabase Edge Function secrets):
`CHAPA_SECRET_KEY`, `CHAPA_WEBHOOK_SECRET`, `RESEND_API_KEY`, `CRON_SECRET`, `TELEGRAM_BOT_TOKEN`,
`TELEGRAM_CHANNEL_ID`, `TELEGRAM_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`.
If you redeploy any edge function, set those with `npx supabase secrets set --env-file supabase/.env.functions` (see `docs/EDGE_FUNCTIONS_RUNBOOK.md`).

> `VITE_TELEBIRR_*` variables exist in `.env.example` but are **not consumed by the current frontend** — skip them until Telebirr checkout is wired.

---

## 3. Domain

1. Vercel → Settings → **Domains** → add your domain (e.g. `yebetweg.com` + `www` redirect).
2. At your registrar: create the `A` record (`76.76.21.21`) or `CNAME` (`cname.vercel-dns.com`) as Vercel instructs; wait for the SSL certificate to issue.
3. Update `VITE_APP_BASEURL` to the final domain and **redeploy** (env changes need a fresh build).
4. Supabase Dashboard → Authentication → **URL Configuration**:
   - Site URL: `https://<your-domain>`
   - Redirect URLs: add `https://<your-domain>/auth/callback` (and localhost variants for dev).
5. Chapa merchant dashboard → webhook URL must point at the deployed function:
   `https://jxyavtdmcloxnhuavokc.supabase.co/functions/v1/chapa-webhook` (unchanged by the domain move).

---

## 4. Analytics

The project ships **zero analytics by default** (privacy-respecting; nothing to remove). Recommended: enable **Vercel Web Analytics** (one click: Vercel → Analytics → Enable) — zero config, no cookie banner needed. Optional alternatives:

- **Plausible** (privacy-first, EU hosted): add `<script defer data-domain="<domain>" src="https://plausible.io/js/script.js">` in `index.html` head.
- **Google Analytics 4**: only if a stakeholder requires it; adds a cookie-consent obligation in the EU/Ethiopia data-protection context.

Do **not** add more than one analytics provider — page weight on Ethiopian mobile networks matters.

---

## 5. Post-deploy smoke tests (run in order, ~15 min)

**Automated — from your machine, against production:**

```bash
# Full deployment matrix (migrations, cron guard, webhook guard, quotas, notifications)
npm run verify:deploy

# With authenticated checks (uses a throwaway test account, NOT your admin)
export TEST_EMAIL="test+smoke@yourdomain.com"
export TEST_PASSWORD="..."
export CRON_SECRET="..."            # verifies the authenticated cron path too
export TELEGRAM_BOT_TOKEN="..."     # verifies webhook registration + chat delivery
npm run verify:deploy
```

Expected: checks 1, 2, 3, 6, 7, 8 PASS (1b SKIP unless you check Dashboard → Database → Cron; 4/5 PASS once Telegram env is exported).

**Manual — in a private browser window:**

| # | Check | Expected |
|---|---|---|
| 1 | Open `https://<domain>` | Homepage renders, hero videos play, no console 404s |
| 2 | Toggle EN / አማርኛ | All visible strings switch (assistant, prices, footer included) |
| 3 | DevTools → Network → Offline, then click a nav link | `offline.html` fallback serves; back online restores |
| 4 | Hard reload twice | Service worker shows "Network: service worker" on second load |
| 5 | Register → email confirmation link | Lands back on the app, signed in (Supabase redirect config OK) |
| 6 | Sign in → Dashboard → save a BOQ estimate → row appears | RLS write path OK in prod |
| 7 | Estimate row → **Share** → copy link → open in incognito | Public `/boq/<token>` page renders read-only report |
| 8 | Estimate row → **Print** (premium test account) | Print-ready report window opens |
| 9 | Dashboard → Assistant → "draft a new rfq" | 3-question flow → RFQ modal opens pre-filled |
| 10 | Submit a real RFQ as a free account ×4 | 4th attempt is capped with the upgrade message (quota RPC) |
| 11 | Chapa checkout with the **sandbox/test** key | Redirect → webhook → subscription activates; PaymentSuccess page shows |
| 12 | Send `/start` to the Telegram bot, then `/submitprice` | Help card + price lands in admin verification queue |
| 13 | `/sitemap.xml` and `/robots.txt` | Serve with production URLs (sitemap regenerates each build) |
| 14 | Admin dashboard → every tab | No errors; Telegram verification queue lists today's submissions |

**Rollback plan:** if anything fails post-launch, Vercel → Deployments → previous production deployment → **Promote to Production**. Supabase migrations applied here are additive (no destructive ops) and safe to leave in place during a frontend rollback.

---

## 6. Launch-day order of operations (summary)

1. Apply migrations (§0) → 2. Rotate secrets (§0/§7) → 3. Vercel import + env (§1–2) → 4. Domain + redeploys (§3) → 5. Analytics (§4) → 6. Smoke tests (§5) → 7. Flip Chapa from sandbox to live keys → 8. Announce.

---

## 7. Go-live reset & secrets rotation (the eve-of-launch sequence)

Run this **once, the eve of the real launch** — after pilot testing, before
announcing. Takes ~30 minutes: dashboard clicks, SQL pastes, CLI one-liners.

### 7.1 Rotate every secret (order matters)

| # | Secret | Where | How |
|---|--------|-------|-----|
| 1 | **service_role JWT** | Supabase Dashboard → Project Settings → API | Rotate — then update it in ALL edge-function secrets that embed it |
| 2 | **CRON_SECRET** | `npx supabase secrets set CRON_SECRET=<new>` | Plus one SQL Editor statement: `update app_settings set value='<new>' where key='cron_secret';` — the four HTTP cron jobs read it from `app_settings` at fire time, so no schedule edits needed |
| 3 | **Resend API key** | resend.com → API Keys → rotate | then `npx supabase secrets set RESEND_API_KEY=<new>` |
| 4 | **Chapa secret + webhook auth** | Chapa merchant dashboard | then `npx supabase secrets set CHAPA_SECRET_KEY=<new>` (and webhook secret) |
| 5 | **Telegram bot token** | @BotFather → /revoke | then `npx supabase secrets set TELEGRAM_BOT_TOKEN=<new>` + re-register the webhook (runbook §4) |
| 6 | **Database password** | Dashboard → Settings → Database | rotate; update `SUPABASE_DB_URL` in local `.env` |
| 7 | **anon/publishable key** | Dashboard → Settings → API | optional (public by design); rotating forces a Vercel env update + redeploy |
| 8 | **JWT secret** | Dashboard → Settings → API → JWT Settings | **last** — invalidates ALL sessions (logs out everyone; fine on the eve of launch) |
| 9 | **GoTrue JWT (new API keys)** | Dashboard → Settings → API Keys | if the project uses the new API-keys system: **Publish** the draft JWT signing keys, then rotate the legacy JWT secret |
| 10 | **Vercel env vars** | Vercel → Settings → Environment Variables | update anything that changed (anon key, `VITE_APP_BASEURL` → final domain) and **redeploy** |

After rotating: `npx supabase secrets list` to confirm, then run the §5 smoke
tests — the **webhook guard**, **cron guard** (export the new `CRON_SECRET`
locally first), and the **auth checks** must pass before continuing.

### 7.2 Clear the pilot data (the wipe)

Run `scripts/wipe-production-data.sql` (Dashboard → SQL Editor → paste → Run).
It deletes every pilot user, subscription, payment, listing, price, tip, Q&A,
moderation-log row AND the matching `auth.users` identities, in FK order,
inside one transaction, with a zero-count verify block at the end.
**It deliberately preserves `app_settings`** — `cron_secret` + `fee_config`
live there and are load-bearing for billing math and scheduled emails.
Selective variants (subs-only, activity-only) are at the bottom of the script.

### 7.3 Re-seed the minimum viable content

The wipe leaves the app a blank shell — re-seed what the first visitors need:

- **Admins:** re-run `scripts/fix-admin-login.sql` (admin login + role row).
- **Market prices:** import the baseline CSV in Admin → Market Price Manager,
  or have your supplier re-send `/submitprice` messages (the Telegram funnel —
  docs/SUPPLIER_TELEGRAM_GUIDE.md). Freshness decays after 7 days, so seed
  close to launch day.
- **Tips / professionals / blogs / ads:** re-add via the admin dashboard (or
  re-run seed SQL you kept from before the wipe).
- **Verify cron jobs survived:** `cron.job` is schema data, untouched by the
  wipe. SQL Editor: `select jobname, schedule, active from cron.job order by jobname;`
  → expect 5 rows, all active.

### 7.4 Final go/no-go gates

- [ ] `npm run verify:deploy` fully green (new secrets exported locally)
- [ ] §5 smoke tests pass on the production URL
- [ ] One real signup → branded confirmation email → redirects through `/auth/callback` → lands on `/dashboard` (§8.3)
- [ ] One sandbox→live Chapa test payment → activates, shows in admin reconciliation, revenue-digest numbers move
- [ ] `resend.com/domains` shows `yebetweg.com` **Verified** (DKIM/SPF green — docs/RESEND_DOMAIN_SETUP.md)

Notes: §0's "rotate all leaked secrets" list is subsumed by §7.1. §0's "apply
the two pending migrations" step has since been completed (migration history
repaired 2026-09-24; `db push --dry-run` reports up to date).

---

## 8. Auth: branded confirmation email + redirect back to the app

The flow is already wired code-side: `signUp` passes
`emailRedirectTo: ${origin}/auth/callback`, the callback page verifies the
`token`/`type` params via `verifyOtp`, shows a 6-digit-code fallback form when
opened without a token (for email clients that strip buttons), and redirects
to `/dashboard` on success. What remains is **dashboard configuration** — the
two Supabase settings controlling where links point and what the email looks
like. Done once; ~10 minutes.

### 8.1 Set the redirect base (Site URL + redirect allow-list)

Dashboard → **Authentication → Sign In / Providers → URL Configuration**:

1. **Site URL** → your production origin (e.g. `https://yebetweg.com` — the
   §3 domain, or the Vercel preview URL during the pilot). This becomes the
   base for every email link and the default redirect target.
2. **Redirect URLs** → add BOTH:
   - `https://<prod-domain>/auth/callback`
   - `http://localhost:8080/auth/callback` (dev)
3. Save. Every email link now lands on the existing `/auth/callback` route,
   which verifies the token and redirects to `/dashboard`
   (src/pages/AuthCallbackPage.tsx).

### 8.2 Paste the branded template

Dashboard → **Authentication → Emails → Templates → "Confirm signup"**:

- Subject: `Confirm your email — YeBetWeg`
- Body: paste the template in `supabase/templates/confirmation.html`
  (bilingual EN/አማርኛ, YeBetWeg header bar, big confirm button →
  `{{ .ConfirmationURL }}`, the `{{ .Token }}` 6-digit code fallback, expiry
  note). Save.
- Repeat for **Magic Link** (same body works — it only uses
  `{{ .ConfirmationURL }}` and `{{ .Token }}`), and optionally **Reset
  Password** with the button labeled "Set a new password".
- The template is ALSO registered in `supabase/config.toml`
  (`[auth.email.template.confirmation]`) so local dev renders the same email;
  on the HOSTED project the dashboard paste above is the operative step.
- The default Supabase SMTP sender is fine for the pilot; for the real launch
  keep it or connect Resend SMTP in the same panel (domain side:
  docs/RESEND_DOMAIN_SETUP.md).
- Keep `Auth → Rate Limits → Emails/hour` at 30 (config.toml updated to
  match; the old default of 2 throttles real signups).

### 8.3 Verify the whole loop (10 minutes, once)

1. From a private window, sign up with a real inbox you control.
2. The email must arrive **branded** (YeBetWeg header, bilingual copy).
3. Click the button → lands on `/auth/callback?token=…&type=signup` →
   "Email verified successfully!" → auto-redirect to `/dashboard`.
4. Test the fallback: copy the 6-digit code from the email, open
   `/auth/callback` (no params), paste email + code, verify.
5. Confirm `public.users` and `auth.users` both gained the member (the same
   signup path §7.2 clears on go-live).
