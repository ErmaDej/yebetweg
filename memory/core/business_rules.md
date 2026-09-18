# YeBetWeg Business Rules — Source of Truth

> Generated from live `dev` (`c54a889`) code audit. Supersedes any earlier spec.
> Canonical tiers: `TIER_PRICES` = free **0** / premium **500** / pro **1200** ETB. ⚠️ `TIER_PRICES.pro` still reads **1200** — the user has directed seed payments to **500/1000**; `TIER_PRICES` in `usePayment.ts` (premium 500 / pro 1200) does **not** match the directed seed (500/1000). **TODO: reconcile `TIER_PRICES` to premium 500 / pro 1000** so code, seeds, and pricing grid agree.
> Auth model: **custom DB auth** (`users` table with `crypt`/`gen_salt`). Custom-auth users are `anon` to Supabase → RLS uses `access_level`/`role` joins, not `auth.uid()`.

## 0. Roles & Resolution

| RoleKey | Source | How assigned / resolved |
|---|---|---|
| `admin` | `users.role = 'admin'` | Hardcoded in `users` row. Seeds: `Admin123`/`admin1@yebetweg.com` (`BYG123`), `AdminTwo`/`admin2@yebetweg.com` (`Admin@456`). |
| `pro` | `premium_subscriptions.tier = 'pro'` (active) | Seeds: `ProUser`/`pro@yebetweg.com` (`Pro123!`). |
| `premium` | `premium_subscriptions.tier = 'premium'` (active) | Seeds: `PremiumUser`/`premium@yebetweg.com` (`Premium123!`). |
| `user` | default (no active paid subscription) | Everyone else. |

**Resolution chain** — `useUserProfile` returns `{ profile, subscription }`. `Dashboard.tsx` computes:
- `roleKey = roleKeyFor(profile, subscription)` → `entitlements.ts`
- `activePlan = getActivePlan(roleKey)` → `PremiumTier` (`"free" | "premium" | "pro"`)
- `premium = activePlan !== "free"`

`roleKeyFor` precedence: `admin` → `pro` (active pro sub) → `premium` (active premium sub) → `user`.

## 1. Subscriptions & Payments

| Property | Rule |
|---|---|
| Tier prices | `free = 0`, `premium = 500 ETB`, `pro = 1000 ETB` (`usePayment.ts` `TIER_PRICES`, now reconciled to seeds). |
| On create | `createSubscriptionRecord` inserts `is_active:false, status:"pending"` — **not live until webhook fires**. |
| Activation | Supabase Edge Function `handle-payment-webhook` (Chapa) sets `is_active:true, status:"active"` and emails receipt. |
| Duration | Seeds use 30-day windows (`now() + interval '30 days'`). |
| Seeds | `009` seeds active pro+premium subs + payments. |

### ⚠️ Pricing drift (HIGH)
Seed payments in `009` record **premium = 1200 ETB** and **pro = 1800 ETB**, which **does not match** `TIER_PRICES` (500/1200). Update seeds to match, or document as intentional legacy test values.

## 2. Feature Entitlements by Tier

| Feature | free (user) | premium | pro | admin |
|---|---|---|---|---|
| Browse listings, tips, market prices, professionals | ✅ read free rows only | ✅ | ✅ all | ✅ |
| Contact sellers / professionals | ❌ via `/#premium` | ✅ | ✅ | ✅ |
| Request quote (RFQ) | ✅ limited | ✅ | ✅ unlimited | ✅ |
| Create listing | ✅ up to 3 active | ✅ | ✅ | ✅ |
| Export BOQ | ❌ `/#premium` | ✅ | ✅ | ✅ |
| Admin dashboard | ❌ | ❌ | ❌ | ✅ |
| Assistant | ✅ limited | ✅ premium answers | ✅ full | ✅ |

### Enforcement points
- **Market Prices** — `MarketPricesSection`: `FREE_ROWS = 5` first rows visible; rows `i >= 5` blurred & locked unless `canReadPremium` (= premium/pro). CTA under table (line 385): upgrade link.
- **Tips** — `TipsSection`: `tip.is_premium && !canReadPremium` → `TipCard` blurred, "Unlock premium tips" CTA.
- **Marketplace contact** — `ListingCard`: `canContact = activePlan === "premium"||"pro"`. Non-paying → `Lock` "Unlock contact" → `/#premium`.
- **BOQ export** — `BoqLiteSection` Export button → `/#premium`.
- **Admin** — dashboard tab gated on `profile.role === "admin"`.

