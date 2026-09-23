-- ============================================================================
-- Admin notification on new tip question (2026-09-23)
-- ============================================================================
-- When a user asks a tip question, every active admin gets an in-app
-- notification immediately — moderation no longer depends on noticing the
-- dashboard. Single row-level INSERT trigger (not FOR EACH STATEMENT … per
-- admin) so one question = one trigger firing, N notification rows.
--
-- SECURITY DEFINER is required: the asker (authenticated) must be allowed to
-- create rows targeting OTHER users (admins), which tip_questions RLS and
-- notifications RLS both forbid. The function only writes notifications —
-- nothing about the question is exposed back to non-admins.
--
-- Email is intentionally out of scope: the notifications table was designed
-- for in-app delivery (freshness_cron + telegram webhook precedent), and the
-- bell already refetches live via realtime INSERTs. An email digest cron can
-- read type='tip_qa' unread rows later without schema changes.
--
-- Type: new enum value 'tip_qa' on notifications.type. Rebuild the CHECK
-- constraint (validated — table is small) so old clients typing the union
-- strictly keep working after the src/ union is extended.
-- ============================================================================

-- 1) Extend the notifications.type CHECK to include 'tip_qa'.
--    Drop every CHECK constraint on `type` first: pg_get_constraintdef
--    normalizes `IN (...)` to `= ANY (ARRAY[...])`, so matching on the
--    definition text (not the IN syntax) keeps this idempotent whatever the
--    original constraint ended up being named.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.notifications'::regclass
      AND contype = 'c'
      AND lower(pg_get_constraintdef(oid)) LIKE '%type%'
  LOOP
    EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('info', 'stale_prices', 'price_submission', 'rfq', 'listing', 'system', 'tip_qa'));

-- 2) Fast path for the bell dropdown / digest queries: unread tip_qa per user.
CREATE INDEX IF NOT EXISTS idx_notifications_type_unread
  ON public.notifications (type, created_at DESC)
  WHERE read_at IS NULL;

-- 3) Trigger function: one notification per active admin (asker excluded).
CREATE OR REPLACE FUNCTION public.notify_admins_new_tip_question()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  SELECT COALESCE(NULLIF(TRIM(COALESCE(u.full_name, '')), ''), 'Someone')
    INTO v_name
    FROM public.users u
    WHERE u.id = new.user_id;

  INSERT INTO public.notifications (user_id, type, title, body, link, meta)
  SELECT a.id,
         'tip_qa',
         'New tip question: ' || left(new.question, 80),
         v_name || ' asked a question',
         '/dashboard',
         jsonb_build_object('question_id', new.id, 'tip_id', new.tip_id)
  FROM public.users a
  WHERE a.role = 'admin'
    AND a.status = 'active'
    AND a.id <> new.user_id;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_new_tip_question ON public.tip_questions;
CREATE TRIGGER trg_notify_admins_new_tip_question
  AFTER INSERT ON public.tip_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_new_tip_question();
