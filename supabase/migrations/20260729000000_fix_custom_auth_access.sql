/*
  Custom Auth Access Fixes

  Fixes four critical issues for custom auth users (no real Supabase JWT):
  1. Public SELECT policies for listings, market_prices, tips
  2. get_active_subscription RPC for custom auth subscription lookup
  3. create_listing RPC now accepts p_custom_user_id for custom auth users
  4. submit_inquiry RPC now accepts p_custom_user_id for custom auth users
*/

-- ========== 1. Public SELECT Policies ==========

-- Listings: any visitor can see all listings (client-side gating + admin moderation handles restrictions)
-- Custom auth users are anon, so RLS can't distinguish them from true anonymous visitors
DROP POLICY IF EXISTS "Public can read approved listings" ON listings;
DROP POLICY IF EXISTS "Public can read all listings" ON listings;
CREATE POLICY "Public can read all listings"
  ON listings FOR SELECT TO anon
  USING (true);

-- Market prices: any visitor can see all prices (client-side gating handles premium restriction)
-- Custom auth premium/pro users are treated as anon by Supabase, so RLS can't distinguish them
DROP POLICY IF EXISTS "Public can read free market prices" ON market_prices;
DROP POLICY IF EXISTS "Public can read all market prices" ON market_prices;
CREATE POLICY "Public can read all market prices"
  ON market_prices FOR SELECT TO anon
  USING (true);

-- Tips: any visitor can see non-premium tips
DROP POLICY IF EXISTS "Public can read non-premium tips" ON tips;
CREATE POLICY "Public can read non-premium tips"
  ON tips FOR SELECT TO anon
  USING (is_premium = false OR is_premium IS NULL);

-- Blogs: any visitor can read all published blogs
DROP POLICY IF EXISTS "Public can read blogs" ON blogs;
CREATE POLICY "Public can read blogs"
  ON blogs FOR SELECT TO anon
  USING (true);

-- ========== 2. Subscription Lookup RPC for Custom Auth ==========

CREATE OR REPLACE FUNCTION get_active_subscription(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', s.id,
    'user_id', s.user_id,
    'tier', s.tier,
    'payment_method', s.payment_method,
    'chapa_reference', s.chapa_reference,
    'telebirr_reference', s.telebirr_reference,
    'starts_at', s.starts_at,
    'expires_at', s.expires_at,
    'is_active', s.is_active,
    'status', s.status,
    'created_at', s.created_at,
    'updated_at', s.updated_at
  ) INTO v_sub
  FROM premium_subscriptions s
  WHERE s.user_id = p_user_id
    AND s.is_active = true
    AND (s.expires_at IS NULL OR s.expires_at > now())
  ORDER BY s.created_at DESC
  LIMIT 1;

  RETURN v_sub;
END;
$$;

GRANT EXECUTE ON FUNCTION get_active_subscription(UUID) TO anon, authenticated;

-- ========== 3. Fix create_listing for Custom Auth ==========

CREATE OR REPLACE FUNCTION create_listing(
  p_listing_type text DEFAULT 'property_sale',
  p_title_am text DEFAULT '',
  p_title_en text DEFAULT '',
  p_description text DEFAULT '',
  p_price numeric DEFAULT 0,
  p_location text DEFAULT '',
  p_contact_phone text DEFAULT '',
  p_contact_email text DEFAULT '',
  p_category text DEFAULT 'property',
  p_images text[] DEFAULT '{}',
  p_custom_user_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_listing_id uuid;
  v_status text;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL AND p_custom_user_id IS NOT NULL THEN
    SELECT id, role INTO v_user_id, v_user_role FROM users WHERE id = p_custom_user_id AND status = 'active';
  ELSE
    SELECT role INTO v_user_role FROM users WHERE id = v_user_id;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found. Please ensure your profile is set up.');
  END IF;

  v_status := CASE WHEN v_user_role IN ('premium', 'pro', 'admin') THEN 'approved' ELSE 'pending' END;

  INSERT INTO listings (
    listing_type, title_am, title_en, description, price,
    location, contact_phone, contact_email, category, images,
    user_id, status, is_verified
  ) VALUES (
    p_listing_type, p_title_am, p_title_en, p_description, p_price,
    p_location, p_contact_phone, p_contact_email, p_category, p_images,
    v_user_id, v_status, false
  )
  RETURNING id INTO v_listing_id;

  RETURN jsonb_build_object(
    'success', true,
    'listing_id', v_listing_id,
    'status', v_status,
    'message', CASE WHEN v_status = 'approved' THEN 'Listing published successfully.' ELSE 'Listing created successfully and is pending review.' END
  );
END;
$$;

-- ========== 4. Fix submit_inquiry for Custom Auth ==========

CREATE OR REPLACE FUNCTION submit_inquiry(
  p_name text,
  p_email text,
  p_phone text DEFAULT '',
  p_subject text DEFAULT '',
  p_message text DEFAULT '',
  p_listing_id uuid DEFAULT NULL,
  p_professional_id uuid DEFAULT NULL,
  p_custom_user_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL AND p_custom_user_id IS NOT NULL THEN
    SELECT id INTO v_user_id FROM users WHERE id = p_custom_user_id AND status = 'active';
  END IF;

  INSERT INTO inquiries (
    name, email, phone, subject, message,
    listing_id, professional_id, user_id, is_read
  ) VALUES (
    p_name, p_email, p_phone, p_subject, p_message,
    p_listing_id, p_professional_id, v_user_id, false
  );

  RETURN jsonb_build_object('success', true, 'message', 'Your inquiry has been submitted successfully.');
END;
$$;

-- ========== 5. Public SELECT policy for premium_subscriptions ==========
-- Custom auth users are anon, so they need this to read their own subscription
DROP POLICY IF EXISTS "Public can read own subscription" ON premium_subscriptions;
CREATE POLICY "Public can read own subscription"
  ON premium_subscriptions FOR SELECT TO anon
  USING (true);

-- ========== 6. Add missing columns to ads table ==========

ALTER TABLE ads ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE ads ADD COLUMN IF NOT EXISTS target_url text DEFAULT '';
ALTER TABLE ads ADD COLUMN IF NOT EXISTS starts_at timestamptz;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS ends_at timestamptz;
