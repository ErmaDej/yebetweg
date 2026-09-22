#!/usr/bin/env node
// ============================================================================
// verify-deployment — automates docs/EDGE_FUNCTIONS_RUNBOOK.md §6 (checks 1-6)
// ============================================================================
// Probes the LIVE Supabase project + deployed edge functions and reports
// PASS / FAIL / SKIP per check, then exits 1 if anything failed.
//
//   node scripts/verify-deployment.js [--url https://xxx.supabase.co] [--key eyJ...]
//
// Credentials resolve like probe-rls.js: CLI flags → env → .env/.env.local.
// Uses the anon key (public by design) for PostgREST probes. Optional secrets
// enable deeper checks (never printed):
//   CRON_SECRET          → check 2 also verifies the authenticated cron path
//   TELEGRAM_BOT_TOKEN   → check 4 (webhook registration) + 5 (chat reachable)
//   TELEGRAM_CHAT_ID     → check 5 (+ check 8 with --post-test)
//   TEST_EMAIL/TEST_PASSWORD → check 7 signs in to verify member RLS on notifications
// All are read from the environment or .env.local/.env — the same values you
// `supabase secrets set` can be exported locally for this script.
//
// Checks map to the runbook §6 matrix:
//   1 migrations-applied  signature tables/RPCs exist via PostgREST
//   2 cron-guard          freshness_cron: no key → 204, wrong key → 204, valid key → 200 ok:true
//   3 webhook-guard       telegram-webhook: POST without secret → 403
//   4 telegram-webhookreg getWebhookInfo: registered, points at this project, no last_error
//   5 telegram-chat       getChat on TELEGRAM_CHAT_ID: bot can actually post
//   6 notifications-live  notifications table live with anon RLS (200 + [])
//   7 notifications-auth  signed-in session reads its own rows (runbook #3)
//   8 telegram-post       OPTIONAL --post-test: live sendMessage to the chat (runbook #8)
// The pg_cron schedule itself is NOT observable over PostgREST (cron schema is
// not API-exposed) — the script prints the dashboard/SQL check to run instead.
// ============================================================================

import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

// --- credential resolution (mirrors probe-rls.js) ----------------------------

function parseArgs(argv) {
  const args = {}
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--url") args.url = argv[++i]
    else if (argv[i] === "--key") args.key = argv[++i]
    else if (argv[i] === "--post-test") args.postTest = true
  }
  return args
}

function loadEnvFile(path) {
  if (!existsSync(path)) return {}
  const vars = {}
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!m) continue
    let v = m[2]
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    vars[m[1]] = v
  }
  return vars
}

const fileVars = {}
for (const f of [".env.local", ".env", ".env.production"]) {
  Object.assign(fileVars, loadEnvFile(resolve(process.cwd(), f)))
}
const arg = parseArgs(process.argv)
const env = (name) => process.env[name] ?? fileVars[name]

const SUPABASE_URL = (
  arg.url ||
  env("SUPABASE_URL") ||
  env("VITE_SUPABASE_URL") ||
  ""
).replace(/\/+$/, "")
const ANON_KEY =
  arg.key || env("SUPABASE_ANON_KEY") || env("VITE_SUPABASE_ANON_KEY") || ""
const CRON_SECRET = env("CRON_SECRET") || ""
const TELEGRAM_BOT_TOKEN = env("TELEGRAM_BOT_TOKEN") || ""
const TELEGRAM_CHAT_ID = env("TELEGRAM_CHAT_ID") || ""
const TEST_EMAIL = env("TEST_EMAIL") || ""
const TEST_PASSWORD = env("TEST_PASSWORD") || ""

if (!SUPABASE_URL || !ANON_KEY) {
  console.error(
    "✗ Missing Supabase URL/anon key (flags, env, or .env.local). Nothing probed.",
  )
  process.exit(1)
}

