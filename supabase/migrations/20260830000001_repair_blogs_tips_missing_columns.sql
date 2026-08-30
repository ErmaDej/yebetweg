-- Repair: Add missing columns to blogs and tips to match the bilingual EN/AM
-- admin_actions edge function contract.
-- The original schema used a single `content` column; the admin edge function
-- uses split `content_en` / `content_am` and `excerpt_*`, plus `status` and `tags`.
-- We add them as nullable + DEFAULT for backward compat with existing rows.

-- ============================================================
-- BLOGS
-- ============================================================
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS content_en text;
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS content_am text;
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS excerpt_en text;
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS excerpt_am text;
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published';
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS tags text DEFAULT '';

-- Backfill: copy legacy `content` into both content_en and content_am so the
-- edge function returns the same text for both languages on read.
UPDATE blogs
SET
  content_en = COALESCE(content_en, content),
  content_am = COALESCE(content_am, content),
  excerpt_en = COALESCE(excerpt_en, ''),
  excerpt_am = COALESCE(excerpt_am, ''),
  status = COALESCE(NULLIF(status, ''), 'published'),
  tags = COALESCE(tags, '')
WHERE content_en IS NULL
   OR content_am IS NULL
   OR status IS NULL
   OR status = ''
   OR tags IS NULL;

-- ============================================================
-- TIPS
-- ============================================================
ALTER TABLE tips ADD COLUMN IF NOT EXISTS content_en text;
ALTER TABLE tips ADD COLUMN IF NOT EXISTS content_am text;
ALTER TABLE tips ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published';
ALTER TABLE tips ADD COLUMN IF NOT EXISTS tags text DEFAULT '';

UPDATE tips
SET
  content_en = COALESCE(content_en, content),
  content_am = COALESCE(content_am, content),
  status = COALESCE(NULLIF(status, ''), 'published'),
  tags = COALESCE(tags, '')
WHERE content_en IS NULL
   OR content_am IS NULL
   OR status IS NULL
   OR status = ''
   OR tags IS NULL;

-- ============================================================
-- RLS: admins can manage blogs and tips
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='blogs' AND policyname='Admins can manage blogs'
  ) THEN
    CREATE POLICY "Admins can manage blogs"
    ON public.blogs FOR ALL
    TO authenticated
    USING (public.current_user_is_admin() = true)
    WITH CHECK (public.current_user_is_admin() = true);
  END IF;
EXCEPTION WHEN OTHERS THEN null;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tips' AND policyname='Admins can manage tips'
  ) THEN
    CREATE POLICY "Admins can manage tips"
    ON public.tips FOR ALL
    TO authenticated
    USING (public.current_user_is_admin() = true)
    WITH CHECK (public.current_user_is_admin() = true);
  END IF;
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- Also allow professionals to edit their own professional profile (and only theirs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='professionals' AND policyname='Professionals can update own profile'
  ) THEN
    CREATE POLICY "Professionals can update own profile"
    ON public.professionals FOR UPDATE
    TO authenticated
    USING (user_id = (SELECT id FROM public.users WHERE auth_uid = auth.uid() LIMIT 1))
    WITH CHECK (user_id = (SELECT id FROM public.users WHERE auth_uid = auth.uid() LIMIT 1));
  END IF;
EXCEPTION WHEN OTHERS THEN null;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='professionals' AND policyname='Professionals can delete own profile'
  ) THEN
    CREATE POLICY "Professionals can delete own profile"
    ON public.professionals FOR DELETE
    TO authenticated
    USING (user_id = (SELECT id FROM public.users WHERE auth_uid = auth.uid() LIMIT 1));
  END IF;
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- Listings: owners can update their own listings regardless of status,
-- AND can delete their own listings only when status = 'pending' (existing)
-- Allow owners to edit images in the images[] array.
-- The existing 'Users can update own listings' policy already covers this.

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
