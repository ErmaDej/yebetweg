-- BOQ estimates persistence for Phase 3 Data Trust
-- Stores inputs (canonical city key) + outputs so estimates survive refresh and can be shared.

create table if not exists public.boq_estimates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  inputs jsonb not null,
  outputs jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.boq_estimates enable row level security;

drop policy if exists "Users can manage own boq estimates" on public.boq_estimates;
create policy "Users can manage own boq estimates"
on public.boq_estimates for all
to authenticated
using (user_id = (select id from public.users where auth_uid = auth.uid()))
with check (user_id = (select id from public.users where auth_uid = auth.uid()));

create index if not exists boq_estimates_user_id_idx on public.boq_estimates(user_id);
create index if not exists boq_estimates_created_at_idx on public.boq_estimates(created_at desc);

create or replace function public.handle_boq_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists boq_estimates_updated_at on public.boq_estimates;
create trigger boq_estimates_updated_at
  before update on public.boq_estimates
  for each row execute function public.handle_boq_updated_at();
