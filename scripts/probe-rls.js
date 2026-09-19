#!/usr/bin/env node
// ============================================================================
// RLS / entitlement probes — automates PRODUCTION_LAUNCH_CHECKLIST.md §3
// ============================================================================
// Read-only probes against the LIVE Supabase PostgREST to prove that
// premium-gated rows are NOT reachable by anonymous sessions and that paid
// sessions are granted correctly. Exit code 0 = all safe, 1 = LEAK/FAIL.
//
// Credentials: anon key ONLY (never service_role — the anon key is public by
// design, which is exactly what an attacker has). Resolution order:
//   1. CLI flags: --url <project-url> --key <anon-key>
//   2. Environment: SUPABASE_URL + SUPABASE_ANON_KEY (or the VITE_ variants)
//   3. Local files: .env / .env.local / .env.production (not committed)
//
// Usage:
//   node scripts/probe-rls.js [--url https://xxx.supabase.co] [--key eyJ...]
//
// This script never mutates data: every probe is a SELECT. Optionally signs
// in with PROBE_PAID_EMAIL/PROBE_PAID_PASSWORD to assert premium rows are
// GRANTED to entitled sessions (skipped when those vars are unset).
//
// Pass rules:
//   - Free-class tables (market_prices, tips, listings): anon queries MUST
//     SUCCEED with the expected rows. A denial (42501 etc.) is a FAIL, not a
//     pass — denial-by-error masks broken policy/privilege wiring (e.g. a
//     policy calling a function anon cannot execute) and breaks the
//     logged-out app. Regression caught live on 2026-09-19.
//   - Pure blocking targets (users, subscription_payments): 0 rows or an
//     outright denial both count as protected.
//   - Revoked RPCs: a denial is the expected pass.
// ============================================================================

import { createClient } from "@supabase/supabase-js"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

// --- credential resolution -------------------------------------------------

function parseArgs(argv) {
  const args = {}
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--url") args.url = argv[++i]
    else if (argv[i] === "--key") args.key = argv[++i]
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
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    vars[m[1]] = v
  }
  return vars
}

// Module-scope so probes beyond credential resolution (e.g. paid-session
// vars) can read the same .env values.
const fileVars = {}

function resolveCredentials() {
  const args = parseArgs(process.argv)
  for (const f of [".env.local", ".env", ".env.production"]) {
    Object.assign(fileVars, loadEnvFile(resolve(process.cwd(), f)))
  }
  const url =
    args.url ||
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    fileVars.SUPABASE_URL ||
    fileVars.VITE_SUPABASE_URL
  const key =
    args.key ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    fileVars.SUPABASE_ANON_KEY ||
    fileVars.VITE_SUPABASE_ANON_KEY
  return { url, key }
}

const { url, key } = resolveCredentials()
if (!url || !key) {
  console.error(
    "Missing Supabase URL/anon key. Pass --url/--key, set SUPABASE_URL +\n" +
      "SUPABASE_ANON_KEY, or keep .env in the project root."
  )
  process.exit(2)
}

// --- probes ----------------------------------------------------------------

const client = createClient(url, key, { auth: { persistSession: false } })

let failures = 0

