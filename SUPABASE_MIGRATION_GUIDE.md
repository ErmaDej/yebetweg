# Supabase Migration Guide for YeBetWeg

## New Project Credentials
- **Project ID**: `jxyavtdmcloxnhuavokc`
- **API URL**: `https://jxyavtdmcloxnhuavokc.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4eWF2dGRtY2xveG5odWF2b2tjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNTg5MzEsImV4cCI6MjA5MzgzNDkzMX0.mqhTUF1bmZbd3lI6M8XFi_kOunlhIoAN3an5hpJPRto`

## Migration Steps

### Step 1: Login to Supabase Dashboard
1. Go to https://app.supabase.com
2. Select the project **YeBetWegProj1x** (jxyavtdmcloxnhuavokc)

### Step 2: Run Migrations via SQL Editor

#### 2a. Create Schema (001_yebetweg_schema.sql)
1. Click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Copy the entire contents of `supabase/migrations/001_yebetweg_schema.sql`
4. Paste into the SQL Editor
5. Click **Run**
6. Wait for success message

#### 2b. Seed Data (002_yebetweg_seed_data.sql)
1. Click **New Query** again
2. Copy the entire contents of `supabase/migrations/002_yebetweg_seed_data.sql`
3. Paste and click **Run**
4. Wait for completion

#### 2c. Add Unsplash Images & Indexes (003_unsplash_images_and_migration.sql)
1. Click **New Query**
2. Copy the entire contents of `supabase/migrations/003_unsplash_images_and_migration.sql`
3. Paste and click **Run**

### Step 3: Verify Migration
1. Go to **Table Editor** in the left sidebar
2. You should see all tables: blogs, tips, market_prices, listings, professionals, ads, subscribers, inquiries, premium_subscriptions
3. Click each table to verify data is present

### Step 4: Test the Application
The `.env` file has already been updated with your new credentials:
- `VITE_SUPABASE_URL=https://jxyavtdmcloxnhuavokc.supabase.co`
- `VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4eWF2dGRtY2xveG5odWF2b2tjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNTg5MzEsImV4cCI6MjA5MzgzNDkzMX0.mqhTUF1bmZbd3lI6M8XFi_kOunlhIoAN3an5hpJPRto`

Run `npm run build` to verify the project compiles with the new database.

## Image URLs
All blog articles, listings, and professional cards now use high-quality Unsplash images:
- Construction & Materials: Professional photography
- Real Estate: Property showcase images
- Professionals: Avatar placeholders (initials)
- Articles: Topic-specific illustrations

## Alternative: Using Supabase CLI
If you have the Supabase CLI installed:
```bash
supabase link --project-ref jxyavtdmcloxnhuavokc
supabase db push
```

## Database Schema
- **blogs**: 8 articles (4 featured)
- **tips**: 10 construction tips (4 premium)
- **market_prices**: 15 material prices
- **listings**: 12 properties/materials/services
- **professionals**: 6 verified professionals
- **ads**: 3 advertisement slots
- **subscribers**: Newsletter signups
- **inquiries**: Contact form submissions
- **premium_subscriptions**: Membership tracking

All data is seeded with realistic Ethiopian construction context.
