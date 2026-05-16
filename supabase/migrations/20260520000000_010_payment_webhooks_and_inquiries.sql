/*
  YeBetWeg MVP Enhancement: Payment Webhooks, Inquiries, and Enhanced Seed Data

  This migration adds:
  1. Webhook tracking for Chapa and TeleBirr callbacks
  2. Inquiry system enhancements for marketplace & professionals
  3. Listing submission support (user-owned listings)
  4. Additional seed data for payments, inquiries, and listings
  5. Helper functions and triggers for subscription activation
*/

-- ==========================================
-- 1. Webhook Event Logging Table
-- ==========================================
CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway text NOT NULL CHECK (gateway IN ('chapa', 'telebirr')),
  event_type text NOT NULL,
  reference text,
  payload jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'failed')),
  processed_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payment_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only service role can manage webhook events"
  ON payment_webhook_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ==========================================
-- 2. Enhanced Inquiry System
-- ==========================================

-- Add listing inquiry support (linking inquiries to listings/professionals)
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS professional_id uuid REFERENCES professionals(id) ON DELETE SET NULL;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false;

-- ==========================================
-- 3. Listing Submission Enhancements
-- ==========================================

-- Add status column for listing moderation
ALTER TABLE listings ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'sold'));
ALTER TABLE listings ADD COLUMN IF NOT EXISTS rejected_reason text;

