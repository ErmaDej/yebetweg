# Edge Function Deployment Runbook — freshness_cron + telegram-webhook

Everything below runs from the project root with the Supabase CLI **linked to
your project**. Linking is local-only (a `supabase/config.toml` + keychain
entry) — the dashboard SQL Editor never loses access either way.

---

## 0. Link the CLI (one time, unblocks all `supabase` commands)

```bash
npx supabase login                      # opens browser, paste token
npx supabase link --project-ref jxyavtdmcloxnhuavokc
```

When prompted for the DB password, use your **database** password (Settings →
Database). The link is stored locally; nothing is written to the repo.

> Already linked before but `supabase link` reports removed access? Just re-run
> the two commands above — linking is idempotent.

## 1. Apply pending migrations (pick ONE path)

**Path A — CLI (all at once, records them in supabase_migrations):**

```bash
npx supabase db push
```

**Path B — Dashboard SQL Editor (per file, in filename order):**

Supabase → SQL Editor → paste each file's contents → Run. Apply in this order
(alphabetical = dependency order):

1. `20260919010000_freshness_automation.sql` — pg_cron schedule + alert tables
2. `20260920000000_notifications_in_app.sql` — in-app notifications table/RLS/realtime
3. `20260920010000_replace_dead_unsplash_images.sql` — image URL repair

> With the Editor path, `supabase_migrations` won't know about them — that's
> fine for a dashboard-managed project, but note it in the tracker so nobody
> `db push`es blindly later.

**Verify:**

```sql
select cron.jobname, cron.schedule, cron.active from cron.job;
-- expect: yebetweg-refresh-freshness | 0 2 * * * | true
select count(*) from pg_policies where tablename = 'notifications';  -- 3
select exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='notifications');  -- true
```

## 2. Deploy the functions

```bash
npx supabase functions deploy freshness_cron --no-verify-jwt
npx supabase functions deploy telegram-webhook --no-verify-jwt
```

`--no-verify-jwt` is required: both enforce their **own** auth (cron secret /
Telegram HMAC), and the scheduler + Telegram servers can't mint Supabase JWTs.

## 3. Set function secrets

```bash
npx supabase secrets set RESEND_API_KEY="re_xxx"          # from resend.com/api-keys
npx supabase secrets set ALERT_EMAIL="ops@yebetweg.com"   # optional fallback recipient
npx supabase secrets set APP_URL="https://yebetweg.com"   # deep links in digests
npx supabase secrets set CRON_SECRET="$(openssl rand -hex 32)"
npx supabase secrets set TELEGRAM_BOT_TOKEN="123456:ABC..."   # from @BotFather
npx supabase secrets set TELEGRAM_WEBHOOK_SECRET="$(openssl rand -hex 32)"
npx supabase secrets set TELEGRAM_CHAT_ID="123456789"      # your admin chat/group id
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically —
never set them by hand.

## 4. Register the Telegram webhook (one command, copy YOUR values)

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://jxyavtdmcloxnhuavokc.supabase.co/functions/v1/telegram-webhook",
    "secret_token": "<same value as TELEGRAM_WEBHOOK_SECRET>",
    "allowed_updates": ["message"],
    "drop_pending_updates": true
  }'
```

Expect `{"ok":true,...}`. Verify any time:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

(`last_error_message` should be absent/empty.)

## 5. Schedule freshness_cron (weekly digest + daily flagging)

The migration already schedules the **DB-side** flagging (`cron.schedule` at
02:00 UTC daily). The edge function adds the email + in-app digest — schedule
it weekly (Mondays 06:00 UTC) with pg_net:

```sql
-- SQL Editor, once:
select cron.schedule(
  'yebetweg-freshness-digest',
  '0 6 * * 1',
  $$
  select net.http_post(
    url := 'https://jxyavtdmcloxnhuavokc.supabase.co/functions/v1/freshness_cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-key', current_setting('app.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Then store the secret once ( keeps it out of SQL you paste around):

```sql
select set_config('app.cron_secret', '<CRON_SECRET value>', false);
-- persisted per-session only; simpler alternative: paste the literal in the header line above
```

> Simplest robust option if the session-config feels fragile: paste the
> CRON_SECRET literal directly in the `jsonb_build_object` line. pg_cron
> stores the SQL anyway, so vault indirection is optional polish.

## 6. Verification checks (end-to-end)

| # | Check | Command / action | Expected |
|---|-------|------------------|----------|
| 1 | Functions live | `curl -s -o /dev/null -w "%{http_code}" https://<ref>.supabase.co/functions/v1/freshness_cron` | `401` (no cron key) — proves the guard works |
| 2 | Cron path OK | Same with `-H "x-cron-key: <CRON_SECRET>"` | `200` + JSON `{ok:true,...}` |
| 3 | In-app notifs created | Check `notifications` table after check 2 (admin rows) | ≥1 `stale_prices` row per admin |
| 4 | Bell badge | Open the app signed in as admin | Badge shows unread count |
| 5 | Bot webhook | `/start` to your bot in Telegram | EN/አማርኛ help reply |
| 6 | Submit path | `/submitprice Addis | Cement | 1150` | Reply `✅ New price recorded`; `market_prices` row with `source_type='telegram_observed'`; admin gets `price_submission` notification |
| 7 | Watch digest | `/watch` in the bot | Top cement/rebar movers list |
| 8 | Email channel | Check Resend dashboard → Logs after check 2 | Digest delivered to admins (if `RESEND_API_KEY` set) |

## 7. Rotate & tear down (when needed)

```bash
npx supabase secrets unset ALERT_EMAIL                  # remove a secret
npx supabase functions delete freshness_cron            # remove a function
# revoke cron job:
select cron.unschedule('yebetweg-freshness-digest');
```

---

## Pending-work status (answered 2026-09-20)

| Item | Where it lives | Owner action |
|------|----------------|--------------|
| `20260918000000_market_prices_tips_entitlement_rls.sql` | ✅ applied by owner (SQL editor) | none |
| `20260919000000_fix_entitlement_policy_function_privilege.sql` | ✅ applied by owner | none |
| `20260919010000_freshness_automation.sql` | pending | §1 above |
| `20260920000000_notifications_in_app.sql` | pending | §1 above |
| `20260920010000_replace_dead_unsplash_images.sql` | pending | §1 above |
| `refresh_market_price_freshness` / `expire_stale_market_prices` / `upsert_market_price_from_telegram` RPCs | inside the pending migrations | §1 applies them |
| edge functions (code only) | `supabase/functions/*` | §2–§5 above |
