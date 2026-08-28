# YeBetWeg Progress Tracker

## Current Status
- Overall posture: Phase 2 + Phase 3 merged to `main` (`abf6829`); tags `phase-2-complete` (`27abdfb`) + `phase-3-complete` (`4833ad2`) pushed. Active: **Phase 4 UI/UX & Accessibility**. Master plan: root `DEVELOPMENT_PLAN.md`. Phase 0 security deferred to Phase 6 gate; TeleBirr frozen, Chapa-only.
- Memory bank status: updated through auth + Batch D + Phase 3 BOQ/gating.
- Branch workflow: `feature/*` → `dev` → `stable` → `main` on phase wrap — **main now at Phase 3** (`abf6829`), `dev`/`stable` at `4833ad2`.
- Last verified: Aug 26 — `npm run typecheck` ✓ · `npm run build` ✓ · `npm run test` 11/11 ✓ on `dev@4833ad2`.

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
| Payment integration - Telebirr | ⏸️ Deferred | Postponed — incomplete Ethio Telecom docs, notify URL config unclear. See project_notes.md |
| Backend deployment | ✅ Complete | All 5 edge functions deployed and verified responding |

## Recent Milestones
- [x] Aug 26, 2026 — **Phase 2 + Phase 3 wrap to `main`** (`abf6829`): merged `dev` → `main`, tags `phase-2-complete` + `phase-3-complete` pushed; Vercel `main` now at Phase 3 BOQ + gating
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
1. **Apply pending migrations** (same manual step as blogs fix): `20260826000000_fix_blogs_authenticated_read_policy.sql` (done) + `20260827000000_boq_estimates.sql` + `20260827000001_market_price_gating_and_freshness.sql` via Supabase dashboard SQL editor (until then `useBoqEstimates` and `get_visible_*` degrade gracefully).
2. **Phase 4 ACTIVE — UI/UX & Accessibility:** Amharic copy pass (many `am` strings are garbled MT; `i18n.tsx` 200 keys), per-form `Label htmlFor` + `aria-label` on icon-only buttons, mobile search in Sheet (currently missing below `md`), fabricated-stats honesty pass (`Hero` counters 10k/500/2k, ticker fake prices, `Professionals` trustScore, `SocialBridge` fake views).
3. **Phase 3 polish (optional):** BOQ share permalink (`/boq/:id`) + Dashboard deep-link; `AdminDashboardTab` content delete confirms (Batch D done for SiteLog, add for blogs/tips/ads).
4. At every milestone: green checks → push `dev` + refresh `stable` + update memory bank.
5. On Phase 4 completion: PR `dev`→`main`, tag `phase-4-complete`.

### Deferred (DO NOT lose track — launch blockers, Phase 6 gate)
- D1 database hardening bundle (RLS enablement etc.) — checklist in `memory/security/project_rules.md`
- D2 payment/admin security bundle (admin bypass, webhook HMAC, JWT identity, credential rotation)
- D3 TeleBirr frozen until unfreeze criteria met (re-enable needs webhook signature verification + sandbox E2E)

## Quality Targets
- mobile-first design on all dashboard surfaces
- consistent English and Amharic UX
- clear role-based clarity for free, premium, pro, and admin users
- stronger visibility for RFQs, inquiries, subscriptions, and verification state