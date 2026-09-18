# YeBetWeg Development Plan

## Current Status
- Last updated: August 26, 2026
- Current posture: full codebase audit complete. Master plan revised and relocated to root **`DEVELOPMENT_PLAN.md`** (single source of truth for phases). Owner approved deferring Phase 0 security work to the Phase 6 Pre-Launch Gate (see Deferral Register below) and freezing TeleBirr (Chapa-only dev mode). Active work: **Phase 1 — Correctness Blitz**.
- Active branch: `dev`. Workflow: `feature/*` → `dev` (every milestone) → `stable` (verified snapshots) → PR to `main` only when a phase completes (production view).

## Master Plan Pointer (Aug 26, 2026 revision)
Phases, batches, file references, exit criteria, and verification commands all live in `/DEVELOPMENT_PLAN.md`. Summary:
1. **Phase 1 — Correctness Blitz** (ACTIVE): search pipeline fixes (useSearch dead columns, ?q= param, double-pagination), Navbar xs-breakpoint bug, dead Filters buttons/blog Read-more, Chapa-only payment flag + PaymentSuccessPage idempotency, SiteLog/useVerification/data-hygiene bugs.
2. **Phase 2 — Architecture Robustness**: TanStack Query, React Router, auth consolidation (retire custom-auth mock user), typed API layer, error strategy, dead-code/migration/repo hygiene.
3. **Phase 3 — Data Trust & Entitlements**: server-side premium gating via RPC (RLS changes deferred), quota verification, BOQ persistence + canonical city keys, price freshness cron, admin model alignment.
4. **Phase 4 — UI/UX & Accessibility Overhaul**: Amharic copy pass, a11y sweep, mobile gaps, honesty pass on fabricated stats, state completeness, shared components.
5. **Phase 5 — Strategic Differentiators**: multi-city BOQ pricing, BOQ Pro export, BOQ→actuals, Telegram bridge growth loop, supplier RFQ loop, save-to-project.
6. **Phase 6 — Pre-Launch Hardening Gate**: clears Deferral Register (D1/D2), pen-test checklist, SEO/perf/PWA/telemetry/docs collapse.

### Deferral Register (mirror of DEVELOPMENT_PLAN.md §Deferral Register)
- **D1** database hardening bundle (RLS enablement on users/subscription_payments, policy fixes) → Phase 6. Full checklist in project_rules.md.
- **D2** payment/admin security bundle (admin_actions bypass, webhook HMAC, JWT identity, secret rotation) → Phase 6.
- **D3** TeleBirr frozen → Chapa-only; feature-flag CTA off.

### Branch & sync discipline (mandatory)
- Every milestone: typecheck+build+test green → push `origin/dev`; refresh `stable`.
- Memory bank updated at every milestone (progress_tracker, this file, business_rules if rules changed, changelog).
- Merge `dev`→`main` only at phase completion; tag `phase-N-complete`.

## Working Principles
- Prefer the live repository code over older planning notes.
- Keep the product experience mobile-first, polished, and bilingual at every step.
- Treat dashboard experience as a high-value product surface, not just a shell.
- Avoid introducing new features that bypass the current auth, profile, and entitlement flows.

## Phase 0 - Stabilize and Consolidate
- [x] Maintain a working TypeScript build and production build path
- [x] Keep the major public sections functional
- [x] Preserve the existing Supabase-backed auth/profile/subscription architecture
- [x] Deploy and verify backend functions for payments and admin actions (all 5 edge functions verified)
- [x] Chapa payment flow verified end-to-end (initialize -> checkout -> activation -> role upgrade)
- [x] Finish QA for auth, payments, and search
- [ ] Apply pending migration `20260730000001_fix_premium_subscriptions_rls.sql` (adds INSERT/UPDATE RLS policies; current flow works without it via service-role edge function, apply for defense-in-depth)
- [ ] Final responsive QA pass across all public and dashboard surfaces

## Phase 1 - Dashboard and UX Overhaul
This is the next major priority, built on the current role-aware dashboard (theming, Quick Actions, AI Assistant teaser, access strength, RFQ tracking).

