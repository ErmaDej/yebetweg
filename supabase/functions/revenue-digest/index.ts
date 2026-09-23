// ============================================================================
// Supabase Edge Function: revenue-digest
// ============================================================================
// Weekly revenue & taxation summary for admins, computed from the
// subscription_payments ledger and emailed via Resend.
//
// Contents per email:
//  - KPIs: last-7-day revenue, this-month revenue, MoM growth %, completed /
//    failed payment counts
//  - Tier split (premium vs pro revenue)
//  - Ethiopian tax context: output VAT (15%) if VAT-registered, otherwise
//    Turnover Tax (2%) — mirroring the in-app Analytics & tax report
//  - Pending activations needing attention (paid but not activated)
//
// Schedule (one-time SQL, NOT in a migration so the CRON_SECRET literal stays
// server-side — same pattern as tip-qa-digest):
//   select cron.schedule(
//     'yebetweg-revenue-digest',
//     '0 7 * * 1',  -- Mondays 07:00 UTC
//     $$
//     select net.http_post(
//       url := 'https://<project-ref>.supabase.co/functions/v1/revenue-digest',
//       headers := jsonb_build_object(
//         'Content-Type', 'application/json',
//         'x-cron-key', '<CRON_SECRET>'
//       ),
//       body := '{}'::jsonb
//     );
//     $$
//   );
//
// Optional: POST {"dryRun": true} to preview without sending email.
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-cron-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const APP_URL = Deno.env.get("SITE_URL") ?? "https://yebetweg.com";
const FROM = "YeBetWeg Revenue <digest@yebetweg.com>";

const VAT_RATE = 0.15;
const TOT_RATE = 0.02;
const VAT_REGISTERED = (Deno.env.get("VAT_REGISTERED") ?? "false") === "true";

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function fmt(n: number): string {
  return new Intl.NumberFormat("en-ET", { maximumFractionDigits: 2 }).format(n) + " ETB";
}

