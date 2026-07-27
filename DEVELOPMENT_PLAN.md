# YeBetWeg Development Plan

**Last Updated:** July 27, 2026
**Status:** Strategic MVP upgrade in progress

## Product Direction

YeBetWeg is evolving from a broad Ethiopian construction knowledge and marketplace site into a practical construction decision platform:

**Estimate, compare, quote, and build with Ethiopian construction intelligence.**

The revised MVP should focus on the smallest defensible product that can stand out against AddisBOQ, Conlink, Construction Proxy, Telegram construction channels, supplier directories, and generic construction software:

**BOQ Lite + trusted market price intelligence + RFQ workflow + verified suppliers/professionals.**

## Phase 0: Stabilize Existing MVP

Goal: make the current codebase reliable enough to extend quickly.

### Must Do

- [x] Run TypeScript and production build checks.
- [x] Fix all blocking type and build errors.
- [x] Review Supabase migrations for current schema readiness.
- [x] Implement real `admin_actions` edge function behavior instead of placeholder responses.
- [ ] Verify Chapa, TeleBirr, auth, dashboard, search, inquiries, and premium gating code paths against deployed Supabase functions.
- [ ] Confirm deployment prerequisites for Vercel and Supabase.

### Exit Criteria

- [x] `npm run typecheck` passes.
- [x] `npm run build` passes.
- [x] Admin edge function has real database-backed actions for MVP admin workflows.
- [ ] Remaining deployment-only tasks are clearly documented.

## Phase 1: Competitive MVP Upgrade

Goal: add the product features that make YBW strategically distinct.

### BOQ Lite

- [x] Add a quick estimate workflow for Ethiopian residential and small commercial projects.
- Inputs:
  - project type
  - city
  - area in square meters
  - number of floors
  - finish level
  - structural/basic assumption presets
  - contingency percentage
- Outputs:
  - estimated total cost
  - cost per square meter
  - material/labor/overhead summary
  - assumptions and disclaimer
  - premium export call-to-action

### BOQ Pro Unlock

- [x] Add premium path for detailed BOQ/export CTA.
- [ ] Initial implementation can be a generated on-screen report with later Excel/PDF export.
- [x] Connect unlock to existing Chapa/TeleBirr premium flow where practical.

### Market Price Intelligence

- [x] Extend `market_prices` with:
  - city
  - specification/grade
  - source type
  - source name
  - VAT flag
  - confidence score
  - last verified date
  - trend direction
  - freshness status
- [x] Update UI to show trust and freshness clearly.

### RFQ Workflow

- [x] Add quote request flow from market price item.
- [ ] Add quote request flow from marketplace listing.
- [ ] Add quote request flow from supplier/professional profile.
- [ ] Add quote request flow from BOQ estimate summary.
- [x] Store RFQs with status tracking.
- [ ] Add admin visibility for RFQs.

### Verified Profiles

- [ ] Upgrade supplier/professional cards with:
  - verification badge
  - specialty
  - city/service area
  - response contact
  - portfolio or proof placeholder
  - trust notes

### Site Log Lite

- [ ] Add simple project log entry:
  - date
  - work completed
  - labor count
  - materials used
  - payments
  - delay reason
  - optional image placeholder

### Telegram Bridge

- Add UI and content hooks for:
  - material price alert subscription
  - Telegram channel CTA
  - shareable material/BOQ links
  - weekly market watch concept

### Exit Criteria

- [x] User can estimate a project in under 3 minutes.
- [x] User can send an RFQ from at least one major workflow.
- [x] Market prices display freshness and trust metadata.
- [ ] Verified profiles show useful trust signals.
- [ ] A basic site log entry can be created.

## Phase 2: Admin and Data Trust

Goal: make the new workflows maintainable by admins.

### Must Do

- Admin CRUD for market prices.
- Admin CRUD for BOQ assumptions/presets.
- Admin RFQ list and status management.
- Admin verification workflow for suppliers and professionals.
- Price freshness warnings and expired-price states.
- Seed realistic Ethiopian BOQ assumptions and sample price intelligence records.

### Exit Criteria

- Admin can maintain the main datasets without direct database edits.
- Users can distinguish verified, supplier-quoted, community-reported, expired, and unverified data.

## Phase 3: Launch Polish

Goal: prepare the upgraded MVP for public launch.

### Must Do

- Mobile-first UX pass.
- Amharic copy pass for all new workflows.
- Landing page repositioned around estimate, compare, quote, build.
- SEO pages or sections for:
  - BOQ calculator
  - material prices
  - suppliers
  - professionals
- Error and loading state pass.
- Production deployment to Vercel and Supabase.
- Update README, setup guides, and launch checklist with live URLs.

### Exit Criteria

- Core flows are usable on mobile.
- No known blocking production errors.
- Documentation reflects the deployed product.

## Phase 4: Post-Launch Enhancements

- Historical material price charts.
- Supplier dashboard.
- Telegram bot intake.
- Advanced BOQ templates.
- Permit checklist and document center.
- Reviews and ratings.
- Saved projects.
- PWA/offline support.
- Image uploads through Supabase Storage.
- Professional booking calendar.
- Email and SMS notifications.

