/*
  # Security: Fix RLS Policies for Unauthenticated Inserts

  ## Problem
  Critical security issue: `listings`, `subscribers`, and `inquiries` tables
  had INSERT policies with `WITH CHECK (true)`, allowing any anonymous user
  to insert arbitrary data without validation.

  ## Changes
  1. **listings** - Replace "Anyone can submit listings" with authenticated-only INSERT policy
  2. **subscribers** - Replace "Anyone can subscribe" with authenticated-only INSERT policy
  3. **inquiries** - Replace "Anyone can submit inquiries" with authenticated-only INSERT policy
  4. **ads** - Add admin-only INSERT/UPDATE/DELETE policies (currently no write policies exist)
  5. **professionals** - Add authenticated-only INSERT policy for professional registration

  ## Security Impact
  - Anonymous (anon) users can NO LONGER insert data into listings, subscribers, inquiries
  - Only authenticated users can submit listings, inquiries, and subscribe
  - Ads table is now fully restricted to admin-only writes
  - Professional registration requires authentication

  ## Notes
  1. SELECT policies remain unchanged (public read access for content)
  2. Frontend forms will need to handle auth requirement gracefully
  3. For now, listings/inquiries/subscribers inserts require authenticated users
*/

-- Drop insecure INSERT policies
DROP POLICY IF EXISTS "Anyone can submit listings" ON listings;
DROP POLICY IF EXISTS "Anyone can subscribe" ON subscribers;
DROP POLICY IF EXISTS "Anyone can submit inquiries" ON inquiries;

-- Add secure INSERT policies (authenticated users only)
CREATE POLICY "Authenticated users can submit listings"
  ON listings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can subscribe"
  ON subscribers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can submit inquiries"
  ON inquiries FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add professional registration policy
CREATE POLICY "Authenticated users can register as professionals"
  ON professionals FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add admin-only write policies for ads table
CREATE POLICY "Admins can insert ads"
  ON ads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can update ads"
  ON ads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can delete ads"
  ON ads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );
