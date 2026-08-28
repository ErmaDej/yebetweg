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