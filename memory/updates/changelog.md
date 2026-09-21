# YeBetWeg Changelog

## Branch Convention
- `stable` — tagged snapshot of the latest working state (created from `dev` at `4612af6`, pushed to `origin/stable`, Aug 1 2026)
- `dev` — active development branch; all forward work happens here
- `feature/*` — short-lived feature branches merged back into `dev`
- `main` — previously used as deploy branch; now slightly behind `dev` (kept for Vercel reference)

## Current Scope
### In Scope
- BOQ Lite
- Market Price Intelligence
- RFQ Workflow
- Verified Professionals
- Admin CRUD and moderation workflows
- Site Log Lite
- A stronger dashboard experience for all major user roles
- Payment integration: Chapa + Telebirr subscription payments

### Deferred or Post-MVP
- social logins
- image upload via Supabase Storage
- favorites and wishlist
- appointment booking and invoicing
- PWA or native app work

## Changelog
### September 21, 2026 — Phase 5 build-out: Pro export, BOQ→actuals, assistant intelligence

- **BOQ→actuals**: new `boq_actuals` ledger (migration `20260921000000`, RLS mirrors boq_estimates) + `useBoqActuals` hook (per-estimate summaries, variance math) + `BoqActualsPanel` on the dashboard — log real spend per category (structure/material/labor/overhead/other) with date + note, see over/under % vs the estimate.
- **Pro export**: `src/lib/boq-export.ts` — one `buildReportRows` source feeding both a CSV (actuals + variance included) and a print-ready branded HTML report (cover sheet, sections, variance line) via `openPrintWindow`. Gated `premium`+ (`canExportBoq`); free users get a bilingual toast + redirect to /#premium. Dashboard estimate rows now have Print / CSV / Delete actions with variance chips.
- **Assistant intelligence**: rewritten `src/lib/assistant.ts` — scored keyword matching (exact=2, phrase=2, typo≤1 edit=1) replaces first-match-wins; **6 new intents** (actuals, export, notifications, telegram, freshness, help); follow-up suggestion chips on answers + greeting; context now includes saved estimates / logged actuals / unread notifications. `AssistantCard` renders suggestions; greeting adapts to BOQ data.
- **verify-deployment fix**: `args.postTest` → `arg.postTest` (ReferenceError crash on the `--post-test` path found by the owner's run).
- **AssistantCard subtitle** honesty fix in i18n (EN+AM): "AI guidance coming soon" → describes the actual rule-based assistant.
- Tests: +13 (assistant scoring/typo/new intents/suggestions, boq-export rows/CSV/print/gating) → **95/95**; typecheck, build, audit:i18n, audit:rls all green. Verified live in preview: estimate save (201), dashboard card + actuals panel render, assistant answers, export buttons on premium plan.

### September 20, 2026 (3) — pg_cron enablement, deploy verifier, a11y + confirm-dialog sweep
- **`20260920020000_enable_pg_cron_and_freshness_schedule.sql`**: enables pg_cron in the `extensions` schema (hosted projects ship without it — the owner's `schema "cron" does not exist` error) and schedules the daily 02:00 UTC DB-side freshness flagging as `yebetweg-refresh-freshness-v2`. Owner applied it — cron now live.
- **`npm run verify:deploy`** (`scripts/verify-deployment.js`): automates the runbook §6 matrix — migrations, freshness_cron guard (204 without key / 200+ok with key), telegram-webhook guard, webhook registration + chat reachability, notifications RLS (anon + signed-in), optional `--post-test` chat delivery. PASS/FAIL/SKIP per check, exit 1 on failure. Currently flags the deployed freshness_cron as pre-guard (redeploy pending).
- **Phase 4 accessibility + confirm-dialog sweep**: shared `ConfirmActionDialog` replaces all fire-immediately destructive ops (admin content delete, user ban/suspend in both admin surfaces, telegram price reject, BOQ estimate delete — the last also upgraded from native `window.confirm`); extended `prefers-reduced-motion` to marquee/typewriter/float/neon/shimmer (typewriter reveals full text instead of hiding it); `--muted-ink` token for skeleton shimmer; aria-labels on the search-clear and filter-close icon buttons. Skip-link, mobile search, and landmarks were verified already present.
- Verified live in preview: accessible names render (Skip to content / Toggle theme / Notifications / Menu / Save to project), zero failed same-origin resources on the homepage, typecheck ✓ · 82/82 tests ✓ · build ✓ · audit:i18n ✓ · audit:rls ✓.
### September 20, 2026 (2) — notifications page, telegram verification queue, supplier guide
- **`/notifications` page** (route + `NotificationsPage.tsx`): beyond the bell dropdown — filter pills (All/Unread/Price submissions/Stale prices/RFQs/Other), unread section with per-item mark-read + Open deep links, dimmed read-history section, bilingual skeletons/empty/error. Bell header gains a "Go to dashboard"-style link to the page. **Fixed a real runtime bug the preview caught:** two `useNotifications` consumers sharing one realtime channel name threw `cannot add postgres_changes callbacks after subscribe()` — channel is now per-instance via `useId()`.
- **Admin Telegram verification queue** (`TelegramPriceQueue.tsx`, in AdminDashboardTab): lists `market_prices` rows with `source_type='telegram_observed' AND freshness_status='community_reported'` (exactly what /submitprice inserts and what price_submission notifications reference via `meta.price_id`); Verify promotes to `admin_verified/verified@90`, Reject expires the row — through the existing hardened `manage_market_prices` admin RPC. Bilingual, with loading/empty/error states.
- **Supplier guide** (`docs/SUPPLIER_TELEGRAM_GUIDE.md`): bilingual /submitprice onboarding — formats, what happens after (review queue, verification, source attribution), fair-play table (real prices, no spam/5-per-hour, admin moderation), pending-verification explainer, FAQ.
- telegram-webhook `price_submission` notifications now carry `meta.price_id` linking notifications to queue rows.
- Live: migrations applied by owner — `GET /rest/v1/notifications` 200 with RLS-filtered rows; probe:rls exit 0. Verified: typecheck ✓ · 82/82 tests ✓ · build ✓ · audit:i18n ✓.
- **In-app notifications** (`20260920000000_notifications_in_app.sql` + `useNotifications` + `NotificationBell`): alongside the email digests, a realtime `notifications` table powers a navbar bell (unread badge, mark-one/all read, deep links). RLS follows the audited role-split pattern — own rows via `users.auth_uid` EXISTS subquery, admins see all, anon nothing; writes are service_role only; `mark_notifications_read` is invoker-rights so RLS governs the UPDATE. `freshness_cron` inserts a `stale_prices` notification per admin (email stays the async digest) and prunes via `prune_notifications`; `telegram-webhook` inserts `price_submission` notifications so admins see community prices instantly. 8 new EN/AM i18n keys, parity-checked. Verified live: bell renders, and with the migration still pending it degrades to the error state (not a crash) — goes green once applied.
- **Dead image repair** (`20260920010000_replace_dead_unsplash_images.sql`): live probe of all 58 seeded Unsplash URLs found 33 now 404. Migration swaps them for four new themed local SVGs (`blog-construction`, `listing-default`, `ad-banner`, `professional-portfolio`) via order-preserving array remapping; two dead URLs in `AdsSection` fallbacks fixed in code; `isImageUrlValid` extended to accept same-origin relative paths (tests still green). Future-proof: local assets can't 404 from upstream churn.
- **Phase 4 systematic sweep**: new `npm run audit:i18n` (`scripts/audit-i18n.js`) — static audit of all 207 translation keys (used-but-undeclared, declared-but-dead, AM-identical-to-EN, truncation smells); audit is clean (5 short-AM flags are legitimate compact Amharic). Error-triad gap closed: Blog/Tips/MarketPrices sections previously had skeleton+empty but no error UI — all three now show bilingual error states with retry.
- **Deployment runbook** (`docs/EDGE_FUNCTIONS_RUNBOOK.md`): CLI link, both migration paths (db push vs SQL editor), function deploy with `--no-verify-jwt`, all seven secrets, Telegram setWebhook curl, weekly Mon-06:00-UTC pg_cron trigger for the digest, 8-step verification matrix, rotate/teardown.
- Verified: audit:i18n ✓ · audit:rls ✓ (33 migrations) · typecheck ✓ · 82/82 tests ✓ · build ✓.
### September 19, 2026 — Phase 4/5: freshness automation, Telegram supplier funnel, multi-city BOQ, honesty pass
- **Freshness automation** (`20260919010000_freshness_automation.sql` + `supabase/functions/freshness_cron`): migration moves RPC revokes into transactional `DO` blocks (fixing the pgTAP-style bare-revoke abort risk) and adds idempotent pg_cron wiring — `refresh_market_price_freshness()` daily 02:00 UTC via `cron.schedule('yebetweg-refresh-freshness', …)`. New scheduled edge function `freshness_cron` (auth via `Authorization: Bearer $SUPABASE_ANON_KEY` + `x-cron-key` header vs `CRON_SECRET`; GET health, other verbs 405) calls `refresh_market_price_freshness` service-side, queries stale prices (flagged or >7d unverified) and emails each admin (`users.role='admin'` with email) a per-city digest via Resend; dedupes within 24h in `freshness_alert_state`, sets `admin_alert_email_sent_at` per admin on success. Deploy: `supabase functions deploy freshness_cron --no-verify-jwt`, set `CRON_SECRET` + `RESEND_API_KEY` + `APP_URL` secrets, schedule weekly Mon 06:00 UTC via dashboard trigger `https://<ref>.supabase.co/functions/v1/freshness_cron`.
- **Telegram /submitprice supplier funnel** (`supabase/functions/telegram-webhook`): HMAC-SHA256 `X-Telegram-Bot-Api-Secret-Token` verification (`TELEGRAM_WEBHOOK_SECRET`); `/start` help, `/submitprice City | Material | Price [unit]` parses flexibly (comma/pipe separators, commas in numbers, common units incl. quintal/ኪሎ), fuzzy city aliases via shared `supabase/functions/_shared/cities.ts`, prices normalized to `market_prices` units via shared `supabase/functions/_shared/units.ts`; inserts `market_prices` row with `source_type='telegram'`, `freshness_status='fresh'`, `confidence_score=0.5`, city → canonical `city_name` map; replies with pending-review notice (existing admin workflow covers moderation). Weekly cement/rebar watch generation is scheduled (Mon 06:00 UTC trigger): latest fresh cement+rebar price per city, 7-day delta vs a week ago, top movers — delivered as Telegram message to `TELEGRAM_CHAT_ID` and email digest to admins.
- **Multi-city BOQ pricing** (`src/hooks/useCityMultipliers.ts` rewritten): flat static `cityMultipliers` replaced by live multipliers derived from `market_prices` — per-city class-weighted baskets (cement 35% / steel 30% / aggregate 15% / finishing 20%), ratio vs Addis basket, blended 60/40 with fresh per-material cross-city ratios for priority materials (cement/derba/mugher/rebar/sand/aggregate/HCB/paint/eucalyptus), clamped ±20%. `BoqLiteSection` renders an indicative per-material breakdown (live vs est. tags) sourced from real market_prices, split EN/AM labels, included in CSV export; `isLiveCityPricing` badge still shown.
- **Honesty pass**: ProfessionalsSection "Responds within 24h" → evidence-based phrasing; VideoShowcaseSection autoplay already user-consent-gated (verified honest); TipsSection verified — ticker counts are real DB rows.
- Verified: audit:rls ✓ (32 migrations) · typecheck ✓ · 82/82 tests ✓ · build ✓.
- **RLS privilege audit** (`scripts/audit-rls-privileges.js`, `npm run audit:rls`): statement-ordered replay of all migrations tracking CREATE FUNCTION + GRANT/REVOKE EXECUTE and CREATE/DROP POLICY (incl. DO-block drop-alls); flags any final policy whose expression calls a function one of its policy roles cannot EXECUTE (the exact 42501 bug class caught live 2026-09-19). Validated both directions on synthetic migrations (bug case → exit 1, role-split fix case → exit 0); repo audits clean. Known limitation: heuristic parser — findings say "COULD fail", verify manually.
- **Paid-session grant probes** (extended `scripts/probe-rls.js`): optional `PROBE_PAID_EMAIL`/`PROBE_PAID_PASSWORD` (env or `.env`) signs in a real entitled account and asserts premium market_prices/tips rows are GRANTED (the positive side of the gate the anon probes can't prove), free rows still visible, with get_active_subscription-based diagnosis on failure. Skips cleanly when unset. Live run: anon surface fully green after the role-split fix was applied by the owner.
- **Secret scrub completed** — `scripts/test-supabase-connection.js` AND `scripts/run-migrations-client.js` (same service_role JWT in both, tracked in git) now resolve credentials env-first (flags → env → .env files); the connection checker defaults to the anon key (warns loudly when service_role is used) and the migration runner refuses to run with an anon key and no longer exits 0 on statement errors. NOTE: the JWT remains in git history until the deferred purge — rotation (owner action) is still the real fix.
- Verified: typecheck ✓ · tests 82/82 ✓ · build ✓ · probe:rls exit 0 · audit:rls exit 0

### September 19, 2026 — Fix anon RLS regression caught live by the probe
- **Regression + hotfix migration** (`20260919000000_fix_entitlement_policy_function_privilege.sql`): after applying `20260918000000` in the live project, `npm run probe:rls` proved EVERY anon table read on market_prices/tips failed with `42501 permission denied for function user_has_premium_entitlement` — including baseline free rows (logged-out visitors would have seen an empty marketplace). Root cause: RLS policy expressions are privilege-checked as the querying role, and the policies were `TO anon, authenticated` while the helper's EXECUTE had been revoked from anon; the Sep 18 run's premium-gate "passes" were denials-by-error, not correct filtering. Fix: role-split policies — anon gets a pure free-row predicate (no function call; anon can never be entitled), authenticated keeps the entitlement policy (helper re-granted to authenticated). Probe hardened at the same time: denials on free-class table probes now FAIL the run instead of passing, free baselines and the `get_visible_*` RPC client read-paths are asserted, and blocking probes require a clean empty result. Checklist updated (31 migrations, probe pass rules, baseline SQL).

### September 18, 2026 — Offline PWA fallback + RLS entitlement fix for market_prices/tips
- **Service worker v3** (`public/sw.js`): offline-first strategy for intermittent connectivity — app-shell precache (individual requests so one missing icon can't break install), network-first navigations with `offline.html` fallback (new `public/offline.html`, EN/አማርኛ toggle), cache-first static assets, stale-while-revalidate for cross-origin CDN images, Supabase API traffic always network-only.
- **RLS entitlement fix** (`20260918000000_market_prices_tips_entitlement_rls.sql`): live-probed that anon sessions could read premium-gated market_prices rows via PostgREST (legacy permissive policies OR-combine past the `get_visible_*` RPC gates). Replaced ALL SELECT policies on market_prices AND tips (same hole: `001`'s `"Public can read free tips" USING(true)` on tips) with one entitlement policy per table; shared `user_has_premium_entitlement()` helper (role OR active subscription — matches `lib/entitlements.ts` incl. `users.status` and `starts_at`/`expires_at`); aligned both `get_visible_*` RPCs to the same predicate (they previously ignored status/starts_at).
- **Supabase mock helper + hook tests** (`tests/helpers/supabase-mock.ts`, `tests/use-market-prices.test.ts`): thenable query-builder mock; proves useMarketPrices prefers the gated RPC (never reading the table), falls back on RPC error/throw with correct filters, and fires `refresh_market_price_freshness` best-effort. `useMarketPrices.fetchMarketPrices` exported for tests.
- Checklist updated: 30 migrations; anon probes now cover tips and NULL access rows.
- **Probe automation** (`scripts/probe-rls.js`, `npm run probe:rls`): read-only PostgREST probes automating checklist §3 — premium-gating (market_prices `access_level='premium'`/NULL + tips `is_premium=true`), free-row baselines, users/payments/pending-listings blocks, `get_active_subscription` anon RPC revoke. Anon key only, env/flag credential resolution (never service_role); denial counted as pass; exit 1 on any leak. Live run Sep 18: caught the unapplied migration (16 premium market_prices rows visible to anon — expected until `supabase db push`); tips + all other gates pass live.
- **useTips data-path tests** (`tests/use-tips.test.ts`, 4): pagination window (page 2/pageSize 3 → range 3-5 with exact count), defaults, category/isPremium filter order, and search path (sanitize → injection-safe `orIlike` → 200-row fetch cap). `useTips.fetchTips` exported for tests. Suite now 82 tests / 10 files.
- **Offline PWA verified end-to-end** (built app served via `vite preview`): SW registers active+controlling, `yebetweg-v3-precache`/`-runtime` caches populated with all 8 precache URLs incl. `/offline.html`, navigation-fallback cache chain (request → `/index.html` → `/offline.html`) confirmed. Found+fixed `offline.html` bug: `setLang` never updated the EN/አማርኛ button `active` classes (now toggles them).
- Verified: typecheck ✓ · tests 82/82 ✓ · build ✓

### September 18, 2026 — Production-readiness pass (repo hygiene, test suite rebuilt, memory bank tracked)
- **Secrets hygiene:** untracked `.env.production`, `.env.preview`, `temp_env.sh` from git (files kept locally); rewrote `.env.example` placeholders-only (TeleBirr block dropped); hardened `.gitignore`. Credential rotation in the Supabase/Chapa/Resend dashboards remains an owner action.
- **Test suite rebuilt:** root-caused the vanished suite — commit `060a05f` (Phase 7 TeleBirr removal) deleted the entire `tests/` dir whose only file was `telebirr.test.mjs` (the old "tests 11/11" claims). Installed Vitest + Testing Library; new suite: **75 tests / 8 files** covering searchUtils (injection-safe filters), entitlements (incl. lapsed-sub regression), validation, url-validator, i18n EN/AM key parity, assistant engine, and SearchBar/ProtectedRoute DOM integration. `npm test` now fails loudly on 0 tests.
- **Two real source bugs caught by the tests and fixed:** `truncateWords` sliced mid-surrogate-pair (corrupts emoji/Amharic glyphs in excerpts); `translations` table was not exported (blocked parity testing).
- **Admin-login scripts consolidated:** 6 one-off scripts → canonical idempotent `scripts/fix-admin-login.sql` (v4) + `scripts/diagnose-admin-auth.sql`; wrong root cause in `memory/notes/admin-login-fix-v2.md` corrected (v1's real defects: no `public.users` profile insert + malformed identities row — not the instance_id placeholder). Owner must still run the script in the Supabase SQL Editor.
- **Memory bank tracked in git** (was gitignored — 7 files existed only on one machine). 12 superseded root docs archived to `docs/archive/` with an index README; root now has 9 focused documents.
- Verified: typecheck ✓ · build ✓ · tests 75/75 ✓

### August 28, 2026 — Phase 7 finalization (TeleBirr removal + PremiumSection cleanup)
- TeleBirr completely removed from codebase: `src/lib/telebirr.ts` (already deleted), edge functions `telebirr-service/` + `telebirr-webhook/` (already deleted), `tests/telebirr.test.mjs` (deleted)
- `PremiumSection.tsx` rewritten Chapa-only: removed all TeleBirr UI/logic, fixed "Get Started" button (disabled for signed-in users, sign-up redirect for unsigned users)
- `usePayment.ts` cleaned: removed unused `createSubscriptionRecord`, `phoneNumber` param, `supabase` import
- `useUserProfile.ts`: removed `telebirr_reference` from SubscriptionRow mapping
- `PaymentPage.tsx` rewritten Chapa-only
- `vite.config.ts`: removed `telebirr.ts` from manualChunks
- `i18n.tsx`: updated Amharic payment strings to remove TeleBirr references
- D3 deferral register entry closed (TeleBirr permanently removed, not frozen)
- Verified: typecheck ✓ · build ✓ · tests ✓

### August 26, 2026 — Phase 7 wrap — phase-7-complete
- SEO: sitemap.xml, manifest.json, Open Graph/Twitter cards, hreflang, canonical, robots
- PWA: manifest.json, service worker (cache-first for assets, network-first for HTML), manifest.json with shortcuts
- Analytics: useAnalytics hook (event + funnel tracking, offline queue), useErrorReporting (error boundary + unhandled rejection), API endpoints (event, funnel, error)
- Performance: vite.config.ts code splitting (vendor chunks, feature chunks), sourcemap, CSS code splitting, chunkSizeWarningLimit
- Vercel: vercel.json (edge functions, security headers, rewrites, SPA fallback)
- index.html: SEO meta, manifest.json, sitemap.xml, hreflang, preconnect
- Verified: typecheck ✓ · build ✓ · tests 11/11 ✓ (22523ff → 1107c3d)

### August 26, 2026 — Phase 6 wrap to main — phase-6-complete (6122716)
- Merged `dev` → `main` (`8d0e163`); tag `phase-6-complete` (`6122716`) pushed.
- Phase 6 Pre-Launch Hardening Gate:
  - RLS hardening (20260828000000): `subscription_payments`/`users` RLS enabled, `premium_subscriptions` anon `USING(true)` removed, listings approved-only, `site_logs` `auth_uid` join, `ads` admin fix, `get_active_subscription` revoked from anon, `login_attempts` rate-limit table.
  - Function hardening (20260828000001): dropped insecure `create_listing`/`submit_inquiry` overloads, secure `is_admin()` + hardened `admin_check_custom_user`.
  - `admin_actions`: removed `_customUserId` fallback (JWT-only admin auth).
  - `chapa-webhook`: enforce HMAC 401 on mismatch (was warn+proceed).
  - `telebirr-webhook`: optional HMAC (`TELEBIRR_WEBHOOK_SECRET`) with 401 on mismatch.
  - Verified: typecheck ✓ · build ✓ · psql applied + history recorded.
  - Secrets rotation + git history purge pending (manual); TeleBirr frozen (`VITE_ENABLE_TELEBIRR=false`).

### August 26, 2026 — Phase 5 wrap to main (471954b) — tag phase-5-complete (5ed819c)
- Merged `dev` → `main` (`bce2c27` → `471954b`); `main` now at Phase 5 Strategic Differentiators.
- Phase 5: `useCityMultipliers` (live city avg basket vs Addis, clamped +-15%, Live/Estimated badge); `BoqLiteSection` BOQ Pro export tier-gated CSV + printable HTML (premium/pro else → `#premium`) + canonical city fix; `Dashboard` BOQ actuals variance (`site_logs` payments); `SocialBridge` Weekly Cement & Rebar Watch (top 3 movers) + live badge; `useProjectSaves` (localStorage) + `BlogSection` Bookmark + `Dashboard` Saved card; `RfqManager` Copy summary + Share via Telegram.
- Verified: typecheck ✓ · build ✓

### August 26, 2026 — Phase 4 wrap to main (bce2c27) — tags phase-4-complete (22523ff)
- Merged `dev` → `main` (`abf6829` → `bce2c27`); `main` now at Phase 4 UI/UX & Accessibility (a11y, mobile, Amharic critical, honesty). `phase-4-complete` tag pushed.
- Phase 4A: `ContactSection`/`CreateListingForm`/Marketplace+Professionals hire/SiteLog `htmlFor`/`id` + `autoComplete`; `MarketPriceManager`/`RfqManager`/`Footer`/`FloatingSocialBar`/`Dashboard` icon-only `aria-label`s; `Navbar` `xs:` → `sm:` + `max-w-[12ch] truncate`, skip-to-content + mobile `Sheet` `SmartSearchBar`, `App` `main#main-content`
- Phase 4C: `PaymentSuccessPage` (4), `PasswordResetDialog` (3), `ResetPasswordPage` gibberish, `RfqManager` 5 statuses (Georgian char `᎒` removed), `AdminDashboardTab` 4 strings — critical-flow Amharic fixes (full 200-key native review still recommended)
- Phase 4D: `HeroSection` live counts via TanStack Query (was 10000/500/2000) + footnote, `TipsSection` ticker `aria-hidden` + live `market_prices`, `Professionals` trust → indicator + `is_verified` guard, `VideoShowcase` 10k+ → growing community, `SocialBridge` fake views/likes removed
- Verified: typecheck ✓ · build ✓

### August 26, 2026 — Phase 3: BOQ persistence + premium gating + freshness (pending migration apply)
- `20260827000000_boq_estimates.sql`: `boq_estimates` (user_id FK users, inputs/outputs jsonb, RLS via `users.auth_uid`, indexes, `updated_at` trigger)
- `useBoqEstimates` (TanStack Query, graceful 42P01) + `BoqLiteSection` Save (canonical `city` key, `cityLabel` separate), toast + count badge, Dashboard Saved BOQ Estimates card (delete with confirm)
- Fixed `BoqLiteSection` → `RfqModal` DB pollution: `city: labels[language][city]` → `city: city`
- `20260827000001_market_price_gating_and_freshness.sql`: `get_visible_market_prices`/`get_visible_tips` (premium gating via `premium_subscriptions`), `refresh_market_price_freshness` (7-day expiry), ads admin policy fix (`users.role`); `useMarketPrices` now prefers RPC (premium-gated) with fallback
- Dashboard: Saved BOQ Estimates card (`Calculator` + `Badge` + delete)
- Verified: typecheck ✓ · build ✓ — migrations pending user `supabase db push` / dashboard (code degrades gracefully until applied) (`2984daa`)

### August 26, 2026 — Auth consolidation + Batch D (SiteLog, verification, inquiries, Ads)
- `AuthContext`: removed `CUSTOM_AUTH_USER_KEY` + localStorage mock-user + `login` RPC fallback + `role` param at signup (now Supabase-only); `edge.ts`: removed `_customUserId` injection; `useUserProfile`: removed synthetic `provider:"local"` profile for custom auth (now returns null when no session)
- `useSiteLogs`: early return when `!userId` (no longer fetches all rows when logged out); `SiteLogSection`: delete button now `opacity-60 sm:opacity-0...` (visible on touch), `AlertDialog` confirm, New Entry disabled when logged out with title, date `max=today` + local-noon conversion
- `useVerification`: `intervalRef` + `clearTimer` + `phoneRef` + `useEffect` cleanup (fixes stacked intervals and unmount leak)
- `MarketplaceSection`/`ProfessionalsSection`: `marketplace@`/`hire@` fake emails → `user.email` or `phone@yebetweg.local`; `AdsSection`: fixed `<button>` inside `<a>` in `native_card` by splitting into separate anchors
- Verified: typecheck ✓ · build ✓ · tests 11/11 ✓ (`aac32f4`)

### August 26, 2026 — Phase 2: centralized edge API, error boundaries, dead weight cleanup
- `supabase.ts` now exports `supabaseUrl`/`supabaseAnonKey` centrally; new `lib/edge.ts` `callEdge()` is the single edge-function entry-point (timeout 15s + abort, safe JSON, `EdgeError`, centralized `_customUserId` injection until auth consolidation)
- `lib/api.ts` now thin wrappers over `callEdge`; `lib/chapa.ts` + `lib/telebirr.ts` refactored to `callEdge` (3 duplicated fetch blocks each removed), `formatAmount` locale `en-ET` → `en` fixed
- `main.tsx`: added `<Toaster>` (sonner) inside `QueryProvider`; `lib/queryClient.tsx`: `QueryCache`/`MutationCache` with global error handling (toast on mutation, console on query)
- `components/ErrorBoundary.tsx`: `resetKey` support, Try again + Refresh, `RouteErrorFallback`; `App.tsx`: per-route `<ErrorBoundary>` and fixed legacy wildcard `/:legacy*` → `*`
- `lib/assistant.ts`: deduplicated `Language` (import from `i18n`); `types/payment.ts`: removed unused `PaymentHookResult`; `package.json`: `shadcn-ui-template` → `yebetweg`, removed `crypto-js` deps
- `index.html`: `vite.svg` → `Logo2x.png` favicon, added `og:image`/`twitter:image`
- Verified: typecheck ✓ · build ✓ · tests 11/11 ✓

### August 26, 2026 — Phase 2 Architecture Robustness: TanStack Query migration
- Migrated all data-fetching hooks to TanStack Query (`@tanstack/react-query`):
  - `useTips`, `useBlogs`, `useListings`, `useProfessionals`, `useMarketPrices`
  - Each hook now returns typed `UseQueryResult` with `data.data` / `data.total` for paginated results
  - Added `useTipCategories()` for facet filters
  - Removed 5 hand-rolled `useState/useEffect` data hooks — eliminates stale-response races, deduplicates refetches, surfaces errors properly
- Updated all section components (`TipsSection`, `BlogSection`, `MarketplaceSection`, `ProfessionalsSection`, `MarketPricesSection`) to consume the new TanStack Query shape
- Removed `useSmartSearch` dependency from TipsSection (now fully server-driven)
- Added `QueryProvider` at app root with 5-min staleTime, 30-min gcTime, retry=1
- Verified: typecheck ✓ · tests 11/11 ✓ · build ✓

### August 26, 2026 — Phase 1 Batch C (payment hardening) on feature/phase-1-correctness
- **C1 TeleBirr feature-flag:** `VITE_ENABLE_TELEBIRR` (default `false`) gates all TeleBirr CTAs in `PremiumSection` — tier cards, bottom panel, and dialog. Chapa remains the sole live payment path.
- **C2 PaymentSuccessPage double-verification fix:** removed `language` from the effect deps; verification now runs **once on mount** via a `mountedRef` guard. No more re-verification when the user toggles language.
- **C3 Activation idempotency:** `verifiedRefs` `Set` in a `useRef` tracks successfully verified references per session; re-visiting the success URL (or language toggle) no longer re-calls `activateChapaPayment`.
- Verified: typecheck ✓ · tests 11/11 ✓ · build ✓

### August 26, 2026 — Knowledge Hub fix (RLS regression) + Tips server-side pagination
- **Root cause of "No matching articles":** NOT frontend — live-DB diagnosis proved `blogs` reads fine anonymously (8 rows) but returns **0 rows for any authenticated session**; an RLS policy regression from the custom-auth churn (20260729/30) locked signed-in users out of `blogs`. All other content tables verified healthy for both roles. Fix migration added: `supabase/migrations/20260826000000_fix_blogs_authenticated_read_policy.sql` (additive permissive SELECT policy for `authenticated`; OR-combines with existing policies, non-destructive). ⚠️ **Applied via psql pooler attempts failed (no CLI token / pooler auth mismatch / direct DB unreachable) → USER MUST APPLY** via `supabase db push` or SQL editor
- **TipsSection rebuilt server-driven:** new `useTips(category, page, pageSize, searchQuery, isPremium)` with exact-count pagination + search mode (full match set, cap 200) + `useTipCategories()` facet helper; section now filters category AND premium/free server-side (was client-only over a 50-row dump), debounced search input, real Pagination UI (9/page), page reset on every filter change; smartSearch dependency removed from this section entirely
- Verified: typecheck ✓ · tests 11/11 ✓ · build ✓

### August 26, 2026 — Phase 1 Batch B (navigation & dead controls) on feature/phase-1-correctness
- **B1 Navbar:** `hidden xs:inline` referenced an undefined Tailwind v4 breakpoint → language label ("AM"/"EN") and signed-in username were invisible at ALL screen sizes. Switched to `hidden sm:inline`; username now truncates (`max-w-[12ch] truncate`) so long emails can't overflow the navbar
- **B2 Filters wired:** the previously-dead Filters buttons now render the feature-complete `FilterPanel` (was orphaned dead code). Marketplace gets Location select (facet options from loaded rows, capped at 40) + Price range (0–3M ETB); Professionals gets Location select + Rating range (1–5). Chip builders fixed to match engine semantics: marketplace price chip key corrected `price_range`→`price` (the old key would have filtered everything out), professionals `min_rating`→`rating` range; active-filter count badge + Reset added to both panels
- **B3 Blog "Read more":** cards are now fully clickable (keyboard-accessible button wrapper, focus ring, aria-label) opening a bilingual article dialog (category badge, read time, author, hero image, paragraph-split content, close control). Excerpt truncation switched from mid-word `content.slice(0,150)` to word-boundary `truncateWords()`; hardcoded "Featured" badge localized ("ተመራጭ")
- Decision recorded: adopting shared `InquiryModal.tsx` is deferred to Batch D (it will replace the inline inquiry dialogs when fake-email inserts are cleaned up)
- Verified: `npm run typecheck` ✓ · `npm run test` 11/11 ✓ · `npm run build` ✓

### August 26, 2026 — Master Plan Revision + Phase 1 Batch A (search pipeline) on feature/phase-1-correctness
- Full codebase audit completed; root `DEVELOPMENT_PLAN.md` rewritten as the master phased plan (Phases 1–6) with an explicit Deferral Register: D1 database hardening → Phase 6 gate, D2 payment/admin security → Phase 6 gate, D3 TeleBirr frozen (Chapa-only dev mode). Mirrored in `memory/security/project_rules.md`
- **A1 — `src/hooks/useSearch.ts` rewritten:** fixed dead queries (blogs/tips/listings used nonexistent columns `title/excerpt/image/bio/material/currency` → PostgREST 42703 silently swallowed; blogs/tips/listings/professionals/market_prices search was entirely broken). Now queries real bilingual columns (`title_en/title_am`, `material_en/material_am`, etc.); user input sanitized via new `src/lib/searchUtils.ts` (`sanitizeSearchTerm` + quoted `orIlike`) closing the or-filter injection/corruption hole; five sequential awaits → parallel `Promise.allSettled` with per-source error isolation; request-id race guard; errors surfaced bilingually; professionals description composed from specialty/experience/location (no bio column); prices show ETB/unit/city and premium flag
- **A2 — `src/pages/SearchResults.tsx`:** reads `?q=` on mount and auto-runs (navbar deep-link now works); Enter via `onKeyDown` (deprecated `onKeyPress` removed); price slider is controlled + debounced re-search (350ms) and resets on Clear All; reactive desktop filter visibility via matchMedia (was render-time `window.innerWidth`); result cards use `navigateTo` instead of raw `<a>` full reloads; error state rendered (`role="alert"`), count/status live regions; distinct "Start Searching" empty state when no query yet; Amharic fixes ("Recent" አሉታዊ→የቅርብ, Sort By, Knowledge Hub, Clear All); aria-labels on search controls; premium badge on gated rows
- **A3 — double-pagination fix:** `useListings` / `useBlogs` / `useProfessionals` accept optional `searchQuery`; when active they fetch the FULL server-side match set (injection-safe ilike over correct columns, cap 200) so client filtering/pagination spans all pages; sections (Marketplace/Blog/Professionals) own the debounced input (300ms) and feed it to both hook and SmartSearchBar; pagination now derives from server total in idle mode (previously pageCount could never exceed 1 — pages 2+ were unreachable) and from the match set while searching (`smartSearch.setPage` path); stale-response guards added to all three hooks; stray destructure artifact cleaned in MarketplaceSection
- `src/lib/i18n.tsx`: exported the `Language` type for reuse by hooks
- Verified on `feature/phase-1-correctness`: `npm run typecheck` ✓ · `npm run test` 11/11 ✓ · `npm run build` ✓ (pre-existing chunk-size warning only)

### August 1, 2026 — Phase A1+A2+A3 (dashboard data layer, mobile, i18n) on feature/dashboard-data
- Extended `useDashboardData` (src/hooks/useDashboardData.ts) with pagination: `limit`, `loadMore`, `hasMore`, `loadingMore`, plus `refreshOnFocus` (refetches on window focus / tab visibility change); existing callers stay backward-compatible
- Activity feed now supports "Load more"; RFQ Tracking empty-state keys off total `stats.rfqs` and offers "Load more RFQs" when results are paginated out
- (A2) Quick Stats grid is now `sm:grid-cols-3` for a cleaner tablet layout; empty states present for activity feed and RFQ tracking
- (A3) Added `dashboard.*` i18n keys (EN + AM) and routed tab labels, stat labels, Quick Actions/Assistant copy, Load More buttons, and empty states through `t(...)` in Dashboard.tsx
- `npm run typecheck` + `npm run build` both pass on `feature/dashboard-data`
- Next: Phase B (premium/pro experience), Phase C (admin upgrade), Phase D (rule-based AI Assistant MVP)

### August 2, 2026 — Phase B (premium/pro dashboard experience) on feature/dashboard-premium-pro
- `src/lib/entitlements.ts`: added `PLAN_BENEFITS`, `roleKeyFor`, `planBenefits(roleKey)` returning the localized benefit keys per plan tier (free/premium/pro/admin)
- `src/pages/Dashboard.tsx`: Access Strength card CTA is now context-aware per `roleKey` (free -> Upgrade access, premium -> Upgrade to Pro, pro -> Explore pro tools, admin -> Review operations); Subscription card renders a role-aware "Your plan includes" benefits panel driven by `planBenefits`
- `src/lib/i18n.tsx`: added `dashboard.benefits.*` + `dashboard.cta.*` keys (EN + AM), wired through `t(...)` in the new panels
- Reconciled `src/components/sections/TipsSection.tsx` + `src/hooks/useTips.ts` back to the `dev` baseline (a concurrent smart-search edit had broken the build) so `npm run typecheck` + `npm run build` stayed green
- Merged into `dev` via `feature/dashboard-premium-pro`; PR #2 (dev -> main) opened to promote to the Vercel deploy branch

### August 2, 2026 — Phase C (admin operational summary) on dev
- `supabase/functions/admin_actions/index.ts`: new `operational_summary` action (runs under the service-role client) returns new RFQs (total + today), pending professional verifications, churn risk (lapsed premium/pro subs), active subs expiring within 7 days, pending listings, failed/pending payments (7d), and totals
- `src/hooks/useAdminOperationalSummary.ts`: new hook calling `callAdminAction("operational_summary")` with typed `OperationalSummary`, loading/error, and refetch
- `src/pages/AdminDashboardTab.tsx`: added an "Operational Summary" card (secure service-role path; bilingual labels) showing New RFQs / Pending verifications / Churn risk; `churnRisk` folded into the operational-health badge; new `OperationalSummaryStat` helper
- `npm run typecheck` + `npm run build` green (frontend); remember to redeploy the `admin_actions` edge function so the new action is live in Supabase: `supabase functions deploy admin_actions`

### August 2, 2026 — Phase D (rule-based AI Assistant MVP) on dev
- `src/lib/assistant.ts`: rule-based engine with a stat-aware greeting + keyword-intent FAQ answers (RFQs, profile strength, market prices, BOQ, finding a pro, subscription) in EN/AM; reads open RFQs, unread inquiries, and `profileStrength` from the live user
- `src/components/assistant/AssistantCard.tsx`: compact, embeddable chat surface (greeting, scrollable message log, quick-reply chips, input + Send, typing state) — drops the "coming soon" stub for a real bilingual conversation
- `src/pages/Dashboard.tsx`: replaced the dashed "YeBetWeg Assistant coming soon" teaser with `<AssistantCard>`; added a `plan` memo (active subscription tier or role-derived tier); removed the now-unused `Bot` icon import
- `src/lib/i18n.tsx`: added `dashboard.assistant.*` keys (EN + AM) for placeholder/send/quick chips + fallback copy
- `npm run typecheck` + `npm run build` green; no server-side deploy needed (frontend-only)

### August 2, 2026 - Stable Snapshot + Development Baseline
- Created `stable` branch from `dev` at `4612af6` and pushed to `origin/stable` — this is the frozen, working baseline snapshot of the project
- Returned to `dev` for ongoing development; `dev` remains the active integration branch
- Verified `npm run typecheck` passes (zero errors) and `npm run build` passes (production bundle builds; only non-blocking chunk-size warning remains)
- Dashboard enhancements (role-aware theming, Quick Actions, AI Assistant teaser, access strength, RFQ tracking, filterable activity feed) confirmed as the current high-value UI/UX state to build on
- Upcoming phase focus: evolve the dashboard from "appealing shell" to a robust, role-aware product surface, keeping the AI Assistant concept as a forward-looking enhancement without blocking MVP

### July 31, 2026 - Step 2 Polish (Quick Actions, exact plan anchor, role theming)
- Added `id="plans"` anchor (with `scroll-mt-24`) on the plan cards grid in PremiumSection; all dashboard upgrade CTAs and PaymentPage now navigate to `/#plans` (exact plan-card location) instead of `/#premium` (section top)
- Replaced the "Next Best Action" card with a role-aware **Quick Actions** card (2x2 buttons per role: free/premium/pro/admin) plus an animated "YeBetWeg Assistant coming soon" teaser (pulsing Bot icon)
- Role-aware theming via `ROLE_STYLES`: Free (slate, User), Premium (amber, Crown), Pro (violet, Zap), Admin (rose, ShieldCheck) — applied to header badge and Plan stat card
- `roleKey` normalizes profile.role/tier → user/premium/pro/admin for styling

### July 31, 2026 - Phase 1 Step 1 + Step 2 (User Dashboard Revamp)
- Created `useDashboardData` hook (`src/hooks/useDashboardData.ts`): parallel fetches for inquiries, listings, RFQs, subscription payments, and unread counts with loading/error/refetch; typed interfaces + `buildActivityFeed()` normalization for a unified activity feed
- Added `profileStrength()` to `src/lib/entitlements.ts`: scores profile completion (username/full_name/phone/profile_image/language_preference), returns `{ score, missing, complete }`
- Dashboard rewired to consume `useDashboardData` (inline `useEffect` stats block removed); `purchasesCount` fallback preserved
- Access strength card now blends plan progress + profile strength and shows a clickable "Complete your profile" hint listing missing fields (jumps to Profile tab via controlled Tabs)
- Quick Stats grid extended to 5 cards (added RFQs); Workspace Snapshot extended to 4 boxes (added RFQ requests)
- Activity tab revamped: filterable + sortable Recent Activity feed (All/Inquiries/Listings/RFQs/Payments chips, newest/oldest toggle) and new RFQ Tracking card with status badges + "Submit RFQ" quick action (opens RfqModal)
- Typecheck and production build passing

### July 30, 2026 - Chapa Payment Flow Verified + Role Upgrade + Phase 0 Completion
- Fixed Chapa API base URL (`https://api.chapa.co/v1/transaction`) which caused 405 on initialize
- Fixed `customization.title` length (Chapa 16-char limit) that caused validation 400s
- Stringified Chapa validation error objects so React no longer crashes rendering them
- Subscription record now created server-side by `chapa-service` (service role bypasses RLS insert gap)
- Added `activate` action to `chapa-service`: verifies payment with Chapa, then calls `activate_subscription` RPC which activates the subscription AND upgrades the user's `role`
- PaymentSuccessPage simplified: calls edge function to activate, keeps receipt on screen (no auto-redirect), buttons to dashboard/home
- All 5 edge functions verified deployed and responding (chapa-service, telebirr-service, chapa-webhook, telebirr-webhook, admin_actions)
- Chapa payment flow verified end-to-end in sandbox (new buyer account → Premium → paid → role upgraded)
- Telebirr integration formally deferred (see project_notes.md)

### July 30, 2026 - Payment Gateway Integration + Auth Fixes
- Created `chapa-service` edge function (server-side proxy), fixed secret key exposure in `src/lib/chapa.ts`
- Added `TELEBIRR_API_URL` env var support to telebirr-service edge function
- All 5 edge functions deployed: chapa-service, telebirr-service, chapa-webhook, telebirr-webhook, admin_actions
- Real Supabase Auth accounts created for premium@yebetweg.com and pro@yebetweg.com via migration
- Subscription fallback from role (entitlements.ts + subscriptionFromRole in useUserProfile)
- onAuthStateChange listener fixed to not overwrite custom auth users with null
- Admin dashboard enhanced: UserManagementSection (search, role dropdown, status toggle), ContentForm (create/edit blogs/tips/ads)
- Supabase env vars set for Chapa and Telebirr credentials

### July 30, 2026 - Memory Bank Consolidation
- Re-grounded the memory bank in the live repository structure
- Elevated dashboard overhaul as a near-term strategic milestone
- Made mobile-first, bilingual, and polished UX an explicit quality bar
- Added clearer guidance for agents and future contributors

### July 28, 2026 - MVP Upgrade Milestone
- BOQ Lite was integrated into the main experience
- Market price intelligence gained richer trust and freshness signals
- RFQ workflows were added across multiple entry points
- Admin market price and RFQ management were strengthened
- Site Log Lite was added

### Earlier Milestones
- June 30, 2026 - TypeScript and build validation were stabilized
- June 15, 2026 - Supabase migration groundwork was prepared
- May 31, 2026 - Frontend sections were completed and rendered together
- May 25, 2026 - Authentication and account flows were established

## Next Milestone
- Deliver a richer, role-aware dashboard system for user, premium, pro, and admin experiences
- Pair the dashboard work with stronger mobile responsiveness and bilingual UX consistency