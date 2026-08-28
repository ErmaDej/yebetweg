# YeBetWeg Development Plan

**Last Updated:** August 28, 2026
**Status:** Master reference plan. Phase 7 complete. TeleBirr permanently removed; payments Chapa-only. D1/D2 cleared (Phase 6), D3 closed (TeleBirr removed). **Next: production launch** (secrets rotation, admin account fix, Vercel deploy).

This plan supersedes `DEVELOPMENT_ROADMAP.md` and the older phase notes in `memory/development/development_plan.md`. Every item is audit-backed with file references so any agent can pick up work without re-discovery.

---

## Execution Discipline (applies to every phase)

1. **Branches:** short-lived `feature/*` branches cut from `dev`. `dev` is the active integration branch.
2. **Milestones:** commit → `npm run typecheck && npm run build && npm run test` → push `origin/dev`.
3. **Staging reference:** push the verified `dev` tree to `stable` whenever it is green and coherent (`stable` is our staging/snapshot branch).
4. **Phase completion:** open PR `dev` → `main`, merge, verify the Vercel deploy, tag `phase-N-complete`. Production is only ever seen from `main`.
5. **Memory bank sync (mandatory at every milestone):**
   - `memory/status/progress_tracker.md` — status table, recent milestones, next actions
   - `memory/development/development_plan.md` — phase deltas and decisions
   - `memory/core/business_rules.md` — any change to tiers, pricing, entitlements, auth, data access
   - `memory/updates/changelog.md` — dated entry
   - Rule: any agent (human or AI) must be able to reconstruct project truth from `memory/` + this file alone.
6. **Definition of done per phase:** exit criteria checked + all three checks green + memory updated + `dev`/`stable` pushed (+ `main` merged if the phase closed).

---

## ⛔ Deferral Register — REMINDERS (must clear before public launch)

Owner decision (Aug 26, 2026): dev-stage velocity over hardening. These Phase 0 findings are consciously deferred and are **hard launch blockers**. Mirrored in `memory/security/project_rules.md`.

### D1 — Database hardening bundle (apply as one migration set at Phase 6)
Compatible with CLI-driven migration pushes — it is just another migration file, applied once:
- [ ] Enable RLS on `users` and `subscription_payments` (policies exist but RLS was never enabled → full anon read/write incl. `password_hash` and payment history)
- [ ] Fix `premium_subscriptions` misnamed "Public can read own" `USING(true)` policy (exposes all subscriptions)
- [ ] Restrict anon `listings` SELECT to `status='approved'` (pending/moderated rows currently public)
- [ ] Fix `site_logs` RLS (compares `auth.uid()` to `users.id` — wrong ID domain; join via `users.auth_uid`)
- [ ] Align `ads` admin policies to the `public.users.role` model (currently checks `raw_app_meta_data`)
- [ ] Rate-limit/lock down `login()` / `authenticate_user()` RPCs (anon brute-force oracle)
- [ ] Revoke anon execute on `get_active_subscription(p_user_id)` (subscription enumeration IDOR)

### D2 — Payment/admin security bundle
- [ ] Remove `_customUserId` body fallback in `supabase/functions/admin_actions/index.ts` (unauthenticated admin bypass) — *smallest, highest-value fix; may be pulled forward at any time*
- [ ] Enforce HMAC rejection in `chapa-webhook` (currently warns-and-proceeds on signature mismatch)
- [ ] Derive caller identity from JWT inside `create_listing` / `submit_inquiry` (remove spoofable `p_custom_user_id`)
- [ ] Rotate ALL credentials present in git history and purge them: DB superuser password in `temp_env.sh`; service-role JWT, Chapa secret, Resend key in tracked `.env.example`; TeleBirr RSA private key in `telebirr-service/index.ts` and `tests/telebirr.test.mjs`
- [ ] On TeleBirr unfreeze: enforce signature verification in `telebirr-webhook` + sandbox E2E before exposing the UI path again

### D3 — TeleBirr permanently removed (Aug 28, 2026)
- Chapa is the only live payment path.
- ~~Feature-flag the TeleBirr option off in `PremiumSection` behind `VITE_ENABLE_TELEBIRR`~~ — TeleBirr code entirely removed from codebase (src, edge functions, tests, vite config).
- All TeleBirr references cleaned from i18n, types, hooks, and components.

