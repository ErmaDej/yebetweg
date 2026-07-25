# YeBetWeg MVP Definition

## Purpose
This document defines the **Minimum Viable Product** — the smallest set of features that delivers value to Ethiopian construction professionals and allows us to ship, collect feedback, and iterate.

## MVP Commitment
> Ship the product that works end-to-end for the core user journey. Everything else is deferred.

## MVP Scope (MUST SHIP)

### 1. Public Landing Page
All sections render correctly for anonymous visitors:
- Hero, Video Showcase, Blog, Tips, Market Prices, Marketplace, Professionals, Premium, Social Bridge, Contact, Ads
- Bilingual EN/AM toggle
- Dark/light theme
- Responsive mobile-first layout
- Navbar with navigation + auth sheet
- Footer with links

### 2. Authentication (Email/Password)
- Sign up, sign in, sign out
- Password reset flow
- Session persistence + token refresh
- Protected routes (dashboard, premium gating)

### 3. Knowledge Hub
- Blog listing with 8 articles, category filter, full-text search
- Tips section with 10 items (6 free, 4 premium-gated)
- Premium gating enforced by `activePlan` prop chain

### 4. Marketplace
- 12 listing cards (property, materials, services)
- Inquiry modal per listing — records to DB
- Category filtering
- Create listing form

### 5. Professionals Directory
- 6 professional profile cards with portfolio
- Inquiry contact modal per professional
- Category filter by specialty

### 6. Market Prices
- 15 material prices with change indicators
- Premium gating (free vs paid rows)

### 7. User Dashboard (`/dashboard`)
- Profile view/edit
- Subscription status display
- Activity overview (inquiries, listings, payments)
- Next-best-action prompt

### 8. Premium Payment Flow (end-to-end)
- Pricing table with 3 tiers (Free, Premium ETB 500/mo, Pro ETB 1 200/mo)
- "Pay with Chapa" dialog → redirect to Chapa
- **"Pay with TeleBirr" dialog → phone input → call `telebirr-service` edge function → QR code display** (blocked until edge function is deployed)
- Payment success page
- Subscription activation via webhook callbacks

### 9. Admin Dashboard Tab (for admin users)
- Role-based access (admin only)
- Live metrics (users, subscriptions, pending listings, unread inquiries)
- Quick-action buttons (manage blogs, moderate listings, etc.)
- **Backend edge function (`admin_actions`) needs real DB logic** (currently a stub)

## OUT OF SCOPE (Deferred to Post-MVP)
| Feature | Rationale |
|---|---|
| Social logins (Google, Facebook) | Not required for first users |
| Image upload via Supabase Storage | Manual seed data works for MVP |
| Favorites/wishlist | Nice-to-have engagement feature |
| Direct messaging between users | Inquiries provide enough initial contact |
| Professional booking/calendar | Requires calendar infra |
| Invoice generation & email | Can be done manually for first customers |
| Promo codes / discounts | Premature optimization |
| Email/SMS notification system | Placeholder Resend integration — no real sending |
| Real-time notifications | Can add post-launch |
| Analytics dashboard (admin) | Stub present; full dash post-MVP |
| PWA / offline support | Post-MVP |
| CI/CD pipeline | Manual deploy is fine for initial release |
| Native mobile apps | Far future |
| AI/ML recommendations | Research phase |

## MVP EXIT CRITERIA

All of the following must be true to declare MVP complete:

### ~~Functional Completeness~~
- [x] All 9 MVP sections above render without console errors
- [x] Auth flows (register, login, logout, password reset) work end-to-end
- [x] Premium gating hides premium content from free users
- [x] Marketplace inquiries write to DB and show in dashboard
- [ ] Payment flow: user can select plan → pay via Chapa or TeleBirr → subscription activates → premium content unlocks
- [ ] Admin dashboard shows live metrics from the database

### ~~Technical Completeness~~
- [ ] `telebirr-service` edge function deployed to Supabase
- [ ] TeleBirr secrets configured in Supabase dashboard
- [ ] `chapa-webhook` edge function deployed to Supabase
- [ ] `admin_actions` edge function has real DB operations (not just stubs)
- [ ] All edge functions handle CORS correctly
- [ ] Supabase migrations applied (all 15+ files)
- [ ] RLS policies working for authenticated/anonymous access

### ~~Quality~~
- [ ] TypeScript compiles with `tsc --noEmit` (zero errors)
- [ ] Build succeeds with `vite build`
- [ ] No "Illegal invocation" or radix dialog a11y warnings in console
- [ ] Error states handled gracefully (auth errors, payment failures, network errors)
- [ ] Bilingual text displayed correctly for all user-facing strings

### ~~Launch~~
- [ ] Frontend deployed to Vercel (or equivalent)
- [ ] Domain configured (custom or staging)
- [ ] Supabase project on production (not free tier if needed for scale)
- [ ] README updated with live URLs
- [ ] Quick-start guide tested from scratch on a clean machine

## Current Gap Analysis (as of Jul 2026)

| Area | Status | Remaining Work |
|---|---|---|
| Frontend UI | ~95% complete | Minor polish, no new sections needed |
| Auth | 100% complete | — |
| Content (seed data) | 100% complete | — |
| Payment UI | 90% complete | TeleBirr QR display integrated, edge function hookup pending |
| Payment backend | 40% complete | Functions written but not deployed; secrets not set |
| Admin dashboard | 60% complete | UI built, backend is a stub |
| Notifications | 10% complete | Stub only — deferred |
| Deployment | 0% complete | Not yet deployed anywhere |

## How to Ship MVP

```
1. Deploy edge functions → 2. Set secrets → 3. Build frontend → 4. Deploy to Vercel → 5. Test end-to-end → 6. Launch
```

Each step has a clear definition of done. No step requires building new features — only shipping what exists.
