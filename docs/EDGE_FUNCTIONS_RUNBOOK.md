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
(NOTE: run the pg_cron enabler **first**, even though its filename sorts last —
the freshness migration schedules a cron job and fails with
`schema "cron" does not exist` if pg_cron isn't enabled yet):

1. `20260920020000_enable_pg_cron_and_freshness_schedule.sql` — **enables pg_cron** + schedules the daily DB-side freshness flagging
2. `20260919010000_freshness_automation.sql` — freshness RPCs + alert tables (if it aborted mid-run on the `cron` error, its earlier statements are already committed — verify with `npm run verify:deploy` check 1; if it passes, you only need step 1 to add the missing schedule)
3. `20260920000000_notifications_in_app.sql` — in-app notifications table/RLS/realtime
4. `20260920010000_replace_dead_unsplash_images.sql` — image URL repair

> With the Editor path, `supabase_migrations` won't know about them — that's
> fine for a dashboard-managed project, but note it in the tracker so nobody
> `db push`es blindly later.

**Verify:**

```sql
select jobname, schedule, active from cron.job;
-- expect: yebetweg-refresh-freshness-v2 | 0 2 * * * | true
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

**Rule: generate once, save once, reuse.** Two of these secrets are values *you*
invent, and each must be used a second time later (CRON_SECRET → §5's cron SQL,
TELEGRAM_WEBHOOK_SECRET → §4's `secret_token`). `$(openssl …)` inside the
`secrets set` command hides the value, so **save it to a file first** (the file
is gitignored — verify with `git check-ignore .freebuff/`): 

```bash
openssl rand -hex 32 > .freebuff/cron-secret.txt
cat .freebuff/cron-secret.txt                                  # ← this IS your CRON_SECRET
npx supabase secrets set CRON_SECRET="$(cat .freebuff/cron-secret.txt)"

openssl rand -hex 32 > .freebuff/webhook-secret.txt
cat .freebuff/webhook-secret.txt                               # ← same value for setWebhook in §4
npx supabase secrets set TELEGRAM_WEBHOOK_SECRET="$(cat .freebuff/webhook-secret.txt)"
```

The rest are values you **look up**, not invent:

| Secret | Where to find it |
|--------|------------------|
| `TELEGRAM_BOT_TOKEN` | @BotFather → `/mybots` → your bot → API Token (format `123456789:AA…`) |
| `TELEGRAM_CHAT_ID` | your admin **group or channel** id — see box below |
| `RESEND_API_KEY` | resend.com → API Keys (`re_…`) |
| `ALERT_EMAIL` | any fallback recipient you choose, e.g. `ops@yebetweg.com` |
| `APP_URL` | your deployed site URL — for Vercel previews it's `https://<project>.vercel.app` (note: **`.vercel.app`**, not `.vercel.com`); set it now, re-set after your production domain exists |

```bash
npx supabase secrets set RESEND_API_KEY="re_xxx"
npx supabase secrets set ALERT_EMAIL="ops@yebetweg.com"   # optional fallback recipient
npx supabase secrets set APP_URL="https://your-app.vercel.app"
npx supabase secrets set TELEGRAM_BOT_TOKEN="123456:ABC..."
npx supabase secrets set TELEGRAM_CHAT_ID="-1001234567890"
```

> **Finding TELEGRAM_CHAT_ID** — ids are negative for groups/channels:
> • *Channel:* post any message, then open
> `https://api.telegram.org/bot<TOKEN>/getUpdates` — the channel post shows
> `chat":{"id":-100…`. (The bot must be a member — see §4's group note.)
> • *Group:* add **@RawDataBot** to the group, read `chat.id`, remove it.
> • *Just yourself (DM):* message the bot once, then `getUpdates` → positive id.
> Channel ids start at `-100`; group ids are small negatives; DMs are positive.

> **Secrets are function-scoped and project-wide**, not stored in your repo or
> `.env` — nothing to copy between machines. They only take effect for
> functions deployed *after* being set (re-run §2's deploy if you set secrets
> after deploying).

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

> `secret_token` **must equal** the `TELEGRAM_WEBHOOK_SECRET` you saved in §3 —
> Telegram echoes it back in the `x-telegram-bot-api-secret-token` header on
> every update, and the function rejects anything else. Bot commands work in
> DMs and groups (add the bot to the group with admin rights to use it there);
> channels are receive-only, so keep supplier interactions out of the channel —
> the channel is where the bot *posts* digests.

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
-- SQL Editor, once — replace <CRON_SECRET> with the value saved in §3
-- (pg_cron stores this SQL, so the literal lives server-side, not in the repo):
select cron.schedule(
  'yebetweg-freshness-digest',
  '0 6 * * 1',
  $$
  select net.http_post(
    url := 'https://jxyavtdmcloxnhuavokc.supabase.co/functions/v1/freshness_cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-key', '<CRON_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

## 5b. Schedule tip-qa-digest (daily) and revenue-digest (weekly)

```sql
-- SQL Editor, once — replace <CRON_SECRET> with the value saved in §3
select cron.schedule(
  'yebetweg-tip-qa-digest',
  '30 6 * * *',  -- daily 06:30 UTC
  $$
  select net.http_post(
    url := 'https://jxyavtdmcloxnhuavokc.supabase.co/functions/v1/tip-qa-digest',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-key','<CRON_SECRET>'),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'yebetweg-revenue-digest',
  '0 7 * * 1',  -- Mondays 07:00 UTC
  $$
  select net.http_post(
    url := 'https://jxyavtdmcloxnhuavokc.supabase.co/functions/v1/revenue-digest',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-key','<CRON_SECRET>'),
    body := '{}'::jsonb
  );
  $$
);
```

**revenue-digest** emails every active admin a weekly revenue & taxation summary
from `subscription_payments`: 7-day + month KPIs, MoM growth %, tier split,
Ethiopian VAT/ToT context, and pending activations needing attention. Set the
optional `VAT_REGISTERED=true` function secret if the business is VAT-registered
(15% output VAT); the default reports the 2% Turnover Tax scheme.

**Deploy note:** both digest functions are deployed with `--no-verify-jwt` —
pg_cron's `net.http_post` cannot send an `Authorization` header, so the
in-function `x-cron-key` guard IS the authentication (requests without it get 401).

## 5c. Schedule subscription-lifecycle (daily renewal reminders + win-back)

```sql
-- SQL Editor, once — replace <CRON_SECRET> with the value saved in §3
select cron.schedule(
  'yebetweg-subscription-lifecycle',
  '0 8 * * *',  -- daily 08:00 UTC
  $$
  select net.http_post(
    url := 'https://jxyavtdmcloxnhuavokc.supabase.co/functions/v1/subscription-lifecycle',
    headers := jsonb_build_object('Content-Type','application/json','x-lifecycle-key','<CRON_SECRET>'),
    body := '{}'::jsonb
  );
  $$
);
```

**subscription-lifecycle** emails premium/pro members directly (not admins):

- **Renewal reminder** — active subscriptions expiring within 3 days get a
  renew-now email quoting the buyer-paid gross (ceil(base/0.98), the
  pass-through price the member actually pays).
- **Win-back** — premium/pro whose membership expired 1–14 days ago and who
  have no active subscription get a come-back email (one per user per cycle).
- **Idempotency** — every send records a `notifications` row whose
  `meta->>'dedup_key'` embeds subscription id + expiry, so re-runs and cron
  retries never double-send for the same cycle; dry-runs (`{"dryRun":true}`)
  write nothing.

Deploy: `npx supabase functions deploy subscription-lifecycle --no-verify-jwt`
(same auth reasoning as the digests; its guard header is `x-lifecycle-key`).

## 6. Verification checks (end-to-end)

**Automated:** `npm run verify:deploy` runs the machine-checkable subset of
this matrix (1–8 minus the human-eye checks) against the live project and
reports PASS/FAIL/SKIP per check — exit code 1 if anything failed. Optional
deeper checks activate when you export `CRON_SECRET`, `TELEGRAM_BOT_TOKEN`,
`TELEGRAM_CHAT_ID` (and `TEST_EMAIL`/`TEST_PASSWORD` for the signed-in RLS
check); `--post-test` sends one silent test message to the admin chat.

| # | Check | Command / action | Expected |
|---|-------|------------------|----------|
| 1 | Functions live | `curl -s -o /dev/null -w "%{http_code}" https://<ref>.supabase.co/functions/v1/freshness_cron` | `204` (no cron key) — proves the guard works; `200` here means CRON_SECRET isn't enforced |
| 2 | Cron path OK | Same with `-H "x-cron-key: <CRON_SECRET>"` | `200` + JSON `{ok:true,telegram_sent:…}` |
| 3 | In-app notifs created | Check `notifications` table after check 2 (admin rows) | ≥1 `stale_prices` row per admin |
| 4 | Bell badge | Open the app signed in as admin | Badge shows unread count |
| 5 | Bot webhook | `/start` to your bot in Telegram | EN/አማርኛ help reply |
| 6 | Submit path | `/submitprice Derba Cement 8200 Qtl "Addis Ababa" cement` | Reply `✅ New price recorded`; `market_prices` row with `source_type='telegram_observed'`; admin gets `price_submission` notification + appears in the admin verification queue |
| 7 | Watch digest | `/watch` in the bot | Top cement/rebar movers list |
| 8 | Admin-channel push | Check your `TELEGRAM_CHAT_ID` group/channel after check 2 | Digest posted by the bot |
| 9 | Email channel | Check Resend dashboard → Logs after check 2 | Digest delivered to admins (if `RESEND_API_KEY` set) |

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
| `20260919010000_freshness_automation.sql` | ⚠️ previously aborted on missing `cron` schema | §1 above — apply 20260920020000 FIRST, then re-run this one |
| `20260920000000_notifications_in_app.sql` | pending | §1 above |
| `20260920010000_replace_dead_unsplash_images.sql` | pending | §1 above |
| `20260920020000_enable_pg_cron_and_freshness_schedule.sql` | pending | §1 above — apply FIRST (enables pg_cron) |
| `refresh_market_price_freshness` / `expire_stale_market_prices` / `upsert_market_price_from_telegram` RPCs | inside the pending migrations | §1 applies them |
| edge functions (code only) | `supabase/functions/*` | §2–§5 above |
| tip-qa-digest + revenue-digest cron jobs | ✅ live (cron.job ids 5, 6) | none — verify via §6-style POST with `x-cron-key` |
| ⚠️ Resend sending domain | `yebetweg.com` NOT verified in Resend | Owner: add + verify the domain at resend.com/domains (DKIM/SPF) — until then both digests compute correctly but email delivery 403s |