const REST = `${SUPABASE_URL}/rest/v1`
const FN = `${SUPABASE_URL}/functions/v1`
const PROJECT_REF = SUPABASE_URL.replace(/^https?:\/\//, "").split(".")[0]

// --- tiny fetch helpers ------------------------------------------------------

async function get(url, headers = {}) {
  try {
    const res = await fetch(url, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, ...headers },
      signal: AbortSignal.timeout(10_000),
    })
    return { status: res.status, body: await res.text().catch(() => "") }
  } catch (e) {
    return { status: 0, body: String(e?.message ?? e) }
  }
}

async function post(url, body, headers = {}) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    })
    return { status: res.status, body: await res.text().catch(() => "") }
  } catch (e) {
    return { status: 0, body: String(e?.message ?? e) }
  }
}

// --- result bookkeeping ------------------------------------------------------

const results = []
function report(id, name, status, detail) {
  results.push({ id, status })
  const tag = status === "PASS" ? "✓ PASS" : status === "FAIL" ? "✗ FAIL" : "– SKIP"
  console.log(`${tag}  [${id}] ${name}${detail ? ` — ${detail}` : ""}`)
}

// --- check 1: migrations applied (signature objects visible via PostgREST) ---

async function checkMigrations() {
  // 404 on an RPC = exists but EXECUTE-revoked from anon (the desired state)
  const probes = [
    { table: "notifications", migration: "20260920000000 notifications_in_app" },
    { table: "freshness_alerts", migration: "20260919010000 freshness_automation" },
  ]
  let missing = 0
  for (const p of probes) {
    const r = await get(`${REST}/${p.table}?select=id&limit=1`)
    if (r.status === 200) {
      console.log(`    · table ${p.table}: live (${p.migration})`)
    } else {
      missing++
      console.log(`    · table ${p.table}: HTTP ${r.status} — ${p.migration} NOT applied?`)
    }
  }
  // server-only RPC: anon must NOT be able to call it. A function-privilege
  // denial surfaces as HTTP 401 + postgres 42501 "permission denied for
  // function" — that means it EXISTS and is revoked (the desired state). A 404
  // means it's not in the schema cache (migration not applied).
  const rpc = await get(`${REST}/rpc/get_stale_market_prices?min_days=0`, {
    Prefer: "params=single-object",
  })
  const denied = rpc.status === 401 && rpc.body.includes("permission denied for function")
  if (denied) {
    console.log("    · rpc get_stale_market_prices: exists, correctly revoked from anon (42501)")
  } else if (rpc.status === 200) {
    missing++
    console.log("    · rpc get_stale_market_prices: HTTP 200 — EXECUTE leaked to anon!")
  } else {
    missing++
    console.log(`    · rpc get_stale_market_prices: HTTP ${rpc.status} ${rpc.body.slice(0, 100)} — 20260919010000 NOT applied?`)
  }
  if (missing === 0) {
    report("1", "migrations-applied", "PASS", "all signature objects live")
  } else {
    report("1", "migrations-applied", "FAIL", `${missing} object(s) missing — run runbook §1`)
  }
  report(
    "1b",
    "pg_cron schedule",
    "SKIP",
    `not observable over PostgREST — Dashboard → Database → Cron should list yebetweg-refresh-freshness-v2 (20260920020000), or run: select jobname, active from cron.job;`,
  )
}

// --- check 2: freshness_cron guard -------------------------------------------

