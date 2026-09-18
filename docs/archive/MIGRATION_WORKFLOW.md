# YeBetWeg Database Migration Workflow

## Current Status (Updated: May 14, 2026)

✅ **Cleanup Complete:**
- Removed redundant `YeBetWegInitScript.sql` (906 lines of consolidated migrations)
- Renamed poorly-named `003_unsplash_images_and_migration.sql` → `20260508183000_003_unsplash_images.sql`
- All 11 migrations now follow proper timestamp naming convention
- Supabase CLI linked to project: `jxyavtdmcloxnhuavokc`

## Migration Files Overview

Your database migrations are stored in `supabase/migrations/` in chronological order:

| # | File | Purpose | Status |
|---|------|---------|--------|
| 1 | `20260508182213_001_yebetweg_schema.sql` | Core schema: tables, indexes, RLS policies | ✅ Applied |
| 2 | `20260508182337_002_yebetweg_seed_data.sql` | Initial seed: blogs, tips, prices, listings, professionals, ads | ✅ Applied |
| 3 | `20260508183000_003_unsplash_images.sql` | Unsplash image URLs for all content + indexes | ✅ Applied |
| 4 | `20260508193022_004_add_unsplash_images.sql` | Additional Unsplash image updates | ✅ Applied |
| 5 | `20260508193509_005_update_listing_professional_images.sql` | Listing & professional images | ✅ Applied |
| 6 | `20260510130523_006_security_rls_policy_fixes.sql` | RLS policy hardening | ✅ Applied |
| 7 | `20260510130544_007_security_check_constraints.sql` | Data integrity constraints | ✅ Applied |
| 8 | `20260510145818_20260510_001_fix_image_urls.sql` | Image URL refresh & cleanup | ✅ Applied |
| 9 | `20260511120000_008_add_users_and_auth_schema.sql` | Auth schema, users, premium subscriptions | ✅ Applied |
| 10 | `20260511120001_009_seed_user_auth_and_premium_data.sql` | Admin, premium, and pro test accounts | ✅ Applied |
| 11 | `20260512000000_telebirr_reference_column.sql` | Telebirr payment reference column | ✅ Applied |

**Note:** All migrations have been manually applied to your remote Supabase project via the SQL Editor dashboard during development setup.

## Workflow: Creating New Migrations

### When to Create a Migration
- Adding new tables or columns
- Modifying RLS policies
- Adding indexes for performance
- Updating schema constraints
- Adding stored procedures or functions

### How to Create a Migration

1. **Create the migration file** in `supabase/migrations/`:
   ```bash
   # Format: YYYYMMDDHHMMSS_XXX_description.sql
   # Use the next timestamp and increment the migration number
   
   # Example for a new migration:
   supabase migration new add_payment_provider_field
   ```

2. **Write the migration content:**
   ```sql
   -- supabase/migrations/20260515120000_012_add_payment_provider_field.sql
   
   -- Add payment_provider column to subscription_payments table
   ALTER TABLE subscription_payments
   ADD COLUMN payment_provider TEXT DEFAULT 'chapa',
   ADD CONSTRAINT valid_payment_provider CHECK (payment_provider IN ('chapa', 'telebirr'));
   ```

3. **Key Rules for Migrations:**
   - ✅ **DO** use `IF NOT EXISTS` / `IF EXISTS` for idempotency
   - ✅ **DO** make migrations reversible when possible
   - ✅ **DO** include comments explaining the changes
   - ✅ **DO** test locally before pushing to production
   - ❌ **DON'T** modify existing migration files (create new ones instead)
   - ❌ **DON'T** combine unrelated changes in one migration

### Example: Adding a New Column Safely

```sql
-- supabase/migrations/20260515130000_012_add_subscription_notes.sql

-- Add notes column to premium_subscriptions table
ALTER TABLE premium_subscriptions
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for queries by user
CREATE INDEX IF NOT EXISTS idx_premium_subscriptions_updated_by 
ON premium_subscriptions(last_updated_by);
```

## Workflow: Applying Migrations

### Option 1: Using Supabase CLI (Recommended)

