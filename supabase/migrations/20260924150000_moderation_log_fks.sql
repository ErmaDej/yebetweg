-- ============================================================================
-- moderation_log foreign keys (for the admin audit view's embedded joins)
-- ============================================================================
-- 20260924000000 created moderation_log with plain uuid columns; the admin
-- ModerationLogView needs PostgREST embedded resources to render actor /
-- content-owner names, which require real FKs. Both are ON DELETE SET NULL:
-- the audit trail must survive user deletions (rows keep their snapshot).
-- Idempotent via a catalog guard (no ADD CONSTRAINT IF NOT EXISTS in PG).
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'moderation_log_actor_id_fkey'
      and conrelid = 'public.moderation_log'::regclass
  ) then
    alter table public.moderation_log
      add constraint moderation_log_actor_id_fkey
      foreign key (actor_id) references public.users(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'moderation_log_target_user_id_fkey'
      and conrelid = 'public.moderation_log'::regclass
  ) then
    alter table public.moderation_log
      add constraint moderation_log_target_user_id_fkey
      foreign key (target_user_id) references public.users(id) on delete set null;
  end if;
end;
$$;

create index if not exists moderation_log_target_user_idx
  on public.moderation_log (target_user_id);
