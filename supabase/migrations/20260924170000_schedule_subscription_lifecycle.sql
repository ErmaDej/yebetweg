-- ============================================================================
-- Schedule subscription-lifecycle (daily 08:00 UTC) — renewal reminders + win-back
-- ============================================================================
-- pg_cron fires the command; pg_net performs the HTTP POST (pg_cron cannot make
-- network calls on its own). The `x-lifecycle-key` guard header value is read
-- from public.app_settings ('cron_secret') at FIRE TIME instead of being
-- embedded in the stored command: rotating the secret in app_settings applies
-- to the schedule immediately, and no secret literal lives in this repo.
--
-- Auth chain: cron → net.http_post (no Authorization header possible) →
-- subscription-lifecycle checks `x-lifecycle-key` against its CRON_SECRET env
-- (kept in sync with app_settings by `supabase secrets set`; see
-- docs/EDGE_FUNCTIONS_RUNBOOK.md §5c).
-- ============================================================================

-- 1) pg_net (idempotent; provides the `net` schema used below).
create extension if not exists pg_net with schema extensions;

-- 2) Secret resolver. SECURITY NOTES:
--    - Runs as the cron job owner (postgres), who owns app_settings and
--      therefore bypasses its admin-only RLS.
--    - Execute is revoked from public/anon/authenticated so PostgREST can
--      never be used to read the secret; only service_role (and the job
--      owner) may call it.
create or replace function public.current_cron_secret()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select value #>> '{}' from public.app_settings where key = 'cron_secret'),
    ''
  );
$$;

revoke all on function public.current_cron_secret() from public;
revoke all on function public.current_cron_secret() from anon;
revoke all on function public.current_cron_secret() from authenticated;
grant execute on function public.current_cron_secret() to service_role;
grant execute on function public.current_cron_secret() to postgres;

-- 3) (Re)create the schedule — unschedule first so re-running this migration
--    never duplicates the job.
select cron.unschedule('yebetweg-subscription-lifecycle')
where exists (select 1 from cron.job where jobname = 'yebetweg-subscription-lifecycle');

select cron.schedule(
  'yebetweg-subscription-lifecycle',
  '0 8 * * *', -- daily 08:00 UTC
  $$
  select net.http_post(
    url := 'https://jxyavtdmcloxnhuavokc.supabase.co/functions/v1/subscription-lifecycle',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-lifecycle-key', public.current_cron_secret()
    ),
    body := '{}'::jsonb
  );
  $$
);