---

## PHASE 1 — Correctness Blitz 🔴 (ACTIVE)

**Goal:** nothing user-facing is visibly broken. No new features.

### Batch A — Search pipeline (worst breakage)
- [ ] **A1.** Rewrite `src/hooks/useSearch.ts`: it queries nonexistent columns (`blogs.title/excerpt/image` instead of `title_en/title_am/image_url`; `tips.title`, `listings.title` vs `*_en/*_am`) → PostgREST 42703 silently swallowed; blogs/tips/listings search is dead. Escape raw query interpolation into `.or(...)` (filter-syntax injection). Convert the 5 sequential awaits into parallel `Promise.all`. Surface per-table errors.
- [ ] **A2.** `src/pages/SearchResults.tsx`: read `?q=` on mount and auto-run search (Navbar already navigates with the param); sync URL on refine; make price slider actually re-trigger search; replace deprecated `onKeyPress`; reactive filter visibility (no render-time `window.innerWidth >= 1024`); use `navigateTo` instead of raw `<a href>`; fix mistranslation ("Recent" → "አሉታዊ").
- [ ] **A3.** Fix double-pagination: Marketplace/Blog/Professionals fetch pages of 6 then client-filter only those rows — searching never sees other pages. Either search server-side or fetch the full filtered set while a query is active.

### Batch B — Navigation & dead controls
- [ ] **B1.** `src/components/layout/Navbar.tsx:119,129` — `hidden xs:inline` uses an undefined Tailwind breakpoint; language label + username hidden at ALL sizes. Define `--breakpoint-xs` in `index.css` or switch to `sm:inline`.
- [ ] **B2.** Wire or remove the dead Filters buttons in `MarketplaceSection.tsx` / `ProfessionalsSection.tsx` (`filtersOpen` toggles nothing; feature-complete `FilterPanel.tsx` sits unused). Same decision for orphaned-but-better `InquiryModal.tsx`.
- [ ] **B3.** `BlogSection.tsx`: "Read more" button does nothing → article view (route/dialog); word-boundary excerpt truncation (currently mid-word/mid-grapheme slicing).

### Batch C — Payment integrity (Chapa-only scope)
- [ ] **C1.** Apply D3 flag: hide TeleBirr CTA in `PremiumSection.tsx` unless `VITE_ENABLE_TELEBIRR=true`.
- [ ] **C2.** `src/pages/PaymentSuccessPage.tsx`: effect deps `[language]` re-runs verification on language toggle → double activation call. Run once on mount.
- [ ] **C3.** Idempotency guard on activation (safe re-visits of the success URL).

### Batch D — Data hygiene bugs
- [ ] **D-1.** `SiteLogSection.tsx`: signed-out users trigger unfiltered `SELECT *` on all site_logs; delete is hover-only (invisible on touch) with no confirmation; future dates allowed. Gate hook behind auth, always-visible delete + AlertDialog confirm, `max={today}`.
- [ ] **D-2.** `useVerification.ts`: stacked intervals (countdown runs 2×+ fast), none cleared on unmount.
- [ ] **D-3.** Fake emails written into `inquiries` (`marketplace@yebetweg.com` hardcoded); "Report price" button with no handler (`MarketPricesSection`); `PremiumSection` free-tier CTA targets wrong anchor; `AuthCallbackPage` retries an identical failing `verifyOtp`; `<button>` nested inside `<a>` in `AdsSection.tsx` native_card (React DOM-nesting warning); ignored `.maybeSingle()` error in `AdsSection`.

**Exit criteria:** every visible button does something real; search works across all five content types; full journey (search → RFQ → pay with Chapa → dashboard unlock) passes manually with zero console errors/warnings; typecheck/build/test green.

---

## PHASE 2 — Architecture Robustness 🟠

**Goal:** make every later change cheaper and safer.

