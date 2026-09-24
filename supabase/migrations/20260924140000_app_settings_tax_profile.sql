-- ============================================================================
-- Per-admin persistent settings (KV) — starts with the tax report profile.
-- ============================================================================
-- RevenueAnalytics previously kept the business legal name, TIN, address and
-- VAT-registered flag in local component state — every refresh wiped them.
-- app_settings is a minimal, admin-only KV store; the tax profile is stored
-- under key 'tax_profile' as JSON:
--   {"legal_name":"…","tin":"…","address":"…","vat_registered":true}
-- Admin-only by RLS; inserts set actor_id from the custom users table.
-- ============================================================================

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists "Admins manage app settings" on public.app_settings;
create policy "Admins manage app settings"
  on public.app_settings
  for all
  to authenticated
  using (coalesce(public.is_admin(), false))
  with check (coalesce(public.is_admin(), false));

-- Seed the tax profile with the defaults the UI used to hard-code, so the
-- first read has sensible values and updates are pure upserts.
insert into public.app_settings (key, value)
values ('tax_profile', jsonb_build_object(
  'legal_name', 'YeBetWeg',
  'tin', '',
  'address', 'Addis Ababa, Ethiopia',
  'vat_registered', false
))
on conflict (key) do nothing;
