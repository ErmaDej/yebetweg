-- ============================================================================
-- delete_own_account() — user-initiated account deletion (GDPR-style)
-- ============================================================================
-- Called from Dashboard → Settings → Danger Zone → Delete Account, behind a
-- two-step confirmation (warning → type DELETE).
--
-- Design:
--   • Owner-executable only: REVOKE from PUBLIC/anon, GRANT to authenticated.
--     The body re-checks the caller maps to a real users row — defense in
--     depth against the Sep-2026 anon-execution bug class (see
--     20260921010000_submit_rfq_reject_anon.sql).
--   • Erases owned, personal data via FK cascades: boq_estimates → boq_actuals
--     / share tokens, notifications, saved_collections, premium_subscriptions
--     → subscription_payments, login_attempts.
--   • ANONYMIZES records the marketplace should keep for accuracy
--     (ON DELETE SET NULL semantics made explicit): listings, inquiries,
--     rfq_requests (rfq_items cascade with them), site_logs, professionals,
--     ads, subscribers keep their rows but lose the owner.
--   • Admins cannot self-delete (would orphan moderation with no notice).
--   • Finally deletes the users row itself.
--   • Postgres roles (this project uses custom DB auth) can't be dropped from
--     SQL by a non-superuser — role cleanup, if any, is a Dashboard task.
--
-- RLS note: runs as SECURITY DEFINER so the cascading deletes and the final
-- users-row delete cannot be blocked by the caller's own policies mid-flight
-- (a partially-deleted account would be worse than none).

create or replace function public.delete_own_account()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_role    text;
begin
  select u.id, u.role into v_user_id, v_role
  from users u
  where u.auth_uid = auth.uid();

  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Not signed in.');
  end if;

  if v_role = 'admin' then
    return jsonb_build_object(
      'success', false,
      'error', 'Admin accounts cannot self-delete. Ask another admin or use the Supabase dashboard.'
    );
  end if;

  -- 1) Owned personal data — hard delete (FK cascades take the children).
  delete from notifications      where user_id = v_user_id;
  delete from boq_actuals        where user_id = v_user_id;
  delete from boq_estimates      where user_id = v_user_id;
  delete from saved_collections  where user_id = v_user_id;
  delete from premium_subscriptions where user_id = v_user_id;
  delete from login_attempts     where user_id = v_user_id;

  -- 2) Marketplace records — keep the row, drop the person.
  update listings       set user_id = null where user_id = v_user_id;
  update inquiries      set user_id = null where user_id = v_user_id;
  update rfq_requests   set user_id = null where user_id = v_user_id;  -- rfq_items cascade from here
  update site_logs      set user_id = null where user_id = v_user_id;
  update professionals  set user_id = null where user_id = v_user_id;
  update ads            set user_id = null where user_id = v_user_id;
  update subscribers    set user_id = null where user_id = v_user_id;

  -- 3) The account row itself.
  delete from users where id = v_user_id;

  return jsonb_build_object('success', true);
end;
$$;

revoke execute on function public.delete_own_account() from public, anon;
grant  execute on function public.delete_own_account() to authenticated;