### ⚠️ Gaps — NOT enforced server-side (MEDIUM) [verified]
Audited the actual RPC bodies (`submit_rfq` in `20260726001000_rfq_workflow.sql`, `create_listing` in `20260520000000_010_payment_webhooks_and_inquiries.sql`):
- **RFQ free-tier limit** (`dashboard.benefit.free.rfq = "Quote requests (limited)"`) is **not enforced in `submit_rfq`** — it inserts straight into `rfq_requests` with no tier/quota check.
- **"List up to 3 active free listings"** (free benefit) is **not enforced in `create_listing`** — it inserts straight into `listings` with status `pending`, no active-count check.

Both limits are currently **documented-but-aspirational**. To enforce, add tier+quota guards inside these SECURITY DEFINER RPCs (see Open Items). Client-side gates are also absent (`RfqModal` calls the RPC; Marketplace "List Your Property" button has zero gating).

## 3. Navigation & Routing

- **Router**: hash-state router in `App.tsx` (NOT `react-router`). Hash fragments = sections/anchors.
- **Auth gate**: `ProtectedRoute` (`useRequireAuth`) guards `/dashboard`. **Role-based gating is NOT applied at the router** — all logged-in users reach `/dashboard`; sections are rendered conditionally.
- **Premium links**: `/#premium` (price section anchor). Paywalls that don't redirect to a dedicated plan route use this anchor.
- Public surface: `/`, `/callback`, `/reset-password`, `/dashboard` (auth-required).

## 4. Data Access (RLS)

Supabase; custom-auth users = `anon`. Policies join `users` by `auth_uid`.

| Table | anon | authenticated (custom user) |
|---|---|---|
| `listings` (SELECT) | public, all | all |
| `market_prices` (SELECT) | all rows | all rows |
| `tips` (SELECT) | non-premium only | non-premium only |
| `blogs` (SELECT) | all | all |
| `professionals` (SELECT) | all (`is_verified` column exists) | all |
| `premium_subscriptions` (SELECT) | **open** (`WITH CHECK (true)`) — own sub readable | per-tier join in `get_active_subscription` RPC |
| `premium_subscriptions` (INSERT/UPDATE) | — | own only (`auth.uid() = user_id`) [001-fix] |
| `listings` (UPDATE/DELETE) | — | own listings; admin override for SELECT |
| `inquiries` (INSERT) | anon+auth, open | — |
| `inquiries` (SELECT) | — | own + admin all |
| `users` (INSERT profile) | — | authenticated (auto via `ensure_auth_user_profile`) |
| `payment_webhook_events` | service_role only | — |

**Premium read gating** for `market_prices`/`tips` is enforced **client-side** via `activePlan` + the `access_level`/​`is_premium` columns — RLS itself only strips premium rows for `tips` (not `market_prices`), so `market_prices` premium rows are served to anon but blurred client-side.

## 5. Profile Lifecycle

- On first sign-in, `ensure_auth_user_profile()` (triggered on auth) auto-creates a `users.profile` row if absent.
- Profile fields: `username, email, full_name, phone, role, provider, password_hash, language_preference, status`.
- Language preference persisted → drives `useLanguage` EN/AM rendering.
- **Professional verification**: `useVerification` is an **SMS OTP** verification flow — **not** the admin professional onboarding. Do not confuse with `professionals.is_verified` (admin-managed table).

## 6. Admin

Admin = `users.role = 'admin'`. Admin actions use a **service-role** edge function `supabase/functions/admin_actions/index.ts` (not anon RLS) for: `operational_summary`, `view_analytics`, `approve_listing`, `reject_listing`, `moderate_tip`, `toggle_professional`, `manage_admin`. Admin routes protected by `profile.role === 'admin'` client-side; RBAC at router is not enforced. Admin auth is the single gate.

**Moderation (C2 — shipped):**
- **Listing moderation**: per-row Approve/Reject retained; now also **bulk** via `moderate_listings` `listingIds[]` + `status`. `AdminDashboardTab` grid supports select-all + an "Approve/Reject selected" bar.
- **RFQ moderation**: per-row status `<Select>` retained; now also **bulk** via `manage_rfqs` `rfqIds[]` + `status` (`RfqManager` multi-select + bulk-apply).
- Both bulk paths use the same service-role `admin_actions` gate (same auth as single-row).

## 7. Operational Data (Phase C)

- `operational_summary` RPC aggregates stats (listings count, inquiries, RFQs, revenue, approvals) for the admin `operational_summary` card on `AdminDashboardTab`.
- Edge function deployed to dashboard route; frontend degrades gracefully on auth error.

## 8. AI Assistant (Phase D)

