-- ============================================================================
-- Digest schedules: resolve the guard secret from app_settings at fire time
-- ============================================================================
-- The three digest jobs (runbook §5/§5b) were scheduled with the CRON_SECRET
-- literal embedded in their stored cron command. After the secret rotation
-- (2026-09-24, now mirrored in public.app_settings 'cron_secret') those stored
-- literals are stale and the jobs would 401 on their next fire. Re-schedule
-- all three using public.current_cron_secret() (created in
-- 20260924170000_schedule_subscription_lifecycle.sql) so rotations apply
-- immediately and no secret lives in the stored SQL.
-- ============================================================================

select cron.unschedule(jobname)
from cron.job
where jobname in (
  'yebetweg-freshness-digest',
  'yebetweg-tip-qa-digest',
  'yebetweg-revenue-digest'
);

select cron.schedule(
  'yebetweg-freshness-digest',
  '0 6 * * 1', -- Mondays 06:00 UTC
  $$
  select net.http_post(
    url := 'https://jxyavtdmcloxnhuavokc.supabase.co/functions/v1/freshness_cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-key', public.current_cron_secret()
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'yebetweg-tip-qa-digest',
  '30 6 * * *', -- daily 06:30 UTC
  $$
  select net.http_post(
    url := 'https://jxyavtdmcloxnhuavokc.supabase.co/functions/v1/tip-qa-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-key', public.current_cron_secret()
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'yebetweg-revenue-digest',
  '0 7 * * 1', -- Mondays 07:00 UTC
  $$
  select net.http_post(
    url := 'https://jxyavtdmcloxnhuavokc.supabase.co/functions/v1/revenue-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-key', public.current_cron_secret()
    ),
    body := '{}'::jsonb
  );
  $$
);
