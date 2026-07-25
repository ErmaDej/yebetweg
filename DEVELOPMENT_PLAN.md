# YeBetWeg Development Plan

**Last Updated:** July 16, 2026
**Status:** MVP Phase — Frontend complete, backend services need deployment.

---

## Project Overview

YeBetWeg is a bilingual (English/Amharic) construction knowledge platform and marketplace connector serving the Ethiopian construction industry. Built with React + TypeScript + Vite frontend and Supabase backend.

---

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

---

## References

- [Ref/MVP_DEFINITION.md](./Ref/MVP_DEFINITION.md) — MVP scope, exit criteria, gap analysis
- [Ref/PROJECT_CONTEXT.md](./Ref/PROJECT_CONTEXT.md) — architecture and data model
- [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md) — deployment checklist
- [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md) — phased roadmap to launch
