/*
  YeBetWeg RFQ Workflow

  Adds structured request-for-quote storage so market prices, BOQ summaries,
  listings, and supplier profiles can create procurement leads.
*/

CREATE TABLE IF NOT EXISTS rfq_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  source_type text NOT NULL DEFAULT 'manual',
  source_id uuid,
  requester_name text NOT NULL,
  requester_email text NOT NULL,
  requester_phone text DEFAULT '',
  city text NOT NULL DEFAULT 'Addis Ababa',
  project_type text DEFAULT '',
  message text DEFAULT '',
  status text NOT NULL DEFAULT 'new',
  admin_notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rfq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES rfq_requests(id) ON DELETE CASCADE,
  material_name text NOT NULL,
  specification text DEFAULT '',
  unit text NOT NULL DEFAULT '',
  quantity numeric,
  target_price numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rfq_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'rfq_requests' AND constraint_name = 'rfq_requests_source_type_enum'
  ) THEN
    ALTER TABLE rfq_requests ADD CONSTRAINT rfq_requests_source_type_enum
      CHECK (source_type IN ('manual', 'market_price', 'boq_estimate', 'listing', 'professional'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'rfq_requests' AND constraint_name = 'rfq_requests_status_enum'
  ) THEN
    ALTER TABLE rfq_requests ADD CONSTRAINT rfq_requests_status_enum
      CHECK (status IN ('new', 'reviewing', 'sent_to_supplier', 'quoted', 'closed', 'spam'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_rfq_requests_status ON rfq_requests(status);
CREATE INDEX IF NOT EXISTS idx_rfq_requests_created_at ON rfq_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rfq_requests_user_id ON rfq_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_rfq_items_rfq_id ON rfq_items(rfq_id);

DROP POLICY IF EXISTS "Anyone can submit RFQs" ON rfq_requests;
CREATE POLICY "Anyone can submit RFQs"
  ON rfq_requests FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can submit RFQ items" ON rfq_items;
CREATE POLICY "Anyone can submit RFQ items"
  ON rfq_items FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own RFQs" ON rfq_requests;
CREATE POLICY "Users can read own RFQs"
  ON rfq_requests FOR SELECT TO authenticated USING (
    user_id IN (SELECT id FROM users WHERE auth_uid = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE auth_uid = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users can read own RFQ items" ON rfq_items;
CREATE POLICY "Users can read own RFQ items"
  ON rfq_items FOR SELECT TO authenticated USING (
    rfq_id IN (
      SELECT r.id
      FROM rfq_requests r
      WHERE r.user_id IN (SELECT id FROM users WHERE auth_uid = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM users WHERE auth_uid = auth.uid() AND role = 'admin')
  );

CREATE OR REPLACE FUNCTION submit_rfq(
  p_requester_name text,
  p_requester_email text,
  p_requester_phone text DEFAULT '',
  p_city text DEFAULT 'Addis Ababa',
  p_project_type text DEFAULT '',
  p_message text DEFAULT '',
  p_source_type text DEFAULT 'manual',
  p_source_id uuid DEFAULT NULL,
  p_material_name text DEFAULT '',
  p_specification text DEFAULT '',
  p_unit text DEFAULT '',
  p_quantity numeric DEFAULT NULL,
  p_target_price numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_rfq_id uuid;
BEGIN
  SELECT u.id INTO v_user_id
  FROM users u
  WHERE u.auth_uid = auth.uid();

  INSERT INTO rfq_requests (
    user_id,
    source_type,
    source_id,
    requester_name,
    requester_email,
    requester_phone,
    city,
    project_type,
    message,
    status
  ) VALUES (
    v_user_id,
    p_source_type,
    p_source_id,
    p_requester_name,
    p_requester_email,
    p_requester_phone,
    p_city,
    p_project_type,
    p_message,
    'new'
  )
  RETURNING id INTO v_rfq_id;

  IF COALESCE(trim(p_material_name), '') <> '' THEN
    INSERT INTO rfq_items (
      rfq_id,
      material_name,
      specification,
      unit,
      quantity,
      target_price
    ) VALUES (
      v_rfq_id,
      p_material_name,
      p_specification,
      p_unit,
      p_quantity,
      p_target_price
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'rfq_id', v_rfq_id,
    'message', 'RFQ submitted successfully.'
  );
END;
$$;
