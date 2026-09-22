-- ============================================================================
-- Phase 5: shareable BOQ permalinks + saved-item collections
-- ============================================================================
-- Collections: free-form labels users attach to saved items (blogs/tips/
-- listings/prices), stored client-side in localStorage; this column exists for
-- a future server-side sync and keeps collection names normalized.
create table if not exists public.saved_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.saved_collections enable row level security;

create policy "Users manage own saved collections"
on public.saved_collections for all
to authenticated
using (user_id = (select id from public.users where auth_uid = auth.uid()))
with check (user_id = (select id from public.users where auth_uid = auth.uid()));

create index if not exists saved_collections_user_idx on public.saved_collections(user_id);

-- ---------------------------------------------------------------------------
-- BOQ share links: every estimate gets a random share token. Anyone with the
-- link can render a read-only view of the PLAN (inputs/outputs) via
-- get_shared_boq — actuals and owner identity are never exposed. Rotating the
-- token kills the old link.

alter table public.boq_estimates
  add column if not exists share_token uuid not null default gen_random_uuid();

-- Token lookups are by exact value; uniqueness guards against collisions.
create unique index if not exists boq_estimates_share_token_idx
  on public.boq_estimates(share_token);

-- Public-by-token read: returns the plan only — no user_id, no actuals.
create or replace function public.get_shared_boq(p_token uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'inputs', e.inputs,
    'outputs', e.outputs,
    'created_at', e.created_at
  )
  from boq_estimates e
  where e.share_token = p_token;
$$;

revoke execute on function public.get_shared_boq(uuid) from public;
grant execute on function public.get_shared_boq(uuid) to anon, authenticated;

-- Owner-only rotation: invalidates the previous permalink.
create or replace function public.rotate_boq_share_token(p_estimate_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_token uuid;
begin
  select u.id into v_user_id from users u where u.auth_uid = auth.uid();
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Sign in first.');
  end if;

  update boq_estimates
  set share_token = gen_random_uuid()
  where id = p_estimate_id and user_id = v_user_id
  returning share_token into v_token;

  if v_token is null then
    return jsonb_build_object('success', false, 'error', 'Estimate not found.');
  end if;

  return jsonb_build_object('success', true, 'share_token', v_token);
end;
$$;

revoke execute on function public.rotate_boq_share_token(uuid) from public;
revoke execute on function public.rotate_boq_share_token(uuid) from anon;
grant execute on function public.rotate_boq_share_token(uuid) to authenticated;
