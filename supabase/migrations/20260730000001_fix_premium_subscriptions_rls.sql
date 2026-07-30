-- Fix RLS policies for premium_subscriptions
-- Root cause: No INSERT/UPDATE policies existed, so createSubscriptionRecord
-- silently failed and PaymentSuccessPage couldn't find the row

-- 1. Allow authenticated users to insert their own subscriptions
DROP POLICY IF EXISTS "Users can insert own subscription" ON premium_subscriptions;
CREATE POLICY "Users can insert own subscription"
  ON premium_subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2. Allow authenticated users to update their own subscriptions
DROP POLICY IF EXISTS "Users can update own subscription" ON premium_subscriptions;
CREATE POLICY "Users can update own subscription"
  ON premium_subscriptions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
