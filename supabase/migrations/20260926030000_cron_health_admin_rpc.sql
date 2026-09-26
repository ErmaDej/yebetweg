-- ============================================================================
-- Cron health for admins: admin_cron_health(window_hours)
-- ============================================================================
-- The 2026-09-25 incident (cron "succeeded" while pg_net abandoned the call
-- at its 5s default timeout) showed that scheduled jobs can fail silently —
-- cron.job_run_details alone is not evidence the edge function ran. This RPC
-- joins three sources into one admin-readable snapshot:
--
--   1. cron.job + cron.job_run_details — per-job schedule, run count, last
--      run, and SQL failures over the window (jobs with zero runs included).
--   2. net._http_response — the actual HTTP replies the edge functions sent
--      back (status, timeout flag, error/body head). The table self-prunes,
--      so it shows the *most recent* replies, not full history.
--   3. alerts — only things a human must act on:
--        job_inactive  : a scheduled job is disabled
--        sql_failed    : a cron run errored inside Postgres
--        http_timed_out: pg_net gave up waiting (the silent-loss failure mode)
--        http_error    : newest reply is a non-2xx with no newer success
--        no_response   : a fire "succeeded" but produced no reply within 5 min
--
-- SECURITY DEFINER + explicit admin gate (same pattern as set_tier_pricing):
-- cron.* and net.* are not exposed to clients otherwise. Window clamped to
-- 1..336 hours so one call can't scan unbounded history.
-- ============================================================================

create or replace function public.admin_cron_health(p_window_hours int default 36)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.users;
  v_since timestamptz;
  v_jobs jsonb;
  v_recent jsonb;
  v_alerts jsonb;
begin
  -- Gate: active admin only.
  select * into v_user from public.users
  where auth_uid = auth.uid() and role = 'admin' and status = 'active';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Forbidden');
  end if;

  if p_window_hours is null or p_window_hours < 1 or p_window_hours > 336 then
    return jsonb_build_object('ok', false, 'error', 'Window must be 1..336 hours');
  end if;
  v_since := now() - make_interval(hours => p_window_hours);

  -- 1) Per-job rollup (left join keeps zero-run jobs visible).
  select coalesce(jsonb_agg(x order by x->>'jobname'), '[]'::jsonb) into v_jobs
  from (
    select to_jsonb(g) x from (
      select j.jobname,
             j.schedule,
             j.active,
             count(rd.runid) as runs,
             count(rd.runid) filter (where rd.status = 'failed') as failures,
             max(rd.start_time) as last_run
      from cron.job j
      left join cron.job_run_details rd
        on rd.jobid = j.jobid and rd.start_time >= v_since
      group by j.jobid, j.jobname, j.schedule, j.active
    ) g
  ) x;

  -- 2) The 40 most recent HTTP replies (evidence the functions answered).
  select coalesce(jsonb_agg(x order by x->>'created' desc), '[]'::jsonb) into v_recent
  from (
    select to_jsonb(t) x from (
      select r.id,
             r.created,
             r.status_code,
             r.timed_out,
             left(coalesce(r.error_msg, ''), 140) as error_msg,
             left(coalesce(r.content, ''), 160) as content_head
      from net._http_response r
      where r.created >= v_since
      order by r.created desc
      limit 40
    ) t
  ) x;

  -- 3) Alerts: actionable failures only.
  select coalesce(jsonb_agg(a order by a->>'at' desc nulls last), '[]'::jsonb) into v_alerts
  from (
    -- a) disabled jobs
    select jsonb_build_object('kind', 'job_inactive', 'jobname', j.jobname, 'at', now()) a
    from cron.job j
    where not j.active
    union all
    -- b) SQL-level failures
    select jsonb_build_object('kind', 'sql_failed', 'jobname', j.jobname,
                              'at', rd.start_time,
                              'detail', left(coalesce(rd.return_message, ''), 140)) a
    from cron.job j
    join cron.job_run_details rd on rd.jobid = j.jobid
    where rd.status = 'failed' and rd.start_time >= v_since
    union all
    -- c) pg_net abandoned the call mid-flight (the silent-loss failure mode)
    select jsonb_build_object('kind', 'http_timed_out', 'at', r.created,
                              'detail', left(coalesce(r.error_msg, ''), 160)) a
    from net._http_response r
    where r.timed_out and r.created >= v_since
    union all
    -- d) newest reply is a non-2xx with no newer success behind it
    select jsonb_build_object('kind', 'http_error', 'at', r.created,
                              'status', r.status_code,
                              'detail', left(coalesce(r.error_msg, left(r.content, 140)), 140)) a
    from net._http_response r
    where r.created >= v_since
      and r.status_code >= 300
      and not exists (
        select 1 from net._http_response ok
        where ok.status_code < 300 and ok.created > r.created)
    union all
    -- e) a fire "succeeded" but no reply showed up within 5 minutes (stale =
    --    still running or the reply was lost); only when it is newer than the
    --    newest reply we DO have, so old fires don't cry wolf
    select jsonb_build_object('kind', 'no_response', 'at', rd.start_time,
                              'jobname', j.jobname) a
    from cron.job j
    join cron.job_run_details rd on rd.jobid = j.jobid
    where j.command like '%net.http_post%'
      and rd.status = 'succeeded'
      and rd.start_time >= v_since
      and rd.start_time > coalesce((select max(created) from net._http_response), '-infinity'::timestamptz)
      and rd.start_time < now() - interval '5 minutes'
  ) a;

  return jsonb_build_object(
    'ok', true,
    'window_hours', p_window_hours,
    'generated_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD HH24:MI "UTC"'),
    'jobs', v_jobs,
    'recent_responses', v_recent,
    'alerts', v_alerts
  );
end;
$$;

revoke all on function public.admin_cron_health(int) from public, anon, authenticated;
grant execute on function public.admin_cron_health(int) to authenticated;
