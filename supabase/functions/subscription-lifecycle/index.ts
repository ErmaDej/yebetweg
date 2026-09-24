// ============================================================================
// subscription-lifecycle — renewal reminders & win-back emails
// ============================================================================
// Reuses the revenue-digest email infrastructure (Resend + service-role
// Supabase client, own auth gate) with two daily flows:
//
//   1. RENEWAL REMINDER — active premium/pro subscriptions expiring within
//      RENEWAL_WINDOW_DAYS (default 3) get a "renew now" email with the
//      tier's current price (pass-through: the buyer pays listed price + the
//      2% checkout fee, so the email quotes the buyer-paid gross).
//   2. WIN-BACK — premium/pro users whose subscription expired within the
//      last WINBACK_WINDOW_DAYS (default 14, i.e. 1–14 days ago) and who
//      have no active subscription get a one-click "come back" email.
//
// Idempotent per (user, flow, cycle): a notification row is recorded per
// send, so re-running the cron never double-sends for the same expiry cycle.
// Dedup keys embed the subscription id + window so a *later* cycle (next
// month's expiry, a new churn) can remind again.
//
// Auth: `x-lifecycle-key` must equal the CRON_SECRET secret (same pattern as
// the digests' x-cron-key), or a `{"dryRun": true}` body may be posted with
// the key for a no-send preview. Deploy with --no-verify-jwt like the
// digests, and schedule with pg_net (see docs/EDGE_FUNCTIONS_RUNBOOK.md §5b).
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, CRON_SECRET
// Test mode: POST {"sandbox":true} sends through Resend's sandbox sender
// (onboarding@resend.dev, delivers only to the Resend account owner) with a
// [SANDBOX] subject prefix — lets you verify the full flow before the
// yebetweg.com domain is verified. Cron never sets this flag.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-lifecycle-key",
};

const FROM = "YeBetWeg Membership <digest@yebetweg.com>";
const SANDBOX_FROM = "YeBetWeg Membership <onboarding@resend.dev>";
const APP_URL = (Deno.env.get("APP_URL") ?? "https://yebetweg.com").replace(/\/$/, "");
const RENEWAL_WINDOW_DAYS = 3;
const WINBACK_WINDOW_DAYS = 14;
const RENEWAL_PAGE = `${APP_URL}/#premium`;
const PAYMENT_PAGE = `${APP_URL}/payment`;