- [ ] Adopt TanStack Query; migrate hooks one-by-one (start: `useTips`, `useBlogs`, `useListings`, `useProfessionals`, `useMarketPrices`) — kills stale-response races, dedupes refetch-on-mount across 6 homepage sections, makes errors surfaceable (today `useTips` silently drops failures → sections look empty).
- [ ] Introduce React Router; replace substring routing in `App.tsx` (`pathname.includes("/search")` also matches `/research`). Routes: `/`, `/dashboard`, `/search`, `/blog/:slug`, `/listing/:id`, `/payment/success`, `/auth/callback`, `/reset-password`. Keep hash-anchor scrolling via helper.
- [ ] Consolidate auth: retire localStorage mock-user custom auth (forgeable; root cause of RLS ID-domain mismatches); remove client-supplied `role` signup metadata (privilege escalation vector). Single source of truth: Supabase sessions.
- [ ] Centralize API layer: one typed `callFunction` wrapper (timeout/abort/retry, parsed error contracts, no anon-key-as-bearer); stop re-deriving URL/key in `api.ts`/`chapa.ts`/`telebirr.ts`; generate DB types via `supabase gen types` and delete raw casts (`as Tip[]`, `any` mappers).
- [ ] Error strategy: route-level ErrorBoundaries, toast + retry pattern, `role="status"` live regions for async messages.
- [ ] Dead weight removal: unused `InquiryModal`/`FilterPanel` (or adopt them — see B2), `sendNotification`, `PaymentHookResult` type, duplicate `Language` type in `assistant.ts`, one chart library (drop chart.js OR recharts), `crypto-js` dep, invalid `"en-ET"` locale.
- [ ] Repo/migration hygiene: fix naive `split(';')` runner (breaks on DO blocks); unify migration naming; move seeds to `seed.sql` (config.toml already points there); rename package from `shadcn-ui-template`; real favicon; actually load the Google Fonts being preconnected; add og:image.

**Exit criteria:** zero hand-rolled fetching; deep links work; fresh clone boots from `.env.example` placeholders; bundle chunks under warning threshold.

---

## PHASE 3 — Data Trust & Entitlements 🟡

**Goal:** the strategic wedge becomes trustworthy. (Anything requiring RLS changes waits for D1.)

- [ ] Server-side premium gating for `market_prices`: premium rows are currently served to anon and merely blurred client-side (trivially bypassable; index-based `FREE_ROWS=5` shifts with sorting). Filter by `access_level` per caller entitlement; blur becomes progressive enhancement only. *(If blocked by D1, implement via SECURITY DEFINER RPC in the meantime — allowed since it needs no RLS change.)*
- [ ] Verify deployed RPC quotas match claims: `create_listing` 3-active-listing cap, `submit_rfq` monthly cap (business_rules.md claims fixed — confirm against production DB).
- [ ] BOQ data layer: persist estimates (`boq_estimates` table: inputs JSONB, outputs, **canonical city key** — RfqModal currently sends the localized Amharic label), save/load/list in Dashboard, shareable permalink.
- [ ] Price freshness automation: cron edge function flags `freshness_status='expired'`; admin stale-price badge.
- [ ] Admin model alignment: one admin definition everywhere; confirmation dialogs on destructive admin ops (content delete / user ban fire immediately today).

**Exit criteria:** premium data not retrievable via network tab by free users; BOQ survives refresh; admins never need the SQL console.

---

## PHASE 4 — UI/UX & Accessibility Overhaul 🟢

**Goal:** appeal + trust for the Ethiopian audience.

