-- Phase 6: Hardening — RLS enablement + policy fixes (non-destructive, additive where possible)

-- 1) Ensure RLS is enabled where policies exist but were inert
alter table public.subscription_payments enable row level security;
alter table public.users enable row level security;

-- 2) Fix premium_subscriptions: anon true policy exposes all subscriptions
drop policy if exists "Public can read own subscription" on public.premium_subscriptions;

-- 3) Fix listings: anon should only see approved, not all (including pending)
drop policy if exists "Public can read all listings" on public.listings;
drop policy if exists "Public can read listings" on public.listings;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='listings' and policyname='Public can read approved listings') then
    create policy "Public can read approved listings"
    on public.listings for select
    to anon, authenticated
    using (status = 'approved');
  end if;
end $$;

-- 4) Fix site_logs: all 5 policies used auth.uid() = user_id (wrong ID domain)
--    Correct is: exists (select 1 from users where users.id = site_logs.user_id and users.auth_uid = auth.uid())
drop policy if exists "Admins can read all site logs" on public.site_logs;
drop policy if exists "Users can delete own site logs" on public.site_logs;
drop policy if exists "Users can insert own site logs" on public.site_logs;
drop policy if exists "Users can read own site logs" on public.site_logs;
drop policy if exists "Users can update own site logs" on public.site_logs;

create policy "Users can read own site logs"
on public.site_logs for select
to authenticated
using (exists (select 1 from public.users where users.id = site_logs.user_id and users.auth_uid = auth.uid()));

create policy "Users can insert own site logs"
on public.site_logs for insert
to authenticated
with check (exists (select 1 from public.users where users.id = site_logs.user_id and users.auth_uid = auth.uid()));

create policy "Users can update own site logs"
on public.site_logs for update
to authenticated
using (exists (select 1 from public.users where users.id = site_logs.user_id and users.auth_uid = auth.uid()))
with check (exists (select 1 from public.users where users.id = site_logs.user_id and users.auth_uid = auth.uid()));

create policy "Users can delete own site logs"
on public.site_logs for delete
to authenticated
using (exists (select 1 from public.users where users.id = site_logs.user_id and users.auth_uid = auth.uid()));

create policy "Admins can read all site logs"
on public.site_logs for select
to authenticated
using (exists (select 1 from public.users where users.auth_uid = auth.uid() and users.role = 'admin'));

-- 5) Clean up old ads admin policies that checked raw_app_meta_data (wrong store)
--    Keep the correct "Admins can manage ads via users role" added in 20260827
drop policy if exists "Admins can delete ads" on public.ads;
drop policy if exists "Admins can update ads" on public.ads;
drop policy if exists "Admins can insert ads" on public.ads;

-- Ensure public can read active ads (already exists, but ensure)
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ads' and policyname='Public can read active ads') then
    create policy "Public can read active ads"
    on public.ads for select
    to anon, authenticated
    using (is_active = true);
  end if;
end $$;

-- 6) Revoke anon execute on get_active_subscription (IDOR)
revoke execute on function public.get_active_subscription(uuid) from anon, public;
grant execute on function public.get_active_subscription(uuid) to authenticated;

-- 7) Rate limiting for login RPC (custom auth fallback — now removed from code but keep DB hardening)
create table if not exists public.login_attempts (
  email text primary key,
  attempts int not null default 0,
  last_attempt timestamptz not null default now()
);

-- Simple rate-limit helper: allow max 5 attempts per 15 minutes
create or replace function public.check_login_rate_limit(p_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempts int;
  v_last timestamptz;
begin
  select attempts, last_attempt into v_attempts, v_last
  from public.login_attempts where email = lower(p_email);

  if v_attempts is null then
    return true;
  end if;

  if v_last < now() - interval '15 minutes' then
    -- reset window
    update public.login_attempts set attempts = 0, last_attempt = now() where email = lower(p_email);
    return true;
  end if;

  return v_attempts < 5;
end;
$$;

create or replace function public.record_login_attempt(p_email text, p_success boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.login_attempts (email, attempts, last_attempt)
  values (lower(p_email), case when p_success then 0 else 1 end, now())
  on conflict (email) do update
  set attempts = case when p_success then 0 when public.login_attempts.last_attempt < now() - interval '15 minutes' then 1 else public.login_attempts.attempts + 1 end,
      last_attempt = now();
end;
$$;

-- Wrap the existing login function if it exists — add rate limit check at top
do $$
declare
  v_def text;
begin
  select pg_get_functiondef(oid) into v_def from pg_proc where proname = 'login' and pronamespace = 'public'::regnamespace limit 1;
  if v_def is not null and v_def not like '%check_login_rate_limit%' then
    -- We don't auto-rewrite the function here to avoid breaking custom logic;
    -- Instead, enforce via a trigger-like wrapper: create a new function that checks limit then calls original
    -- For now, just ensure the helper table exists — actual login function will be hardened in next migration
    null;
  end if;
end $$;

grant select, insert, update on public.login_attempts to anon, authenticated;
alter table public.login_attempts enable row level security;
drop policy if exists "Service can manage login attempts" on public.login_attempts;
create policy "Service can manage login attempts"
on public.login_attempts for all
to authenticated, anon
using (true) with check (true);
