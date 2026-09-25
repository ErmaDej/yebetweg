-- ============================================================================
-- Cron HTTP calls: raise pg_net timeout 5s (default) → 30s.
-- ============================================================================
-- Incident, 2026-09-25 08:00 UTC: cron.job_run_details showed
-- yebetweg-subscription-lifecycle "succeeded", but net._http_response held
-- `Timeout of 5000 ms reached` and the function never ran — a cold-started
-- edge function plus its Supabase-auth lookup exceeded pg_net's default 5s
-- wait. "Succeeded" only means the SQL block ran; the HTTP call was abandoned
-- mid-flight and the daily run was silently lost.
--
-- Fix: explicit timeout_milliseconds on every scheduled http_post. 30s gives
-- cold starts generous headroom while staying well under the cron slot.
-- (Unschedule + re-schedule, same pattern as 20260924181000.)
-- ============================================================================

-- Housekeeping from earlier verification sessions
drop table if exists public.tmp_cron_run_check;
drop table if exists public.tmp_cron_deep;
drop table if exists public._cron_verify3;

-- yebetweg-subscription-lifecycle — daily 08:00 UTC
select cron.unschedule('yebetweg-subscription-lifecycle')
where exists (select 1 from cron.job where jobname = 'yebetweg-subscription-lifecycle');
select cron.schedule(
  'yebetweg-subscription-lifecycle',
  '0 8 * * *',
  $$
  select net.http_post(
    url := 'https://jxyavtdmcloxnhuavokc.supabase.co/functions/v1/subscription-lifecycle',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-lifecycle-key', public.current_cron_secret()
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- yebetweg-freshness-digest — Mondays 06:00 UTC
select cron.unschedule('yebetweg-freshness-digest')
where exists (select 1 from cron.job where jobname = 'yebetweg-freshness-digest');
select cron.schedule(
  'yebetweg-freshness-digest',
  '0 6 * * 1',
  $$
  select net.http_post(
    url := 'https://jxyavtdmcloxnhuavokc.supabase.co/functions/v1/freshness_cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-key', public.current_cron_secret()
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- yebetweg-revenue-digest — Mondays 07:00 UTC
select cron.unschedule('yebetweg-revenue-digest')
where exists (select 1 from cron.job where jobname = 'yebetweg-revenue-digest');
select cron.schedule(
  'yebetweg-revenue-digest',
  '0 7 * * 1',
  $$
  select net.http_post(
    url := 'https://jxyavtdmcloxnhuavokc.supabase.co/functions/v1/revenue-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-key', public.current_cron_secret()
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- yebetweg-tip-qa-digest — daily 06:30 UTC
select cron.unschedule('yebetweg-tip-qa-digest')
where exists (select 1 from cron.job where jobname = 'yebetweg-tip-qa-digest');
select cron.schedule(
  'yebetweg-tip-qa-digest',
  '30 6 * * *',
  $$
  select net.http_post(
    url := 'https://jxyavtdmcloxnhuavokc.supabase.co/functions/v1/tip-qa-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-key', public.current_cron_secret()
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
