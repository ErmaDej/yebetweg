/*
  Real Supabase Auth sessions for seeded premium/pro testers.

  Payment checkout is not fully live yet, so these known test personas need
  first-class Supabase Auth users linked to app profiles and active
  subscriptions in every environment where migrations are applied.

  Test credentials:
  - premium@yebetweg.com / Premium123!
  - pro@yebetweg.com / Pro123!
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_account record;
  v_auth_uid uuid;
  v_profile_id uuid;
BEGIN
  FOR v_account IN
    SELECT *
    FROM (
      VALUES
        ('premium@yebetweg.com', 'Premium123!', 'PremiumUser', 'Premium Tester', '+251911000125', 'premium'),
        ('pro@yebetweg.com', 'Pro123!', 'ProUser', 'Pro Tester', '+251911000126', 'pro')
    ) AS accounts(email, password, username, full_name, phone, tier)
  LOOP
    SELECT au.id
    INTO v_auth_uid
    FROM auth.users au
    WHERE lower(au.email) = lower(v_account.email)
    LIMIT 1;

    IF v_auth_uid IS NULL THEN
      v_auth_uid := gen_random_uuid();

      INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        confirmation_token,
        recovery_token,
        email_change,
        email_change_token_new,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
      )
      VALUES (
        v_auth_uid,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        v_account.email,
        crypt(v_account.password, gen_salt('bf')),
        now(),
        '',
        '',
        '',
        '',
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        jsonb_build_object('full_name', v_account.full_name, 'username', v_account.username, 'role', v_account.tier),
        now(),
        now()
      );
    ELSE
      UPDATE auth.users
      SET
        encrypted_password = crypt(v_account.password, gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
          || jsonb_build_object('full_name', v_account.full_name, 'username', v_account.username, 'role', v_account.tier),
        updated_at = now()
      WHERE id = v_auth_uid;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM auth.identities ai
      WHERE ai.provider = 'email'
        AND ai.provider_id = v_auth_uid::text
    ) THEN
      INSERT INTO auth.identities (
        id,
        user_id,
        provider_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      )
      VALUES (
        v_auth_uid,
        v_auth_uid,
        v_auth_uid::text,
        jsonb_build_object('sub', v_auth_uid::text, 'email', v_account.email, 'email_verified', true),
        'email',
        now(),
        now(),
        now()
      );
    END IF;

    INSERT INTO public.users (
      auth_uid,
      username,
      email,
      full_name,
      phone,
      role,
      provider,
      password_hash,
      language_preference,
      status,
      metadata
    )
    VALUES (
      v_auth_uid,
      v_account.username,
      v_account.email,
      v_account.full_name,
      v_account.phone,
      v_account.tier,
      'supabase',
      crypt(v_account.password, gen_salt('bf')),
      'en',
      'active',
      jsonb_build_object('seeded_test_account', true)
    )
    ON CONFLICT (email) DO UPDATE
    SET
      auth_uid = EXCLUDED.auth_uid,
      username = EXCLUDED.username,
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      role = EXCLUDED.role,
      provider = 'supabase',
      password_hash = EXCLUDED.password_hash,
      status = 'active',
      metadata = COALESCE(public.users.metadata, '{}'::jsonb) || jsonb_build_object('seeded_test_account', true),
      updated_at = now()
    RETURNING id INTO v_profile_id;

    UPDATE public.premium_subscriptions
    SET
      is_active = false,
      status = 'expired',
      updated_at = now()
    WHERE user_id = v_profile_id
      AND tier <> v_account.tier
      AND is_active = true;

    IF EXISTS (
      SELECT 1
      FROM public.premium_subscriptions ps
      WHERE ps.user_id = v_profile_id
        AND ps.tier = v_account.tier
    ) THEN
      UPDATE public.premium_subscriptions
      SET
        payment_method = 'chapa',
        starts_at = now(),
        expires_at = now() + interval '1 year',
        is_active = true,
        status = 'active',
        updated_at = now()
      WHERE id = (
        SELECT ps.id
        FROM public.premium_subscriptions ps
        WHERE ps.user_id = v_profile_id
          AND ps.tier = v_account.tier
        ORDER BY ps.created_at DESC
        LIMIT 1
      );
    ELSE
      INSERT INTO public.premium_subscriptions (
        user_id,
        tier,
        payment_method,
        chapa_reference,
        starts_at,
        expires_at,
        is_active,
        status
      )
      VALUES (
        v_profile_id,
        v_account.tier,
        'chapa',
        'SEEDED-' || upper(v_account.tier) || '-AUTH-TEST',
        now(),
        now() + interval '1 year',
        true,
        'active'
      );
    END IF;
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Authenticated users can read market prices" ON market_prices;
CREATE POLICY "Authenticated users can read market prices"
  ON market_prices FOR SELECT TO authenticated USING (
    access_level = 'free'
    OR EXISTS (
      SELECT 1
      FROM users u
      WHERE u.auth_uid = auth.uid()
        AND u.status = 'active'
        AND u.role IN ('premium', 'pro', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM users u
      JOIN premium_subscriptions s ON s.user_id = u.id
      WHERE u.auth_uid = auth.uid()
        AND s.is_active
        AND s.status = 'active'
        AND s.starts_at <= now()
        AND (s.expires_at IS NULL OR s.expires_at >= now())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can read tips" ON tips;
CREATE POLICY "Authenticated users can read tips"
  ON tips FOR SELECT TO authenticated USING (
    is_premium = false
    OR EXISTS (
      SELECT 1
      FROM users u
      WHERE u.auth_uid = auth.uid()
        AND u.status = 'active'
        AND u.role IN ('premium', 'pro', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM users u
      JOIN premium_subscriptions s ON s.user_id = u.id
      WHERE u.auth_uid = auth.uid()
        AND s.is_active
        AND s.status = 'active'
        AND s.starts_at <= now()
        AND (s.expires_at IS NULL OR s.expires_at >= now())
    )
  );

NOTIFY pgrst, 'reload schema';
