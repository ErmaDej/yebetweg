-- ============================================================================
-- Tip Q&A: threaded replies + community voting
-- ============================================================================
-- 1) Replies: an answer may target another answer (one extra level of
--    nesting: question → answer → reply). answer_tip_question gains an
--    optional p_parent_answer_id and validates it — same question, not
--    itself, no reply-to-reply — so the UI can render a strict two-level
--    thread and trust every parent pointer. Direct inserts are still blocked
--    for cross-question parents only by the FK; validation lives in the RPC.
-- 2) Votes: tip_qa_votes is one vote per (user, target); value is +1 (up) or
--    −1 (down). vote_tip_qa owns scoring: same-value vote toggles off,
--    opposite value flips. Scores derive from rows, never drift.
-- 3) Realtime: publication gets tip_qa_votes so open threads update live.
-- 4) Premium perk restored on answers: is_expert badge for premium/pro.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Replies: column
-- ---------------------------------------------------------------------------
alter table public.tip_answers
  add column if not exists parent_answer_id uuid
  references public.tip_answers(id) on delete cascade;

create index if not exists tip_answers_parent_idx
  on public.tip_answers(parent_answer_id)
  where parent_answer_id is not null;

comment on column public.tip_answers.parent_answer_id is
  'When set, this answer is a reply to another (top-level) answer of the same question';

-- ---------------------------------------------------------------------------
-- 2) Votes table
-- ---------------------------------------------------------------------------
create table if not exists public.tip_qa_votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  question_id uuid references public.tip_questions(id) on delete cascade,
  answer_id uuid references public.tip_answers(id) on delete cascade,
  value smallint not null check (value in (1, -1)),
  created_at timestamptz not null default now(),
  -- Exactly one target per vote row:
  constraint tip_qa_votes_target_check check (
    (question_id is not null)::int + (answer_id is not null)::int = 1
  )
);

create index if not exists tip_qa_votes_question_idx on public.tip_qa_votes(question_id);
create index if not exists tip_qa_votes_answer_idx on public.tip_qa_votes(answer_id);
create unique index if not exists tip_qa_votes_user_question_uq
  on public.tip_qa_votes(user_id, question_id) where question_id is not null;
create unique index if not exists tip_qa_votes_user_answer_uq
  on public.tip_qa_votes(user_id, answer_id) where answer_id is not null;

alter table public.tip_qa_votes enable row level security;

create policy "Signed-in users read tip qa votes"
on public.tip_qa_votes for select
to authenticated
using (true);

create policy "Users manage own tip qa votes"
on public.tip_qa_votes for all
to authenticated
using (user_id = (select id from public.users where auth_uid = auth.uid()))
with check (user_id = (select id from public.users where auth_uid = auth.uid()));

-- ---------------------------------------------------------------------------
-- 3) Score helper — one source of truth for a target's vote balance
-- ---------------------------------------------------------------------------
create or replace function public.tip_qa_score(p_target uuid)
returns int
language sql
stable
set search_path = public
as $$
  select coalesce(sum(v.value), 0)::int
  from public.tip_qa_votes v
  where v.question_id = p_target or v.answer_id = p_target;
$$;

