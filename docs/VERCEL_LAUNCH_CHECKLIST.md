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

1. Apply migrations (§0) → 2. Rotate secrets (§0) → 3. Vercel import + env (§1–2) → 4. Domain + redeploys (§3) → 5. Analytics (§4) → 6. Smoke tests (§5) → 7. Flip Chapa from sandbox to live keys → 8. Announce.
