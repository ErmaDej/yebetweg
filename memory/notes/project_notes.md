# YeBetWeg Project Notes

## Implementation Observations
- Branch strategy: `stable` is the frozen working baseline (pushed Aug 1, 2026 from `dev@4612af6`); `dev` is the active integration branch; `feature/*` branches are merged into `dev`. `main` is the Vercel deploy reference but has DIVERGED from `dev`: `main` carries the Chapa/payment subscription-activation fixes (06468b2..28bc97d) while `dev` carries the dashboard overhaul (Phase A+B+C). `dev` is ahead of `main` by Phase A+B+C; PR #2 (dev -> main) is open to promote the dashboard work.
- Completed scope: Phase A (paginated dashboard data + refresh-on-focus, mobile grid, `dashboard.*` i18n), Phase B (premium/pro dashboard: context-aware Access Strength CTA + role-aware "Your plan includes" benefits panel via `entitlements.ts`), and Phase C (admin operational summary: `operational_summary` edge action + `useAdminOperationalSummary` hook + Operational Summary card in AdminDashboardTab). All merged to `dev`; `npm run typecheck` + `npm run build` green.
- The admin data path is the `admin_actions` Supabase Edge Function (service-role, JWT/admin-authorized). The dashboard panels call it via `callAdminAction` in `src/lib/api.ts`.
- The dashboard has been enhanced with role-aware theming (`ROLE_STYLES` in Dashboard.tsx), role-specific Quick Actions, an animated "YeBetWeg Assistant coming soon" teaser (pulsing Bot icon), access strength with profile-gap hints, and a filterable/sortable activity feed. These are deliberate UI/UX differentiators to preserve and build on, not remove.
- The AI Assistant concept is intentionally out of MVP scope but is a strong forward-looking hook; the current teaser should evolve into a real (optionally rule-based first) assistant without blocking the MVP dashboard work.
- The app uses a route-driven layout in [src/App.tsx](src/App.tsx), with dashboard and admin views rendered as separate pages.
- Authentication, profile, and subscription state are layered through [src/context/AuthContext.tsx](src/context/AuthContext.tsx) and [src/hooks/useUserProfile.ts](src/hooks/useUserProfile.ts).
- The app already has a strong bilingual foundation via [src/lib/i18n.tsx](src/lib/i18n.tsx), but new UI work should continue to reinforce consistency instead of introducing one-off strings.
- The current dashboard is functional but still too lightweight for a product that needs to feel premium, role-aware, and highly actionable.

## Known Risks and Gaps
- Some payment and admin workflows still depend on live deployment and verification.
- The dashboard experience should be treated as a product differentiator rather than a placeholder.
- More visual polish and responsive QA are needed for small screens and Amharic-heavy content.
- The repository contains a mix of strategic docs, implementation notes, and legacy materials; a cleanup review should happen only after the active plan is stable.
- Chapa sandbox rejects emails on unverifiable domains (e.g., `@yebetweg.com` fails `validation.email` because the domain has no MX/DNS records). Real customer emails (gmail, etc.) work. When testing with seeded accounts, use a real email or the admin manually upgrades the role.
- Pending migration `20260730000001_fix_premium_subscriptions_rls.sql` (INSERT/UPDATE policies) has NOT been applied to the remote project yet. The payment flow works without it because subscription creation and activation run server-side with the service role. Apply via Supabase Dashboard SQL editor or `supabase db push` when convenient.
- NEW (Phase C): the `operational_summary` action was added to the `admin_actions` edge function in the repo, but it has NOT been redeployed to Supabase yet. Run `supabase functions deploy admin_actions` (or redeploy via the Supabase Dashboard) so the Operational Summary card can fetch data. The frontend hook degrades gracefully (shows an error alert) until the function is redeployed. NOTE: the user has confirmed the edge function was already redeployed and the operational_summary query works from the Supabase SQL editor; the Operational Summary card should now return live counts.

## Phase D - AI Assistant (rule-based MVP)
- The "YeBetWeg Assistant coming soon" teaser was replaced with a working, bilingual rule-based chat (src/lib/assistant.ts + src/components/assistant/AssistantCard.tsx). It reads open RFQs and profile strength from the live user and answers keyword-based FAQs (RFQs, profile, market prices, BOQ, pros, subscription). LLM-backed expansion is deferred (not MVP-blocking).
- Note: `supabase db push --dry-run` failed (migration drift) — deferred per user; do not run migrations until reviewed.

## Working Notes for Future Agents
- Prefer editing existing components and UI patterns rather than introducing parallel solutions.
- Keep new features compatible with the current role and subscription model.
- Do not break the custom language context when adding new UI copy.
- When a feature touches both an endpoint and UI, update the memory docs and the related code path together.

## Cleanup Review Queue
The following are candidates for later review, not immediate deletion:
- older planning notes in the repository root that may overlap with the new memory bank
- screenshots or temporary assets that are no longer referenced in the app
- local setup scripts that may be outdated or environment-specific
- duplicate or stale documentation drafts under the Ref and root folders

## Postponed Work
- image upload through Supabase Storage
- favorites or wishlist flows
- social logins
- appointment booking and invoice generation
- PWA or native app work
- advanced analytics beyond the dashboard overhaul
- Telebirr payment gateway integration — deferred due to incomplete documentation and inability to locate notify URL/webhook configuration in the Ethio Telecom developer portal. Decision recorded July 30, 2026. Revisit once docs improve or consider Chapa-only for go-live.

## Recommended Working Rhythm
- update the memory files whenever key scope, architecture, or priorities change
- keep the dashboard plan and the UI quality bar visible in daily work
- re-check the memory bank before making large feature or deletion decisions