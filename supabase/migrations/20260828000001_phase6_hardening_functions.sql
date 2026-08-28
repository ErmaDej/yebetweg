-- Phase 6: Harden DB functions — remove custom-auth bypass

-- 1) Drop insecure overloads that trust p_custom_user_id
drop function if exists public.create_listing(text, text, text, text, numeric, text, text, text, text, text[], uuid);
drop function if exists public.submit_inquiry(text, text, text, text, text, uuid, uuid, uuid);

-- Keep the secure versions (without p_custom_user_id) — they already exist and correctly use auth.uid() -> users.auth_uid

-- 2) Secure helper for admin checks — use auth, not supplied UUID
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where auth_uid = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- 3) Harden admin_check_custom_user to also require auth (defense in depth)
--    Keep signature for backward compat but ignore the supplied UUID and check real auth
create or replace function public.admin_check_custom_user(p_custom_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Ignore supplied UUID — check actual authenticated user
  return public.is_admin();
end;
$$;

-- 4) For all admin_* functions that took p_custom_user_id, create secure wrappers
--    that ignore the param and check is_admin(). We do this via overloading:
--    create versions without the param that are secure, and make the old versions delegate to is_admin().
--    Instead of rewriting all ~10 admin functions here (they will be hardened via the edge function fix),
--    we at least ensure the check function is secure. The edge function will be fixed to not send _customUserId.

-- 5) Ensure login rate-limit helpers are executable (already created in previous migration)
grant execute on function public.check_login_rate_limit(text) to anon, authenticated;
grant execute on function public.record_login_attempt(text, boolean) to anon, authenticated;