-- ---------------------------------------------------------------------------
-- 4) vote_tip_qa RPC — insert / flip / toggle-off, exactly one target
-- ---------------------------------------------------------------------------
create or replace function public.vote_tip_qa(
  p_value smallint,
  p_question_id uuid default null,
  p_answer_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_existing smallint;
begin
  if p_value not in (1, -1) then
    return jsonb_build_object('success', false, 'error', 'Vote value must be 1 or -1');
  end if;
  if (p_question_id is not null)::int + (p_answer_id is not null)::int <> 1 then
    return jsonb_build_object('success', false, 'error', 'Exactly one target (question or answer) required');
  end if;

  select id into v_user_id from public.users where auth_uid = auth.uid() limit 1;
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Sign in to vote.');
  end if;

  if p_question_id is not null then
    if not exists (select 1 from public.tip_questions where id = p_question_id) then
      return jsonb_build_object('success', false, 'error', 'Question not found.');
    end if;
    select value into v_existing from public.tip_qa_votes
      where user_id = v_user_id and question_id = p_question_id;
  else
    if not exists (select 1 from public.tip_answers where id = p_answer_id) then
      return jsonb_build_object('success', false, 'error', 'Answer not found.');
    end if;
    select value into v_existing from public.tip_qa_votes
      where user_id = v_user_id and answer_id = p_answer_id;
  end if;

  -- Same value again → withdraw the vote.
  if v_existing = p_value then
    delete from public.tip_qa_votes
     where user_id = v_user_id
       and ((p_question_id is not null and question_id = p_question_id)
         or (p_answer_id is not null and answer_id = p_answer_id));
    return jsonb_build_object('success', true, 'action', 'removed',
                              'score', public.tip_qa_score(coalesce(p_question_id, p_answer_id)));
  end if;

  if p_question_id is not null then
    insert into public.tip_qa_votes (user_id, question_id, value)
    values (v_user_id, p_question_id, p_value)
    on conflict (user_id, question_id) where question_id is not null
    do update set value = excluded.value;
  else
    insert into public.tip_qa_votes (user_id, answer_id, value)
    values (v_user_id, p_answer_id, p_value)
    on conflict (user_id, answer_id) where answer_id is not null
    do update set value = excluded.value;
  end if;

  return jsonb_build_object('success', true, 'action', 'added',
                            'score', public.tip_qa_score(coalesce(p_question_id, p_answer_id)));
end;
$$;

revoke execute on function public.vote_tip_qa(smallint, uuid, uuid) from public, anon;
grant execute on function public.vote_tip_qa(smallint, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5) answer_tip_question — adds replies + restores the premium expert badge.
--    Rate limits and spam heuristics carried over unchanged from
--    20260924000000 so the hardening survives the signature change.
-- ---------------------------------------------------------------------------
create or replace function public.answer_tip_question(
  p_question_id uuid,
  p_answer text,
  p_parent_answer_id uuid default null
)
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
  v_is_premium boolean;
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

  -- Reply validation: parent must be a top-level answer of the SAME question.
  -- (Also excludes self-replies and reply-to-reply by requiring a null parent.)
  if p_parent_answer_id is not null then
    if not exists (
      select 1 from public.tip_answers a
      where a.id = p_parent_answer_id
        and a.question_id = p_question_id
        and a.parent_answer_id is null
    ) then
      raise exception 'Reply target must be a top-level answer of the same question' using errcode = '22000';
    end if;
  end if;

  -- Premium perk: answers by active premium/pro members get the expert badge.
  select exists (
    select 1 from public.premium_subscriptions s
    where s.user_id = v_user_id and s.is_active and s.expires_at > now()
      and s.tier in ('premium', 'pro')
  ) into v_is_premium;

  insert into public.tip_answers (question_id, user_id, answer, is_expert, parent_answer_id)
  values (p_question_id, v_user_id, p_answer, coalesce(v_is_premium, false), p_parent_answer_id)
  returning id into v_new_id;

  return jsonb_build_object('id', v_new_id, 'success', true,
                            'is_expert', coalesce(v_is_premium, false));
end;
$$;

revoke execute on function public.answer_tip_question(uuid, text, uuid) from public, anon;
grant execute on function public.answer_tip_question(uuid, text, uuid) to authenticated;

-- The RPC signature gained p_parent_answer_id; drop the pre-replies 2-arg
-- overload so clients can't accidentally resolve the stale version.
drop function if exists public.answer_tip_question(uuid, text);

-- ---------------------------------------------------------------------------
-- 6) Realtime: publish votes (questions/answers already published)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'tip_qa_votes'
  ) then
    alter publication supabase_realtime add table public.tip_qa_votes;
  end if;
end;
$$;

alter table public.tip_qa_votes replica identity full;

-- ---------------------------------------------------------------------------
-- 7) Scoreboard view: one row per voted target with its balance and the
--    caller's own vote. security_invoker keeps reads under the base table's
--    RLS; clients never see raw voter rows — only aggregates.
-- ---------------------------------------------------------------------------
create or replace view public.v_tip_qa_scores as
select
  v.question_id,
  v.answer_id,
  coalesce(v.question_id, (select a.question_id from public.tip_answers a where a.id = v.answer_id))
    as thread_question_id,
  sum(v.value)::int as score,
  max(case
        when v.user_id = (select u.id from public.users u where u.auth_uid = auth.uid())
        then v.value
      end) as my_value
from public.tip_qa_votes v
group by v.question_id, v.answer_id;

alter view public.v_tip_qa_scores set (security_invoker = true);
grant select on public.v_tip_qa_scores to authenticated;
