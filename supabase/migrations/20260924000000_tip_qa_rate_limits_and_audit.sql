-- ============================================================================
-- Tip Q&A rate limits + moderation audit log
-- ============================================================================
-- 1. Rate limits + spam heuristics inside the ask/answer RPCs (server-side,
--    can't be bypassed by UI): per-user hourly + daily caps, duplicate question
--    detection, link-spam (>=3 links or url-shortener domains), ALL-CAPS
--    shouting, and minimum-length answers.
-- 2. moderation_log: who deleted what, when — via triggers on both tables.
--    Content fixes here close the file so a failed apply can't leave
--    duplicated limits behind.
-- ============================================================================

create table if not exists public.moderation_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,                          -- users.id of the deleter (null = system/service)
  action text not null,                   -- 'tip_question_delete' | 'tip_answer_delete'
  target_id uuid not null,                -- id of the deleted row
  target_user_id uuid,                    -- users.id of the content author
  detail jsonb default '{}'::jsonb,       -- content snapshot for review
  created_at timestamptz not null default now()
);

create index if not exists moderation_log_actor_idx on public.moderation_log (actor_id, created_at desc);
create index if not exists moderation_log_action_idx on public.moderation_log (action, created_at desc);

alter table public.moderation_log enable row level security;

drop policy if exists "Admins can view moderation log" on public.moderation_log;
create policy "Admins can view moderation log"
  on public.moderation_log
  for select
  to authenticated
  using (coalesce(public.is_admin(), false));

-- Only the SECURITY DEFINER triggers below write here; no direct client writes.

-- ---------------------------------------------------------------------------
-- Triggers: record every deletion (owner cleanup, admin moderation, or
-- service-role purge) with a content snapshot for review.
-- ---------------------------------------------------------------------------
create or replace function public.log_tip_qa_deletion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_action text;
  v_detail jsonb;
begin
  select id into v_actor from public.users where auth_uid = auth.uid() limit 1;

  if tg_table_name = 'tip_questions' then
    v_action := 'tip_question_delete';
    v_detail := jsonb_build_object('question', old.question, 'tip_id', old.tip_id);
  else
    v_action := 'tip_answer_delete';
    v_detail := jsonb_build_object(
      'answer', old.answer,
      'question_id', old.question_id,
      'tip_id', (select tip_id from public.tip_questions where id = old.question_id)
    );
  end if;

  insert into public.moderation_log (actor_id, action, target_id, target_user_id, detail)
  values (v_actor, v_action, old.id, old.user_id, v_detail);

  return old;
end;
$$;

drop trigger if exists tip_questions_audit_delete on public.tip_questions;
create trigger tip_questions_audit_delete
  after delete on public.tip_questions
  for each row execute function public.log_tip_qa_deletion();

drop trigger if exists tip_answers_audit_delete on public.tip_answers;
create trigger tip_answers_audit_delete
  after delete on public.tip_answers
  for each row execute function public.log_tip_qa_deletion();