type LedgerRow = {
  amount: number | null;
  status: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

type PendingRow = { chapa_reference: string | null; created_at: string };

function statBlock(label: string, value: string, accent = "#111"): string {
  return `
  <td style="padding:10px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
    <div style="font-size:11px;text-transform:uppercase;color:#64748b">${esc(label)}</div>
    <div style="font-size:18px;font-weight:700;color:${accent}">${esc(value)}</div>
  </td>`;
}

function buildHtml(
  weekRows: LedgerRow[],
  monthRows: LedgerRow[],
  momPct: number | null,
  pending: PendingRow[],
): string {
  const completed = weekRows.filter((r) => r.status === "completed");
  const failed = weekRows.filter((r) => r.status && r.status !== "completed");
  const weekRevenue = completed.reduce((a, r) => a + Number(r.amount ?? 0), 0);
  const monthRevenue = monthRows.reduce((a, r) => a + Number(r.amount ?? 0), 0);

  const tierMap = new Map<string, { total: number; count: number }>();
  for (const r of completed) {
    const tier = String(r.metadata?.tier ?? "other");
    const cur = tierMap.get(tier) ?? { total: 0, count: 0 };
    tierMap.set(tier, { total: cur.total + Number(r.amount ?? 0), count: cur.count + 1 });
  }
  const tierHtml = [...tierMap.entries()]
    .map(
      ([tier, v]) =>
        `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee;text-transform:capitalize">${esc(tier)}</td>` +
        `<td style="padding:6px 10px;border-bottom:1px solid #eee">${v.count}×</td>` +
        `<td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${esc(fmt(v.total))}</td></tr>`,
    )
    .join("");

  const outputVat = VAT_REGISTERED ? weekRevenue - weekRevenue / (1 + VAT_RATE) : 0;
  const netSales = weekRevenue - outputVat;
  const tot = !VAT_REGISTERED ? netSales * TOT_RATE : 0;
  const schemeLabel = VAT_REGISTERED ? "VAT-registered (15%)" : "Turnover Tax (2%)";

  const pendingHtml = pending
    .slice(0, 8)
    .map(
      (p) =>
        `<li><code>${esc(p.chapa_reference ?? "—")}</code> — ${esc(
          new Date(p.created_at).toUTCString(),
        )}</li>`,
    )
    .join("");

  return `
  <div style="font-family:system-ui,sans-serif;max-width:640px">
    <h2 style="margin:0 0 4px">Weekly revenue &amp; tax summary</h2>
    <p style="color:#555;margin-top:0">YeBetWeg subscription ledger · ${esc(
      new Date().toUTCString(),
    )}</p>

    <table style="border-collapse:separate;border-spacing:8px 0;width:100%">
      <tr>
        ${statBlock("Last 7 days", fmt(weekRevenue), "#166534")}
        ${statBlock("This month", fmt(monthRevenue))}
        ${statBlock(
          "MoM growth",
          momPct === null ? "—" : `${momPct >= 0 ? "+" : ""}${momPct.toFixed(1)}%`,
          momPct !== null && momPct < 0 ? "#b91c1c" : "#111",
        )}
      </tr>
      <tr>
        ${statBlock("Completed payments", String(completed.length))}
        ${statBlock("Failed / other", String(failed.length), failed.length ? "#b45309" : "#111")}
        ${statBlock("Tax scheme", schemeLabel)}
      </tr>
    </table>

    <h3 style="font-size:14px;margin:20px 0 6px">Revenue by tier (this week)</h3>
    <table style="border-collapse:collapse;width:100%;font-size:13px">
      <thead><tr>
        <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #ddd">Tier</th>
        <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #ddd">Payments</th>
        <th style="text-align:right;padding:6px 10px;border-bottom:2px solid #ddd">Revenue</th>
      </tr></thead>
      <tbody>${tierHtml || '<tr><td colspan="3" style="padding:8px 10px;color:#888">No completed payments this week.</td></tr>'}</tbody>
    </table>

    <h3 style="font-size:14px;margin:20px 0 6px">Tax context (last 7 days)</h3>
    <table style="border-collapse:collapse;width:100%;font-size:13px">
      <tr><td style="padding:6px 10px;border-bottom:1px solid #eee">Gross revenue</td><td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${esc(fmt(weekRevenue))}</td></tr>
      <tr><td style="padding:6px 10px;border-bottom:1px solid #eee">Output VAT (15%)</td><td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${esc(fmt(outputVat))}</td></tr>
      <tr><td style="padding:6px 10px;border-bottom:1px solid #eee">Net sales</td><td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${esc(fmt(netSales))}</td></tr>
      <tr><td style="padding:6px 10px;border-bottom:1px solid #eee">${esc(VAT_REGISTERED ? "VAT due" : "Turnover Tax due (2%)")}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:700">${esc(fmt(VAT_REGISTERED ? outputVat : tot))}</td></tr>
    </table>

    ${
      pending.length
        ? `<h3 style="font-size:14px;margin:20px 0 6px">Pending activations (${pending.length})</h3>
           <p style="font-size:13px;color:#555">Payments awaiting verification/activation — reconcile in Dashboard → Revenue:</p>
           <ul style="font-size:13px;padding-left:18px">${pendingHtml}</ul>`
        : ""
    }

    <p style="margin-top:20px">
      <a href="${APP_URL}/dashboard" style="display:inline-block;background:#1d4ed8;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Open the revenue dashboard</a>
    </p>
    <p style="margin-top:14px;font-size:11px;color:#888">
      Computed summary from the subscription_payments ledger only — reconcile against official
      books before filing with the Ministry of Revenue. Amounts in ETB. VAT per Proclamation
      285/2002; ToT per Proclamation 308/2002. You receive this because you are a YeBetWeg admin.
    </p>
  </div>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-key") !== cronSecret) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  let dryRun = false;
  try {
    const body = await req.json();
    dryRun = body?.dryRun === true;
  } catch {
    // empty body is fine (cron posts {})
  }

  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const monthStartIso = (() => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    })();
    const prevMonthStartIso = (() => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    })();

    // 1) Ledger: everything since the start of last month (covers both windows).
    const { data: ledger, error: ledgerErr } = await admin
      .from("subscription_payments")
      .select("amount, status, created_at, metadata")
      .gte("created_at", prevMonthStartIso)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (ledgerErr) throw ledgerErr;
    const rows = (ledger ?? []) as LedgerRow[];

    const weekRows = rows.filter((r) => r.created_at >= weekAgo);
    const monthRows = rows.filter((r) => r.created_at >= monthStartIso);
    const prevMonthRows = rows.filter(
      (r) => r.created_at < monthStartIso && r.created_at >= prevMonthStartIso,
    );
    const sum = (list: LedgerRow[]) =>
      list.filter((r) => r.status === "completed").reduce((a, r) => a + Number(r.amount ?? 0), 0);
    const thisMonth = sum(monthRows);
    const prevMonth = sum(prevMonthRows);
    const momPct = prevMonth > 0 ? ((thisMonth - prevMonth) / prevMonth) * 100 : null;

    // 2) Pending activations needing attention.
    const { data: pend, error: pendErr } = await admin
      .from("premium_subscriptions")
      .select("chapa_reference, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(20);
    if (pendErr) throw pendErr;
    const pending = (pend ?? []) as PendingRow[];

    // 3) Admin recipients.
    const { data: admins, error: adminErr } = await admin
      .from("users")
      .select("email")
      .eq("role", "admin")
      .eq("status", "active");
    if (adminErr) throw adminErr;
    const recipients = [
      ...new Set((admins ?? []).map((a: { email: string | null }) => a.email).filter(Boolean)),
    ] as string[];

    // 4) Send.
    let emailSent = 0;
    const sendErrors: string[] = [];
    if (!dryRun && recipients.length > 0) {
      const html = buildHtml(weekRows, monthRows, momPct, pending);
      const results = await Promise.allSettled(
        recipients.map(async (to) => {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY") ?? ""}`,
            },
            body: JSON.stringify({
              from: FROM,
              to,
              subject: `[YeBetWeg] Weekly revenue: ${fmt(sum(weekRows))}${
                momPct !== null ? ` (${momPct >= 0 ? "+" : ""}${momPct.toFixed(0)}% MoM)` : ""
              }`,
              html,
            }),
          });
          if (!res.ok) {
            const bodyText = await res.text().catch(() => "");
            sendErrors.push(`${to}: ${res.status} ${bodyText.slice(0, 180)}`);
          }
          return res;
        }),
      );
      emailSent = results.filter((r) => r.status === "fulfilled" && r.value.ok).length;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        dry_run: dryRun,
        week_revenue_etb: sum(weekRows),
        month_revenue_etb: thisMonth,
        mom_growth_pct: momPct,
        pending_activations: pending.length,
        recipients: recipients.length,
        emails_sent: emailSent,
        ...(sendErrors.length ? { send_errors: sendErrors } : {}),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("revenue-digest failed:", e);
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
