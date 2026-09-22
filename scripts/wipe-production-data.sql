-- ============================================================================
-- wipe-production-data.sql — one-shot clean slate for a production database
-- ============================================================================
-- PURPOSE
--   Deletes ALL application rows while leaving the schema 100% intact:
--   tables, columns, indexes, RLS policies, functions, triggers, pg_cron
--   schedules, and the supabase_migrations.schema_migrations bookkeeping are
--   NOT touched. After running this, the app behaves like a fresh install
--   with zero users, zero content, zero prices, zero subscriptions.
--
-- HOW TO RUN
--   Supabase Dashboard → SQL Editor → paste → Run.
--   The SQL Editor connects as the postgres (table owner) role, which
--   BYPASSES RLS — that is exactly why this works without "violating" any
--   policy: policies only bind app roles (anon/authenticated). Never run
--   this through the app or the anon key; it would be blocked, as designed.
--
-- SAFETY
--   • Runs in a single transaction: any error = full rollback, no partial wipe.
--   • Order respects every foreign key (children deleted before parents).
--   • The "VERIFY" block at the end must return all zeros.
--
-- DO YOU NEED THIS?
--   Not routinely. Run it only when you want a truly zero environment, e.g.:
--     (a) before flipping Chapa from sandbox to live (clears test subs),
--     (b) to demo from a pristine state (careful: you also lose market
--         prices and tips — the substance of the demo; prefer the SELECTIVE
--         variant at the bottom if you only want to reset users/subs),
--     (c) to fulfill a user's data-removal request.
--   Otherwise use the selective blocks below.

begin;

-- ----------------------------------------------------------------------------
-- 1) User-generated + derived data (children of users)
-- ----------------------------------------------------------------------------
delete from public.notifications;
delete from public.boq_actuals;
delete from public.boq_estimates;
delete from public.rfq_items;
delete from public.rfq_requests;
delete from public.inquiries;
delete from public.subscription_payments;
delete from public.premium_subscriptions;
delete from public.payment_webhook_events;
delete from public.login_attempts;

-- ----------------------------------------------------------------------------
-- 2) Marketplace + content + market data
-- ----------------------------------------------------------------------------
delete from public.listings;
delete from public.freshness_alerts;
delete from public.market_prices;
delete from public.site_logs;
delete from public.blogs;
delete from public.tips;
delete from public.ads;
delete from public.professionals;
delete from public.saved_collections;
delete from public.subscribers;

-- ----------------------------------------------------------------------------
-- 3) Users LAST (everything above may reference it)
--    Default: delete everyone. To KEEP the admin accounts, replace this one
--    line with the commented variant.
-- ----------------------------------------------------------------------------
delete from public.users;
-- delete from public.users where role <> 'admin';  -- variant: keep admins

commit;

-- ============================================================================
-- VERIFY — every row must show 0. If any shows >0 the commit above failed
-- (see the error) or a new table with an FK to users was added after this
-- script was written: add its delete to section 1 and re-run.
-- ============================================================================
select 'users' as table_name, count(*) as rows_left from public.users
union all select 'premium_subscriptions', count(*) from public.premium_subscriptions
union all select 'subscription_payments', count(*) from public.subscription_payments
union all select 'payment_webhook_events', count(*) from public.payment_webhook_events
union all select 'listings', count(*) from public.listings
union all select 'inquiries', count(*) from public.inquiries
union all select 'rfq_requests', count(*) from public.rfq_requests
union all select 'rfq_items', count(*) from public.rfq_items
union all select 'boq_estimates', count(*) from public.boq_estimates
union all select 'boq_actuals', count(*) from public.boq_actuals
union all select 'market_prices', count(*) from public.market_prices
union all select 'freshness_alerts', count(*) from public.freshness_alerts
union all select 'notifications', count(*) from public.notifications
union all select 'blogs', count(*) from public.blogs
union all select 'tips', count(*) from public.tips
union all select 'ads', count(*) from public.ads
union all select 'professionals', count(*) from public.professionals
union all select 'site_logs', count(*) from public.site_logs
union all select 'saved_collections', count(*) from public.saved_collections
union all select 'subscribers', count(*) from public.subscribers
union all select 'login_attempts', count(*) from public.login_attempts
order by rows_left desc;

-- ============================================================================
-- SELECTIVE VARIANTS (run instead of the full wipe when appropriate)
-- ============================================================================
-- Reset only subscriptions/payments (e.g. after Chapa sandbox testing):
--   delete from public.subscription_payments;
--   delete from public.payment_webhook_events;
--   delete from public.premium_subscriptions;
--
-- Reset only user activity but keep content + prices + accounts:
--   delete from public.notifications;
--   delete from public.boq_actuals;
--   delete from public.boq_estimates;
--   delete from public.rfq_items;
--   delete from public.rfq_requests;
--   delete from public.inquiries;
--
-- Auth note: YeBetWeg uses custom DB auth (public.users), so Supabase's
-- auth.users is normally empty. If you ever enabled Supabase Auth accounts,
-- clear them separately (Dashboard → Authentication → Users) — do NOT
-- touch auth.users from this script.
--
-- Sequence note: id sequences continue from their current values after a
-- DELETE (harmless; ids are not sequential-sensitive anywhere). If you want
-- them reset too, run e.g.:  truncate table public.<t> restart identity cascade;
-- for the same list of tables instead of the deletes above.
