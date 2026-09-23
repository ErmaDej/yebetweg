-- ============================================================================
-- Tip Q&A: Realtime delivery + admin moderation
-- ============================================================================
-- 1) Realtime: publish tip_questions / tip_answers on the supabase_realtime
--    publication so subscribed clients receive postgres_changes events.
--    Reads stay RLS-guarded (`to authenticated` policies from
--    20260922010000) — anon subscribers get no rows.
--    replica identity full makes DELETE payloads carry the whole old row,
--    so clients can prune by id without a refetch.
-- 2) Moderation: admins may update/delete any question or answer via plain
--    client calls — RLS authorizes them (public.is_admin(), the phase-6
--    hardened helper). No SECURITY DEFINER RPC needed.
-- Idempotent: guarded adds + drop-if-exists policies.

-- ------------------------------------------------------------- realtime pub
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'tip_questions'
  ) then
    alter publication supabase_realtime add table public.tip_questions;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'tip_answers'
  ) then
    alter publication supabase_realtime add table public.tip_answers;
  end if;
end;
$$;

alter table public.tip_questions replica identity full;
alter table public.tip_answers   replica identity full;

-- ------------------------------------------------------- admin moderation RLS
drop policy if exists "Admins update any tip question" on public.tip_questions;
create policy "Admins update any tip question"
on public.tip_questions for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins delete any tip question" on public.tip_questions;
create policy "Admins delete any tip question"
on public.tip_questions for delete
to authenticated
using (public.is_admin());

drop policy if exists "Admins update any tip answer" on public.tip_answers;
create policy "Admins update any tip answer"
on public.tip_answers for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins delete any tip answer" on public.tip_answers;
create policy "Admins delete any tip answer"
on public.tip_answers for delete
to authenticated
using (public.is_admin());
