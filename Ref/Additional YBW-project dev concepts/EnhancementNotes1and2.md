I've read the full project: all 131 source files (via deep exploration), all 22 Supabase migrations, 6 edge functions, every doc in Ref/, the memory/ bank, root planning docs, and verified npm run typecheck passes green. Here is the revised master plan.
YeBetWeg — Revised Master Enhancement Plan
Ground truth established: Phase 0–1 features are built (BOQ Lite, RFQ workflow, price intelligence, trust cards, Site Log, admin CRUD, Chapa verified E2E). But the audit surfaced critical security holes, ~20 functional bugs, and systemic UX debt that must precede any new features. The plan below replaces your current DEVELOPMENT_PLAN.md sequencing.
PHASE 0 — Security Remediation 🔴 (do before anything else)
The audit found vulnerabilities that are exploitable today by anyone with your anon key.
#	Finding	Fix
0.1	users & subscription_payments have RLS policies but RLS was never enabled → anyone with the anon key can read/write all rows incl. bcrypt password_hash, emails, payment history	New migration: ALTER TABLE users ENABLE ROW LEVEL SECURITY; ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY; then verify every policy actually applies
0.2	Secrets committed to git: DB superuser password in temp_env.sh; real-looking service-role JWT, Chapa secret, TeleBirr keys, Resend key in tracked .env.example; TeleBirr RSA private key hardcoded in supabase/functions/telebirr-service/index.ts and tests/telebirr.test.mjs; service-role JWT in scripts/run-migrations-client.js	Rotate every credential (Supabase DB password, service_role, Chapa, TeleBirr, Resend, JWT secret). Strip files to placeholders, load real values from env only, run git filter-repo / BFG to purge history
0.3	Unauthenticated admin bypass: admin_actions falls back to trusting _customUserId from request body → knowing an admin's UUID grants full service-role CRUD	Delete the _customUserId fallback path in admin_actions/index.ts; require a valid Supabase JWT whose public.users.role = 'admin'
0.4	Forgeable payments: telebirr-webhook has zero signature verification; chapa-webhook logs-and-proceeds on HMAC mismatch	Enforce signature/HMAC verification — reject with 401 on mismatch or missing secret. Never process unverified events
0.5	Client-supplied identity: p_custom_user_id in create_listing/submit_inquiry RPCs; get_active_subscription(p_user_id) granted to anon (IDOR); chapa-service accepts subscription.user_id from body	Derive identity from JWT inside SECURITY DEFINER functions; revoke anon execute on get_active_subscription; take user_id server-side from session
0.6	premium_subscriptions policy USING(true) exposes all users' subscriptions; listings fully anon-readable including pending rows; site_logs RLS compares auth.uid() against users.id (wrong ID domain → effectively broken)	Rewrite policies: subscriptions readable only by owner/admin; listings filter status='approved' for anon; site_logs join users ON auth_uid = auth.uid()
0.7	Brute-force oracle: login()/authenticate_user() RPCs exposed to anon with no rate limiting	Rate-limit (per-IP + per-email), add lockout, or retire the dual custom-auth model entirely (see 2.4)
Exit criteria: pen-test checklist passes (anon key cannot read users/payments/pending listings, cannot activate a subscription, cannot invoke admin_actions); all credentials rotated; git log clean of secrets.
PHASE 1 — Correctness Blitz 🟠 (fix what's visibly broken)
Functional bugs users hit today, ordered by impact:
 1. Search is dead for 3 of 5 content types — useSearch.ts queries nonexistent columns (blogs.title/excerpt/image instead of title_en/title_am/image_url) → PostgREST 42703 silently swallowed. Also interpolates raw query into .or(...) (filter-syntax injection via ,/parens). Rewrite with correct columns + escaped params + parallel Promise.all (currently 5 sequential waterfalls).
 2. SearchResults.tsx never reads ?q= — Navbar navigates to /search?q=… but page starts empty. Read the param on mount, auto-run search, sync URL on refine.
 3. Navbar hidden xs:inline uses an undefined Tailwind breakpoint — the language label and username are hidden at all screen sizes (src/components/layout/Navbar.tsx:119,129). Define --breakpoint-xs or switch to sm:inline.
 4. Dead Filters buttons in Marketplace + Professionals (filtersOpen toggles nothing) while feature-complete FilterPanel.tsx sits unused — wire the panel in or delete the button. Same for unused InquiryModal.tsx (which is better than the inline duplicates actually used).
 5. Double-pagination search bug — Marketplace/Blog/Professionals fetch server pages of 6, then client-filter only those 6; searching never sees other pages. Either search server-side or fetch the full filtered set when a query is active.
 6. Blog "Read more" does nothing; excerpt cuts mid-word/mid-grapheme. Add article view (route or dialog) + word-boundary truncation.
 7. Payment flow integrity — usePayment: if TeleBirr subscription-record insert fails, flow still reports success → orphaned payments. Abort with error. Fix PaymentSuccessPage re-running verification when language toggles (deps [language]). Guard double-activation with idempotency check.
 8. Site Log — signed-out users trigger an unfiltered SELECT * of all site_logs (wasted query + exposure risk given broken RLS); delete has no confirmation and is hover-only (invisible on touch); future dates allowed. Gate the hook behind auth, add AlertDialog confirm, max={today}.
 9. Timer leak in useVerification — stacked intervals make countdown run 2×+ fast; none cleared on unmount.
10. Phantom backend calls — client calls request_otp, verify_otp, fetch_analytics edge functions that don't exist; notify_user.ts is mis-laid-out and won't deploy. Remove the UI/hooks or implement the functions.
11. Small but embarrassing: fake emails written into inquiries (marketplace@yebetweg.com); "Report price" button with no handler; PremiumSection "Get Started" targets wrong anchor; AuthCallbackPage retries an identical failing call; garbled Amharic copy on ResetPassword/PaymentSuccess/AuthCallback pages; <button> nested in <a> in AdsSection (React DOM-nesting warning).
Exit criteria: every user-facing button does something; npm run typecheck && npm run build && npm run test green; manual pass of search→RFQ→pay→dashboard journey with zero console errors/warnings.
PHASE 2 — Architecture Robustness 🟡 (make the codebase hard to break)
1. Adopt TanStack Query (replaces 15 hand-rolled useState/useEffect hooks): stale-response races disappear, caching dedupes the 6 sections each refetching on mount, errors finally become surfaceable. Migrate hooks one-by-one starting with useTips/useBlogs/useListings/useProfessionals/useMarketPrices.
2. Replace substring routing (pathname.includes("/search") matches /research) with React Router — proper routes /dashboard, /search, /payment/success, /blog/:slug (needed for Phase 5 SEO anyway), active-link styling, scroll restoration. Keep hash-anchor scrolling via a helper.
3. Consolidate auth — retire the localStorage mock-user "custom auth" (forgeable, forces every consumer to remember not to trust it, and is the root cause of the RLS auth.uid() mismatches). Single source of truth: Supabase Auth sessions. Remove client-supplied role signup metadata (privilege escalation vector).
4. Centralize API layer — one typed callFunction wrapper (timeout/abort/retry, parsed error contracts, no anon-key-as-bearer); stop re-deriving URL/key in api.ts/chapa.ts/telebirr.ts. Replace raw casts (as Tip[], any mappers) with generated types via supabase gen types.
5. Error strategy — route-level ErrorBoundaries, toast + retry pattern for data failures (currently useTips silently drops errors → blank sections look like empty DB), role="status" live regions for async messages.
6. Kill dead weight — InquiryModal (or adopt it), FilterPanel (or wire it), sendNotification, PaymentHookResult, duplicate Language type in assistant.ts, one chart library (drop chart.js or recharts), crypto-js dependency, formatAmount's invalid en-ET locale.
7. Migration & repo hygiene — fix naive split(';') migration runner (breaks on DO blocks), unify migration naming, move seeds out of schema migrations into seed.sql (config.toml already points there), rename package from shadcn-ui-template, replace vite.svg favicon, actually load the Google Fonts you preconnect to, add og:image.
Exit criteria: no hand-rolled fetching left; deep links work; a fresh clone + .env.example placeholders boots cleanly; bundle splits below warning threshold.
PHASE 3 — Data Trust & Entitlements 🟡 (your stated strategic wedge)
1. Server-side premium gating — today market_prices premium rows are served to anon and merely blurred client-side (trivially bypassable, and index-based FREE_ROWS=5 shifts with sorting). Filter access_level in the query/RPC based on the caller's entitlement; keep blur as progressive enhancement only.
2. Enforce tier quotas where advertised — verify create_listing 3-listing cap and submit_rfq monthly cap exist in the deployed RPCs (memory docs claim fixed; confirm against production DB).
3. BOQ data layer — persist estimates: new boq_estimates table (inputs JSONB, outputs, city canonical key — not the localized Amharic label currently sent via RfqModal), save/load/list in Dashboard, shareable permalink. This converts the estimator from a toy into the retention hook EnhancementNotes-1 recommends ("estimator → tracker").
4. Price freshness automation — cron edge function flagging freshness_status='expired' past threshold; admin badge for stale prices (your DEVELOPMENT_PLAN Phase 2 item).
5. Admin model alignment — one admin definition (public.users.role), consistent across ads policies (currently checking raw_app_meta_data), RLS, and edge functions. Add confirmation dialogs to destructive admin ops (delete content/user ban currently fire immediately).
Exit criteria: free user cannot retrieve premium prices via network tab; BOQ survives refresh; admins never touch SQL console.
PHASE 4 — UI/UX & Accessibility Overhaul 🟢 (appeal + quality bar)
1. Amharic copy pass (highest-leverage trust win for your audience) — many current AM strings are gibberish machine translation ("ቨርያቄ አቅማቅያን", "አሉታዊ" for "Recent", a stray Georgian character in AdminDashboardTab, semantic mismatch in dashboard.benefits.title). Native review of all 200 i18n keys + the inline language === 'en' ? … : … strings; migrate inline ternaries into i18n.tsx as you go.
2. Accessibility sweep — associate every floating Label (Marketplace/CreateListing/Professionals/hire dialogs), aria-label all icon-only buttons (admin row actions, Footer send, search submit), make filter-chip Badges keyboard-operable, add skip-to-content link, extend prefers-reduced-motion to marquee/neon/float/shimmer/typewriter, announce async alerts via live regions.
3. Mobile gaps — restore language label/username (fix 1.3), add search to the mobile Sheet (currently zero search below md), fix SearchResults' non-reactive window.innerWidth >= 1024 filter visibility, always-visible (not hover-only) card actions, mobile labels for icon-only Dashboard tabs.
4. Honesty & polish — fabricated numbers presented as data: hero counters (10,000+/500+/2,000+), Tips ticker prices duplicating real DB data, Professionals "Trust Score" formula and "responds in 24h", SocialBridge fake play buttons/view counts, VideoShowcase "Join 10,000+". Replace with real counts (cheap COUNT queries), wire ticker to market_prices, or label as illustrative. Respect prefers-reduced-motion for the dual autoplaying videos + add posters/preload=none.
5. State completeness — uniform skeleton/empty/error triad across all 6 list sections; success feedback after Join-network submit (currently closes silently); "send another message" reset on Contact; loading states on AuthCallback.
6. Component upgrades — extract shared PremiumGate component (currently reimplemented in 4 sections), shared social-links constant (duplicated in Footer + FloatingSocialBar), unified inquiry modal (adopt the orphaned-but-better InquiryModal), real blog article page, listing detail view with image gallery.
Exit criteria: axe/Lighthouse a11y ≥ 90 on home/dashboard/search; AM speaker can complete estimate→RFQ→payment without English; no fabricated stats presented as live data.
PHASE 5 — Strategic Differentiators 🟢 (from Ref/EnhancementNotes-1/2)
Priority order per the competitive analysis (Addis Cost Estimator is the bar):
1. Multi-city BOQ pricing — replace flat cityMultipliers heuristic with city-adjusted rates sourced from market_prices (you already collect city/spec/confidence). Closes the direct gap with Addis Cost Estimator's 6-city support.
2. BOQ Pro export — real CSV/XLSX + printable PDF report via edge function (currently the button just navigates to /#premium). Gate server-side by tier. Ship as guided form first, per EnhancementNotes-2.
3. BOQ → actuals tracking — log spend against a saved estimate (job-costing lite, reusing site_logs patterns). Extends stickiness past the quote, per EnhancementNotes-1 #3.
4. Telegram bridge as growth loop — /submitprice bot command funnel feeding market_prices with supplier-sourced rows (price-data collection funnel tactic); weekly cement/rebar watch post auto-generated from DB; deep links back. Your SocialBridgeSection becomes real.
5. Supplier RFQ response loop — suppliers currently can't see or answer RFQs; even an admin-mediated email/Telegram relay closes the loop and creates the lead-fee monetization story.
6. Save-to-project on content — bookmark blogs/tips/prices into a project folder (Houzz habit-loop, feeds directory + BOQ).
Exit criteria: estimate→save→RFQ→supplier-response round trip demonstrable; first real supplier-sourced price row enters via Telegram funnel.
PHASE 6 — Launch Polish & Hardening ⚪
- SEO: per-route meta/OG images, sitemap, SSR-prerender or at least static rendering for content sections (current reveal-on-scroll keeps content opacity-0 — invisible to crawlers/no-JS), structured data for listings/professionals.
- Performance: lazy-load below-fold sections + videos, poster images, chunk splitting, image CDN for Unsplash assets.
- PWA basics (installable, offline shell) — post-MVP item worth pulling forward for Ethiopia's connectivity reality.
- Telemetry: error reporting (Sentry-style), basic analytics events on the core funnel (estimate started/completed, RFQ sent, pay click).
- Docs: collapse the 15+ overlapping root MD files into README + TECHNICAL_DOCUMENTATION + this plan; update Ref/PROJECT_CONTEXT.md status section; archive AI-tooling artifacts (.bolt/, .kilo/, .claude/worktrees, ProblematicScreenshots/) out of the repo.
Suggested execution cadence
Phase	Scope	Why first
0	Security	Actively exploitable; blocks trustworthy launch
1	Bugs	User-visible breakage; cheap wins
2	Architecture	Every later phase gets cheaper/safer
3	Data trust	Core product promise
4	UI/UX + Amharic	Trust & conversion for ET audience
5	Differentiators	Competitive moat once stable
6	Launch	Ship it
Each phase ends with: npm run typecheck && npm run build && npm run test green + the phase's exit criteria checked + memory/ docs updated (per your own project rules).



