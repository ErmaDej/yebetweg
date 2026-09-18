# YeBetWeg Development Roadmap

**Status:** MVP Phase — Ship the core platform end-to-end.

The full feature set is ~90% built in the frontend. What remains is deploying backend services, wiring them up, and shipping.

---

## Phase 0: SHIP MVP (Current — Target: July 2026)

### Objective
Deliver a working product to real users. No new features — only ship what exists.

### Track I: Deploy Backend Services

- [ ] **Deploy `telebirr-service` edge function** — `supabase functions deploy telebirr-service`
- [ ] **Set TeleBirr secrets** in Supabase Dashboard:
  - `VITE_TELEBIRR_API_KEY`
  - `VITE_TELEBIRR_MERCHANT_APP_ID`
  - `VITE_TELEBIRR_FABRIC_APP_ID`
  - `VITE_TELEBIRR_SHORT_CODE`
- [ ] **Deploy `chapa-webhook` edge function** — `supabase functions deploy chapa-webhook`
- [ ] **Set Chapa secrets** — `CHAPA_SECRET_KEY`, `CHAPA_WEBHOOK_SECRET`
- [ ] **Deploy `telebirr-webhook` edge function**
- [ ] **Deploy `admin_actions` edge function** (stub now; add real DB queries before deploy)
- [ ] **Apply all Supabase migrations** (15+ files in `supabase/migrations/`)

### Track II: Harden the Admin Backend

- [ ] **`admin_actions`** — Replace placeholder switch with real Supabase queries:
  - `manage_blogs` → CRUD on blogs table
  - `moderate_listings` → approve/reject listings
  - `manage_users` → list, suspend, update roles
  - `view_analytics` → aggregate counts from tables
- [ ] **Admin dashboard** — verify metrics load correctly after edge function is real

### Track III: Frontend Polish & Verify

- [ ] **TypeScript check** — `tsc --noEmit` must pass with zero errors
  - Fix any type issues in `Dashboard.tsx`, `AdminDashboardTab.tsx`, `PremiumSection.tsx`
- [ ] **Build check** — `vite build` must succeed
- [ ] **Payment flow QA**:
  - Chapa: open dialog → redirect → callback → subscription activates
  - TeleBirr: open dialog → enter phone → edge function called → QR shown → webhook → subscription activates
- [ ] **Auth flow QA**: register, login, logout, password reset, session persistence
- [ ] **Search QA**: search from navbar → results page renders
- [ ] **Responsive QA**: all sections at 320px, 768px, 1024px, 1440px
- [ ] **Error states**: API failure, network down, invalid input, expired session

### Track IV: Launch

- [ ] **Build and deploy frontend** to Vercel
- [ ] **Configure custom domain** (or staging subdomain)
- [ ] **Verify Supabase production project** (not on free tier if needed)
- [ ] **Update README** with live URLs
- [ ] **Run SETUP_CHECKLIST.md** from scratch on clean machine
- [ ] **Soft launch** — invite 5-10 beta testers

---

## Phase 1: Post-MVP Iteration (August 2026)

After shipping, collect real user feedback and prioritize the highest-impact improvements:

- Fix bugs found by beta users
- Image upload for listings & profiles (Supabase Storage)
- Favorites / wishlist
- Email notification for marketplace inquiries
- Price negotiation system
- Admin content editor (inline edit blogs/tips)
- Promo codes for subscriptions

---

## Phase 2: Growth (Q3–Q4 2026)

- Social logins (Google, Facebook)
- Professional booking / appointment calendar
- Invoice generation
- Real-time notifications
- PWA / offline support
- Analytics dashboard with charts
- CI/CD pipeline

---

## Phase 3: Scale (2027)

- Native mobile apps (React Native)
- AI-powered recommendations
- Third-party API (property data, mapping)
- Advanced caching, CDN, load testing
- Blockchain verification (research)

---

## How to Read This Roadmap

- **[ ] unchecked** = work remaining
- **Phase 0** is the entire focus. Nothing in Phase 1+ starts until Phase 0 ships.
- Priority within Phase 0: **Track I → Track II → Track III → Track IV** (back-end first, then front-end, then launch).
- See [Ref/MVP_DEFINITION.md](./Ref/MVP_DEFINITION.md) for the full scope definition and exit criteria.