- Rule engine `src/lib/assistant.ts`: intent matching + stat-aware greeting (uses `operational_summary` stats).
- `AssistantCard` rendered in `Dashboard.tsx` for all roles (behind the Assistant card; replaced the "coming soon" teaser).
- Greeting varies by role (user/premium/pro/admin) and current operational stats.
- Scope = rule-based; finite FAQ intents (plan/billing, listings, RFQ, contact, tips, market prices, admin). Escalates unknown to support contact.

## 9. UI/Plan Metadata

- `PLAN_BENEFITS` / `planBenefits` in `entitlements.ts` drives benefit-checklist rendering.
- `ROLE_STYLES` / `QUICK_ACTIONS` per roleKey drive dashboard hero + quick-action buttons.
- i18n keys live under `dashboard.*` and `assistant.*` (EN+AM). Paywall CTAs reference `dashboard.paywall.*`.

## 10. Branch & Release State

- `stable` refrozen to current `dev` → `e60e713` (== dev tree).
- `main` (Vercel deploy ref) — merged `dev` into `main` (PR #2 closed; `dev` is an ancestor of `main`), resolved toward `dev`. `main` tree == `dev` tree.
- `reserve-main` @ `06468b2` = pre-merge `main` snapshot (rollback net if the RS256-infra removal is ever needed).
- `dev`/`main`/`stable` converge on one tree (`dev`/`stable` = `e60e713`; `main` = `fb42c4b` merge). build + typecheck clean on all.
- **Vercel deploy (resolved)**: `vercel.json` `env` values must be strings. `dev` shipped an object form (`{ "description": … }`) → Vercel schema error `env.VITE_SUPABASE_URL should be string`. Fixed: `env.VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are now string placeholders (`""`). **Real values MUST be supplied via Vercel Project Environment Variables** (do not hardcode secrets in `vercel.json`).
- Migrations: `001`–`010` core; `011` removed (per `dev`; `010` still defines `activate_subscription`). Seeds `009` (now 500/1000) + `20260730000000_seed_real_auth_test_accounts.sql`.

## 11. Known Risks / Open Items

1. **Pricing reconciled** ✅: `TIER_PRICES` = free 0 / premium **500** / pro **1000** ETB (`usePayment.ts`), matching seed `009` (500/1000). Canonical.
2. **Free-tier limits — NOW ENFORCED server-side** ✅ in the RPCs:
   - `create_listing` (`010`): free users capped at **3 active (`approved`) listings**.
   - `submit_rfq` (`rfq_workflow.sql`): free users capped at **3 RFQs/month** (in-code default). Paid = unlimited.
   Both resolve active paid sub via `premium_subscriptions` (`is_active` + `expires_at > now()` + `tier IN ('premium','pro')`).
3. **Chapa `validation.email`** — root cause = seeded `@yebetweg.com` rejected by Chapa `/initialize` (Chapa rejects unverifiable domains). Resolution is test/workflow-level: use a real email or admin-upgrade (see `project_notes`). Verified both branches now build + typecheck clean and the chapa-service code is consistent.
4. **main↔dev reconciled** ✅: merged `dev` into `main` (PR #2), resolving toward `dev` — dropped RS256 signing-key infra (`rs256-key.pem`, `es256-key.pem`, `gotrue_jwk.json`, `signing_keys.json`, `recreate-auth-with-rs256.sh`, `telebirr_mock.py`, migration `011`), adopted `dev`'s `telebirr.ts`/`usePayment.ts`/`vercel.json`/`chapa-webhook`. `main` tree == `dev` tree. `stable` refrozen to `dev`.
5. **Custom-auth anon RLS** — any new "premium-only" table must include an `access_level`/`role` column + joined policy (do not rely on `auth.uid()`); see `20260730000000_fix_custom_auth_access.sql`.
6. **Payment retest** ✅ — dev/main/stable all build + typecheck clean post-convergence.

### Proposed: free-tier caps — IMPLEMENTED (no longer pending)
- **Listings (free)**: `3` active (`approved`) — enforced in `create_listing`.
- **RFQ (free)**: `3`/month — enforced in `submit_rfq` (tunable in-code default).

---
## 12. Pricing (Canonical)

| Tier | ETB |
|---|---|
| free | 0 |
| premium | 500 |
| pro | 1000 |

Source of truth: `TIER_PRICES` in `src/hooks/usePayment.ts` (0/500/1000), reconciled with seed `009` payment rows (500/1000). Earlier specs/docstrings referencing pro=1200/1800 were the drift — now corrected.

---
*Authoritative. `dev`/`main`/`stable` converge on the same tree (`45f6d78`/`89cd192`). Reconcile drift here before shipping C2 (bulk approve/reject).*