```bash
# Link to remote project (one-time setup)
supabase link --project-ref jxyavtdmcloxnhuavokc

# Push migrations to remote database
supabase db push

# Pull remote schema changes (if made in dashboard)
supabase db pull
```

### Option 2: Manual via Supabase Dashboard

1. Go to **SQL Editor** in Supabase Dashboard
2. Click **New Query**
3. Copy the migration file contents
4. Paste and click **Run**
5. Wait for success confirmation

### Option 3: Using psql Directly

```bash
# Set your database URL environment variable
export DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres"

# Run migrations in order
psql $DATABASE_URL -f supabase/migrations/20260508182213_001_yebetweg_schema.sql
psql $DATABASE_URL -f supabase/migrations/20260508182337_002_yebetweg_seed_data.sql
# ... etc for each migration
```

## Workflow: Verifying Migrations

### Check Applied Migrations
```bash
# Via Supabase CLI (requires local Docker setup)
supabase migration list

# Via Supabase Dashboard:
# 1. Click SQL Editor
# 2. Run: SELECT * FROM _supabase_migrations ORDER BY name;
```

### Verify Schema in Dashboard
1. Go to **Table Editor** in Supabase
2. Verify all tables exist with correct columns
3. Check RLS policies under each table's **Policy** tab
4. Verify indexes in Table → Indexes

## Database Structure

### Core Tables
- **blogs** - Construction and building knowledge articles
- **tips** - Construction tips (some premium)
- **market_prices** - Material and service prices
- **listings** - Property and material listings
- **professionals** - Construction professionals and contractors
- **ads** - Advertisement slots
- **subscribers** - Newsletter subscribers
- **inquiries** - Contact form submissions

### Auth Tables
- **auth.users** - Supabase built-in auth users
- **users** - Application user profiles
- **premium_subscriptions** - Membership tracking
- **subscription_payments** - Payment history

## Troubleshooting

### Issue: Docker Permission Error
```
permission denied while trying to connect to the Docker daemon socket
```
**Solution:** Either:
- Add user to docker group: `sudo usermod -aG docker $USER`
- Use Supabase Dashboard or `supabase db push --linked` for remote operations

### Issue: Migration Fails with "Already Exists"
**Cause:** Migration already applied to database
**Solution:** Check `_supabase_migrations` table in dashboard, or:
- Use `IF NOT EXISTS` in new migration to handle idempotency
- Don't re-run old migrations

### Issue: Need to Reverse a Migration
**Solution:**
1. Create a new migration with the revert logic
2. Never modify or delete existing migration files
3. Example revert migration:
```sql
-- supabase/migrations/20260515140000_013_revert_payment_provider.sql
ALTER TABLE subscription_payments DROP COLUMN IF EXISTS payment_provider;
```

## Best Practices

1. **One logical change per migration** - Don't combine schema, data, and policy changes
2. **Make migrations idempotent** - They should be safely re-runnable
3. **Document your changes** - Include comments explaining the why
4. **Test locally first** - Run migrations on local development before production
5. **Review before applying** - Have another developer review migration files
6. **Version control** - Never delete migration files, always create reversions
7. **Backup before major changes** - Export data before significant schema changes

## Quick Reference: Common Tasks

### Add a new table with RLS
```sql
CREATE TABLE new_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own records" ON new_table
  FOR SELECT
  USING (auth.uid() = user_id);
```

### Add a column to existing table
```sql
ALTER TABLE table_name
ADD COLUMN IF NOT EXISTS column_name column_type DEFAULT value;
```

### Create an index for performance
```sql
CREATE INDEX IF NOT EXISTS idx_table_column ON table_name(column) WHERE condition;
```

### Grant permissions
```sql
GRANT SELECT ON TABLE table_name TO authenticated;
GRANT INSERT, UPDATE ON TABLE table_name TO authenticated;
```

## Support

- **Supabase Docs:** https://supabase.com/docs/guides/database/migrations
- **Project Dashboard:** https://app.supabase.com (project ID: jxyavtdmcloxnhuavokc)
- **SQL Patterns:** See existing migrations for examples
