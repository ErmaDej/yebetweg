# YeBetWeg Developer Onboarding Guide

## Purpose

This guide is the developer onboarding reference for YeBetWeg. It consolidates the existing project documentation into one practical checklist and introduces the codebase, architecture, setup, and development workflow.

## Project Summary

YeBetWeg is a React + TypeScript + Vite web app for Ethiopian construction knowledge and marketplace services. It uses Tailwind CSS, shadcn/ui components, Lucide icons, and a Supabase backend for data storage, real-time sync, and security.

## Quick Start

### 1. Clone the repository

```bash
git clone <repo-url>
cd yebetweg
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create or update `.env` at the project root with Supabase values:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

### 4. Run the development server

```bash
npm run dev
```

Open the local Vite URL shown in the terminal.

### 5. Build and typecheck

```bash
npm run build
npm run typecheck
```

### 6. Preview production build

```bash
npm run preview
```

## Core Architecture

### Technology stack

- React 19
- TypeScript
- Vite 7
- Tailwind CSS v4
- shadcn/ui components
- Supabase (PostgreSQL + RLS)
- React Hook Form + Zod
- Lucide React icons
- Next Themes for dark/light mode

### Key directories

- `src/components/` — UI components and section layouts
  - `layout/` — navbar, footer, floating social bar
  - `sections/` — homepage sections such as hero, blog, tips, market prices, marketplace, professionals, premium, ads, contact
  - `ui/` — shadcn reusable components
- `src/hooks/` — data-fetching and UI hooks
- `src/lib/` — shared utilities, translation context, and Supabase client
- `supabase/migrations/` — SQL schema and seed data
- `public/` — static assets

### Core files

- `src/App.tsx` — main page composition
- `src/main.tsx` — React application entry point
- `src/lib/supabase.ts` — Supabase client initialization
- `src/lib/i18n.tsx` — bilingual translation context and keys
- `src/hooks/useBlogs.ts` — blog data logic
- `src/hooks/useMarketPrices.ts` — market price logic
- `src/hooks/useListings.ts` — marketplace listing logic
- `src/hooks/useProfessionals.ts` — professionals directory logic

## Database and Data Model

### Main tables

- `blogs` — articles and knowledge content
- `tips` — free and premium construction tips
- `market_prices` — material price data
- `listings` — marketplace items and services
- `professionals` — verified professional profiles
- `ads` — advertisement slots
- `subscribers` — newsletter signups
- `inquiries` — contact submissions
- `premium_subscriptions` — membership tracking

### Supabase notes

- RLS is enabled across tables
- Public read access is permitted for content tables
- Write access is restricted to authenticated/authorized workflows
- Seed data is available in `supabase/migrations/20260508182337_002_yebetweg_seed_data.sql`

## Development Workflow

### Recommended workflow

1. Start the dev server: `npm run dev`
2. Make changes in `src/`
3. Validate TypeScript: `npm run typecheck`
4. Build for production: `npm run build`
5. Preview production output: `npm run preview`

### Code conventions

- Prefer TypeScript typings and interfaces
- Use Tailwind utility classes for styling
- Reuse shadcn/ui components in `src/components/ui/`
- Keep translation strings in `src/lib/i18n.tsx`
- Use `use*` hooks for data fetching and state logic
- Keep sections lean; move data logic to hooks where possible

### Translation / i18n

- English and Amharic support is managed in `src/lib/i18n.tsx`
- Language selection persists in local storage
- Add new translation keys there and update components accordingly

### Styling / theme

- Tailwind CSS is configured via `tailwind.config.js`
- Theme switching is handled by `src/components/theme-provider.tsx` and `src/components/mode-toggle.tsx`
- Global styles and animations are in `src/index.css`

## Documentation and Reference

### Primary docs

- `README.md` — product overview and quick start
- `TECHNICAL_DOCUMENTATION.md` — architecture, schema, and system details
- `USER_MANUAL.md` — end-user workflows and feature guides
- `QUICK_START_GUIDE.md` — rapid onboarding reference
- `SETUP_CHECKLIST.md` — setup and deployment checklist
- `DATABASE_MIGRATION_INSTRUCTIONS.md` — SQL migration steps
- `SUPABASE_MIGRATION_GUIDE.md` — Supabase project onboarding
- `IMPLEMENTATION_SUMMARY.md` — feature summary and implementation notes
- `PROJECT_COMPLETION_SUMMARY.md` — project status and final checklist
- `ASSETS_AND_IMAGES.md` — image asset inventory and URLs

### Ref directory

- `Ref/PROJECT_CONTEXT.md` — source-of-truth project context
- `Ref/DOCUMENTATION_INDEX.md` — documentation index and pointers
- `Ref/DEVELOPER_ONBOARDING.md` — this onboarding guide

## Developer Checklist

### Onboarding steps

- [ ] Read `Ref/PROJECT_CONTEXT.md`
- [ ] Read `TECHNICAL_DOCUMENTATION.md`
- [ ] Verify `.env` and Supabase configuration
- [ ] Run `npm install`
- [ ] Run `npm run dev`
- [ ] Confirm feature sections render correctly
- [ ] Run `npm run typecheck`
- [ ] Run `npm run build`

### Common tasks

- Modify translations: update `src/lib/i18n.tsx`
- Add section content: create a new component under `src/components/sections/`
- Add new data model / migration: add SQL in `supabase/migrations/`
- Add new shared UI: add component under `src/components/ui/`
- Add new hooks: add under `src/hooks/`

## Notes for Contributors

- Keep the `Ref/` directory updated with new docs
- Use the changelog at `/memories/repo/yeBetWeg_project_changelog.md` for tracking major updates
- Keep environment secrets out of version control
- Prefer descriptive commit messages and doc updates with feature changes

## Useful commands

```bash
npm install
npm run dev
npm run build
npm run typecheck
npm run preview
```

---

*Created as the developer onboarding guide for YeBetWeg.*
