# YeBetWeg Project Context

## Purpose

This file is the source of truth for the YeBetWeg project. It collects the current architecture, technology stack, features, documentation index, and core implementation details in a single curated reference.

## Project Overview

**YeBetWeg (የቤት-ወግ)** is a construction knowledge platform and marketplace connector for Ethiopia. It supports bilingual content in English and Amharic and integrates a Supabase backend for real-time data, user interaction, and marketplace functionality.

## Key Features

- Knowledge Hub with 8 bilingual construction articles
- Construction tips section with 10 expert tips (6 free, 4 premium)
- Market prices dashboard for 15 construction materials
- Marketplace with 12 listings across property, materials, and professional services
- Professionals directory with 6 verified construction experts
- Premium membership system with tiered access
- Advertisement slots and social media integration
- Contact form and newsletter subscription
- Dark/light mode and language toggle
- Responsive mobile-first design

## Technology Stack

- Frontend: React 19, TypeScript, Vite 7
- Styling: Tailwind CSS v4, OKLCH color palette
- UI Components: shadcn/ui, Lucide React, Radix UI
- Forms: React Hook Form, Zod
- Backend: Supabase (PostgreSQL, RLS, real-time)
- Internationalization: custom React context and translation keys
- Animation: CSS animations + intersection observer

## Project Structure

```
src/
├── components/
│   ├── icons/
│   ├── layout/
│   ├── sections/
│   └── ui/
├── hooks/
├── lib/
├── App.tsx
├── main.tsx
└── index.css
supabase/
├── migrations/
public/
├── assets and static files
package.json
vite.config.ts
tsconfig.json
README.md
TECHNICAL_DOCUMENTATION.md
USER_MANUAL.md
QUICK_START_GUIDE.md
SETUP_CHECKLIST.md
DATABASE_MIGRATION_INSTRUCTIONS.md
SUPABASE_MIGRATION_GUIDE.md
IMPLEMENTATION_SUMMARY.md
PROJECT_COMPLETION_SUMMARY.md
Ref/
```

## Documentation Index

| File | Purpose |
|------|---------|
| `README.md` | High-level product overview, feature summary, quick start for users and developers |
| `TECHNICAL_DOCUMENTATION.md` | Architecture, stack, schema, implementation details, and system design |
| `USER_MANUAL.md` | End-user guide with workflows, features, and FAQs |
| `QUICK_START_GUIDE.md` | Rapid onboarding and most common actions for users |
| `SETUP_CHECKLIST.md` | Development & deployment checklist, verification steps |
| `DATABASE_MIGRATION_INSTRUCTIONS.md` | Database migration workflow and Supabase setup steps |
| `SUPABASE_MIGRATION_GUIDE.md` | Supabase credentials and migration execution guide |
| `IMPLEMENTATION_SUMMARY.md` | Implementation highlights, feature completion report |
| `PROJECT_COMPLETION_SUMMARY.md` | Final project delivery summary, readiness status |
| `ASSETS_AND_IMAGES.md` | Image asset inventory and usage notes |

## Existing Documentation Sources

The following documents are the primary references for YeBetWeg:

- `README.md`
- `TECHNICAL_DOCUMENTATION.md`
- `USER_MANUAL.md`
- `QUICK_START_GUIDE.md`
- `SETUP_CHECKLIST.md`
- `DATABASE_MIGRATION_INSTRUCTIONS.md`
- `SUPABASE_MIGRATION_GUIDE.md`
- `IMPLEMENTATION_SUMMARY.md`
- `PROJECT_COMPLETION_SUMMARY.md`
- `ASSETS_AND_IMAGES.md`

## Core Database and Data Model

### Tables

- `blogs`
- `tips`
- `market_prices`
- `listings`
- `professionals`
- `ads`
- `subscribers`
- `inquiries`
- `premium_subscriptions`

### Sample Data Summary

- 8 blog articles
- 10 construction tips
- 15 market price records
- 12 marketplace listings
- 6 professional profiles
- 3 advertisements

## Runtime Configuration

- `.env` contains Supabase project credentials and environment variables
- `package.json` defines scripts: `dev`, `build`, `typecheck`, `preview`
- `tsconfig.json` and `vite.config.ts` define build settings

## Notes for Future Work

- Expand marketplace listing submission workflow
- Add user authentication beyond anonymous Supabase access
- Create image upload support for listings and profiles
- Implement historical market price charts
- Add admin dashboard for content moderation

---

*Created as the curated project context reference for YeBetWeg.*
