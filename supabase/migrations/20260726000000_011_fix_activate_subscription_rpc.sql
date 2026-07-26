CREATE OR REPLACE FUNCTION activate_subscription(p_reference text, p_gateway text DEFAULT 'chapa')
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

  -- Record the payment
  INSERT INTO subscription_payments (user_id, subscription_id, amount, currency, method, reference, status)
  VALUES (v_user_id, v_subscription_id, CASE WHEN v_tier = 'premium' THEN 500 ELSE 1200 END, 'ETB', p_gateway, p_reference, 'completed');

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_subscription_id,
    'user_id', v_user_id,
    'tier', v_tier
  );
END;
$$;
