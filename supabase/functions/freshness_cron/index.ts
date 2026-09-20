// ============================================================================
// freshness_cron — Scheduled edge function (Supabase pg_cron / cron scheduler)
// ============================================================================
// Runs daily: flags stale market prices as expired, then emails admins a
// digest of stale prices. Dedupes via the freshness_alerts table (one alert
// row per run; email only re-sent when there are newly expired rows or the
// last alert is older than 24h).
//
// Deployment:
//   supabase functions deploy freshness_cron --no-verify-jwt
//   supabase secrets set ALERT_EMAIL="ops@yebetweg.com"   # optional fallback
// Scheduling (Dashboard → Database → Cron, or SQL editor):
//   select cron.schedule(
//     'freshness-cron', '0 4 * * *',
//     $$
//     select net.http_post(
//       url := 'https://<project-ref>.supabase.co/functions/v1/freshness_cron',
//       headers := jsonb_build_object(
//         'Authorization', 'Bearer ' || vault_get('service_role_key')
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
  return `<h2>YeBetWeg stale price report</h2>
<p>${rows.length} market price row(s) are older than 7 days and now flagged <b>expired</b>.</p>
<table border="1" cellpadding="6" style="border-collapse:collapse;font-family:system-ui;font-size:13px">
<tr style="background:#f5f5f5"><th>Material</th><th>City</th><th>Last price</th><th>Stale</th></tr>${list}</table>
${more}
<p style="margin-top:16px;font-size:12px;color:#666">Update these in the admin Market Prices panel. Suppliers can also refresh them via the Telegram bot (/submitprice).</p>`;
}

Deno.serve(async () => {
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
      // when Resend is unconfigured or fails. Bell badge lights up instantly
      // via Supabase Realtime.
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
      email_skipped_because: shouldEmail ? undefined : reason,
    });
  } catch (e) {
    console.error("freshness_cron failed:", e);
    return json({ error: e instanceof Error ? e.message : "unexpected error" }, 500);
  }
});