-- Create an RPC function for users to create their own listings
CREATE OR REPLACE FUNCTION create_listing(
  p_listing_type text,
  p_title_am text,
  p_title_en text,
  p_description text,
  p_price numeric,
  p_location text,
  p_contact_phone text,
  p_contact_email text,
  p_category text,
  p_images text[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_listing_id uuid;
BEGIN
  -- Get the user_id from the current auth user
  SELECT u.id INTO v_user_id
  FROM users u
  WHERE u.auth_uid::text = auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found. Please ensure your profile is set up.');
  END IF;

  INSERT INTO listings (
    listing_type, title_am, title_en, description, price,
    location, contact_phone, contact_email, category, images,
    user_id, status, is_verified
  ) VALUES (
    p_listing_type, p_title_am, p_title_en, p_description, p_price,
    p_location, p_contact_phone, p_contact_email, p_category, p_images,
    v_user_id, 'pending', false
  )
  RETURNING id INTO v_listing_id;

  RETURN jsonb_build_object(
    'success', true,
    'listing_id', v_listing_id,
    'message', 'Listing created successfully and is pending review.'
  );
END;
$$;

-- Create an RPC function for submitting inquiries
CREATE OR REPLACE FUNCTION submit_inquiry(
  p_name text,
  p_email text,
  p_phone text DEFAULT '',
  p_subject text,
  p_message text,
  p_listing_id uuid DEFAULT NULL,
  p_professional_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Try to get the user_id if authenticated
  SELECT u.id INTO v_user_id
  FROM users u
  WHERE u.auth_uid::text = auth.uid();

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

-- ==========================================
-- 4. Subscription Activation Function
-- ==========================================

-- RPC to activate a subscription after successful payment
CREATE OR REPLACE FUNCTION activate_subscription(
  p_reference text,
  p_gateway text DEFAULT 'chapa'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription_id uuid;
  v_user_id uuid;
  v_tier text;
BEGIN
  -- Find the subscription by reference
  IF p_gateway = 'chapa' THEN
    SELECT id, user_id, tier INTO v_subscription_id, v_user_id, v_tier
    FROM premium_subscriptions
    WHERE chapa_reference = p_reference AND status = 'pending';
  ELSE
    SELECT id, user_id, tier INTO v_subscription_id, v_user_id, v_tier
    FROM premium_subscriptions
    WHERE telebirr_reference = p_reference AND status = 'pending';
  END IF;

  IF v_subscription_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Subscription not found or already active');
  END IF;

  -- Activate the subscription
  UPDATE premium_subscriptions
  SET is_active = true,
      status = 'active',
      updated_at = now(),
      starts_at = now(),
      expires_at = now() + interval '30 days'
  WHERE id = v_subscription_id;

  -- Update user role
  UPDATE users
  SET role = CASE
      WHEN v_tier = 'pro' THEN 'pro'
      WHEN v_tier = 'premium' THEN 'premium'
      ELSE role
    END,
    updated_at = now()
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_subscription_id,
    'user_id', v_user_id,
    'tier', v_tier
  );
END;
$$;

-- ==========================================
-- 5. Additional Seed Data for Testing
-- ==========================================

-- Insert sample inquiries for testing
DO $$
DECLARE
  v_listing_id uuid;
  v_professional_id uuid;
BEGIN
  -- Get reference IDs
  SELECT id INTO v_listing_id FROM listings LIMIT 1;
  SELECT id INTO v_professional_id FROM professionals LIMIT 1;

  -- Seed inquiries if they don't exist
  IF NOT EXISTS (SELECT 1 FROM inquiries WHERE subject = 'Inquiry about construction material') THEN
    INSERT INTO inquiries (name, email, phone, subject, message, listing_id, created_at)
    VALUES
      ('Abebe Kebede', 'abebe@example.com', '+251911123456', 'Inquiry about construction material',
       'I am interested in this material. Please provide more details about pricing and availability.',
       v_listing_id, now() - interval '2 days');

    INSERT INTO inquiries (name, email, phone, subject, message, professional_id, created_at)
    VALUES
      ('Sara Tadesse', 'sara@example.com', '+251922345678', 'Consultation request for residential project',
       'I would like to schedule a consultation for a 3-bedroom residential project in Addis Ababa.',
       v_professional_id, now() - interval '1 day');
  END IF;
END $$;

-- Seed additional payment records for testing
DO $$
DECLARE
  v_premium_user_id uuid;
  v_pro_user_id uuid;
  v_premium_sub_id uuid;
  v_pro_sub_id uuid;
BEGIN
  SELECT id INTO v_premium_user_id FROM users WHERE username = 'PremiumUser' LIMIT 1;
  SELECT id INTO v_pro_user_id FROM users WHERE username = 'ProUser' LIMIT 1;

  -- Add payment records for the existing subscriptions
  IF v_premium_user_id IS NOT NULL THEN
    SELECT id INTO v_premium_sub_id FROM premium_subscriptions
    WHERE user_id = v_premium_user_id AND tier = 'premium' LIMIT 1;

    IF v_premium_sub_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM subscription_payments WHERE subscription_id = v_premium_sub_id AND reference = 'CHAPA-PAY-0001'
    ) THEN
      INSERT INTO subscription_payments (user_id, subscription_id, amount, currency, method, reference, status, created_at)
      VALUES (v_premium_user_id, v_premium_sub_id, 500, 'ETB', 'chapa', 'CHAPA-PAY-0001', 'completed', now() - interval '25 days');
    END IF;
  END IF;

  IF v_pro_user_id IS NOT NULL THEN
    SELECT id INTO v_pro_sub_id FROM premium_subscriptions
    WHERE user_id = v_pro_user_id AND tier = 'pro' LIMIT 1;

    IF v_pro_sub_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM subscription_payments WHERE subscription_id = v_pro_sub_id AND reference = 'TELEBIRR-PAY-0001'
    ) THEN
      INSERT INTO subscription_payments (user_id, subscription_id, amount, currency, method, reference, status, created_at)
      VALUES (v_pro_user_id, v_pro_sub_id, 1200, 'ETB', 'telebirr', 'TELEBIRR-PAY-0001', 'completed', now() - interval '20 days');
    END IF;
  END IF;
END $$;

-- Add RLS policies for user-owned listings
DROP POLICY IF EXISTS "Users can update own listings" ON listings;
CREATE POLICY "Users can update own listings"
  ON listings FOR UPDATE TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_uid::text = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_uid::text = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own pending listings" ON listings;
CREATE POLICY "Users can delete own pending listings"
  ON listings FOR DELETE TO authenticated
  USING (
    status = 'pending'
    AND user_id IN (SELECT id FROM users WHERE auth_uid::text = auth.uid())
  );

-- Admin can see all listings including pending
DROP POLICY IF EXISTS "Admin can read all listings" ON listings;
CREATE POLICY "Admin can read all listings"
  ON listings FOR SELECT TO authenticated
  USING (
    status = 'approved'
    OR user_id IN (SELECT id FROM users WHERE auth_uid::text = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users WHERE auth_uid::text = auth.uid() AND role = 'admin'
    )
  );

-- RLS for inquiries - users can see their own, admins can see all
DROP POLICY IF EXISTS "Users can read own inquiries" ON inquiries;
CREATE POLICY "Users can read own inquiries"
  ON inquiries FOR SELECT TO authenticated
  USING (
    user_id IN (SELECT id FROM users WHERE auth_uid::text = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users WHERE auth_uid::text = auth.uid() AND role = 'admin'
    )
  );

-- Allow public to insert inquiries (for non-logged-in users)
DROP POLICY IF EXISTS "Anyone can submit inquiries" ON inquiries;
CREATE POLICY "Anyone can submit inquiries"
  ON inquiries FOR INSERT TO anon, authenticated WITH CHECK (true);