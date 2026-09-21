-- ============================================================================
-- Phase 5: BOQ → actuals — real spend captured against saved estimates
-- ============================================================================
-- Each row is one real spend entry logged against a saved BOQ estimate.
-- Variance (estimate.outputs.total vs SUM(amount)) is computed client-side;
-- the table stays a dumb, auditable ledger.
--
-- RLS mirrors the audited boq_estimates pattern exactly: own rows via
-- users.auth_uid EXISTS-free subquery, anon nothing.

create table if not exists public.boq_actuals (
  id uuid primary key default gen_random_uuid(),
  boq_estimate_id uuid not null references public.boq_estimates(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  category text not null check (category in ('structure','material','labor','overhead','other')),
  description text,
  amount numeric(14,2) not null check (amount > 0),
  spent_at date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.boq_actuals enable row level security;

drop policy if exists "Users manage own boq actuals" on public.boq_actuals;
create policy "Users manage own boq actuals"
on public.boq_actuals for all
to authenticated
using (user_id = (select id from public.users where auth_uid = auth.uid()))
with check (user_id = (select id from public.users where auth_uid = auth.uid()));

create index if not exists boq_actuals_estimate_id_idx on public.boq_actuals(boq_estimate_id);
create index if not exists boq_actuals_user_spent_idx on public.boq_actuals(user_id, spent_at desc);