### Phase A - Stabilize & Deepen the User Dashboard (done)
- [x] A1. Extend `useDashboardData` with pagination (`limit`, `loadMore`, `hasMore`, `loadingMore`) + `refreshOnFocus`
- [x] A1. Wire `loadMore` into Dashboard.tsx activity feed + RFQ tracking empty-state
- [x] A2. Mobile grid polish (`sm:grid-cols-3` stats grid); empty states present
- [x] A3. Centralize dashboard labels into `dashboard.*` i18n keys (EN + AM)

### B. Premium and Pro Dashboard Experience (done)
- [x] B1. `entitlements.ts` — `PLAN_BENEFITS`, `roleKeyFor`, `planBenefits(roleKey)`; localized benefit labels via `dashboard.benefits.*`
- [x] B2. Context-aware Access Strength CTA per roleKey (free->Upgrade access, premium->Upgrade to Pro, pro->Explore pro tools, admin->Review operations)
- [x] B3. Role-aware "Your plan includes" benefits panel in the Subscription card (free/premium/pro/admin)

### C. Admin Dashboard Upgrade
- [x] C1. Operational summary (new RFQs, pending verifications, churn risk) via a service-role query path — `operational_summary` action in `admin_actions` edge fn + `useAdminOperationalSummary` hook + Operational Summary card in AdminDashboardTab
- [x] C2. Bulk approve/reject + row actions in RfqManager / listing moderation — `moderate_listings` & `manage_rfqs` admin actions now accept `listingIds`/`rfqIds` arrays; AdminDashboardTab listings grid + RfqManager cards support multi-select with select-all + bulk apply (Approve/Reject selected / bulk status). Per-row actions retained.

### D. UI, Mobile, and Language Quality Bar (running)
- [ ] Mobile-first gate on every dashboard surface
- [ ] Amharic as a first-class column (i18n dict)
- [ ] Role-aware clarity for free/premium/pro/admin
- [ ] Preserve and extend the existing bilingual UX patterns in English and Amharic
- [ ] Avoid hard-coded strings in new UI work; use the language context system consistently
- [ ] Make cards, tabs, tables, and action states visually coherent and polished

## Phase D - AI Assistant (rule-based MVP shipped; LLM later)
Your "YeBetWeg Assistant coming soon" teaser is now a working rule-based helper:
- [x] D1. `src/lib/assistant.ts`: stat-aware greeting + keyword-intent FAQ answers (RFQs, profile strength, market prices, BOQ, pros, subscription) in EN/AM
- [x] D2. `src/components/assistant/AssistantCard.tsx`: compact embeddable chat surface (messages, quick-reply chips, input)
- [x] D3. Replaced the dashboard teaser with `<AssistantCard>`; added a `plan` memo + `dashboard.assistant.*` i18n keys
- [ ] D4. Expand to an edge-function-backed LLM assistant later (not blocking the MVP)

The rule-based assistant reads the user's own stats (open RFQs via `useDashboardData`, profile strength via `profileStrength`) and answers top FAQs. The conversation is stateless per-session; the LLM path is deferred (see project_notes.md).

## Phase 2 - Product and Data Trust
- [ ] Improve BOQ assumptions and premium report experience
- [ ] Strengthen price confidence, freshness, and trust signals
- [ ] Expand verification workflows for suppliers and professionals
- [ ] Add more useful site-log and project-tracking workflows

## Phase 3 - Launch Polish and Cleanup
- [ ] Finish deployment readiness for Vercel and Supabase
- [ ] Refine onboarding, error states, and empty states
- [ ] Review and remove stale or redundant files after validating their usage
- [ ] Update documentation so agents and contributors read the same source of truth

## Definition of Done for the Dashboard Work
The dashboard overhaul is considered complete when:
- user, premium, pro, and admin surfaces are clearly differentiated
- the experience is polished on mobile and desktop
- the bilingual UX feels consistent and complete
- the UI clearly supports RFQ, inquiry, profile, and subscription workflows
- the implementation remains compatible with the current auth and subscription model