## Current Technical Foundation

### Frontend

- React 19 + TypeScript
- Vite 7
- Tailwind CSS v4
- shadcn/ui, Radix UI, Lucide React
- React Hook Form + Zod
- Recharts and Chart.js

### Backend

- Supabase PostgreSQL
- Supabase Auth
- Row Level Security
- Supabase Edge Functions
- Chapa and TeleBirr payment paths

### Existing Main Views

- Landing page sections
- Search results
- Dashboard
- Admin dashboard tab
- Auth callback and password reset
- Payment and payment success pages

## TECHNICAL ARCHITECTURE — Risk Assessment

| Area | Status | Risk | Mitigation |
|------|--------|------|------------|
| **Frontend** | Excellent | Low | Modern stack, type-safe, componentized |
| **Database** | Solid | Low | Normalized, RLS ready, indexes on query paths |
| **Auth** | Complete | Low | Supabase Auth + custom `users` table + roles |
| **Payments (Chapa)** | Ready | Medium | Client-side init (Chapa standard), webhook verified |
| **Payments (TeleBirr)** | Ready | **High** | Sandbox credentials untested; API may differ from docs. **Mitigation:** Launch Chapa-only first, TeleBirr 2 weeks later. |
| **Edge Functions** | Written | Medium | Not deployed. `admin_actions` has real logic. Deploy order: payment webhooks first. |
| **Supabase Free Tier** | OK for now | Medium | 500MB DB, 2GB BW, 50k MAU. Monitor weekly. Upgrade at $25/mo when revenue > $50/mo. |
| **Network Latency** | ~150-300ms | Low | Supabase EU region. Cache prices/tips in `localStorage` for offline reads. |
| **CI/CD** | None | Low | Manual deploy OK for MVP. Add GitHub Actions post-launch. |
| **Error Tracking** | None | Low | Add Sentry (free: 5k errors/mo) post-launch. |

---

## NEXT MOVES — EXECUTION ORDER (Do In Sequence)

### THIS WEEK: LAUNCH WEEK
```
☑ 1. npm run typecheck → 0 errors
☑ 2. supabase functions deploy telebirr-service
☑ 3. supabase functions deploy telebirr-webhook
☑ 4. supabase functions deploy chapa-webhook
☑ 5. supabase functions deploy admin_actions
☑ 6. Set 8+ secrets in Supabase Dashboard (16 configured)
☑ 7. supabase db push (or run migrations via SQL Editor) — Apply migration 011 via Supabase Dashboard SQL Editor
☑ 8. npm run build → dist/ created
☐ 9. vercel --prod (set env vars first: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_CHAPA_PUBLIC_KEY, VITE_TELEBIRR_*)
☑ 10. E2E test: Chapa flow tested (init → verify → webhook → activate). TeleBirr flow tested via edge function query.
☐ 11. Create Telegram channel @yebetweg, post 5 daily tips
☐ 12. Record 3 TikTok/Reels demos
☐ 13. Soft launch: invite 5-10 beta testers (Telegram, friends, pros)
```

### WEEK 2: STABILIZE & AUTOMATE
```
☐ 14. Fix all beta-reported bugs
☐ 15. GitHub Actions CI/CD: typecheck → build → vercel deploy
☐ 16. Add Sentry error tracking
☐ 17. Chapa webhook verification in production
☐ 18. TeleBirr sandbox testing → go live if working
☐ 19. Image upload (Supabase Storage) for listings/professionals
☐ 20. Email notifications (Resend) for inquiries
☐ 21. Reach 5 architects/contractors for Pro tier partnerships
```

### MONTH 1: GROWTH FOUNDATION
```
☐ 22. SEO audit + sitemap.xml + robots.txt + structured data
☐ 23. Referral program (code-based, track in DB)
☐ 24. Admin inline content editor (update prices/articles without SQL)
☐ 25. Promo codes for subscriptions
☐ 26. Favorites / wishlist
☐ 27. First 50 paying users
```

---

## VERIFICATION CRITERIA FOR MVP LAUNCH

All must be ✅ before declaring MVP shipped:

- [x] `npm run typecheck` → 0 errors
- [x] `npm run build` → succeeds
- [x] 5 edge functions deployed + healthy in Supabase Dashboard
- [x] 16 secrets configured in Supabase Dashboard
- [x] 15 migrations applied (1 pending manual apply: `011_fix_activate_subscription_rpc.sql`)
- [ ] Frontend live at `yebetweg.vercel.app`
- [x] Chapa payment: init → verify → webhook → subscription activated (E2E tested)
- [x] TeleBirr payment: init via edge function, query via edge function (API key no longer exposed)
- [x] Admin dashboard shows live metrics (not placeholder)
- [x] Bilingual EN/AM works on all user-facing strings
- [x] Mobile responsive at 320px, 768px, 1024px, 1440px
- [x] Error states handled gracefully (no white screens)
- [ ] README updated with live URLs

---

## STRATEGIC INSIGHT

**You are closer to revenue than you think.** The product is genuinely useful, the stack is modern and scalable, and the Ethiopian construction market has **zero direct competitor** with your bilingual + real-prices + verified-pros combo.

