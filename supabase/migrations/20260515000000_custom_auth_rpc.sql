/*
  Custom Authentication RPC for Local User Login
  
  This migration creates an RPC function to authenticate users from the custom
  `users` table using bcrypt password verification. This allows seeded test
  accounts with locally-hashed passwords to work alongside Supabase auth.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- RPC function to authenticate against custom users table
CREATE OR REPLACE FUNCTION authenticate_user(
  p_email text,
  p_password text
)
RETURNS TABLE (
  user_id uuid,
  username text,
  email text,
  full_name text,
  role text,
  status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.username,
    u.email,
    u.full_name,
    u.role,
    u.status
  FROM users u
  WHERE u.email = p_email
    AND u.password_hash IS NOT NULL
    AND u.password_hash = crypt(p_password, u.password_hash)
    AND u.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION authenticate_user(text, text) TO anon, authenticated;

-- Alternative: Create a login via email function that returns a JWT-compatible response
CREATE OR REPLACE FUNCTION login(
  p_email text,
  p_password text
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_username text;
  v_role text;
  v_status text;
BEGIN
  SELECT u.id, u.username, u.role, u.status INTO v_user_id, v_username, v_role, v_status
  FROM users u
  WHERE u.email = p_email
    AND u.password_hash IS NOT NULL
    AND u.password_hash = crypt(p_password, u.password_hash);

  IF v_user_id IS NOT NULL THEN
    IF v_status != 'active' THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Account is not active'
      );
    END IF;
    
    RETURN jsonb_build_object(
      'success', true,
      'user_id', v_user_id,
      'username', v_username,
      'role', v_role,
      'message', 'Login successful'
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid email or password'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION login(text, text) TO anon, authenticated;
