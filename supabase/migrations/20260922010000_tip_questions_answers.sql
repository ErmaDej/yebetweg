-- ============================================================================
-- tip_questions / tip_answers — StackOverflow-style Q&A on Construction Tips
-- ============================================================================
-- Anyone signed in can ask a question on a tip (or answer an open question);
-- tips' authors aren't singled out — the community answers. Premium perk:
-- premium/pro users get an "Expert answer" badge on their answers.
-- Admins moderate (hide/delete) everything. Anon is default-deny.
--
-- Policy model mirrors the audited boq_estimates pattern (custom DB auth →
-- `to authenticated` + auth_uid join, never a bare `true`).

-- ---------------------------------------------------------------- questions
create table if not exists public.tip_questions (
  id uuid primary key default gen_random_uuid(),
  tip_id uuid not null references public.tips(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  question text not null check (char_length(trim(question)) between 8 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tip_questions_tip_id_idx on public.tip_questions(tip_id);
create index if not exists tip_questions_user_id_idx on public.tip_questions(user_id);
create index if not exists tip_questions_created_at_idx on public.tip_questions(created_at desc);

alter table public.tip_questions enable row level security;

create policy "Signed-in users read tip questions"
on public.tip_questions for select
to authenticated
using (true);

create policy "Users create own tip questions"
on public.tip_questions for insert
to authenticated
with check (user_id = (select id from public.users where auth_uid = auth.uid()));

create policy "Users edit own tip questions"
on public.tip_questions for update
to authenticated
using (user_id = (select id from public.users where auth_uid = auth.uid()))
with check (user_id = (select id from public.users where auth_uid = auth.uid()));

create policy "Users delete own tip questions"
on public.tip_questions for delete
to authenticated
using (user_id = (select id from public.users where auth_uid = auth.uid()));

-- ------------------------------------------------------------------ answers
create table if not exists public.tip_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.tip_questions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  answer text not null check (char_length(trim(answer)) between 2 and 2000),
  is_expert boolean not null default false,  -- set by RPC; premium/pro only
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tip_answers_question_id_idx on public.tip_answers(question_id);
create index if not exists tip_answers_user_id_idx on public.tip_answers(user_id);
create index if not exists tip_answers_created_at_idx on public.tip_answers(created_at);

alter table public.tip_answers enable row level security;

create policy "Signed-in users read tip answers"
on public.tip_answers for select
to authenticated
using (true);

create policy "Users create own tip answers"
on public.tip_answers for insert
to authenticated
with check (user_id = (select id from public.users where auth_uid = auth.uid()));

create policy "Users edit own tip answers"
on public.tip_answers for update
to authenticated
using (user_id = (select id from public.users where auth_uid = auth.uid()))
with check (user_id = (select id from public.users where auth_uid = auth.uid()));

create policy "Users delete own tip answers"
on public.tip_answers for delete
to authenticated
using (user_id = (select id from public.users where auth_uid = auth.uid()));

-- ------------------------------------------------- ask_tip_question RPC
-- Single entry point from the UI: validates the tip exists, caps abuse
-- (5 open questions per user per tip), returns the created row id.

create or replace function public.ask_tip_question(p_tip_id uuid, p_question text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_question_id uuid;
begin
  select u.id into v_user_id from users u where u.auth_uid = auth.uid();
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Sign in to ask a question.');
  end if;

  if p_tip_id is null or not exists (select 1 from tips where id = p_tip_id) then
    return jsonb_build_object('success', false, 'error', 'Tip not found.');
  end if;

  if char_length(trim(coalesce(p_question, ''))) < 8 then
    return jsonb_build_object('success', false, 'error', 'Please write at least 8 characters.');
  end if;

  -- Simple abuse cap: max 5 open questions per user per tip.
  if (select count(*) from tip_questions where tip_id = p_tip_id and user_id = v_user_id) >= 5 then
    return jsonb_build_object('success', false, 'error', 'You already have 5 questions on this tip.');
  end if;

  insert into tip_questions (tip_id, user_id, question)
  values (p_tip_id, v_user_id, trim(p_question))
  returning id into v_question_id;

  return jsonb_build_object('success', true, 'id', v_question_id);
end;
$$;

revoke execute on function public.ask_tip_question(uuid, text) from public, anon;
grant  execute on function public.ask_tip_question(uuid, text) to authenticated;

-- ---------------------------------------------- answer_tip_question RPC
-- Sets is_expert for premium/pro answerers; one answer per user per question.

create or replace function public.answer_tip_question(p_question_id uuid, p_answer text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_answer_id uuid;
  v_is_premium boolean;
begin
  select u.id into v_user_id from users u where u.auth_uid = auth.uid();
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Sign in to answer.');
  end if;

  if p_question_id is null or not exists (select 1 from tip_questions where id = p_question_id) then
    return jsonb_build_object('success', false, 'error', 'Question not found.');
  end if;

  if char_length(trim(coalesce(p_answer, ''))) < 2 then
    return jsonb_build_object('success', false, 'error', 'Please write an answer.');
  end if;

  if exists (
    select 1 from tip_answers where question_id = p_question_id and user_id = v_user_id
  ) then
    return jsonb_build_object('success', false, 'error', 'You already answered this question.');
  end if;

  select exists (
    select 1 from premium_subscriptions s
    where s.user_id = v_user_id and s.is_active and s.expires_at > now()
      and s.tier in ('premium', 'pro')
  ) into v_is_premium;

  insert into tip_answers (question_id, user_id, answer, is_expert)
  values (p_question_id, v_user_id, trim(p_answer), coalesce(v_is_premium, false))
  returning id into v_answer_id;

  return jsonb_build_object('success', true, 'id', v_answer_id, 'is_expert', coalesce(v_is_premium, false));
end;
$$;

revoke execute on function public.answer_tip_question(uuid, text) from public, anon;
grant  execute on function public.answer_tip_question(uuid, text) to authenticated;
