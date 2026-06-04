/*
  Dashboard reliability and admin visibility refresh.

  - Recreates ensure_auth_user_profile with explicit casts/defaults so PostgREST
    always receives the declared return shape.
  - Adds role-aware admin read policies needed by the admin dashboard metrics.
  - Notifies PostgREST to reload schema metadata after the RPC replacement.
*/

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
  FROM public.users u
  WHERE u.auth_uid = v_auth_uid
  LIMIT 1;

  IF NOT FOUND AND v_email IS NOT NULL THEN
    SELECT *
    INTO v_profile
    FROM public.users u
    WHERE lower(u.email) = lower(v_email)
    LIMIT 1;

    IF FOUND THEN
      UPDATE public.users
      SET
        auth_uid = v_auth_uid,
        full_name = COALESCE(public.users.full_name, v_full_name),
        profile_image = COALESCE(NULLIF(public.users.profile_image, ''), v_avatar_url, ''),
        updated_at = now()
      WHERE public.users.id = v_profile.id
      RETURNING * INTO v_profile;
    END IF;
  END IF;

  IF NOT FOUND THEN
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

        EXIT;
      EXCEPTION
        WHEN unique_violation THEN
          v_suffix := v_suffix + 1;
          v_username := v_username_base || '_' || v_suffix::text;
      END;
    END LOOP;
  END IF;

  RETURN QUERY
  SELECT
    v_profile.id::uuid,
    v_profile.auth_uid::uuid,
    v_profile.username::text,
    v_profile.email::text,
    v_profile.full_name::text,
    COALESCE(v_profile.phone, '')::text,
    COALESCE(v_profile.role, 'user')::text,
    COALESCE(v_profile.provider, 'supabase')::text,
    COALESCE(v_profile.language_preference, 'en')::text,
    COALESCE(v_profile.status, 'active')::text,
    COALESCE(v_profile.profile_image, '')::text,
    COALESCE(v_profile.metadata, '{}'::jsonb)::jsonb,
    v_profile.created_at::timestamptz,
    v_profile.updated_at::timestamptz;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_auth_user_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users admin_user
    WHERE admin_user.auth_uid = auth.uid()
      AND admin_user.role = 'admin'
      AND admin_user.status = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

DROP POLICY IF EXISTS "Admins can read all users" ON users;
CREATE POLICY "Admins can read all users"
  ON users FOR SELECT TO authenticated USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can read all subscriptions" ON premium_subscriptions;
CREATE POLICY "Admins can read all subscriptions"
  ON premium_subscriptions FOR SELECT TO authenticated USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can read all payments" ON subscription_payments;
CREATE POLICY "Admins can read all payments"
  ON subscription_payments FOR SELECT TO authenticated USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can read all inquiries" ON inquiries;
CREATE POLICY "Admins can read all inquiries"
  ON inquiries FOR SELECT TO authenticated USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can read all listings" ON listings;
CREATE POLICY "Admins can read all listings"
  ON listings FOR SELECT TO authenticated USING (public.current_user_is_admin());

NOTIFY pgrst, 'reload schema';