async function checkCronGuard() {
  const noKey = await get(`${FN}/freshness_cron`)
  if (noKey.status === 204) {
    // guarded — now verify the valid-key path when we have the secret
    if (!CRON_SECRET) {
      report("2", "cron-guard", "PASS", "guard active (204 without key); export CRON_SECRET to also verify the authenticated path")
      return
    }
    const ok = await get(`${FN}/freshness_cron`, { "x-cron-key": CRON_SECRET })
    if (ok.status === 200 && ok.body.includes('"ok":true')) {
      report("2", "cron-guard", "PASS", "no key → 204, valid key → 200 ok:true")
    } else {
      report("2", "cron-guard", "FAIL", `valid key → HTTP ${ok.status} ${ok.body.slice(0, 120)}`)
    }
  } else if (noKey.status === 401 || noKey.status === 403) {
    report("2", "cron-guard", "FAIL", `HTTP ${noKey.status} — pre-guard build deployed; redeploy freshness_cron`)
  } else if (noKey.status === 404) {
    report("2", "cron-guard", "FAIL", "404 — function not deployed (runbook §2)")
  } else if (noKey.status === 200) {
    report("2", "cron-guard", "FAIL", "200 WITHOUT a key — CRON_SECRET unset or the pre-guard build is still deployed: `npx supabase secrets set CRON_SECRET=…` then redeploy freshness_cron")
  } else {
    report("2", "cron-guard", "FAIL", `HTTP ${noKey.status} ${noKey.body.slice(0, 120)}`)
  }
}

// --- check 3: telegram-webhook guard ------------------------------------------

async function checkWebhookGuard() {
  const r = await post(`${FN}/telegram-webhook`, {})
  if (r.status === 403) {
    report("3", "webhook-guard", "PASS", "unsigned POST rejected (403)")
  } else if (r.status === 200) {
    report("3", "webhook-guard", "FAIL", "200 without the secret — TELEGRAM_WEBHOOK_SECRET missing in function secrets; unsigned updates would be processed")
  } else if (r.status === 404) {
    report("3", "webhook-guard", "FAIL", "404 — function not deployed (runbook §2)")
  } else {
    report("3", "webhook-guard", "FAIL", `HTTP ${r.status} ${r.body.slice(0, 120)}`)
  }
}

// --- check 4 + 5: telegram bot wiring -----------------------------------------

async function checkTelegram() {
  if (!TELEGRAM_BOT_TOKEN) {
    report("4", "telegram-webhookreg", "SKIP", "export TELEGRAM_BOT_TOKEN to verify registration")
    report("5", "telegram-chat", "SKIP", "requires TELEGRAM_BOT_TOKEN")
    return
  }
  const info = await get(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`)
  let infoData = null
  try {
    infoData = JSON.parse(info.body)
  } catch {
    /* handled below */
  }
  if (info.status !== 200 || !infoData?.ok) {
    report("4", "telegram-webhookreg", "FAIL", `getWebhookInfo HTTP ${info.status} — token invalid or revoked`)
    report("5", "telegram-chat", "SKIP")
    return
  }
  const wh = infoData.result ?? {}
  const pending = Boolean(wh.pending_update_count)
  const lastErr = wh.last_error_message
  if (!wh.url) {
    report("4", "telegram-webhookreg", "FAIL", "no webhook registered — run runbook §4 setWebhook")
  } else if (!wh.url.includes(PROJECT_REF)) {
    report("4", "telegram-webhookreg", "FAIL", `webhook points at another project: ${wh.url}`)
  } else if (lastErr) {
    report("4", "telegram-webhookreg", "FAIL", `registered → ${wh.url} but last_error: ${lastErr}`)
  } else {
    report(
      "4",
      "telegram-webhookreg",
      "PASS",
      `registered → ${wh.url}${pending ? ` · ${pending} pending update(s)` : ""}`,
    )
  }

  if (!TELEGRAM_CHAT_ID) {
    report("5", "telegram-chat", "SKIP", "export TELEGRAM_CHAT_ID to verify the bot can post there")
    return
  }
  const chat = await get(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChat?chat_id=${encodeURIComponent(TELEGRAM_CHAT_ID)}`)
  let chatData = null
  try {
    chatData = JSON.parse(chat.body)
  } catch {
    /* handled below */
  }
  if (chat.status === 200 && chatData?.ok) {
    const title = chatData.result?.title ?? chatData.result?.username ?? TELEGRAM_CHAT_ID
    report("5", "telegram-chat", "PASS", `bot sees chat "${title}" — digest delivery target is valid`)
  } else {
    const desc = chatData?.description ?? `HTTP ${chat.status}`
    report("5", "telegram-chat", "FAIL", `getChat failed: ${desc} — is the bot a member/admin of that chat?`)
  }
}