-- ---------------------------------------------------------------------------
-- Rate limits + spam heuristics for asking (replaces previous version).
-- Caps per asker (users.id): 5/hour, 15/day. Heuristics: duplicate of the
-- asker's own recent question on the same tip, >=3 links, url-shortener
-- domains, ALL-CAPS shouting (>=40 letters, >60% uppercase).
-- ---------------------------------------------------------------------------
create or replace function public.ask_tip_question(p_tip_id uuid, p_question text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_hour_count int;
  v_day_count int;
  v_new_id uuid;
  v_link_count int;
  v_letters text;
begin
  select id into v_user_id
    from public.users
    where auth_uid = auth.uid()
    limit 1;

  if v_user_id is null then
    raise exception 'Sign in to ask a question' using errcode = '42501';
  end if;

  p_question := btrim(coalesce(p_question, ''));
  if char_length(p_question) < 10 then
    raise exception 'Question must be at least 10 characters' using errcode = '22000';
  end if;
  if char_length(p_question) > 500 then
    raise exception 'Question must be at most 500 characters' using errcode = '22000';
  end if;

  -- --- rate limits ---
  select count(*) into v_hour_count
    from public.tip_questions
    where user_id = v_user_id and created_at > now() - interval '1 hour';
  if v_hour_count >= 5 then
    raise exception 'Slow down — you have asked 5 questions in the last hour' using errcode = '53000';
  end if;

  select count(*) into v_day_count
    from public.tip_questions
    where user_id = v_user_id and created_at > now() - interval '24 hours';
  if v_day_count >= 15 then
    raise exception 'Daily limit reached — try again tomorrow' using errcode = '53000';
  end if;

  -- --- spam heuristics ---
  v_link_count := (select count(*) from regexp_matches(p_question, 'https?://[^\s]+', 'g'));
  if v_link_count >= 3 then
    raise exception 'Too many links in one question' using errcode = '22000';
  end if;

  if v_link_count > 0 and p_question ~* '(bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|cutt\.ly|rb\.gy|shorturl\.at)' then
    raise exception 'Link shorteners are not allowed' using errcode = '22000';
  end if;

  v_letters := regexp_replace(p_question, '[^a-zA-Z]', '', 'g');
  if char_length(v_letters) >= 40 then
    if char_length(regexp_replace(p_question, '[^A-Z]', '', 'g'))::numeric / char_length(v_letters) > 0.6 then
      raise exception 'Please avoid typing in all caps' using errcode = '22000';
    end if;
  end if;

  select count(*) into v_day_count
    from public.tip_questions
    where tip_id = p_tip_id and user_id = v_user_id
      and lower(btrim(question)) = lower(p_question)
      and created_at > now() - interval '24 hours';
  if v_day_count > 0 then
    raise exception 'You already asked this question here recently' using errcode = '22000';
  end if;

  insert into public.tip_questions (tip_id, user_id, question)
  values (p_tip_id, v_user_id, p_question)
  returning id into v_new_id;

  return jsonb_build_object('id', v_new_id, 'success', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Rate limits + spam heuristics for answering (replaces previous version).
-- Caps per answerer (users.id): 10/hour, 40/day; answers must be >= 10 chars;
-- same link-spam and ALL-CAPS heuristics; one answer per user per question
-- (enforced by the unique index from the base migration).
-- ---------------------------------------------------------------------------
create or replace function public.answer_tip_question(p_question_id uuid, p_answer text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_hour_count int;
  v_day_count int;
  v_new_id uuid;
  v_link_count int;
  v_letters text;
begin
  select id into v_user_id
    from public.users
    where auth_uid = auth.uid()
    limit 1;

  if v_user_id is null then
    raise exception 'Sign in to answer questions' using errcode = '42501';
  end if;

  p_answer := btrim(coalesce(p_answer, ''));
  if char_length(p_answer) < 10 then
    raise exception 'Answer must be at least 10 characters' using errcode = '22000';
  end if;
  if char_length(p_answer) > 2000 then
    raise exception 'Answer must be at most 2000 characters' using errcode = '22000';
  end if;

  select count(*) into v_hour_count
    from public.tip_answers
    where user_id = v_user_id and created_at > now() - interval '1 hour';
  if v_hour_count >= 10 then
    raise exception 'Slow down — you have posted 10 answers in the last hour' using errcode = '53000';
  end if;

  select count(*) into v_day_count
    from public.tip_answers
    where user_id = v_user_id and created_at > now() - interval '24 hours';
  if v_day_count >= 40 then
    raise exception 'Daily limit reached — try again tomorrow' using errcode = '53000';
  end if;

  v_link_count := (select count(*) from regexp_matches(p_answer, 'https?://[^\s]+', 'g'));
  if v_link_count >= 3 then
    raise exception 'Too many links in one answer' using errcode = '22000';
  end if;

  if v_link_count > 0 and p_answer ~* '(bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|cutt\.ly|rb\.gy|shorturl\.at)' then
    raise exception 'Link shorteners are not allowed' using errcode = '22000';
  end if;

  v_letters := regexp_replace(p_answer, '[^a-zA-Z]', '', 'g');
  if char_length(v_letters) >= 40 then
    if char_length(regexp_replace(p_answer, '[^A-Z]', '', 'g'))::numeric / char_length(v_letters) > 0.6 then
      raise exception 'Please avoid typing in all caps' using errcode = '22000';
    end if;
  end if;

  insert into public.tip_answers (question_id, user_id, answer)
  values (p_question_id, v_user_id, p_answer)
  returning id into v_new_id;

  return jsonb_build_object('id', v_new_id, 'success', true);
end;
$$;

revoke execute on function public.ask_tip_question(uuid, text) from public, anon;
grant execute on function public.ask_tip_question(uuid, text) to authenticated;
revoke execute on function public.answer_tip_question(uuid, text) from public, anon;
grant execute on function public.answer_tip_question(uuid, text) to authenticated;
