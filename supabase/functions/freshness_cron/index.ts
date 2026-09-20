// ============================================================================
// freshness_cron — Scheduled edge function (Supabase pg_cron / cron scheduler)
// ============================================================================
// Runs daily: flags stale market prices as expired, then alerts admins via
// all three channels — in-app notifications (bell), email (Resend), and
// Telegram (TELEGRAM_CHAT_ID: your admin group or channel). Dedupes via the
// freshness_alerts table (email only re-sent when there are newly expired
// rows or the last alert is older than 24h).
//
// Deployment:
//   supabase functions deploy freshness_cron --no-verify-jwt
// Scheduling (Dashboard → Database → Cron, or SQL editor):
//   select cron.schedule(
//     'yebetweg-freshness-digest', '0 6 * * 1',
//     $$
//     select net.http_post(
//       url := 'https://<project-ref>.supabase.co/functions/v1/freshness_cron',
//       headers := jsonb_build_object(
//         'Content-Type', 'application/json',
//         'x-cron-key', '<CRON_SECRET>'
//       ),
//       body := '{}'::jsonb
//     );
//     $$
//   );
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface StaleRow {
  id: string;
  material_en: string;
  city: string | null;
  unit: string | null;
  price: number | string | null;
  days_stale: number;
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const ALERT_EMAIL = Deno.env.get("ALERT_EMAIL") ?? ""; // optional fallback recipient
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? ""; // required in prod — guards the trigger
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") ?? ""; // admin group/channel
const APP_URL = (Deno.env.get("APP_URL") ?? "").replace(/\/+$/, ""); // deep links in digests
const DASHBOARD_URL = `${APP_URL}/dashboard`;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );
}

function buildDigestHtml(rows: StaleRow[]): string {
  const list = rows
    .slice(0, 25)
    .map(
      (r) =>
        `<tr><td>${esc(r.material_en)}</td><td>${esc(r.city ?? "—")}</td>` +
        `<td>${r.price != null ? Number(r.price).toLocaleString() : "—"} ETB/${esc(r.unit ?? "")}</td>` +
        `<td>${r.days_stale}d</td></tr>`,
    )
    .join("");
  const more =
    rows.length > 25
      ? `<p style="color:#666">…and ${rows.length - 25} more.</p>`
      : "";
  const cta = APP_URL
    ? `<p><a href="${esc(DASHBOARD_URL)}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Open the admin dashboard</a></p>`
    : "";
  return `<h2>YeBetWeg stale price report</h2>
<p>${rows.length} market price row(s) are older than 7 days and now flagged <b>expired</b>.</p>
<table border="1" cellpadding="6" style="border-collapse:collapse;font-family:system-ui;font-size:13px">
<tr style="background:#f5f5f5"><th>Material</th><th>City</th><th>Last price</th><th>Stale</th></tr>${list}</table>
${more}
${cta}
<p style="margin-top:16px;font-size:12px;color:#666">Update these in the admin Market Prices panel. Suppliers can also refresh them via the Telegram bot (/submitprice).</p>`;
}

function buildTelegramDigest(rows: StaleRow[]): string {
  const lines = rows
    .slice(0, 8)
    .map((r) => `• ${r.material_en} — ${r.city ?? "—"} · ${r.days_stale}d stale`);
  const more =
    rows.length > 8 ? `\n…and ${rows.length - 8} more.` : "";
  return [
    `⏰ <b>YeBetWeg freshness report</b>`,
    `${rows.length} price${rows.length === 1 ? "" : "s"} need${rows.length === 1 ? "s" : ""} refresh:`,
    ``,
    ...lines,
    more,
    ``,
    `Update them in the admin panel${APP_URL ? ` → ${DASHBOARD_URL}` : ""}. Suppliers can help via /submitprice.`,
  ].join("\n");
}