// --- check 6: notifications live with anon RLS ---------------------------------

async function checkNotifications() {
  const r = await get(`${REST}/notifications?select=id&limit=1`)
  if (r.status === 200) {
    const rows = (() => {
      try {
        const v = JSON.parse(r.body)
        return Array.isArray(v) ? v.length : -1
      } catch {
        return -1
      }
    })()
    if (rows === 0) {
      report("6", "notifications-live", "PASS", "table live, anon sees 0 rows (RLS default-deny for anon)")
    } else {
      report("6", "notifications-live", "FAIL", `anon SELECT returned ${rows} rows — RLS is leaking`)
    }
  } else {
    report("6", "notifications-live", "FAIL", `HTTP ${r.status} — 20260920000000 not applied or RLS blocks schema cache`)
  }
}

// --- check 7: signed-in member sees only their own notification rows (runbook #3)

async function checkSignedInNotifications() {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    report("7", "notifications-auth", "SKIP", "export TEST_EMAIL/TEST_PASSWORD to verify the signed-in path")
    return
  }
  const login = await post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    { email: TEST_EMAIL, password: TEST_PASSWORD },
    { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  )
  let session = null
  try {
    session = JSON.parse(login.body)
  } catch {
    /* handled below */
  }
  const token = session?.access_token
  if (login.status !== 200 || !token) {
    report("7", "notifications-auth", "FAIL", `sign-in failed (HTTP ${login.status}${session?.error_description ? `: ${session.error_description}` : ""}) — check TEST_EMAIL/TEST_PASSWORD`)
    return
  }
  const mine = await get(`${REST}/notifications?select=id,user_id,created_at&order=created_at.desc&limit=5`, {
    Authorization: `Bearer ${token}`,
  })
  if (mine.status !== 200) {
    report("7", "notifications-auth", "FAIL", `authenticated SELECT → HTTP ${mine.status} ${mine.body.slice(0, 100)}`)
    return
  }
  let rows = []
  try {
    rows = JSON.parse(mine.body)
  } catch {
    /* handled below */
  }
  const foreign = rows.filter((r) => !r.user_id).length
  if (foreign > 0) {
    report("7", "notifications-auth", "FAIL", "row(s) without user_id visible — RLS policy bug")
  } else {
    report("7", "notifications-auth", "PASS", `signed-in member reads own rows (RLS ok) · ${rows.length} recent notification(s) visible`)
  }
}

// --- check 9: quota RPCs hardened (anon can't call submit_rfq / create_listing) --

