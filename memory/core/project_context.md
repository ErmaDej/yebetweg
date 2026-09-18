# YeBetWeg Project Memory Bank - Core Context

## Purpose
This file is the primary product and implementation reference for the YeBetWeg repository. Agents should treat it as the canonical definition of product direction, current implementation reality, and delivery priorities. When newer memory files or live code conflict with older notes, the repository code and this memory bank should take precedence.

## Product Definition
YeBetWeg is a bilingual Ethiopian construction decision platform that helps users move from idea to estimate to supplier/professional contact and execution tracking. The core promise is: Estimate, compare, quote, and build with Ethiopian construction intelligence.

## Primary Users
- Homeowners planning villas, renovations, G+1 to G+4 houses, and finishing works
- Small contractors and foremen who need estimates, quotes, leads, and site records
- Engineers, architects, quantity surveyors, and trades seeking visibility and inquiries
- Suppliers and service providers that want structured buyer demand
- Diaspora clients who need trustworthy local construction guidance

## Strategic Pillars
1. BOQ Lite
2. Market Intelligence
3. Marketplace and RFQ
4. Verified Professionals
5. Knowledge Hub
6. Site Log Lite
7. Telegram Bridge

## Current Implementation Reality
The app already includes:
- a public landing experience with blogs, tips, BOQ, market prices, marketplace, professionals, premium, social bridge, and contact sections
- route-based dashboard and admin surfaces
- bilingual UI via a custom language context
- Supabase-backed profile and subscription state
- admin CRUD flows for market prices and RFQs
- a role-aware user dashboard (Free/Premium/Pro/Admin) with access strength, quick actions, RFQ tracking, a filterable/sortable activity feed, and a premium/pro "Your plan includes" benefits panel (context-aware Access Strength CTA) — Phase A+B shipped on `dev`
- an admin operational-summary surface backed by the service-role `admin_actions` edge function (`operational_summary` action + `useAdminOperationalSummary` hook) — Phase C shipped on `dev`
- an animated "YeBetWeg Assistant coming soon" AI teaser on the dashboard (out of MVP scope, kept as a forward-looking product hook)

## Core Source Files
- [src/App.tsx](src/App.tsx) for route orchestration
- [src/pages/Dashboard.tsx](src/pages/Dashboard.tsx) for the user dashboard
- [src/pages/AdminDashboardTab.tsx](src/pages/AdminDashboardTab.tsx) for the admin workspace
- [src/hooks/useAdminOperationalSummary.ts](src/hooks/useAdminOperationalSummary.ts) for the admin operational-summary query
- [src/lib/i18n.tsx](src/lib/i18n.tsx) for language management and translations
- [src/hooks/useUserProfile.ts](src/hooks/useUserProfile.ts) for profile and subscription behavior
- [src/lib/entitlements.ts](src/lib/entitlements.ts) for plan entitlement logic
- [src/context/AuthContext.tsx](src/context/AuthContext.tsx) for authentication flow

## Quality Bar for All Work
All features should be:
- mobile-first and highly responsive
- visually polished and consistent with the shadcn/Tailwind design system
- bilingual and language-safe
- accessible and easy to navigate
- aligned with the product promise and current architecture

## Current Delivery Priorities
1. Stabilize backend services and deployment readiness
2. Overhaul user, premium, pro, and admin dashboards into role-aware power tools
3. Tighten mobile responsiveness and component polish
4. Strengthen i18n coverage and Amharic quality across the app
5. Prepare a cleanup review of stale, redundant, or conflicting files

## Dashboard Overhaul Priority
The dashboard system is now a near-term strategic milestone. The next iteration should deliver:
- role-aware user, premium, pro, and admin experiences
- richer analytics and quick actions
- RFQ, inquiry, and subscription visibility
- profile, verification, and billing status panels
- strong bilingual UX and mobile-first layouts

## Source-of-Truth Rule
For day-to-day implementation, agents should prefer:
1. this memory bank
2. the live code in the repository
3. the active development plan
4. older reference docs only as context