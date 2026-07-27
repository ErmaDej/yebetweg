# YeBetWeg Project Context

## Purpose

This file is the source of truth for the YeBetWeg project. It defines the product position, target users, strategic differentiators, core workflows, MVP scope, technology stack, and current delivery priorities.

## Product Overview

**YeBetWeg (YBW / የቤት-ወግ)** is a bilingual Ethiopian construction decision platform that helps homeowners, small contractors, engineers, suppliers, and property builders move from idea to estimated budget, supplier quotes, trusted professionals, and site progress tracking.

YBW is not only a construction blog, marketplace, or price board. It is the practical workflow layer for Ethiopian building decisions:

1. Learn what to build and what it requires.
2. Estimate construction cost using Ethiopian BOQ assumptions.
3. Compare current material prices by city and source confidence.
4. Convert BOQ materials into supplier quote requests.
5. Find verified professionals and service providers.
6. Track site activity and payments during execution.

## Strategic Positioning

YBW should stand out by being more trustworthy than Telegram-only channels, more complete than BOQ-only calculators, more actionable than content portals, and more locally relevant than generic construction software.

The core product promise:

> Estimate, compare, quote, and build with Ethiopian construction intelligence.

## Target Users

- Homeowners planning villas, G+1 to G+4 houses, renovations, finishing works, or small commercial projects.
- Small contractors and foremen who need estimates, material prices, quote requests, leads, and site logs.
- Engineers, architects, quantity surveyors, contractors, foremen, and trades seeking visibility and client inquiries.
- Suppliers and shops that want verified buyer demand and structured quote opportunities.
- Diaspora clients who need trusted local construction information before committing money.

## Competitive Context

Direct and adjacent competitors include AddisBOQ, Addis Cost Estimator, Conlink, Construction Proxy, Construction Resources Telegram, Construction Et Market Telegram, Ethio Construction Engineering Telegram, Kabu, EthioMaterial, Shaleqa, and Ethiopian ecommerce or supplier directory sites.

Observed competitor strengths:

- BOQ calculators and paid exports.
- Telegram-first material price distribution.
- Supplier and material catalogs.
- Job, tender, and professional communities.
- Ecommerce-style product discovery.
- Site log and contractor workflow features.

Observed gaps YBW can exploit:

- Telegram data is large but unstructured and hard to trust.
- BOQ-only products do not strongly connect estimates to supplier quotes, professionals, education, and project tracking.
- Generic directories are not workflow-centered.
- Supplier marketplaces often lack homeowner guidance and trust metadata.
- International construction software is too heavy for the Ethiopian homeowner and small-contractor market.

## Core Differentiator

YBW combines BOQ, market prices, supplier and professional matching, educational guidance, and Telegram/community distribution in one mobile-first bilingual experience.

The minimum defensible wedge is:

**BOQ Lite + trusted market price intelligence + RFQ workflow + verified suppliers/professionals.**

## MVP Product Pillars

### 1. BOQ Lite

- Quick construction cost estimate for common Ethiopian building types.
- Inputs: project type, city, built-up area, floors, finish level, structural assumptions, and optional contingency.
- Outputs: estimated total, cost per square meter, major material summary, labor/overhead allowance, assumptions, and disclaimer.
- Premium path: BOQ Pro export or detailed report unlock.

### 2. Market Intelligence

- Material prices by city, unit, grade/specification, VAT status, source type, source name, date, and confidence score.
- Freshness labels such as verified, community reported, supplier quoted, expired, or needs confirmation.
- Trend indicators and premium historical analytics over time.

### 3. Marketplace and RFQ

- Listings for materials, property, equipment, services, and construction opportunities.
- RFQ flow from a material, listing, supplier, or BOQ summary.
- Quote request status tracking for users and admins.
- Future supplier dashboard for responding to RFQs.

### 4. Verified Professionals and Suppliers

- Searchable profiles for engineers, architects, contractors, quantity surveyors, foremen, trades, and suppliers.
- Verification badge, specialties, service areas, portfolio, response contact, and trust notes.
- Inquiry flow from each profile.

### 5. Knowledge Hub

- Bilingual articles and construction tips tied to practical actions such as estimate, permit, hire, buy, compare, and track.
- Premium content should support decisions, not merely hide generic articles.

### 6. Site Log Lite

- Daily work note, labor count, materials used, payments, delays, and optional photo record.
- Exportable or shareable project summary in a later phase.

### 7. Telegram Bridge

- Telegram should be a growth and distribution loop, not just a social icon.
- Use cases: material price alerts, featured suppliers, weekly cement/rebar watch, RFQ intake, listing promotion, and deep links back to YBW.

## Current Implemented Foundation

- React 19 + TypeScript + Vite frontend.
- Tailwind CSS v4, shadcn/ui, Radix UI, Lucide React.
- Supabase backend with PostgreSQL, RLS, auth, migrations, and edge function structure.
- Bilingual English/Amharic language system.
- Existing sections for hero, blogs, tips, market prices, marketplace, professionals, premium, ads, contact, dashboard, search, and authentication.
- Chapa and TeleBirr integration code paths.

## Technology Stack

- Frontend: React 19, TypeScript, Vite 7.
- Styling: Tailwind CSS v4, OKLCH color palette.
- UI Components: shadcn/ui, Lucide React, Radix UI.
- Forms: React Hook Form, Zod.
- Backend: Supabase PostgreSQL, Auth, RLS, Edge Functions.
- Internationalization: custom React context and translation keys.
- Payments: Chapa and TeleBirr.
- Deployment: Vercel frontend, Supabase backend.

## Core Database and Data Model

Existing tables:

- `blogs`
- `tips`
- `market_prices`
- `listings`
- `professionals`
- `ads`
- `subscribers`
- `inquiries`
- `premium_subscriptions`
- `users`
- `subscription_payments`

Required strategic additions:

- BOQ assumptions and presets.
- BOQ estimates or saved project estimates.
- RFQ requests and RFQ line items.
- Supplier verification metadata.
- Price confidence, source, city, freshness, VAT, and trend metadata.
- Site log entries.

## Monetization

- Premium BOQ exports and project reports.
- Supplier and professional verification.
- Featured supplier/professional placement.
- RFQ lead fees or supplier subscriptions.
- Premium market price analytics and alerts.
- Relevant construction brand sponsorships and ads.
- Site Log Pro subscription for contractors.

## MVP Success Metrics

- A user can generate a quick estimate in under 3 minutes.
- A user can view fresh material prices with confidence metadata.
- A user can send an RFQ from a material, listing, supplier, or BOQ list.
- A user can contact a verified professional or supplier.
- A user can create one daily site log entry.
- An admin can manage prices, listings, professionals, RFQs, and verification status.

## Current Delivery Priority

The project is in a strategic MVP upgrade phase. The next delivery sequence is:

1. Stabilize existing build and backend functions.
2. Add BOQ Lite.
3. Extend price intelligence metadata.
4. Add RFQ workflow.
5. Upgrade supplier/professional trust profiles.
6. Add Site Log Lite.
7. Polish launch UX, Amharic copy, and deployment readiness.

---

*Last updated: July 26, 2026.*