- [ ] **Amharic copy pass (highest-leverage):** native review of all 200 i18n keys — many AM strings are gibberish machine translation ("ቨርያቄ አቅማቅያን", "አሉታዊ" for Recent, stray Georgian char in AdminDashboardTab, `dashboard.benefits.title` semantic mismatch). Migrate inline `language === 'en' ? … : …` ternaries into `i18n.tsx` as touched.
- [ ] Accessibility sweep: associate floating Labels (Marketplace/CreateListing/Professionals hire dialog), aria-label icon-only buttons (admin row actions, Footer send, search submit), keyboard-operable filter-chip Badges, skip-to-content link, extend `prefers-reduced-motion` to marquee/neon/float/shimmer/typewriter, live regions for async alerts.
- [ ] Mobile gaps: language label/username restore (B1); add search to mobile Sheet (zero search below `md` today); always-visible card actions (not hover-only); mobile labels for icon-only Dashboard tabs.
- [ ] Honesty pass: replace fabricated-as-live numbers (hero counters, Tips ticker duplicating DB data, Professionals "Trust Score" formula + "responds in 24h", SocialBridge fake play/view counts, VideoShowcase member count) with real COUNT queries or explicit illustrative labeling. Posters + `preload=none` on dual autoplay videos.
- [ ] State completeness: uniform skeleton/empty/error triad across all six list sections; success feedback after Join-network submit; "send another message" reset on Contact.
- [ ] Component upgrades: shared `PremiumGate` component (reimplemented in 4 sections), shared social-links constant (duplicated Footer/FloatingSocialBar), unified inquiry modal, blog article page, listing detail with image gallery.

**Exit criteria:** Lighthouse a11y ≥ 90 (home/dashboard/search); AM speaker completes estimate→RFQ→payment without English; no fabricated stats presented as live data.

---

## PHASE 5 — Strategic Differentiators 🟢

Per `Ref/Additional YBW-project dev concepts/EnhancementNotes-1/2.md` (Addis Cost Estimator is the bar):

- [ ] Multi-city BOQ pricing sourced from `market_prices` (replace flat `cityMultipliers` heuristic) — closes the direct competitor gap.
- [ ] BOQ Pro export: real CSV/XLSX + printable PDF via edge function, tier-gated server-side (today the button just navigates to `/#premium`).
- [ ] BOQ → actuals tracking (job-costing lite against saved estimates; reuse `site_logs` patterns) — estimator becomes tracker; retention hook.
- [ ] Telegram bridge growth loop: `/submitprice` supplier funnel feeding `market_prices`; weekly cement/rebar watch generated from DB; deep links back. Make `SocialBridgeSection` real.
- [ ] Supplier RFQ response loop (admin-mediated email/Telegram relay acceptable first step) — closes the lead loop; enables lead-fee story.
- [ ] Save-to-project on content (bookmark blogs/tips/prices into project folders).

**Exit criteria:** estimate→save→RFQ→supplier-response round trip demonstrable; first supplier-sourced price row enters via the Telegram funnel.

---

## PHASE 6 — Pre-Launch Hardening Gate ⚪

**Nothing ships publicly until this gate clears.**

- [ ] Clear **D1** (single consolidated RLS migration set) and **D2** (admin bypass, webhook HMAC, identity-from-JWT, credential rotation + git history purge).
- [ ] TeleBirr unfreeze decision (signature verification + sandbox E2E) or permanent removal from UI.
- [ ] Pen-test checklist: anon key cannot read users/payments/pending listings, cannot activate subscriptions, cannot invoke admin actions.
- [ ] SEO: per-route meta/OG images, sitemap, crawler-visible content (current reveal-on-scroll renders `opacity-0`), structured data for listings/professionals.
- [ ] Performance: lazy-load below-fold sections/videos, chunk splitting, image optimization.
- [ ] PWA basics (installable, offline shell) — worth pulling forward given connectivity realities.
- [ ] Telemetry: error reporting + funnel events (estimate started/completed, RFQ sent, pay click).
- [ ] Docs: collapse overlapping root MD files into README + TECHNICAL_DOCUMENTATION + this plan; refresh `Ref/PROJECT_CONTEXT.md` status; archive AI-tooling artifacts out of the repo.

---

## Verification Commands

```bash
npm run typecheck        # tsc --noEmit
npm run build            # tsc -b && vite build
npm run test             # node --test tests/**/*.test.mjs
git push origin dev && git push origin stable   # at every verified milestone
```

## References

- `Ref/PROJECT_CONTEXT.md` — product positioning (source of truth)
- `Ref/MVP_DEFINITION.md` — original MVP scope and gap analysis
- `Ref/Additional YBW-project dev concepts/EnhancementNotes-1.md` / `-2.md` — competitive intelligence feeding Phase 5
- `memory/security/project_rules.md` — deferral register mirror
- `memory/core/business_rules.md` — tiers, roles, entitlements, data access rules
