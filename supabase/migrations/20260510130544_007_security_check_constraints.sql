/*
  # Security: Add Database CHECK Constraints for Data Integrity

  ## Problem
  High severity: No database-level validation exists. Even with RLS, authenticated
  users could insert malformed data (invalid emails, negative prices, oversized text).

  ## Changes
  1. **inquiries** - Add CHECK constraints for email format, name length, message length
  2. **listings** - Add CHECK constraints for price bounds, title length, location length
  3. **subscribers** - Add CHECK constraint for email format
  4. **professionals** - Add CHECK constraints for name length, specialty enum, location length

  ## Constraints Added
  - Email format: Must match basic email pattern
  - Name: 2-100 characters
  - Message: 10-5000 characters
  - Price: 0 to 999,999,999
  - Title: 1-200 characters
  - Location: 2-100 characters
  - Specialty: Must be one of: architect, engineer, contractor, electrician, plumber, mason, surveyor

  ## Notes
  1. These are defense-in-depth constraints that complement frontend validation
  2. Uses IF NOT EXISTS patterns to be idempotent
  3. Email regex is simplified RFC pattern for PostgreSQL compatibility
*/

-- Add CHECK constraints to inquiries table
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'inquiries_email_format' AND table_name = 'inquiries'
  ) THEN
    ALTER TABLE inquiries ADD CONSTRAINT inquiries_email_format
      CHECK (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'inquiries_name_length' AND table_name = 'inquiries'
  ) THEN
    ALTER TABLE inquiries ADD CONSTRAINT inquiries_name_length
      CHECK (length(trim(name)) >= 2 AND length(name) <= 100);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'inquiries_message_length' AND table_name = 'inquiries'
  ) THEN
    ALTER TABLE inquiries ADD CONSTRAINT inquiries_message_length
      CHECK (length(trim(message)) >= 10 AND length(message) <= 5000);
  END IF;
END $$;

-- Add CHECK constraints to listings table
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'listings_price_bounds' AND table_name = 'listings'
  ) THEN
    ALTER TABLE listings ADD CONSTRAINT listings_price_bounds
      CHECK (price >= 0 AND price <= 999999999);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'listings_title_length' AND table_name = 'listings'
  ) THEN
    ALTER TABLE listings ADD CONSTRAINT listings_title_length
      CHECK (length(trim(title_en)) >= 1 AND length(title_en) <= 200);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'listings_location_length' AND table_name = 'listings'
  ) THEN
    ALTER TABLE listings ADD CONSTRAINT listings_location_length
      CHECK (length(trim(location)) >= 2 AND length(location) <= 100);
  END IF;
END $$;

-- Add CHECK constraint to subscribers table
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'subscribers_email_format' AND table_name = 'subscribers'
  ) THEN
    ALTER TABLE subscribers ADD CONSTRAINT subscribers_email_format
      CHECK (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$');
  END IF;
END $$;

-- Add CHECK constraints to professionals table
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'professionals_name_length' AND table_name = 'professionals'
  ) THEN
    ALTER TABLE professionals ADD CONSTRAINT professionals_name_length
      CHECK (length(trim(name)) >= 2 AND length(name) <= 100);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'professionals_specialty_enum' AND table_name = 'professionals'
  ) THEN
    ALTER TABLE professionals ADD CONSTRAINT professionals_specialty_enum
      CHECK (specialty IN ('architect', 'engineer', 'contractor', 'electrician', 'plumber', 'mason', 'surveyor'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'professionals_location_length' AND table_name = 'professionals'
  ) THEN
    ALTER TABLE professionals ADD CONSTRAINT professionals_location_length
      CHECK (length(trim(location)) >= 2 AND length(location) <= 100);
  END IF;
END $$;
