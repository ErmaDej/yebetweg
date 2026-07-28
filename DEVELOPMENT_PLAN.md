# YeBetWeg Development Plan

**Last Updated:** July 28, 2026  
**Status:** Phase 1 feature complete — Admin CRUD, RFQ management, trust cards, Site Log Lite

## Progress Snapshot

- [x] Project context replaced with competitor-informed YBW positioning.
- [x] Development plan replaced with phased execution plan.
- [x] Phase 0 typecheck and production build verified.
- [x] `admin_actions` edge function upgraded with full CRUD for market prices (create/read/update/delete, bulk CSV import, single edit).
- [x] BOQ Lite estimator added to the landing flow.
- [x] Market price intelligence migration added.
- [x] Market price UI upgraded with trust, freshness, source, VAT, city, and RFQ action metadata.
- [x] RFQ database workflow migration added.
- [x] RFQ modal wired to market price quote requests.
- [x] **RFQ modal upgraded to support generic sources** (listings, professionals, BOQ estimate).
- [x] **RFQ button added to marketplace listing cards** with full context passing.
- [x] **RFQ button added to professional profile cards** alongside existing Hire flow.
- [x] **RFQ button wired to BOQ estimate summary** replacing placeholder #marketplace nav link.
- [x] **Admin Market Price CRUD** — Full table view, inline add/edit dialog, delete, CSV bulk import in Admin Dashboard.
- [x] **Admin RFQ Management** — Dedicated panel with list, status dropdown, detail view, admin notes per RFQ.
- [x] **Verified Professional Trust Card Upgrade** — Prominent verification badge, trust score bar, portfolio count badge, response time indicator.
- [x] **Site Log Lite** — New `site_logs` table migration, entry form (date, work, labor, materials, payments, delays), listing with delete.
- [ ] New migrations applied to the target Supabase project.
- [ ] Telegram bridge upgrade.
- [ ] Launch polish and final deployment.

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
- [x] Add quote request flow from marketplace listing.
- [x] Add quote request flow from supplier/professional profile.
- [x] Add quote request flow from BOQ estimate summary.
- [x] Store RFQs with status tracking.
- [x] Add admin visibility for RFQs with full status management UI.

### Verified Profiles

- [x] Upgrade supplier/professional cards with:
  - verification badge (prominent corner badge + avatar ring)
  - specialty
  - city/service area
  - response contact
  - portfolio or proof count badge
  - trust score visualization (gradient bar)
  - trust level (high/medium/low)

### Site Log Lite

- [x] Add simple project log entry:
  - date
  - work completed
  - labor count
  - materials used
  - payments
  - delay reason
  - notes
  - delete entry

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
- [x] Verified profiles show useful trust signals (score bar, verification badge, portfolio count).
- [x] A basic site log entry can be created.

## Phase 2: Admin and Data Trust

Goal: make the new workflows maintainable by admins.

### Must Do

- [x] Admin CRUD for market prices (with CSV bulk import).
- Admin CRUD for BOQ assumptions/presets.
- [x] Admin RFQ list and status management.
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

## Quick Start

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

## References

- [Ref/PROJECT_CONTEXT.md](./Ref/PROJECT_CONTEXT.md) - strategic product context
- [Ref/MVP_DEFINITION.md](./Ref/MVP_DEFINITION.md) - previous MVP scope and gap analysis
- [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md) - deployment checklist
- [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md) - prior phased roadmap
