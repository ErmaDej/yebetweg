# YeBetWeg Progress Tracker

## Current Status
- Overall posture: Phase 7 complete on `main`. **TeleBirr permanently removed.** Payments Chapa-only. Production-readiness pass executed Sep 18, 2026 (see milestone below). Remaining launch blockers are owner actions: secrets rotation, admin-login script run, Vercel production deploy.
- Memory bank status: **tracked in git as of Sep 18, 2026** (was gitignored; 7 files recovered). Updated through the Sep 18 production-readiness pass.
- Branch workflow: `feature/*` → `dev` → `stable` → `main` on phase wrap — **main at Phase 7 final**, `dev`/`stable` pending merge.
- Last verified: Sep 20 — typecheck ✓ · build ✓ · **tests 82/82 ✓ (Vitest)** · probe:rls exit 0 · audit:rls exit 0 · audit:i18n exit 0 · in-app notifications + image repair + i18n/error-triad sweep complete · a11y/confirm-dialog sweep complete
- Pending owner apply: migrations `20260919010000`/`2026092000…`/`2026092001…`/`2026092002…` applied Sep 20 ✓ (pg_cron enabled, daily freshness schedule live, `/notifications` table live). Remaining: redeploy `freshness_cron` (guard fix) + deploy `telegram-webhook` + secrets + Telegram webhook registration + weekly digest trigger per `docs/EDGE_FUNCTIONS_RUNBOOK.md`; verify with `npm run verify:deploy`

## Status Summary
| Area | Status | Notes |
|------|--------|-------|
| Product foundation | ✅ Strong | Core sections and core workflows are in place |
| Public experience | ✅ Stable | Landing experience and key sections are functioning |
| Auth and profile flow | ✅ Functional | Auth context + profile hook active; real auth accounts for testers |
| Dashboard experience | ✅ Phase B+C shipped | Role-aware dashboard on dev: Phase A data layer + B premium/pro panels (context-aware CTA, benefits panel) + C admin operational summary card |
| Stable baseline | ✅ Created | `stable` branch pushed to `origin/stable` from `dev@4612af6` (Aug 1, 2026) |
| Admin experience | ✅ Enhanced | CRUD for blogs/tips/ads, user management with role+status |
| Mobile responsiveness | ⚠️ Needs ongoing QA | Must be treated as an explicit quality target |
| Payment integration - Chapa | ✅ Verified end-to-end | Initialize → checkout → activation → role upgrade all working |
| Payment integration - Telebirr | ✅ Removed | Permanently removed from codebase (Aug 28, 2026). Chapa-only. |
| Backend deployment | ✅ Complete | All 5 edge functions deployed and verified responding |

