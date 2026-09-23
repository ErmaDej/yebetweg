# YeBetWeg — Project Bible 📖

The single reference document for the product: what it is, why it wins, how every
feature works, how each user tier experiences it, how to run it as an admin, and
how to present it. If code and this doc ever disagree, trust the code and fix this doc.

> **Product in one sentence:** YeBetWeg (የቤት-ወግ, "for home construction") is a bilingual
> (English/አማርኛ) Ethiopian construction decision platform that takes a homeowner or
> contractor from *idea → realistic budget → trusted prices → suppliers & professionals →
> tracking real spend* — all tuned to how construction actually works in Ethiopia.

---

## Table of contents

1. [Why YeBetWeg stands out](#1-why-yebetweg-stands-out)
2. [Architecture at a glance](#2-architecture-at-a-glance)
3. [Feature reference](#3-feature-reference)
4. [User guides by tier](#4-user-guides-by-tier)
5. [Admin operations manual](#5-admin-operations-manual)
6. [Explaining & presenting YeBetWeg](#6-explaining--presenting-yebetweg)
7. [Data & security model](#7-data--security-model)
8. [Operations pointers](#8-operations-pointers)
9. [Known limitations & roadmap](#9-known-limitations--roadmap)

---

## 1. Why YeBetWeg stands out

Ethiopian home builders face the same three failures: budgets built on guesses
("my neighbor said cement was 900 birr"), prices found via word-of-mouth that are
stale or city-irrelevant, and no way to compare suppliers except walking shop to shop.
Existing tools are either generic international calculators with US materials or
Facebook groups with zero trust model. YeBetWeg's edge:

| Differentiator | What it means | Why competitors don't have it |
|---|---|---|
| **Live, city-specific market prices with freshness flags** | Prices come from a supplier funnel (Telegram) + admin verification, tagged with city and freshness — every row answers "how old is this price?" | Facebook/Telegram groups have no structure, no verification, no freshness discipline |
| **Multi-city BOQ estimator grounded in real prices** | Estimate cement/steel/aggregate/finishing quantities for 7 Ethiopian cities using the same market_prices table buyers see — one source of truth | International calculators use dollar costs and foreign material classes; local spreadsheets go stale |
| **Estimate → actuals feedback loop** | Log what you *really* spent per category; the platform computes variance so your next estimate starts from reality, not hope | Nobody closes this loop — estimates are made once and forgotten |
| **Trust pipeline for crowdsourced prices** | Supplier Telegram submissions land in an admin verification queue before becoming public data — quality is curated, not scraped | Aggregators either trust everything or nothing |
| **Bilingual by design** | Every surface — UI, assistant, reports, error messages — works in English and አማርኛ with an audited translation key set | Most local tools are Amharic-only or English-only |
| **Works offline-first** | A PWA with a service worker: load the app once on a site with bad connectivity and navigation still works, with a proper offline page | Web competitors die on the building site |
| **Honest labeling policy** | Every placeholder/illustrative number in the UI is explicitly marked "illustrative"; live counts are real DB counts | Competitors inflate; we built an honesty pass into the codebase |

**Positioning line for stakeholders:** *YeBetWeg is the "Zillow + HomeAdvisor + local price
index" for Ethiopian construction — estimate, compare, quote, and build with local
intelligence.*

---

## 2. Architecture at a glance

```
┌───────────────────────────  Frontend (this repo)  ───────────────────────────┐
│  React 18 + TypeScript + Vite          │  Bilingual i18n (src/lib/i18n.tsx) │
│  TanStack Query (server state)         │  Tailwind + shadcn/ui + recharts   │
│  React Router (/, /dashboard, /search, │  PWA: public/sw.js + offline.html  │
│           /boq/:token, /notifications, │  SEO: sitemap generated at build   │
│           /auth/callback, …)           │                                    │
└───────────────┬──────────────────────────────────────────────────────────────┘
                │ Supabase JS (anon key) — all reads/writes pass RLS
┌───────────────▼──────────────────────────────────────────────────────────────┐
│  Supabase (Postgres + Auth-less custom auth + RLS + pg_cron)                  │
│  • Custom DB auth: users table (crypt/gen_salt); app sessions are anon to    │
│    Supabase → entitlement flows through access_level/role joins, not auth.uid│
│  • RLS on every table; SECURITY DEFINER RPCs for quota-guarded actions       │
│  • pg_cron: nightly refresh_market_price_freshness (yebetweg-refresh-v2)     │
└───────┬──────────────────────────────┬───────────────────────────────────────┘
        │ Edge Functions               │
┌───────▼────────┐ ┌──────────────┐ ┌──▼──────────────┐ ┌───────────────────┐
│ chapa-service  │ │ chapa-webhook│ │ freshness_cron  │ │ telegram-webhook  │
│ (payment init) │ │ (activates   │ │ (stale flags +  │ │ (supplier funnel: │
│                │ │  subs+email) │ │  admin alerts)  │ │ /submitprice etc.)│
└────────────────┘ └──────────────┘ └─────────────────┘ └───────────────────┘
        │
┌───────▼───────────────┐   ┌───────────────────────────────────────────────┐
│ Resend (transactional │   │ Chapa (Ethiopian payment gateway: Telebirr/   │
│ email + notifications)│   │ CBE Birr/cards) — webhook activates tiers     │
└───────────────────────┘   └───────────────────────────────────────────────┘
```

**Key tables:** `users`, `blogs`, `tips`, `listings`, `professionals`, `market_prices`,
`rfq_requests`, `boq_estimates`, `boq_actuals`, `premium_subscriptions`, `payments`,
`notifications`, `freshness_alerts`, `saved_collections`. Full rules: `memory/core/business_rules.md`.

**Canonical tiers & pricing:** free **0** / premium **500 ETB / 30 days** / pro **1000 ETB / 30 days** (Chapa checkout; subscriptions activate only when Chapa's webhook confirms — never on client say-so).

---

## 3. Feature reference

### 3.1 Knowledge Hub (blogs + tips)
- **What:** curated construction articles (blogs) and short practical tips; premium-tagged tips are blurred for free users with an unlock CTA.
- **How it works:** `BlogSection`/`TipsSection` read `blogs`/`tips`; gating is `is_premium` + the user's plan. Category filter chips are real buttons (keyboard-operable, `aria-pressed`).
- **Why it matters:** content is the top-of-funnel — it earns trust before anyone pays.

### 3.2 Market Prices
- **What:** the live price index — material, unit, price, city, and a **freshness badge** (fresh / aging / stale, computed nightly by pg_cron).
- **Free tier:** first 5 rows visible; the rest blurred with an upgrade CTA. Premium/pro see everything.
- **Trust detail:** rows expose `access_level` (free vs premium) and `price_date`; stale prices are visibly flagged rather than hidden — *we show the age, not just the number*.

### 3.3 Multi-city BOQ estimator ("BOQ Lite")
- **What:** pick city + project type + area (m²) → estimated quantities and cost breakdown for cement, steel, aggregate, finishing.
- **How it works:** `useCityBoq` sources unit prices from `market_prices` (replacing the old flat multipliers); where a city has no data yet, rows are labeled **"est."** honestly and fall back to Addis-based ratios.
- **Outputs:** per-material breakdown, total, and — for signed-in users — **Save estimate** (persists to `boq_estimates` with the canonical city).

### 3.4 BOQ → actuals (spend tracking)
- **What:** per saved estimate, log real spending by category (structure / material / labor / overhead / other) with date and note.
- **Math:** the panel shows actual total, **variance % vs estimate** (green under / amber over), a **last-6-months spend bar chart**, and a **category donut**.
- **Why it matters:** the platform's compounding value — each project makes the next estimate smarter.

### 3.5 Pro export & share permalinks
- **Print report (premium+):** a branded print-ready report from any saved estimate — cover sheet, sectioned costs, per-material breakdown with live/est. tags, actuals + variance when logged, disclaimer. Opens a print window → Save as PDF.
- **CSV (premium+):** spreadsheet export of the same rows.
- **Share permalink (any signed-in user):** generate/rotate a secret token per estimate → public read-only page at `/boq/:token` (e.g. to show a contractor). Rotating invalidates the old link instantly.

### 3.6 Marketplace (listings)
- **What:** materials, properties, equipment from sellers and suppliers.
- **Tiers:** anyone can browse; **free accounts can create up to 3 active listings**; contacting a seller (inquiry modal) requires premium+.
- **Flow:** create → status `pending` → admin approves → public.

### 3.7 RFQ (request for quote)
- **What:** structured quote requests to suppliers/professionals.
- **Quota:** free = 3 RFQs/month (enforced server-side by the `submit_rfq` RPC, which also **rejects anonymous sessions**); premium+ unlimited. Admin monitors incoming RFQs.
- **Assistant drafting:** tell the assistant *"draft a new rfq"* → 3-question flow (material → city → optional budget) → RFQ modal opens **pre-filled**.

### 3.8 AI-style Assistant (in-app, not an LLM)
- **What:** a bilingual rule-based advisor with scored keyword matching (typo-tolerant) covering: BOQ, market prices, actuals, exports, RFQ, notifications, Telegram submissions, freshness/trust, and a capabilities menu. Answers include **follow-up suggestion chips** and adapt to your real data (saved estimates, unread notifications).
- **Design choice:** deterministic and instant — no hallucinated prices ever. It routes, explains, and drafts; it never invents market data.

### 3.9 Notifications
- **In-app:** navbar bell with unread badge + full `/notifications` page (filter by type, mark read). Delivered instantly for price submissions and RFQ events.
- **Email:** Resend powers receipts, notifications, and stale-price alerts to admins.

### 3.10 Telegram supplier funnel
- **Suppliers** message the bot **without an app or login**: `/start` → help card (EN+AM), `/submitprice` → guided price entry → lands in the admin **verification queue** + in-app notification.
- **Community commands:** `/watch` (weekly Cement & Rebar Watch: top movers), `/prices`, `/help`.
- **Why Telegram:** it's where Ethiopian suppliers already are — zero-install data collection, quality-controlled on our side.

### 3.11 Freshness automation
- **Nightly pg_cron** refreshes freshness flags; `freshness_cron` edge function flags expired prices, records `freshness_alerts`, and notifies admins (email + in-app). Protected by `CRON_SECRET`.

### 3.12 Saved collections
- **What:** bookmark any article/tip/listing/price; organize into named collections (e.g. "Kitchen") from the dashboard — a Houzz-style inspiration board for your build. Client-persisted, backward compatible.

### 3.13 Payments (Chapa)
- **Flow:** choose tier → Chapa checkout (Telebirr, CBE Birr, cards) → `chapa-webhook` confirms → subscription row flips to `is_active:true` → tier benefits unlock instantly; receipt emailed.
- **Sep 2026 hardening:** a Vercel routing bug (explicit rewrites dropped the SPA fallback) made `/payment/success` 404 at the edge, so activation never ran and paid users stayed "free". Fixed rewrites; `activate_subscription` is now **idempotent** (return page + webhook races converge safely) and writes a `subscription_payments` ledger row that powers revenue reporting; the success page retries once on failure; stuck payments can be healed by admins in Revenue Monitoring.

### 3.14 Platform qualities
- **PWA/offline:** service worker caches the shell; dead navigations serve `public/offline.html`.
- **SEO:** per-page titles/descriptions, `sitemap.xml` regenerated on every build, semantic landmarks, skip-to-content.
- **Accessibility (Phase 4):** keyboard-operable chips, live regions on the assistant log and notification badge, labeled icon buttons, visible mobile tab labels, reduced-motion support for every animation, confirmation dialogs on all destructive admin actions.

### 3.15 Tip Q&A community threads
- **What:** every construction tip carries a StackOverflow-style Q&A thread. Signed-in members ask questions; anyone signed-in answers; premium answerers get an "Expert answer" badge; the asker can delete their own questions, admins can moderate everything.
- **How it works:** `tipsSection` renders a question-count teaser on each card; clicking opens a **scrollable modal dialog** (sticky ask form, newest-question auto-scroll). Data lives in `tip_questions`/`tip_answers` with RLS; writes go through `ask_tip_question` / `answer_tip_question` RPCs. **Supabase Realtime** pushes new questions/answers into open threads live — no reload. The `useTipQa` hook owns one subscription per card.
- **Abuse defenses (server-side, cannot be bypassed):** per-user caps (5 questions/hour, 15/day; 10 answers/hour, 40/day), duplicate-question rejection, ≥3-links and URL-shortener blocking, ALL-CAPS shouting filter, minimum lengths. Every deletion (owner, admin, or service) is recorded in `moderation_log` with a content snapshot — reviewable by admins.
- **Moderation surface:** Admin → Tip Q&A Moderation (browse, search, delete with confirmation dialog).
- **Admin awareness:** a DB trigger notifies every active admin in-app the moment a question lands (`tip_qa` notification type — bell + `/notifications` page). A daily **email digest** (`tip-qa-digest` edge function, pg_cron 06:30 UTC) summarizes unread tip Q&A notifications via Resend so moderation never depends on remembering to check the dashboard.

### 3.16 Admin revenue monitoring & tax-ready reporting
- **What:** Admin → Revenue Monitoring & Reports: this-month / last-30-days / all-time revenue KPIs, active-subscriber MRR at canonical pricing (premium 500 / pro 1000 ETB), a 12-month revenue bar chart, per-tier split, and a searchable, date-ranged **payment ledger**.
- **Export:** one-click **CSV export** (RFC 4180-escaped) with explicit `amount_etb`, `currency`, `vat_rate`, `vat_etb`, `gross_etb`, payer identity and status columns — laid out so a tax authority or accountant can consume it directly.
- **Reconciliation:** pending subscriptions surface with an "Activate" action backed by the `admin_activate_subscription` RPC (admin-gated, audited) — this heals payments that succeeded at Chapa but whose activation failed (see the 3.13 payment-fix note).

### 3.17 Media reliability & performance
- All showcase imagery is **self-hosted** (`public/images/`) — no third-party hotlink failures. The hero renders a 17KB WebP logo (down from a 1.5MB PNG), videos use real first-frame posters with `preload="metadata"`, and the favicon is a WebP. Anchor navigation (`/#premium` etc.) re-corrects after layout shift and yields to the user's first scroll.

---

---

## 4. User guides by tier

### 4.1 Visitor (not signed in)
Browse blogs, free tips, the first 5 market-price rows, listings, and professionals.
Run the estimator (results labeled "est."). Use the assistant. Everything else
(saving, contact, RFQ) surfaces a friendly sign-in/upgrade prompt.

### 4.2 Free account ("user")
**Can:** save BOQ estimates; track actuals; share estimates via permalink; create up to 3 active listings; send 3 RFQs per month; bookmark + collections; receive notifications.
**Limits (all explained in-UI, enforced server-side):** 5 price rows, premium tips blurred, no seller/professional contact, no print/CSV export.
**Upgrade path:** `/#premium` → tier comparison → Chapa checkout.

### 4.3 Premium (500 ETB / 30 days)
Everything free, plus: **all market-price rows**, **all premium tips**, **contact any seller/professional** (inquiry modal), **unlimited RFQs**, **BOQ print report + CSV export**, priority placement signals, premium badge.

### 4.4 Pro (1000 ETB / 30 days)
Everything premium, plus: **multi-city price analytics** (compare cities for procurement), all pro analytics surfaces, unlimited everything, priority RFQ handling, dedicated support line. Aimed at contractors, engineers, and material suppliers who buy across cities.

### 4.5 Supplier (Telegram-only — never touches the web app)
1. Open the YeBetWeg bot → `/start` (bilingual help).
2. `/submitprice` → follow the prompts (material, unit, price, city, shop name).
3. Submission lands in the admin queue; once verified it appears publicly with freshness tracking.
4. Optional: `/watch` weekly for cement & rebar movers; `/prices` anytime.
Full guide: `docs/SUPPLIER_TELEGRAM_GUIDE.md`.

### 4.6 Admin
Full moderation + monitoring powers (next section) in the dashboard's Admin tab.

---

## 5. Admin operations manual

### 5.1 Where things live
Sign in as an admin account → **Dashboard → Admin tab**. Sections cover content
(blogs/tips/ads), marketplace approvals, **Telegram price verification queue**,
market-price management (create/edit/delete with freshness), user management
(role changes, suspend/ban — all behind confirmation dialogs), and platform stats.

### 5.2 Daily routine (≈10 min)
1. **Bell + `/notifications`**: check overnight `price_submission` and `rfq` events.
2. **Telegram verification queue**: verify or reject submitted prices (rejections are dialog-confirmed; submitters are notified). Verified prices go live immediately.
3. **Freshness alerts**: open stale-price alerts → contact the source supplier via Telegram or update the price from Market Price Manager. Stale rows are visible to users — clearing them protects trust.
4. **Marketplace approvals**: approve/reject pending listings (reject with reason).

### 5.3 Weekly routine
- Send/trigger the **weekly Cement & Rebar Watch** (`/watch` in Telegram) — note top movers for the community.
- Review **RFQ volume** and response times; nudge unresponsive suppliers.
- Scan content: publish at least one blog/tip; keep 2–3 premium tips in rotation.
- Skim `verify:deploy` output (or run it after any deploy).

### 5.4 Monitoring & health
| What | Where | Healthy looks like |
|---|---|---|
| Migration/cron/webhook/quota checks | `npm run verify:deploy` (local, hits prod) | checks 1,2,3,6,7,8 PASS |
| Nightly freshness job | Supabase Dashboard → Database → Cron | `yebetweg-refresh-freshness-v2` active, recent successful run |
| Edge function logs | Supabase Dashboard → Edge Functions → (function) → Logs | no 5xx bursts; cron returns 204/200 |
| Payment activations | Supabase → Table `payments`/`premium_subscriptions` | `pending` rows resolve to `active` within minutes |
| Traffic | Vercel Analytics | steady; investigate spikes for abuse |
| User incidents | Admin → User Management | suspend/ban only with confirmation dialog |

### 5.5 Admin golden rules
- **Never** edit a price without a `price_date` — freshness is the product's core promise.
- Verify Telegram submissions only when plausible (sanity-check price vs city norm); a wrong verified price damages more trust than a delayed one.
- Destructive actions (content delete, user ban, price delete) always ask for confirmation — don't bypass.
- Two admin accounts exist as seeds; keep at least two active admins.

---

## 6. Explaining & presenting YeBetWeg

### 6.1 The 30-second pitch
> "Ethiopian home builders guess their budgets — cement prices differ by city and week, and there's no trusted place to check. YeBetWeg is a bilingual platform with live, verified, freshness-flagged market prices, a multi-city cost estimator grounded in those real prices, and a supplier funnel over Telegram. Estimate, compare, quote, and track what you actually spent — before you build."

### 6.2 The 2-minute stakeholder walkthrough
1. **Problem:** budget surprises kill Ethiopian home projects; info lives in WhatsApp groups with zero trust.
2. **Solution loop:** *prices → estimate → quotes → actuals* — each stage feeds the next (show the homepage sections in order; it's the same order as the loop).
3. **Data moat:** suppliers submit prices over Telegram in 30 seconds (show `docs/SUPPLIER_TELEGRAM_GUIDE.md`); our admin queue curates quality; freshness flags keep it honest. Crowdsourced data + curation = a price index competitors can't scrape.
4. **Business model:** free tier (teaser) → premium 500 ETB (full data + contact + exports) → pro 1000 ETB (multi-city procurement analytics for businesses). Chapa-native payments.
5. **Traction hooks:** supplier funnel already wired, weekly watch builds habit, actuals loop compounds data quality with every user.

### 6.3 Live demo script (15 min, seeded accounts)
Sign-in seeds (dev): admin `admin1@yebetweg.com` / `Admin123` · premium `premium@yebetweg.com` / `Premium123!` · pro `pro@yebetweg.com` / `Pro123!`.

| Min | Do | Say |
|---|---|---|
| 0–1 | Homepage (EN) → toggle አማርኛ | "Fully bilingual, built for how Ethiopia builds." |
| 1–3 | Market Prices as visitor | "5 free rows, everything flagged with freshness — note the badges." |
| 3–5 | Sign in premium → prices unlock; blur lifts on a tip | "500 birr unlocks the full index and contacts." |
| 5–7 | BOQ Lite: city=Hawassa, area=180 → breakdown | "Prices come from the same table buyers see — one source of truth." Save it. |
| 7–9 | Dashboard → saved estimate → Print | "A print-ready BOQ report for the contractor — or share the link." Show `/boq/:token` in a new tab. |
| 9–11 | Log an actual (Materials 250k) → variance chip + charts | "The loop closes: next year's estimate starts from reality." |
| 11–13 | Assistant: "draft a new rfq" → walk 3 questions → modal pre-fills | "The assistant routes and drafts; it never invents prices." |
| 13–14 | Telegram: `/submitprice` on the bot → admin queue appears | "Suppliers need no app — 30 seconds in Telegram." |
| 14–15 | Admin tab: verify the submission; open User Management | "Curation is manual-by-design at our scale; automation flags what needs me." |

### 6.4 Rookie FAQ
- **Is the AI assistant ChatGPT?** No — it's a fast, deterministic advisor: it routes, explains, and drafts RFQs. Market numbers always come from the database, never generated.
- **Where do prices come from?** Verified supplier submissions (Telegram funnel + admin direct entry). Each carries a date and freshness flag.
- **Why do some estimate rows say "est."?** Honest labeling: that city has no verified price for that material yet, so we fall back to Addis ratios and say so.
- **What stops fake prices?** Nothing is auto-published: every submission lands in an admin queue; staleness is computed nightly and flagged publicly.
- **Is payment safe?** Checkout is Chapa (Telebirr/CBE Birr/cards). We never touch card data; subscriptions activate only on Chapa's webhook confirmation.
- **What if my internet drops on site?** The app is a PWA — it keeps working offline for navigation, with a clear offline page.

---

## 7. Data & security model

- **Auth:** custom DB auth (`users` with `crypt`); app sessions present as `anon` to Supabase, so **RLS is built on access-level/role joins, not `auth.uid()`**. Consequence: every table's policies must be audited for role checks — a tradition of `audit:rls` exists for exactly this.
- **RLS:** default-deny everywhere; premium gating (price rows, tips) is enforced in policies, not just UI. Anonymous sessions cannot create RFQs (`submit_rfq` rejects anon) — caps are enforced server-side in SECURITY DEFINER RPCs (`submit_rfq`, `create_listing`).
- **Secrets:** edge-function secrets (`CHAPA_*`, `RESEND_API_KEY`, `CRON_SECRET`, `TELEGRAM_*`, service role) live only in Supabase; the frontend ships the anon key by design. Historical leaks were rotated — see `docs/VERCEL_LAUNCH_CHECKLIST.md` §0.
- **Probes:** `scripts/probe-rls.js` (anonymous privilege audit) and `npm run verify:deploy` (deployment checks incl. quota RPCs) guard against regressions of the Sep-2026 privilege bug class.

---

## 8. Operations pointers

| Topic | Document |
|---|---|
| Edge functions: secrets, webhook registration, cron, verification | `docs/EDGE_FUNCTIONS_RUNBOOK.md` |
| Vercel launch: env vars, domain, analytics, smoke tests | `docs/VERCEL_LAUNCH_CHECKLIST.md` |
| Supplier onboarding (user-facing, bilingual) | `docs/SUPPLIER_TELEGRAM_GUIDE.md` |
| Business rules source of truth | `memory/core/business_rules.md` |
| Development status | `DEVELOPMENT_PLAN.md`, `memory/status/progress_tracker.md` |

Local commands: `npm run dev` · `npm run build` (typecheck+build+sitemap) · `npm test` · `npm run verify:deploy` · `npm run audit:rls` · `npm run audit:i18n` · `npm run probe:rls`.

**CI:** GitHub Actions (`.github/workflows/ci.yml`) runs `npm run typecheck` + `npm test` on every push/PR — broken commits fail CI before Vercel ever builds them. Tests run with inert Supabase env dummies (`tests/setup.env.ts`), so no secrets are needed in CI.

---

## 9. Known limitations & roadmap

**Honest limitations (as of Sep 2026):**
- Non-Addis cities have thin price coverage → estimator rows fall back to "est." ratios until suppliers in those cities join the funnel (this is the growth flywheel: more suppliers → tighter estimates).
- The assistant is rule-based — broad but not conversational; it won't handle free-form chat.
- Save-collections and saved items are client-persisted (localStorage) — they don't roam between devices yet.
- Weekly Telegram watch is still admin-triggered (`/watch`); the tip Q&A admin digest IS automated (daily 06:30 UTC email).

**Roadmap candidates:** Pro analytics dashboards (city comparisons, price history charts), auto-scheduled Telegram digest, server-side roaming for saved items, Telebirr direct checkout, supplier rating/reputation on verified submissions, SMS notifications for non-smartphone users.
