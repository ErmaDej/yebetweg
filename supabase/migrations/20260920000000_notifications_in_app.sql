-- ============================================================================
-- In-app notifications (2026-09-20)
-- ============================================================================
-- Eloquent in-app notifications alongside the email digests:
--   * freshness_cron emails admins AND inserts unread notifications so admins
--     see stale-price alerts in the app bell immediately.
--   * telegram-webhook inserts a notification per /submitprice so admins know
--     a community price awaits verification (service_role write, bypasses RLS).
--
-- RLS follows the audited role-split pattern (no policy calls a function a
-- role cannot EXECUTE — the 42501 bug class caught live 2026-09-19):
--   * authenticated users read/mark their OWN notifications via an EXISTS
--     subquery on users.auth_uid (own-row reads are permitted by users RLS).
--   * admins additionally read every notification (their own users row
--     proves the role — no security-definer helper needed).
--   * anon: nothing.
-- Writes happen only via service_role (edge functions) or the mark-read RPC.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info'
    CHECK (type IN ('info', 'stale_prices', 'price_submission', 'rfq', 'listing', 'system')),
  title text NOT NULL,
  body text,
  link text,
  meta jsonb DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_recent
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Idempotent policy setup: drop our policies if re-run, then recreate.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'notif_select_own') THEN
    DROP POLICY notif_select_own ON public.notifications;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'notif_select_admin') THEN
    DROP POLICY notif_select_admin ON public.notifications;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'notif_update_own') THEN
    DROP POLICY notif_update_own ON public.notifications;
  END IF;
END $$;

-- Own notifications: subquery reads the caller's OWN users row (permitted by
-- users RLS), so no cross-user access and no helper function involved.
CREATE POLICY notif_select_own ON public.notifications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_uid = auth.uid() AND u.id = notifications.user_id
    )
  );

-- Admins see everything; role proven from the caller's own users row.
CREATE POLICY notif_select_admin ON public.notifications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_uid = auth.uid() AND u.role = 'admin'
    )
  );

-- Users may only mark their own notifications read (title/body immutable).
CREATE POLICY notif_update_own ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_uid = auth.uid() AND u.id = notifications.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_uid = auth.uid() AND u.id = notifications.user_id
    )
  );

-- No INSERT/DELETE policies: inserts come from service_role only; rows are
-- pruned by a retention job, not end users.

-- Realtime streaming for the bell badge (idempotent).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- Mark-read helper: invoker rights, so the UPDATE runs under the caller's
-- own RLS (notif_update_own) — users can never touch someone else's rows.
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.notifications
     SET read_at = now()
   WHERE id = ANY(p_ids)
     AND read_at IS NULL;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) FROM anon, public;

-- Housekeeping: keep the table lean (called by freshness_cron alongside its run)
CREATE OR REPLACE FUNCTION public.prune_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  removed integer;
BEGIN
  DELETE FROM public.notifications
   WHERE (read_at IS NOT NULL AND read_at < now() - interval '90 days')
      OR (read_at IS NULL AND created_at < now() - interval '180 days');
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prune_notifications() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.prune_notifications() TO service_role;
