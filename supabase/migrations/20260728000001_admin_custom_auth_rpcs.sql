-- Admin helper: check if a custom-auth user is an active admin
CREATE OR REPLACE FUNCTION admin_check_custom_user(p_custom_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = p_custom_user_id
    AND role = 'admin'
    AND status = 'active'
  );
END;
$$;

-- Admin: list all market prices
CREATE OR REPLACE FUNCTION admin_get_market_prices(p_custom_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT admin_check_custom_user(p_custom_user_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT json_agg(to_json(mp) ORDER BY mp.category, mp.material_en)
  INTO result
  FROM market_prices mp;
  RETURN COALESCE(result, '[]'::JSON);
END;
$$;

-- Admin: create market price
CREATE OR REPLACE FUNCTION admin_create_market_price(
  p_custom_user_id UUID,
  p_material_am TEXT,
  p_material_en TEXT,
  p_unit TEXT,
  p_price NUMERIC,
  p_change_percent NUMERIC DEFAULT 0,
  p_category TEXT DEFAULT 'cement',
  p_city TEXT DEFAULT 'Addis Ababa',
  p_specification TEXT DEFAULT '',
  p_source_type TEXT DEFAULT 'admin_verified',
  p_source_name TEXT DEFAULT 'YeBetWeg Market Desk',
  p_vat_included BOOLEAN DEFAULT false,
  p_confidence_score INT DEFAULT 90,
  p_trend_direction TEXT DEFAULT 'stable',
  p_freshness_status TEXT DEFAULT 'verified',
  p_access_level TEXT DEFAULT 'free'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT admin_check_custom_user(p_custom_user_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  INSERT INTO market_prices (
    material_am, material_en, unit, price, change_percent, category,
    city, specification, source_type, source_name, vat_included,
    confidence_score, trend_direction, freshness_status, access_level
  ) VALUES (
    p_material_am, p_material_en, p_unit, p_price, p_change_percent, p_category,
    p_city, p_specification, p_source_type, p_source_name, p_vat_included,
    p_confidence_score, p_trend_direction, p_freshness_status, p_access_level
  )
  RETURNING to_json(market_prices.*) INTO result;
  RETURN result;
END;
$$;

-- Admin: update market price
CREATE OR REPLACE FUNCTION admin_update_market_price(
  p_custom_user_id UUID,
  p_price_id UUID,
  p_material_am TEXT DEFAULT NULL,
  p_material_en TEXT DEFAULT NULL,
  p_unit TEXT DEFAULT NULL,
  p_price NUMERIC DEFAULT NULL,
  p_change_percent NUMERIC DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_specification TEXT DEFAULT NULL,
  p_source_type TEXT DEFAULT NULL,
  p_source_name TEXT DEFAULT NULL,
  p_vat_included BOOLEAN DEFAULT NULL,
  p_confidence_score INT DEFAULT NULL,
  p_trend_direction TEXT DEFAULT NULL,
  p_freshness_status TEXT DEFAULT NULL,
  p_access_level TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT admin_check_custom_user(p_custom_user_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE market_prices SET
    material_am = COALESCE(p_material_am, material_am),
    material_en = COALESCE(p_material_en, material_en),
    unit = COALESCE(p_unit, unit),
    price = COALESCE(p_price, price),
    change_percent = COALESCE(p_change_percent, change_percent),
    category = COALESCE(p_category, category),
    city = COALESCE(p_city, city),
    specification = COALESCE(p_specification, specification),
    source_type = COALESCE(p_source_type, source_type),
    source_name = COALESCE(p_source_name, source_name),
    vat_included = COALESCE(p_vat_included, vat_included),
    confidence_score = COALESCE(p_confidence_score, confidence_score),
    trend_direction = COALESCE(p_trend_direction, trend_direction),
    freshness_status = COALESCE(p_freshness_status, freshness_status),
    access_level = COALESCE(p_access_level, access_level),
    updated_at = now()
  WHERE id = p_price_id
  RETURNING to_json(market_prices.*) INTO result;
  RETURN result;
END;
$$;

-- Admin: delete market price
CREATE OR REPLACE FUNCTION admin_delete_market_price(
  p_custom_user_id UUID,
  p_price_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT admin_check_custom_user(p_custom_user_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  DELETE FROM market_prices WHERE id = p_price_id;
  RETURN FOUND;
END;
$$;

-- Admin: bulk import market prices
CREATE OR REPLACE FUNCTION admin_bulk_import_market_prices(
  p_custom_user_id UUID,
  p_rows JSON
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inserted_count INT := 0;
  row_data JSON;
BEGIN
  IF NOT admin_check_custom_user(p_custom_user_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  FOR row_data IN SELECT * FROM json_array_elements(p_rows)
  LOOP
    INSERT INTO market_prices (
      material_am, material_en, unit, price, change_percent, category,
      city, specification, source_type, source_name, vat_included,
      confidence_score, trend_direction, freshness_status, access_level
    ) VALUES (
      COALESCE(row_data->>'material_am', ''),
      COALESCE(row_data->>'material_en', ''),
      COALESCE(row_data->>'unit', 'Qtl'),
      (COALESCE((row_data->>'price')::NUMERIC, 0)),
      (COALESCE((row_data->>'change_percent')::NUMERIC, 0)),
      COALESCE(row_data->>'category', 'cement'),
      COALESCE(row_data->>'city', 'Addis Ababa'),
      COALESCE(row_data->>'specification', ''),
      COALESCE(row_data->>'source_type', 'admin_verified'),
      COALESCE(row_data->>'source_name', 'YeBetWeg Market Desk'),
      COALESCE((row_data->>'vat_included')::BOOLEAN, false),
      (COALESCE((row_data->>'confidence_score')::INT, 70)),
      COALESCE(row_data->>'trend_direction', 'stable'),
      COALESCE(row_data->>'freshness_status', 'verified'),
      COALESCE(row_data->>'access_level', 'free')
    );
    inserted_count := inserted_count + 1;
  END LOOP;
  RETURN json_build_object('count', inserted_count);
END;
$$;

-- Admin: list all RFQs
CREATE OR REPLACE FUNCTION admin_get_rfqs(p_custom_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT admin_check_custom_user(p_custom_user_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT json_agg(
    json_build_object(
      'id', r.id,
      'requester_name', r.requester_name,
      'requester_email', r.requester_email,
      'requester_phone', r.requester_phone,
      'city', r.city,
      'source_type', r.source_type,
      'status', r.status,
      'admin_notes', r.admin_notes,
      'created_at', r.created_at,
      'rfq_items', COALESCE(
        (SELECT json_agg(json_build_object(
          'material_name', ri.material_name,
          'specification', ri.specification,
          'unit', ri.unit,
          'quantity', ri.quantity,
          'target_price', ri.target_price
        )) FROM rfq_items ri WHERE ri.rfq_id = r.id),
        '[]'::JSON
      )
    ) ORDER BY r.created_at DESC
  ) INTO result
  FROM rfq_requests r;
  RETURN COALESCE(result, '[]'::JSON);
END;
$$;

-- Admin: update RFQ status
CREATE OR REPLACE FUNCTION admin_update_rfq_status(
  p_custom_user_id UUID,
  p_rfq_id UUID,
  p_status TEXT,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT admin_check_custom_user(p_custom_user_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE rfq_requests SET
    status = p_status,
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    updated_at = now()
  WHERE id = p_rfq_id;
  RETURN FOUND;
END;
$$;
