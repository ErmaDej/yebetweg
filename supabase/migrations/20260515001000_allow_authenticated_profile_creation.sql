/*
  Allow Supabase Auth users to create their own app profile row.

  The dashboard creates a row in public.users the first time a Supabase Auth
  user opens it. Existing policies allowed reads and updates, but not this
  first insert, which blocked both user and admin dashboard loading.
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'Authenticated users can create own profile'
  ) THEN
    CREATE POLICY "Authenticated users can create own profile"
      ON users FOR INSERT TO authenticated
      WITH CHECK (
        auth_uid = auth.uid()
        AND provider IN ('supabase', 'google', 'facebook')
        AND role = 'user'
        AND status = 'active'
      );
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.ensure_auth_user_profile();

CREATE OR REPLACE FUNCTION public.ensure_auth_user_profile()
RETURNS TABLE (
  id uuid,
  auth_uid uuid,
  username text,
  email text,
  full_name text,
  phone text,
  role text,
  provider text,
  language_preference text,
  status text,
  profile_image text,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_uid uuid := auth.uid();
  v_email text := auth.jwt() ->> 'email';
  v_full_name text := auth.jwt() -> 'user_metadata' ->> 'full_name';
  v_avatar_url text := auth.jwt() -> 'user_metadata' ->> 'avatar_url';
  v_username_base text;
  v_username text;
  v_suffix integer := 0;
  v_profile public.users;
BEGIN
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Authenticated user is required';
  END IF;

  SELECT *
  INTO v_profile
  FROM public.users
  WHERE auth_uid = v_auth_uid
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY
    SELECT
      v_profile.id,
      v_profile.auth_uid,
      v_profile.username,
      v_profile.email,
      v_profile.full_name,
      v_profile.phone,
      v_profile.role,
      v_profile.provider,
      v_profile.language_preference,
      v_profile.status,
      v_profile.profile_image,
      v_profile.metadata,
      v_profile.created_at,
      v_profile.updated_at;
    RETURN;
  END IF;

  IF v_email IS NOT NULL THEN
    SELECT *
    INTO v_profile
    FROM public.users
    WHERE lower(email) = lower(v_email)
    LIMIT 1;

    IF FOUND THEN
      UPDATE public.users
      SET
        auth_uid = v_auth_uid,
        full_name = COALESCE(public.users.full_name, v_full_name),
        profile_image = COALESCE(NULLIF(public.users.profile_image, ''), v_avatar_url, ''),
        updated_at = now()
      WHERE id = v_profile.id
      RETURNING * INTO v_profile;

      RETURN QUERY
      SELECT
        v_profile.id,
        v_profile.auth_uid,
        v_profile.username,
        v_profile.email,
        v_profile.full_name,
        v_profile.phone,
        v_profile.role,
        v_profile.provider,
        v_profile.language_preference,
        v_profile.status,
        v_profile.profile_image,
        v_profile.metadata,
        v_profile.created_at,
        v_profile.updated_at;
      RETURN;
    END IF;
  END IF;

  v_username_base := lower(regexp_replace(split_part(COALESCE(v_email, 'user_' || v_auth_uid::text), '@', 1), '[^a-zA-Z0-9_]+', '_', 'g'));
  v_username_base := COALESCE(NULLIF(trim(both '_' FROM v_username_base), ''), 'user_' || left(v_auth_uid::text, 8));
  v_username := v_username_base;

  LOOP
    BEGIN
      INSERT INTO public.users (
        auth_uid,
        username,
        email,
        full_name,
        phone,
        role,
        provider,
        language_preference,
        status,
        profile_image,
        metadata
      )
      VALUES (
        v_auth_uid,
        v_username,
        COALESCE(v_email, v_auth_uid::text || '@auth.local'),
        v_full_name,
        '',
        'user',
        'supabase',
        'en',
        'active',
        COALESCE(v_avatar_url, ''),
        '{}'::jsonb
      )
      RETURNING * INTO v_profile;

      RETURN QUERY
      SELECT
        v_profile.id,
        v_profile.auth_uid,
        v_profile.username,
        v_profile.email,
        v_profile.full_name,
        v_profile.phone,
        v_profile.role,
        v_profile.provider,
        v_profile.language_preference,
        v_profile.status,
        v_profile.profile_image,
        v_profile.metadata,
        v_profile.created_at,
        v_profile.updated_at;
      RETURN;
    EXCEPTION
      WHEN unique_violation THEN
        v_suffix := v_suffix + 1;
        v_username := v_username_base || '_' || v_suffix::text;
    END;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_auth_user_profile() TO authenticated;