## Recent Milestones
- [x] Sep 20, 2026 (3) — **pg_cron enablement + deploy verifier + a11y/confirm-dialog sweep**. `20260920020000` enables pg_cron (owner hit `schema "cron" does not exist`) and schedules the daily freshness flagging; owner applied it ✓. `npm run verify:deploy` automates runbook §6 (guards, webhook reg, RLS, optional chat post-test). Phase 4 sweep: shared `ConfirmActionDialog` on all destructive admin/owner ops (content delete, ban/suspend ×2, telegram reject, BOQ delete — replacing `window.confirm`); reduced-motion extended to marquee/typewriter/float/neon/shimmer; icon-button aria-labels. Preview-verified: accessible names render, zero failed same-origin resources.
- [x] Sep 19, 2026 — **Readiness pass 2: probe hardening + RLS audit tooling + secret scrub**. Owner applied the entitlement migration pair to the live project; `probe:rls` went fully green (anon gating correct, baselines + RPC read-paths pass). Caught+fixed a P0 regression the first migration introduced (anon policy calling a helper anon couldn't EXECUTE → all anon table reads 42501) via role-split policies in `20260919000000`. Added `audit:rls` static policy-privilege auditor (validated on synthetic bug/fix cases), paid-session grant probes (PROBE_PAID_* optional), scrubbed the hardcoded service_role JWT from BOTH tracked scripts (env-based now; rotation still required — key remains in git history). Suite grew to 82 tests (useTips pagination/filter/search coverage).
- [x] Sep 18, 2026 — **Production-readiness pass (B1–B3)**: (B1) untracked secret-bearing files `.env.production`/`.env.preview`/`temp_env.sh` from git, rewrote `.env.example` placeholders-only (TeleBirr block dropped), hardened `.gitignore`. Consolidated 6 one-off admin-login SQL scripts into canonical `scripts/fix-admin-login.sql` (v4, idempotent) + `scripts/diagnose-admin-auth.sql`; corrected the wrong root cause in `memory/notes/admin-login-fix-v2.md` (it was NOT the instance_id placeholder — v1 never inserted the public.users profile and built identities wrongly). (B2) root-caused the vanished test suite: commit `060a05f` (Phase 7 TeleBirr removal) deleted the whole `tests/` dir (its only file was telebirr.test.mjs — the "tests 11/11" in older entries refers to that suite; it passed then but the dir went with the deletion). Installed Vitest + Testing Library, rebuilt the suite: **75 tests / 8 files** (searchUtils, entitlements, validation, url-validator, i18n EN/AM parity, assistant, SearchBar + ProtectedRoute DOM). Tests caught 2 real source bugs, both fixed: `truncateWords` sliced mid-surrogate-pair (emoji/Amharic glyph corruption) and `translations` was unexported. (B3) memory bank now tracked in git; 12 superseded root docs archived to `docs/archive/`. typecheck ✓ · build ✓ · tests 75/75 ✓
- [x] Sep 1, 2026 — **Ads + vercel + accessibility fixes**: vercel.json structure fixed (removed invalid rewrites, added cache headers, ignored test/supabase-temp files); sw.js: guard against 206 Partial Content (caches.put crash); SheetContent aria-describedby fix; SafeImage component with broken-image fallback; AdsSection: sample ad fallback seeded (Unsplash images), expanded image URL allowlist; BlogSection: uses SafeImage for graceful loading.
- [x] Aug 30, 2026 — **Fix admin_actions edge function + repair migrations**: Fixed null-payload crash in `manage_blogs/tips/ads` (guard with `payload &&` check); pushed missing columns migration for `market_prices` (city, specification, source_type, vat_included, confidence_score, freshness_status, etc.) and `blogs/tips` (content_en/am, excerpt_en/am, status, tags); verified manage_blogs/tips/ads all return data (8/20/6 rows). typecheck ✓ · build ✓
- [x] Aug 28, 2026 — **Phase 7 finalization**: TeleBirr permanently removed from codebase (PremiumSection, usePayment, useUserProfile, PaymentPage, vite.config, i18n). "Get Started" button fixed for signed-in vs unsigned users. D3 deferral entry closed. Verified: typecheck ✓ · build ✓ · tests ✓
- [x] Aug 26, 2026 — **Phase 7 wrap to `main`** — phase-7-complete: SEO/PWA/performance (sitemap, manifest, service worker, meta tags), Analytics/telemetry (useAnalytics, useErrorReporting, funnel tracking, error boundary), Performance (code splitting, lazy loading, bundle optimization), Production config (vercel.json, index.html SEO, service worker, manifest.json, sitemap.xml). Verified: typecheck ✓ · build ✓ · tests 11/11 ✓
- [x] Aug 26, 2026 — **Phase 7: Amharic native review** (f0e7326): 31 garbled Amharic strings fixed across i18n.tsx + assistant.ts (search.recent, dashboard.benefits, trust indicator, etc.)
- [x] Aug 26, 2026 — **Phase 6 wrap to `main`** (`8d0e163`): Phase 6 complete (6122716) — RLS hardening, function hardening, edge function security, webhook HMAC enforcement, auth consolidation
- [x] Aug 26, 2026 — **Phase 2 + Phase 3 wrap to `main`** (`abf6829`): merged `dev` → `main`, tags `phase-2-complete` + `phase-3-complete` pushed; Vercel `main` was at Phase 3
- [x] Aug 26, 2026 — **Phase 3 BOQ + premium gating** (`2984daa`): `boq_estimates` table + `useBoqEstimates` + Save (canonical city) + Dashboard card; `get_visible_*` RPCs + `refresh_market_price_freshness` + ads admin fix; `useMarketPrices` RPC-preferred. typecheck/build green — migrations pending user apply
- [x] Aug 26, 2026 — **Auth consolidation + Batch D** (`aac32f4`): removed mock-user + RPC login + client role; `edge` + `useUserProfile` cleaned; `useSiteLogs` early return, `SiteLogSection` AlertDialog + mobile-visible delete + `max=today`; `useVerification` interval ref leak fixed; fake inquiry emails → real/placeholder; `AdsSection` button-in-anchor fixed. typecheck/build/tests green
- [x] Aug 26, 2026 — **Phase 2 batch: centralized edge API + error boundaries + dead-weight cleanup**: `edge.ts` single entry-point (timeout/abort, EdgeError), `api/chapa/telebirr` refactored, `<Toaster>` + per-route `ErrorBoundary`, `crypto-js` removed, `Language` deduped, `PaymentHookResult` removed, package renamed, favicon/og:image fixed. typecheck/build/tests green (`b960ab9`)
- [x] Aug 26, 2026 — **Phase 2: React Router migration**: `App.tsx` `BrowserRouter` + 6 routes with per-route boundaries; `navigateTo` → `useNavigate` in 9 files (Navbar, Dashboard, etc.); `handleSignOut` restored; `useBlogs` now options-object API. (`5e3dc3a`)
- [x] Aug 26, 2026 — **Phase 2: TanStack Query migration** across all 5 data hooks (Tips, Blogs, Listings, Professionals, Market Prices), `QueryProvider` installed, all sections wired to new typed shape. typecheck/test(11)/build green (`7c0e771`)
- [x] Aug 26, 2026 — **Phase 1 Batch C complete**: TeleBirr feature-flag (`VITE_ENABLE_TELEBIRR` off by default), PaymentSuccessPage single-run verification + idempotency guard. typecheck/test(11)/build green
- [x] Aug 26, 2026 — **Knowledge Hub empty-state root-caused to RLS**: blogs unreadable for authenticated sessions (anon fine); fix migration `20260826000000_fix_blogs_authenticated_read_policy.sql` written — ⚠️ pending user application (`supabase db push` or SQL editor). TipsSection rebuilt fully server-driven (search/category/premium + real pagination 9/page). typecheck/test(11)/build green
- [x] Aug 26, 2026 — **Phase 1 Batch B complete** on `feature/phase-1-correctness`: Navbar xs-breakpoint fix (language label + username now visible ≥sm, username truncated), FilterPanel wired into Marketplace (location+price) & Professionals (location+rating) with chip keys aligned to filter-engine semantics, blog article reader dialog + word-boundary excerpts + localized Featured badge. typecheck/test(11)/build green
- [x] Aug 26, 2026 — Master plan revised (`DEVELOPMENT_PLAN.md`), deferral register recorded (D1/D2/D3)
- [x] Aug 26, 2026 — **Phase 1 Batch A complete** on `feature/phase-1-correctness`: useSearch rewrite (dead columns fixed across all 5 sources, injection-safe filters, parallel queries, error surfacing, race guard); SearchResults `?q=` deep-link + reactive slider/filters + navigateTo + a11y + Amharic fixes; double-pagination fix in Marketplace/Blog/Professionals (server-side search mode, cap 200, correct pagination source both modes). typecheck/test(11)/build green
- [x] Stable baseline snapshot pushed to `origin/stable` (branch created from `dev@4612af6`)
- [x] Typecheck + production build verified clean on the stable snapshot
- [x] Phase A (paginated dashboard data layer, mobile grid, i18n centralization) merged into dev — `useDashboardData` loadMore/hasMore/refreshOnFocus; Load More in Activity + RFQ tracking; `sm:grid-cols-3`; `dashboard.*` EN/AM keys
- [x] Phase B (premium/pro experience) merged into dev on `feature/dashboard-premium-pro` — `entitlements.ts` (PLAN_BENEFITS, roleKeyFor, planBenefits); role-aware "Your plan includes" benefits panel + context-aware Access Strength CTA in Dashboard.tsx
- [x] Phase C (admin operational summary) merged into dev — `operational_summary` action in admin_actions edge fn (service-role); `useAdminOperationalSummary` hook; new Operational Summary card in AdminDashboardTab (new RFQs, pending verifications, churn risk)
- [x] PR #2 opened (dev -> main) carrying Phase A+B+C toward the Vercel deploy branch
- [x] Phase D (rule-based AI Assistant MVP) merged into dev on a new branch — `assistant.ts` engine + `AssistantCard` chat surface replacing the "coming soon" teaser; stat-aware (open RFQs, profile strength); bilingual
- [x] Real Supabase Auth accounts created for premium/pro testers
- [x] Subscription fallback from role (entitlements.ts + subscriptionFromRole)
- [x] onAuthStateChange listener fixed to not overwrite custom auth users
- [x] Admin dashboard: UserManagementSection, ContentForm create/edit dialogs, CRUD for blogs/tips/ads
- [x] All 5 edge functions deployed and verified: chapa-service, telebirr-service, chapa-webhook, telebirr-webhook, admin_actions
- [x] Chapa payment flow verified end-to-end in sandbox (buyer account → pay → activate → role upgraded to premium)
- [x] Chapa API fixes: correct base URL (/v1/transaction), 16-char title limit, stringified error objects
- [x] Subscription created server-side via chapa-service (service role bypasses RLS insert gap)
- [x] Activation + role upgrade done server-side via chapa-service "activate" action → activate_subscription RPC
- [x] PaymentSuccessPage simplified: calls edge function, no auto-redirect (receipt stays on screen)
- [x] Supabase env vars set for Chapa credentials

## Active Next Actions
0. **Owner apply step** (Sep 19): run `20260919010000_freshness_automation.sql` (32nd migration), deploy `freshness_cron` + `telegram-webhook` edge functions with their secrets, set the Telegram webhook + weekly Mon-06:00-UTC trigger. Verify: `supabase functions logs freshness_cron` after manual trigger; send `/submitprice Addis | Cement | 1150` to the bot and confirm a `market_prices` row with `source_type='telegram'` appears (pending review).
1. **Secrets rotation** (owner, manual): rotate DB password, service_role, Chapa secret, Resend key. URGENT since Sep 19: the service_role JWT is confirmed hardcoded in TWO tracked scripts (`test-supabase-connection.js`, `run-migrations-client.js` — scrubbed from the working tree that day, but it remains in git history); treat it as compromised until rotated. History purge still deferred by owner decision.
2. **Admin login** (owner, manual): run `scripts/fix-admin-login.sql` in the Supabase SQL Editor, then verify both admin accounts log in via the app UI. If it fails, run `scripts/diagnose-admin-auth.sql` first.
3. **Production launch**: Vercel deploy (configure env vars from `.env.example`, domain), DNS config, monitoring/alerts.
4. **Post-launch** (optional): BOQ share permalink (`/boq/:id`), chart lib consolidation, analytics dashboard, expand test coverage to hooks/pages. Phase 5 progress: freshness cron automation ✓, Telegram /submitprice funnel ✓, multi-city BOQ from market_prices ✓ (all Sep 19) — remaining Phase 5 items: Pro export, BOQ→actuals depth, save-to-project polish.

### Deferred (DO NOT lose track — launch blockers, Phase 6 gate)
- D1 database hardening bundle (RLS enablement etc.) — **CLEARED in Phase 6** (20260828000000 migration)
- D2 payment/admin security bundle (admin bypass, webhook HMAC, JWT identity, credential rotation) — **CLEARED in Phase 6** (admin_actions hardened, chapa-webhook HMAC enforced, TeleBirr edge functions deleted)
- D3 TeleBirr frozen until unfreeze criteria met — **CLOSED** (TeleBirr permanently removed from codebase, Aug 28 2026)

## Quality Targets
- mobile-first design on all dashboard surfaces
- consistent English and Amharic UX
- clear role-based clarity for free, premium, pro, and admin users
- stronger visibility for RFQs, inquiries, subscriptions, and verification state