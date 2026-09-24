# Resend sending-domain setup — yebetweg.com

Status as of **2026-09-24**. Everything here was executed against the live
Resend account (key in `.env` / Supabase secret `RESEND_API_KEY`) except the
one step that requires the domain to exist.

## Current state

| Item | State |
|---|---|
| Resend domain record | ✅ Created — id `799d5275-eb71-4246-8c63-bc012e6e02ec`, region `eu-west-1`, status `not_started` |
| DNS for yebetweg.com | ❌ **The domain does not exist in public DNS (NXDOMAIN)** |
| WHOIS | ❌ **"No match for domain YEBETWEG.COM"** — the domain is not registered |
| Digest functions | ✅ Deployed (`revenue-digest` v5, `tip-qa-digest` v2); real send attempted |

**Conclusion:** verification is blocked on registering `yebetweg.com` at a
registrar and pointing it at a DNS provider. Nobody can add DKIM/SPF records
before that. Both digest functions already send from
`digest@yebetweg.com` and fail with
`403 — The yebetweg.com domain is not verified` until this is done (proven by
a real send: 2 admin recipients attempted, Resend rejected with that exact
message).

## Step 1 — Register yebetweg.com (owner action)

Any registrar (EthioTelecom/.et alternatives aside, a .com registrar such as
Namecheap/Cloudflare Registrar works). Cloudflare Registrar is convenient if
Cloudflare DNS will host the records — it's at-cost and the dashboard
supports all record types below.

## Step 2 — Add these DNS records (exact values from Resend)

| Type | Name | Value | Priority |
|---|---|---|---|
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDH558e3pspY91iDcoV0VJ10y1SlZA/xqDVqI2pl2ztrKMe1Gn5yCPg6oI2TxGGFcLLKp9IB/5DwUvxqgczoy62lWbKQfbeNl48fjLHkrEE4oLr/Sv0Od+y3/DE60L1Vs5CH0vAipGsTUaJCoGgVgSoppw0VhlDOsvI0mgKdIHbewIDAQAB` | — |
| MX | `send` | `feedback-smtp.eu-west-1.amazonses.com` | 10 |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | — |
| CNAME | `rsend` | `send.forge.rmta.net` | — |

Notes:
- The DKIM value above is the full TXT value Resend issued (starts `p=MIGf…`,
  ends `…wIDAQAB`); keep it on one string.
- If the app/website will also live on this domain, add the usual A/CNAME
  records for the site alongside these — they don't conflict (all four live
  on subdomains except the root TXT, which is safe to coexist).

## Step 3 — Trigger verification & re-run the real-send test

1. In Resend (or via `GET /domains/{id}`), wait for status → `verified`
   (usually minutes after the records propagate).
2. Re-fire both digests for a real delivery test:

   ```bash
   curl -X POST "https://jxyavtdmcloxnhuavokc.supabase.co/functions/v1/revenue-digest" \
     -H "x-cron-key: $CRON_SECRET" -H "Content-Type: application/json" \
     -d '{"dryRun": false}'

   curl -X POST "https://jxyavtdmcloxnhuavokc.supabase.co/functions/v1/tip-qa-digest" \
     -H "x-cron-key: $CRON_SECRET" -H "Content-Type: application/json" \
     -d '{"dryRun": false}'
   ```

   (`CRON_SECRET` is a Supabase edge-function secret — same value the cron
   scheduler uses.) Expect `emails_sent: <number of active admins>` from
   revenue-digest. tip-qa-digest only sends when there are unread tip-Q&A
   items; verify its pipeline with `{"dryRun": true}` (returns the rendered
   recipient count) or after a real question is asked.

3. Alternative sanity check without waiting for real data — send any email
   via the API from `digest@yebetweg.com` once the domain is verified.

## Which sender identity the digests use

- `revenue-digest` → `YeBetWeg Revenue <digest@yebetweg.com>` (supabase/functions/revenue-digest/index.ts:45)
- `tip-qa-digest`  → `YeBetWeg Digest <digest@yebetweg.com>` (supabase/functions/tip-qa-digest/index.ts:40)

Both post to `https://api.resend.com/emails` with the `RESEND_API_KEY`
secret. No code change is needed once the domain verifies.
