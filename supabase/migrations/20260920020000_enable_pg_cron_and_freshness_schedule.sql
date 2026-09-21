-- ============================================================================
-- Enable pg_cron + schedule the daily DB-side freshness flagging.
-- Fixes: "ERROR 3F000: schema "cron" does not exist" — pg_cron was never
-- enabled on the hosted project, so every cron.schedule() call failed.
-- ============================================================================
-- What runs daily at 02:00 UTC:
--   expire_stale_market_prices() — flags market_prices rows older than 7 days
--   as 'expired' (the "70% fresh" honesty data buyers see). The weekly digest
--   (email/telegram/in-app) is a separate pg_cron job — see
--   docs/EDGE_FUNCTIONS_RUNBOOK.md §5 — that POSTs to the freshness_cron edge
--   function, which calls these same RPCs and then notifies admins.
-- ============================================================================

-- 1) Enable pg_cron (idempotent). On hosted Supabase it installs into the
--    `extensions` schema (default for dashboard-enabled extensions).
create extension if not exists pg_cron with schema extensions;

-- pg_cron's job metadata lives in the `cron` schema; the postgres role needs
-- USAGE to schedule/inspect jobs (grants are idempotent).
grant usage on schema cron to postgres;

-- 2) Daily DB-side flagging at 02:00 UTC — replaces the schedule this
--    migration's predecessor documented but never created. Version-tagged
--    jobname (v2) so re-running after a stale v1 job upgrades cleanly.
select cron.schedule(
  'yebetweg-refresh-freshness-v2',
  '0 2 * * *',
  $$
  select public.expire_stale_market_prices();
  $$
);

-- If an older job from earlier attempts exists under the plain name, drop it
-- so dashboards show exactly one freshness job.
select cron.unschedule(jobname)
from cron.job
where jobname = 'yebetweg-refresh-freshness';
