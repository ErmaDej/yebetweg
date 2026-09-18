# YeBetWeg Project Rules & Conventions

## Core Rules
- Treat the memory bank as the project’s shared operating system for planning and execution.
- Prefer the current implementation in the repository over older docs or assumptions.
- Keep work aligned with the product promise: estimate, compare, quote, and build with Ethiopian construction intelligence.

## Dashboard Rules
- The dashboard is a strategic product surface and must be polished, role-aware, and useful.
- User, premium, pro, and admin experiences should feel clearly different and purpose-built.
- New dashboard work must support real workflows such as RFQs, inquiries, subscriptions, and profile status.

## UI and Experience Rules
- Build mobile-first and test layouts at small screen sizes.
- Keep the experience visually consistent with the current shadcn/Tailwind system.
- Preserve strong bilingual support in English and Amharic.
- Do not add new UI copy without considering the language context and translation strategy.

## Architecture Rules
- Keep auth, profile, and subscription flow consistent with [src/context/AuthContext.tsx](src/context/AuthContext.tsx), [src/hooks/useUserProfile.ts](src/hooks/useUserProfile.ts), and [src/lib/entitlements.ts](src/lib/entitlements.ts).
- Prefer existing components and patterns instead of introducing parallel implementations.
- Keep data access aligned with the Supabase schema and current edge-function architecture.

## Permission and Role Rules
- Respect the existing user, premium, pro, and admin concepts.
- Any dashboard or feature that exposes sensitive actions must follow role-aware logic.
- Keep RBAC and RLS concepts aligned when adding new protected features.

## Documentation Rules
- Update the memory files whenever scope, architecture, or priorities shift.
- Do not delete files or folders without checking whether they are still referenced by the app, docs, or memory bank.
- When a change affects multiple surfaces, update both the code and the relevant memory docs together.

## ⛔ Deferred Security Items — LAUNCH BLOCKERS (owner decision, Aug 26 2026)
Development-stage velocity was chosen over hardening. These items are consciously deferred to the **Phase 6 Pre-Launch Gate** in the root `DEVELOPMENT_PLAN.md`. **Do NOT ship to production with these open.** Any agent working near these areas must not "fix silently" either — coordinate via a phase branch.

### D1 — Database hardening (deferred; apply as one migration set later)
- RLS never enabled on `users` / `subscription_payments` (policies exist but inert → anon read/write incl. password_hash, payment history)
- `premium_subscriptions` `USING(true)` policy exposes all subscriptions
- Anon `listings` SELECT includes pending/unmoderated rows
- `site_logs` policies compare `auth.uid()` against wrong ID domain (need join via `users.auth_uid`)
- `ads` admin policies check `raw_app_meta_data` instead of `public.users.role`
- `login()`/`authenticate_user()` RPCs = unthrottled anon brute-force oracle
- `get_active_subscription(p_user_id)` granted to anon (IDOR)

### D2 — Payment/admin security (deferred)
- `_customUserId` body fallback in `admin_actions/index.ts` = unauthenticated admin bypass (smallest high-value fix; may be pulled forward anytime)
- `chapa-webhook` warns-and-proceeds on HMAC mismatch instead of rejecting
- Client-supplied identity (`p_custom_user_id`) in `create_listing` / `submit_inquiry`
- Live-looking secrets committed to git (`temp_env.sh`, `.env.example`, TeleBirr RSA key in `telebirr-service/index.ts` + tests) → rotate + purge history before launch

### D3 — TeleBirr frozen (product decision)
- Chapa-only during development. Hide TeleBirr CTA behind `VITE_ENABLE_TELEBIRR` (default false).
- No further TeleBirr investment until unfreeze; on unfreeze require webhook signature verification + sandbox E2E.