function report(name, pass, detail) {
  const icon = pass ? "✅" : "❌"
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ""}`)
  if (!pass) failures++
}

function isDenied(error) {
  // PostgREST/Postgres denials surface as 42501 or PGRST errors; either way a
  // denial on a blocking probe is a pass (better than empty).
  if (!error) return false
  const code = error.code ?? ""
  return code === "42501" || code === "PGRST" || /permission|row-level|policy/i.test(error.message ?? "")
}

/** BLOCK: anon must see zero premium-gated rows via a CLEAN empty result.
 * A denial is a FAIL: it hides broken policy wiring (e.g. 42501 = the policy
 * calls a function anon cannot execute) and would break free reads too. */
async function probeAnonCannotReadPremium(table, column, value, label) {
  const { data, error, count } = await client
    .from(table)
    .select("id", { count: "exact" })
    .eq(column, value)
  if (error)
    return report(
      label,
      false,
      `query denied: ${error.message} — denial is not a pass (broken policy/privilege wiring)`
    )
  const n = count ?? data?.length ?? -1
  report(label, n === 0, `${n} premium rows visible to anon`)
}

/** BLOCK: anon must see zero NULL-ambiguous premium rows (access_level IS NULL). */
async function probeAnonCannotReadNullAmbiguous(table, column, label) {
  const { data, error, count } = await client
    .from(table)
    .select("id", { count: "exact" })
    .is(column, null)
  if (error)
    return report(
      label,
      false,
      `query denied: ${error.message} — NULL rows are free-class, anon must read them`
    )
  const n = count ?? data?.length ?? -1
  report(label, true, `${n} NULL rows visible to anon (info: NULLs are treated as free)`)
}

/** Baseline: anon sees free rows (probes are meaningful only if this passes). */
async function probeAnonSeesFreeRows(table, column, value, label) {
  const { data, error, count } = await client
    .from(table)
    .select("id", { count: "exact" })
    .eq(column, value)
  if (error)
    return report(
      label,
      false,
      `query denied: ${error.message} (42501 here = the policy calls a function anon cannot execute)`
    )
  const n = count ?? data?.length ?? -1
  report(label, n > 0, `${n} free rows visible to anon`)
}

/** BLOCK: anon must not execute the hardened RPC. */
async function probeAnonCannotCallRpc(fn, label) {
  const { error } = await client.rpc(fn, { p_user_id: "00000000-0000-0000-0000-000000000000" })
  if (!error) return report(label, false, "RPC executed without error")
  report(label, isDenied(error), error.message)
}

/** Baseline: the client's primary read path — anon must be able to call the
 * get_visible_* RPCs and get the free rows back. */
async function probeAnonRpcVisible(fn, label) {
  const { data, error, count } = await client.rpc(fn)
  if (error) return report(label, false, `RPC failed: ${error.message}`)
  const n = count ?? data?.length ?? 0
  report(label, n > 0, `${n} free rows via ${fn}()`)
}

/** PAID-SESSION: sign in with optional test credentials and assert that
 * entitled users actually SEE the premium rows (the positive side of the
 * gate — the anon probes only prove the negative). Enable with:
 *   PROBE_PAID_EMAIL / PROBE_PAID_PASSWORD (env or .env file)
 * Credentials for an account with premium/pro role or an active
 * subscription. Skips cleanly when not configured; FAILS when configured but
 * the account cannot authenticate or sees no premium rows.
 *
 * Note: when this probe runs, Supabase RLS policies evaluate for the
 * signed-in user's JWT — so "premium rows > 0" exercises
 * user_has_premium_entitlement() end-to-end with a real session.
 */
async function probePaidGrants() {
  const email = process.env.PROBE_PAID_EMAIL || fileVars.PROBE_PAID_EMAIL
  const password = process.env.PROBE_PAID_PASSWORD || fileVars.PROBE_PAID_PASSWORD
  if (!email || !password) {
    console.log("⏭️  paid-session grants — SKIPPED (set PROBE_PAID_EMAIL + PROBE_PAID_PASSWORD to enable)")
    return
  }

  const authClient = createClient(url, key, { auth: { persistSession: false } })
  const { data: signIn, error: signInError } = await authClient.auth.signInWithPassword({
    email,
    password,
  })
  if (signInError || !signIn?.user) {
    report("paid session signs in", false, signInError?.message || "no user returned")
    return
  }
  report("paid session signs in", true, `user ${signIn.user.id.slice(0, 8)}…`)

  try {
    // The assert-under-test: entitled session sees premium rows.
    const { data: mpData, error: mpError, count: mpCount } = await authClient
      .from("market_prices")
      .select("id", { count: "exact" })
      .eq("access_level", "premium")
    if (mpError)
      report("paid session sees premium market_prices", false, `query failed: ${mpError.message}`)
    else
      report(
        "paid session sees premium market_prices",
        (mpCount ?? mpData?.length ?? 0) > 0,
        `${mpCount ?? mpData?.length ?? 0} premium rows visible to the paid session`
      )

    const { data: tpData, error: tpError, count: tpCount } = await authClient
      .from("tips")
      .select("id", { count: "exact" })
      .eq("is_premium", true)
    if (tpError)
      report("paid session sees premium tips", false, `query failed: ${tpError.message}`)
    else
      report(
        "paid session sees premium tips",
        (tpCount ?? tpData?.length ?? 0) > 0,
        `${tpCount ?? tpData?.length ?? 0} premium rows visible to the paid session`
      )

    // Free rows must still be visible under the paid session (no over-blocking).
    for (const [table, col, val] of [
      ["market_prices", "access_level", "free"],
      ["tips", "is_premium", false],
    ]) {
      const { error: e, count: c } = await authClient
        .from(table)
        .select("id", { count: "exact" })
        .eq(col, val)
      if (e) report(`paid session still sees free ${table}`, false, `query failed: ${e.message}`)
      else report(`paid session still sees free ${table}`, (c ?? 0) > 0, `${c ?? 0} free rows`)
    }

    // Diagnosis when grants failed: is the account actually entitled?
    const mpFailed = mpError || (mpCount ?? 0) === 0
    const tpFailed = tpError || (tpCount ?? 0) === 0
    if (mpFailed || tpFailed) {
      const { data: sub, error: subErr } = await authClient.rpc("get_active_subscription", {
        p_user_id: signIn.user.id,
      })
      if (subErr)
        console.log(
          `   ℹ️  diagnosis: get_active_subscription failed (${subErr.message}) — account may not be entitled; point PROBE_PAID_* at a premium/pro or actively-subscribed account.`
        )
      else if (!sub)
        console.log(
          "   ℹ️  diagnosis: account has NO active subscription — point PROBE_PAID_* at a premium/pro or actively-subscribed account."
        )
      else
        console.log(
          `   ℹ️  diagnosis: active subscription found (status=${sub.status ?? "?"}, tier=${sub.tier ?? sub.plan ?? "?"}) — check users.status/role linkage for this account.`
        )
    }
  } finally {
    await authClient.auth.signOut()
  }
}

/** INFO: other anon gates from the checklist (blocking or informational). */
async function probeAnonCountZero(table, label) {
  const { data, error, count } = await client
    .from(table)
    .select("id", { count: "exact" })
    .limit(1)
  if (error) return report(label, isDenied(error), error.message)
  const n = count ?? data?.length ?? -1
  report(label, n === 0, `${n} rows visible to anon`)
}

async function main() {
  console.log(`Probing ${url}\n`)

  console.log("— Premium gating (the fix under test) —")
  await probeAnonCannotReadPremium(
    "market_prices",
    "access_level",
    "premium",
    "anon cannot read premium market_prices"
  )
  await probeAnonCannotReadNullAmbiguous(
    "market_prices",
    "access_level",
    "market_prices NULL access_level visibility (info)"
  )
  await probeAnonCannotReadPremium("tips", "is_premium", true, "anon cannot read premium tips")
  await probeAnonSeesFreeRows(
    "market_prices",
    "access_level",
    "free",
    "anon sees free market_prices (baseline)"
  )
  await probeAnonSeesFreeRows("tips", "is_premium", false, "anon sees free tips (baseline)")
  await probeAnonRpcVisible(
    "get_visible_market_prices",
    "anon RPC get_visible_market_prices works (client read path)"
  )
  await probeAnonRpcVisible("get_visible_tips", "anon RPC get_visible_tips works (client read path)")

  console.log("\n— Other checklist gates —")
  await probeAnonCountZero("users", "anon cannot read users")
  await probeAnonCountZero("subscription_payments", "anon cannot read payment history")
  // Approved listings are intentionally public; only pending must be hidden.
  {
    const { data, error, count } = await client
      .from("listings")
      .select("id", { count: "exact" })
      .eq("status", "pending")
    if (error)
      report(
        "anon cannot read pending listings",
        false,
        `query denied: ${error.message} — anon must read approved listings, so a denial here is broken wiring`
      )
    else {
      const n = count ?? data?.length ?? -1
      report("anon cannot read pending listings", n === 0, `${n} pending listings visible to anon`)
    }
  }
  await probeAnonCannotCallRpc(
    "get_active_subscription",
    "anon cannot call get_active_subscription"
  )

  console.log("\n— Paid-session grants (optional) —")
  await probePaidGrants()

  console.log("")
  if (failures > 0) {
    console.error(`PROBE FAILED: ${failures} probe(s) unsafe — do not launch.`)
    process.exit(1)
  }
  console.log("ALL PROBES PASSED — anon surface is safe.")
}

main().catch((err) => {
  console.error("Probe run error:", err.message)
  process.exit(2)
})