function esc(s: string): string {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function fmt(n: number): string {
  return new Intl.NumberFormat("en-ET", { maximumFractionDigits: 2 }).format(n) + " ETB";
}

/** Buyer-paid gross for a tier: ceil(base / 0.98) — mirrors src/lib/fees.ts. */
function buyerGross(base: number): number {
  return Math.ceil((base / 0.98) * 100) / 100;
}

type SubRow = {
  id: string;
  user_id: string;
  tier: string;
  status: string | null;
  is_active: boolean | null;
  starts_at: string | null;
  expires_at: string | null;
  user: { email: string | null; full_name: string | null } | null;
};

type NotifiedRow = { user_id: string; dedup_key: string };

function renewalHtml(name: string, tier: string, expiresAt: string, daysLeft: number): string {
  const price = buyerGross(tier === "pro" ? 1000 : 500);
  return `
  <div style="font-family:system-ui,sans-serif;max-width:560px">
    <h2 style="margin:0 0 8px">Your ${esc(tier === "pro" ? "Pro" : "Premium")} membership expires soon</h2>
    <p style="color:#555;margin-top:0">Hi ${esc(name || "there")},</p>
    <p style="color:#333;line-height:1.5">
      Your YeBetWeg <strong>${esc(tier)}</strong> membership expires on
      <strong>${esc(new Date(expiresAt).toUTCString())}</strong> (${daysLeft} day${daysLeft === 1 ? "" : "s"} from now).
    </p>
    <p style="color:#333;line-height:1.5">
      Renew today to keep your benefits without interruption${tier === "pro" ? " — including BOQ exports and share links" : ""}.
      Renewal costs <strong>${esc(fmt(price))}</strong> (includes the payment-processing fee) for another 30 days.
    </p>
    <p style="margin:20px 0">
      <a href="${esc(RENEWAL_PAGE)}" style="background:#166534;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Renew membership</a>
    </p>
    <p style="color:#888;font-size:12px">You are receiving this because you have a YeBetWeg membership. Questions? Reply to this email.</p>
  </div>`;
}

function winbackHtml(name: string, tier: string, expiredAt: string): string {
  const price = buyerGross(tier === "pro" ? 1000 : 500);
  return `
  <div style="font-family:system-ui,sans-serif;max-width:560px">
    <h2 style="margin:0 0 8px">Your ${esc(tier === "pro" ? "Pro" : "Premium")} benefits have ended</h2>
    <p style="color:#555;margin-top:0">Hi ${esc(name || "there")},</p>
    <p style="color:#333;line-height:1.5">
      Your YeBetWeg <strong>${esc(tier)}</strong> membership expired on
      ${esc(new Date(expiredAt).toUTCString())} — we wanted to make sure that wasn't a mistake.
    </p>
    <p style="color:#333;line-height:1.5">
      Rejoining restores instant price intelligence, premium tips, saved collections
      ${tier === "pro" ? ", Pro BOQ exports and shareable reports" : ""} — everything in one place.
      It's <strong>${esc(fmt(price))}</strong> for 30 days (payment-processing fee included).
    </p>
    <p style="margin:20px 0">
      <a href="${esc(PAYMENT_PAGE)}" style="background:#166534;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Restart my membership</a>
    </p>
    <p style="color:#888;font-size:12px">You are receiving this because you previously had a YeBetWeg membership. Questions? Reply to this email.</p>
  </div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-lifecycle-key") !== cronSecret) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  let dryRun = false;
  let sandbox = false;
  try {
    const body = await req.json();
    dryRun = body?.dryRun === true;
    sandbox = body?.sandbox === true;
  } catch {
    // empty body is fine (cron posts {})
  }

  try {
    const now = new Date();
    const renewalUntil = new Date(now.getTime() + RENEWAL_WINDOW_DAYS * 24 * 3600 * 1000).toISOString();
    const winbackSince = new Date(now.getTime() - WINBACK_WINDOW_DAYS * 24 * 3600 * 1000).toISOString();

    // 1) Expiring-soon actives (renewal reminders).
    const { data: expiring, error: expErr } = await admin
      .from("premium_subscriptions")
      .select("id, user_id, tier, status, is_active, starts_at, expires_at, user:users(email, full_name)")
      .eq("is_active", true)
      .gte("expires_at", now.toISOString())
      .lte("expires_at", renewalUntil)
      .order("expires_at", { ascending: true })
      .limit(200);
    if (expErr) throw expErr;

    // 2) Recently churned (win-back): inactive/expired premium tiers whose
    //    expiry fell inside the window. Their user must have no active sub.
    const { data: churned, error: churnErr } = await admin
      .from("premium_subscriptions")
      .select("id, user_id, tier, status, is_active, starts_at, expires_at, user:users(email, full_name)")
      .in("tier", ["premium", "pro"])
      .lt("expires_at", now.toISOString())
      .gte("expires_at", winbackSince)
      .order("expires_at", { ascending: false })
      .limit(200);
    if (churnErr) throw churnErr;

    // Win-back filter: drop users who already re-activated anything.
    const churnedRows = (churned ?? []) as SubRow[];
    const userIds = [...new Set(churnedRows.map((r) => r.user_id))];
    let stillActive = new Set<string>();
    if (userIds.length > 0) {
      const { data: activeRows } = await admin
        .from("premium_subscriptions")
        .select("user_id")
        .in("user_id", userIds)
        .eq("is_active", true);
      stillActive = new Set((activeRows ?? []).map((r) => r.user_id));
    }
    const winbackCandidates = churnedRows.filter(
      (r) => !stillActive.has(r.user_id) && r.user?.email,
    );
    // One win-back per user per cycle: keep the most recent expiry if a user
    // has several expired rows inside the window.
    const seenWinback = new Set<string>();
    const winbackRows = winbackCandidates.filter((r) => {
      if (seenWinback.has(r.user_id)) return false;
      seenWinback.add(r.user_id);
      return true;
    });

    // Dedup: notification rows keep us idempotent per (user, flow, cycle).
    const renewalRows = (expiring ?? []) as SubRow[];
    const allTargets: Array<{ row: SubRow; flow: "renewal" | "winback"; dedup: string }> = [
      ...renewalRows
        .filter((r) => r.user?.email && r.tier !== "free")
        .map((row) => ({ row, flow: "renewal" as const, dedup: `renewal:${row.id}:${row.expires_at}` })),
      ...winbackRows.map((row) => ({
        row,
        flow: "winback" as const,
        dedup: `winback:${row.id}:${(row.expires_at ?? "").slice(0, 10)}`,
      })),
    ];
    const dedupKeys = allTargets.map((t) => t.dedup);
    const already = new Set<string>();
    if (dedupKeys.length > 0) {
      const { data: notified } = await admin
        .from("notifications")
        .select("user_id, meta->>dedup_key")
        .in("meta->>dedup_key", dedupKeys)
        .limit(500);
      for (const n of (notified ?? []) as NotifiedRow[]) already.add(n.dedup_key);
    }

    let sent = 0;
    const skipped: string[] = [];
    const errors: string[] = [];
    for (const { row, flow, dedup } of allTargets) {
      const email = row.user?.email;
      if (!email) continue;
      if (already.has(dedup)) {
        skipped.push(dedup);
        continue;
      }
      const name = row.user?.full_name ?? "";
      const expiresAt = row.expires_at ?? now.toISOString();
      const daysLeft = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 86400000));
      const html =
        flow === "renewal"
          ? renewalHtml(name, row.tier, expiresAt, daysLeft)
          : winbackHtml(name, row.tier, expiresAt);
      const subject =
        flow === "renewal"
          ? `[YeBetWeg] Your ${row.tier} membership expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`
          : `[YeBetWeg] Restart your ${row.tier} membership`;

      if (!dryRun) {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY") ?? ""}`,
          },
          body: JSON.stringify({
            from: sandbox ? SANDBOX_FROM : FROM,
            to: email,
            subject: sandbox ? `[SANDBOX] ${subject}` : subject,
            html,
          }),
        });
        if (!r.ok) {
          errors.push(`${email}: ${r.status} ${await r.text()}`);
          continue;
        }
      }

      sent += 1;
      // Record the send so the cron never double-sends this cycle — real
      // sends only; a dry-run must not suppress the later real send.
      // Best-effort: a failed insert only risks a duplicate email on re-run.
      if (!dryRun) {
        await admin.from("notifications").insert({
          user_id: row.user_id,
          type: "system",
          title: subject,
          body: flow === "renewal"
            ? `Renewal reminder for ${row.tier} (expires ${expiresAt})`
            : `Win-back note for ${row.tier} (expired ${expiresAt})`,
          link: "/#premium",
          meta: { dedup_key: dedup, flow, subscription_id: row.id, tier: row.tier },
        });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        dry_run: dryRun,
        renewal_candidates: renewalRows.length,
        winback_candidates: winbackRows.length,
        emails_sent: sent,
        skipped_already_notified: skipped.length,
        send_errors: errors,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("subscription-lifecycle failed:", e);
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