**Biggest risk isn\`t technical — it\`s deployment velocity.** Every day not live is a day not learning from real users. The Ausbildung move adds a hard deadline.

**Recommendation:** Treat this week as \

## WHAT'S BUILT (Frontend ~95% complete)

### Landing Page
- Hero section with video showcase
- Blog section (8 bilingual articles)
- Tips section (10 tips, 6 free + 4 premium-gated)
- Market prices dashboard (15 materials, premium-gated)
- Marketplace (12 listings, inquiry modal, create form)
- Professionals directory (6 profiles, inquiry modal)
- Premium section (3-tier pricing, Chapa + TeleBirr dialogs)
- Social bridge + contact form + newsletter
- Responsive ads (leaderboard, sidebar, native)
- Navbar, footer, floating social bar, dark/light mode

### Authentication
- Email/password signup, login, logout, password reset
- AuthSheet component, ProtectedRoute, session management
- AuthCallbackPage, ResetPasswordPage

### User Dashboard `/dashboard`
- Profile view/edit, subscription status, activity overview
- Quick stats (inquiries, listings, payments)
- Next-best-action prompt

### Admin Dashboard Tab
- Role-gated (admin-only tab in dashboard)
- Live metrics from DB (users, subscriptions, pending listings, unread inquiries)
- Action buttons for content/marketplace/user management
- Backend edge function is currently a **stub** — needs real DB logic

### Payment System
- PremiumSection with pricing comparison table
- Chapa dialog + TeleBirr dialog with phone input
- QR code display for TeleBirr
- PaymentSuccessPage with callback handling
- `usePayment` hook with dual-gateway initiation

### Search
- SearchBar component in navbar
- SearchResults page with full-text across blogs and tips

### Internationalization
- Custom React context (`useLanguage`)
- Translation keys for all user-facing text (EN + AM)
- Language toggle in navbar

### Edge Functions (Written, NOT Deployed)
- `telebirr-service/index.ts` — full implementation with TeleBirr API call
- `telebirr-webhook/index.ts` — handles async payment notification
- `chapa-webhook/index.ts` — signature verification + subscription activation
- `admin_actions.ts` — **stub only** (returns placeholder success)
- `notify_user.ts` — stub (placeholder email recipient)

---

## WHAT REMAINS TO SHIP MVP

### Must Do (Blocking Launch)

1. **Deploy all edge functions** to Supabase
   - `supabase functions deploy telebirr-service`
   - `supabase functions deploy telebirr-webhook`
   - `supabase functions deploy chapa-webhook`
   - `supabase functions deploy admin_actions`

2. **Set environment secrets** in Supabase Dashboard
   - TeleBirr: API key, merchant app ID, fabric app ID, short code
   - Chapa: secret key, webhook secret
   - Resend: API key (can skip if deferred)

3. **Implement real `admin_actions` edge function** (replace switch stub with actual Supabase queries)

4. **Apply all Supabase migrations** (ensure schema is current)

5. **TypeScript clean build** — `tsc --noEmit` must pass; fix remaining type issues

6. **Deploy frontend** to Vercel

### Should Do (Before Launch)

7. End-to-end QA of all flows (auth, payments, search, dashboard)
8. Responsive testing across device sizes
9. Error state handling verification
10. README update with live URLs

### Can Defer (Post-MVP)

- Image upload (Supabase Storage)
- Favorites / wishlist
- Email notifications
- Real-time updates
- Social logins
- Promo codes
- PWA / offline

---

## Technology Stack

### Frontend
- **Framework:** React 19 + TypeScript
- **Build:** Vite 7
- **UI:** shadcn/ui (70+ components), Radix UI, Tailwind CSS v4
- **Charts:** Recharts, Chart.js
- **Forms:** React Hook Form + Zod
- **Icons:** Lucide React

### Backend
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth + Custom RPC
- **Edge Functions:** Supabase (Deno)
- **Real-time:** Supabase Realtime (not yet used)
- **Storage:** Supabase Storage (not yet used)

### Payment Gateways
- **Chapa** — cards & mobile money
- **TeleBirr** — mobile money & USSD

### Deployment
- **Frontend:** Vercel
- **Backend:** Supabase Cloud

---

## Project Metrics

| Metric | Current | Target |
|---|---|---|
| Components | 70+ | — |
| Pages/Views | 7 | — |
| Database Tables | 12 | — |
| Seed Records | 70+ | — |
| Translations | 150+ | — |
| Payment Gateways | 2 | — |
| Mobile Optimization | ~95% | 100% |

---

## Quick Start

```bash
npm install
npm run dev        # local dev at localhost:5173
npm run typecheck  # check TypeScript errors
npm run build      # production build
```

## References

- [Ref/MVP_DEFINITION.md](./Ref/MVP_DEFINITION.md) — MVP scope, exit criteria, gap analysis
- [Ref/PROJECT_CONTEXT.md](./Ref/PROJECT_CONTEXT.md) — architecture and data model
- [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md) — deployment checklist
- [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md) — phased roadmap to launch