async function checkQuotaRpcs() {
  // submit_rfq: probe with full named params (empty body → PGRST202 route-miss,
  // which proves nothing). A 200 + success:true here means ANON CAN CREATE RFQs
  // and bypass the free cap. After 20260921010000 the answer must be denied.
  const rfq = await post(`${REST}/rpc/submit_rfq`, {
    p_requester_name: "verify-probe",
    p_requester_email: "verify-probe@example.com",
    p_requester_phone: "",
    p_city: "Addis Ababa",
    p_project_type: "",
    p_message: "verify-deployment probe",
    p_source_type: "manual",
    p_material_name: "",
    p_specification: "",
    p_unit: "",
    p_quantity: null,
    p_target_price: null,
  }, { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` })
  const rfqBody = rfq.body.toLowerCase()
  if (rfq.status === 401 || rfq.status === 403 || rfqBody.includes("42501") || rfqBody.includes("permission denied")) {
    report("9", "quota-rpc submit_rfq", "PASS", `anon denied (HTTP ${rfq.status}) — cap enforced server-side only`)
  } else if (rfq.status === 200 && rfqBody.includes('"success":true')) {
    report("9", "quota-rpc submit_rfq", "FAIL", "anon CREATED an RFQ (ownerless, cap bypassed) — apply migration 20260921010000_submit_rfq_reject_anon.sql")
  } else if (rfq.status === 200 && rfqBody.includes("sign in")) {
    report("9", "quota-rpc submit_rfq", "PASS", "anon blocked in-function (sign-in required) — ownerless inserts impossible")
  } else {
    report("9", "quota-rpc submit_rfq", "FAIL", `unexpected response HTTP ${rfq.status}: ${rfq.body.slice(0, 90)}`)
  }

  // create_listing: requires a users row, so anon already fails with 'User not
  // found' (verified live). Probe the correct param names and assert the block.
  const lst = await post(`${REST}/rpc/create_listing`, {
    p_listing_type: "material",
    p_title_am: "verify-probe",
    p_title_en: "verify-probe",
    p_description: "verify-deployment probe",
    p_price: 1,
    p_location: "probe",
    p_contact_phone: "000",
    p_contact_email: "verify-probe@example.com",
    p_category: "material",
    p_images: [],
  }, { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` })
  const lstBody = lst.body.toLowerCase()
  if (lst.status === 401 || lst.status === 403 || lstBody.includes("42501") || lstBody.includes("permission denied")) {
    report("9", "quota-rpc create_listing", "PASS", `anon denied (HTTP ${lst.status})`)
  } else if (lst.status === 200 && (lstBody.includes("user not found") || lstBody.includes('"success":false'))) {
    report("9", "quota-rpc create_listing", "PASS", "anon blocked (no profile row → 'User not found')")
  } else if (lst.status === 200 && lstBody.includes('"success":true')) {
    report("9", "quota-rpc create_listing", "FAIL", "anon CREATED a listing — investigate immediately")
  } else {
    report("9", "quota-rpc create_listing", "FAIL", `unexpected response HTTP ${lst.status}: ${lst.body.slice(0, 90)}`)
  }
  console.log("  (Free-tier caps: 3 RFQs/month, 3 active listings — verify the cap itself with a disposable free account: submit a 4th RFQ and expect the 'Upgrade' error message.)")
}

// --- check 8: OPTIONAL live post to the admin chat (--post-test; runbook #8) -----

async function checkTelegramPost() {
  if (!arg.postTest) {
    return
  }
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    report("8", "telegram-post", "SKIP", "requires TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID")
    return
  }
  const r = await post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    chat_id: TELEGRAM_CHAT_ID,
    text: "YeBetWeg verify-deployment ✔ delivery test (safe to ignore)",
    disable_notification: true,
  })
  let data = null
  try {
    data = JSON.parse(r.body)
  } catch {
    /* handled below */
  }
  if (r.status === 200 && data?.ok) {
    report("8", "telegram-post", "PASS", `test message delivered to chat ${TELEGRAM_CHAT_ID} (silent)`)
  } else {
    report("8", "telegram-post", "FAIL", `sendMessage failed: ${data?.description ?? `HTTP ${r.status}`} — bot must be a member/admin of the chat`)
  }
}

// --- main -----------------------------------------------------------------------

console.log(`verify-deployment → ${SUPABASE_URL}`)
await checkMigrations()
await checkCronGuard()
await checkWebhookGuard()
await checkTelegram()
await checkNotifications()
await checkSignedInNotifications()
await checkQuotaRpcs()
await checkTelegramPost()

const pass = results.filter((r) => r.status === "PASS").length
const fail = results.filter((r) => r.status === "FAIL").length
const skip = results.filter((r) => r.status === "SKIP").length
console.log(`\n${pass} passed · ${fail} failed · ${skip} skipped`)
console.log("Manual checks that remain (runbook §6): send /start + /submitprice to the bot, check Resend logs, check the bell badge as an admin. Re-run with --post-test (and TELEGRAM_* exported) to send one silent test message to your admin chat.")
process.exit(fail > 0 ? 1 : 0)
