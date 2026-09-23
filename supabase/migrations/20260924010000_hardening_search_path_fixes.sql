-- ============================================================================
-- RLS / function privilege audit fixes (Sep 2026)
-- ============================================================================
-- Audit finding: 9 live SECURITY DEFINER functions had no `SET search_path`,
-- which means their body resolution used the caller-controlled search_path —
-- the classic privilege-hijack vector (a malicious schema earlier in the path
-- could shadow the tables they reference). All 9 are re-declared here with
-- `set search_path = public` while keeping behavior and signatures identical.
--
-- Defect classes checked and CLEAN:
--   • functions referencing nonexistent columns (the smoke-test bug class) —
--     no hits outside the already-fixed tip_qa trigger
--   • missing EXECUTE grants on the tip Q&A RPCs — base migration already
--     revokes from public/anon and grants to authenticated
--   • hardcoded project refs inside migrations — none
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Custom auth (20260515000000)
-- ---------------------------------------------------------------------------
create or replace function public.authenticate_user(
  p_email text,
  p_password text
)
returns table (
  user_id uuid,
  username text,
  email text,
  full_name text,
  role text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    u.id,
    u.username,
    u.email,
    u.full_name,
    u.role,
    u.status
  from users u
  where u.email = p_email
    and u.password_hash is not null
    and u.password_hash = crypt(p_password, u.password_hash)
    and u.status = 'active';
end;
$$;

grant execute on function public.authenticate_user(text, text) to anon, authenticated;

create or replace function public.login(
  p_email text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_username text;
  v_role text;
  v_status text;
begin
  select u.id, u.username, u.role, u.status
    into v_user_id, v_username, v_role, v_status
    from users u
   where u.email = p_email
     and u.password_hash is not null
     and u.password_hash = crypt(p_password, u.password_hash);

  if v_user_id is not null then
    if v_status != 'active' then
      return jsonb_build_object('success', false, 'message', 'Account is not active');
    end if;
    return jsonb_build_object(
      'success', true,
      'user_id', v_user_id,
      'username', v_username,
      'role', v_role,
      'message', 'Login successful'
    );
  else
    return jsonb_build_object('success', false, 'message', 'Invalid email or password');
  end if;
end;
$$;

grant execute on function public.login(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin RPCs (20260728000001) — hardened copies, same signatures/behavior.
-- admin_check_custom_user gains search_path too (all others authorize
-- through it, so hardening it hardens the chain).
-- ---------------------------------------------------------------------------
create or replace function public.admin_check_custom_user(p_custom_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from users
    where id = p_custom_user_id
      and role = 'admin'
      and status = 'active'
  );
end;
$$;

create or replace function public.admin_get_market_prices(p_custom_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  if not admin_check_custom_user(p_custom_user_id) then
    raise exception 'Unauthorized';
  end if;
  select json_agg(to_json(mp) order by mp.category, mp.material_en)
    into result
    from market_prices mp;
  return coalesce(result, '[]'::json);
end;
$$;

create or replace function public.admin_create_market_price(
  p_custom_user_id uuid,
  p_material_am text,
  p_material_en text,
  p_unit text,
  p_price numeric,
  p_change_percent numeric default 0,
  p_category text default 'cement',
  p_city text default 'Addis Ababa',
  p_specification text default '',
  p_source_type text default 'admin_verified',
  p_source_name text default 'YeBetWeg Market Desk',
  p_vat_included boolean default false,
  p_confidence_score int default 90,
  p_trend_direction text default 'stable',
  p_freshness_status text default 'verified',
  p_access_level text default 'free'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  if not admin_check_custom_user(p_custom_user_id) then
    raise exception 'Unauthorized';
  end if;
  insert into market_prices (
    material_am, material_en, unit, price, change_percent, category,
    city, specification, source_type, source_name, vat_included,
    confidence_score, trend_direction, freshness_status, access_level
  ) values (
    p_material_am, p_material_en, p_unit, p_price, p_change_percent, p_category,
    p_city, p_specification, p_source_type, p_source_name, p_vat_included,
    p_confidence_score, p_trend_direction, p_freshness_status, p_access_level
  )
  returning to_json(market_prices.*) into result;
  return result;
end;
$$;

create or replace function public.admin_update_market_price(
  p_custom_user_id uuid,
  p_price_id uuid,
  p_material_am text default null,
  p_material_en text default null,
  p_unit text default null,
  p_price numeric default null,
  p_change_percent numeric default null,
  p_category text default null,
  p_city text default null,
  p_specification text default null,
  p_source_type text default null,
  p_source_name text default null,
  p_vat_included boolean default null,
  p_confidence_score int default null,
  p_trend_direction text default null,
  p_freshness_status text default null,
  p_access_level text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  if not admin_check_custom_user(p_custom_user_id) then
    raise exception 'Unauthorized';
  end if;
  update market_prices set
    material_am = coalesce(p_material_am, material_am),
    material_en = coalesce(p_material_en, material_en),
    unit = coalesce(p_unit, unit),
    price = coalesce(p_price, price),
    change_percent = coalesce(p_change_percent, change_percent),
    category = coalesce(p_category, category),
    city = coalesce(p_city, city),
    specification = coalesce(p_specification, specification),
    source_type = coalesce(p_source_type, source_type),
    source_name = coalesce(p_source_name, source_name),
    vat_included = coalesce(p_vat_included, vat_included),
    confidence_score = coalesce(p_confidence_score, confidence_score),
    trend_direction = coalesce(p_trend_direction, trend_direction),
    freshness_status = coalesce(p_freshness_status, freshness_status),
    access_level = coalesce(p_access_level, access_level),
    updated_at = now()
  where id = p_price_id
  returning to_json(market_prices.*) into result;
  return result;
end;
$$;

create or replace function public.admin_delete_market_price(
  p_custom_user_id uuid,
  p_price_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not admin_check_custom_user(p_custom_user_id) then
    raise exception 'Unauthorized';
  end if;
  delete from market_prices where id = p_price_id;
  return found;
end;
$$;

create or replace function public.admin_bulk_import_market_prices(
  p_custom_user_id uuid,
  p_rows json
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count int := 0;
  row_data json;
begin
  if not admin_check_custom_user(p_custom_user_id) then
    raise exception 'Unauthorized';
  end if;
  for row_data in select * from json_array_elements(p_rows)
  loop
    insert into market_prices (
      material_am, material_en, unit, price, change_percent, category,
      city, specification, source_type, source_name, vat_included,
      confidence_score, trend_direction, freshness_status, access_level
    ) values (
      coalesce(row_data->>'material_am', ''),
      coalesce(row_data->>'material_en', ''),
      coalesce(row_data->>'unit', 'Qtl'),
      (coalesce((row_data->>'price')::numeric, 0)),
      (coalesce((row_data->>'change_percent')::numeric, 0)),
      coalesce(row_data->>'category', 'cement'),
      coalesce(row_data->>'city', 'Addis Ababa'),
      coalesce(row_data->>'specification', ''),
      coalesce(row_data->>'source_type', 'admin_verified'),
      coalesce(row_data->>'source_name', 'YeBetWeg Market Desk'),
      coalesce((row_data->>'vat_included')::boolean, false),
      (coalesce((row_data->>'confidence_score')::int, 70)),
      coalesce(row_data->>'trend_direction', 'stable'),
      coalesce(row_data->>'freshness_status', 'verified'),
      coalesce(row_data->>'access_level', 'free')
    );
    inserted_count := inserted_count + 1;
  end loop;
  return json_build_object('count', inserted_count);
end;
$$;

create or replace function public.admin_get_rfqs(p_custom_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  if not admin_check_custom_user(p_custom_user_id) then
    raise exception 'Unauthorized';
  end if;
  select json_agg(
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
      'rfq_items', coalesce(
        (select json_agg(json_build_object(
          'material_name', ri.material_name,
          'specification', ri.specification,
          'unit', ri.unit,
          'quantity', ri.quantity,
          'target_price', ri.target_price
        )) from rfq_items ri where ri.rfq_id = r.id),
        '[]'::json
      )
    ) order by r.created_at desc
  ) into result
  from rfq_requests r;
  return coalesce(result, '[]'::json);
end;
$$;

create or replace function public.admin_update_rfq_status(
  p_custom_user_id uuid,
  p_rfq_id uuid,
  p_status text,
  p_admin_notes text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not admin_check_custom_user(p_custom_user_id) then
    raise exception 'Unauthorized';
  end if;
  update rfq_requests set
    status = p_status,
    admin_notes = coalesce(p_admin_notes, admin_notes),
    updated_at = now()
  where id = p_rfq_id;
  return found;
end;
$$;