async function sendTelegram(text: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: "HTML" }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  // Guard: when CRON_SECRET is set, only callers presenting x-cron-key get in.
  // --no-verify-jwt means the platform JWT check is off, so this is the only
  // thing stopping strangers from firing your alerts. 204 for wrong key (no
  // body — don't confirm the guard's shape to probes).
  if (CRON_SECRET && req.headers.get("x-cron-key") !== CRON_SECRET) {
    return new Response(null, { status: 204 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Server configuration error" }, 500);
  }
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    // 1) Flag newly-stale rows (idempotent; returns only rows it transitioned)
    const { data: newlyExpired, error: expireErr } = await admin.rpc(
      "expire_stale_market_prices",
    );
    if (expireErr) throw expireErr;

    // 2) Snapshot the full stale set for the digest
    const { data: staleRows, error: staleErr } = await admin.rpc(
      "get_stale_market_prices",
      { min_days: 0 },
    );
    if (staleErr) throw staleErr;

    const rows: StaleRow[] = staleRows ?? [];
    const newCount = Array.isArray(newlyExpired) ? newlyExpired.length : 0;

    // 3) Dedupe: skip email when nothing new is flagged and we alerted <24h ago
    let shouldEmail = rows.length > 0;
    let reason = "stale rows present";
    if (rows.length === 0) {
      shouldEmail = false;
      reason = "nothing stale";
    } else if (newCount === 0) {
      const { data: lastAlert } = await admin
        .from("freshness_alerts")
        .select("ran_at")
        .order("ran_at", { ascending: false })
        .limit(1);
      const last = lastAlert?.[0]?.ran_at
        ? new Date(lastAlert[0].ran_at as string).getTime()
        : 0;
      if (Date.now() - last < 23 * 60 * 60 * 1000) {
        shouldEmail = false;
        reason = "already alerted within 24h";
      }
    }

    let notifiedCount = 0;
    let inAppCount = 0;
    let telegramSent = false;

    if (shouldEmail) {
      // 4) Resolve admin recipients (users.role='admin'), fallback to ALERT_EMAIL
      const recipients = new Set<string>();
      if (ALERT_EMAIL) recipients.add(ALERT_EMAIL);
      const { data: admins } = await admin
        .from("users")
        .select("id, email")
        .eq("role", "admin")
        .limit(20);
      for (const a of admins ?? []) {
        if (a.email && a.email.includes("@")) recipients.add(a.email);
      }

      // 4b) In-app notifications for every admin — the reliable channel even
      // when Resend/Telegram are unconfigured or fail. Bell badge lights up
      // instantly via Supabase Realtime.
      const adminIds = (admins ?? []).map((a) => a.id).filter(Boolean);
      if (adminIds.length > 0) {
        const summary = rows
          .slice(0, 3)
          .map((r) => `${r.material_en} (${r.city ?? "—"}) ${r.days_stale}d`)
          .join(", ");
        const { error: notifErr } = await admin.from("notifications").insert(
          adminIds.map((uid) => ({
            user_id: uid,
            type: "stale_prices",
            title: `${rows.length} market price${rows.length === 1 ? "" : "s"} need refresh`,
            body: `Stale: ${summary}${rows.length > 3 ? ` +${rows.length - 3} more` : ""}`,
            link: "/dashboard",
            meta: { total_stale: rows.length, newly_expired: newCount },
          })),
        );
        if (!notifErr) inAppCount = adminIds.length;
        else console.error("in-app notification insert failed:", notifErr);
      }

      // 4c) Telegram push to the admin chat/channel (fire-and-forget channel)
      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        telegramSent = await sendTelegram(buildTelegramDigest(rows));
      }

      if (recipients.size > 0 && RESEND_API_KEY) {
        const html = buildDigestHtml(rows);
        const results = await Promise.allSettled(
          [...recipients].map((to) =>
            fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
              },
              body: JSON.stringify({
                from: "YeBetWeg Alerts <alerts@yebetweg.com>",
                to,
                subject: `[YeBetWeg] ${rows.length} stale market price${rows.length === 1 ? "" : "s"} need refresh`,
                html,
              }),
            }),
          ),
        );
        notifiedCount = results.filter(
          (r) => r.status === "fulfilled" && r.value.ok,
        ).length;
      }
    }

    // 5) Log the run (RLS-locked table; service_role write)
    await admin.from("freshness_alerts").insert({
      newly_expired: newCount,
      total_stale: rows.length,
      notified_count: notifiedCount,
    });

    // 6) Housekeeping: prune old notifications (90d read / 180d unread)
    await admin.rpc("prune_notifications");

    return json({
      ok: true,
      newly_expired: newCount,
      total_stale: rows.length,
      notified_count: notifiedCount,
      in_app_notified: inAppCount,
      telegram_sent: telegramSent,
      email_skipped_because: shouldEmail ? undefined : reason,
    });
  } catch (e) {
    console.error("freshness_cron failed:", e);
    return json({ error: e instanceof Error ? e.message : "unexpected error" }, 500);
  }
});
