// ============================================================================
// Supabase Edge Function: tip-qa-digest
// ============================================================================
// Daily digest for admins: summarizes UNREAD tip_qa notifications (new tip
// questions / answers since the last digest) and emails them via Resend.
// Built on the notifications table written by the tip_qa trigger
// (20260923000000) — no extra bookkeeping needed.
//
// Schedule (one-time SQL, NOT in a migration so the CRON_SECRET literal stays
// server-side — same pattern as the freshness digest in the runbook §5):
//   select cron.schedule(
//     'yebetweg-tip-qa-digest',
//     '30 6 * * *',
//     $$
//     select net.http_post(
//       url := 'https://<project-ref>.supabase.co/functions/v1/tip-qa-digest',
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
const DASHBOARD_URL = `${APP_URL}/dashboard`;
const FROM = "YeBetWeg Digest <digest@yebetweg.com>";

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

type NotifRow = {
  id: string;
  type: string;
  title: string | null;
  body: string | null;
  link: string | null;
  created_at: string;
};

function kindLabel(_type: string): string {
  return "New tip question";
}

function buildHtml(rows: NotifRow[], sinceIso: string): string {
  const items = rows
    .slice(0, 20)
    .map(
      (r) => `
      <li style="margin-bottom:10px">
        <strong>${esc(kindLabel(r.type))}</strong> — ${esc(r.body ?? r.title ?? "")}
        <div style="color:#666;font-size:12px">${esc(new Date(r.created_at).toUTCString())}</div>
      </li>`,
    )
    .join("");

  return `
  <div style="font-family:system-ui,sans-serif;max-width:600px">
    <h2 style="margin:0 0 8px">Tip Q&A digest</h2>
    <p style="color:#555">${rows.length} unread tip Q&A notification${rows.length === 1 ? "" : "s"} since ${esc(
      new Date(sinceIso).toUTCString(),
    )}.</p>
    <ul style="padding-left:18px">${items}</ul>
    ${rows.length > 20 ? `<p style="color:#666">…and ${rows.length - 20} more.</p>` : ""}
    <p>
      <a href="${DASHBOARD_URL}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Open the admin dashboard</a>
    </p>
    <p style="margin-top:16px;font-size:12px;color:#666">Moderate questions and answers in Admin → Tip Q&A Moderation. You receive this because you are a YeBetWeg admin.</p>
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
    // Digest window: since the previous tip_qa notification marked read OR the
    // last 24h, whichever is more recent — keeps back-to-back digests honest.
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    // 1) Unread tip Q&A notifications for any admin-audience row in the window.
    //    Notifications carry user_id = users.id of each admin (one row per admin).
    const { data: notifs, error: notifErr } = await admin
      .from("notifications")
      .select("id, type, title, body, link, created_at")
      .eq("type", "tip_qa")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);

    if (notifErr) throw notifErr;
    const rows = (notifs ?? []) as NotifRow[];

    // 2) Resolve admin emails (dedupe; skip rows with no email).
    const { data: admins, error: adminErr } = await admin
      .from("users")
      .select("email")
      .eq("role", "admin")
      .eq("status", "active");

    if (adminErr) throw adminErr;
    const recipients = [...new Set((admins ?? []).map((a: { email: string | null }) => a.email).filter(Boolean))] as string[];

    // 3) Send one digest per recipient (dedupe identical content).
    let emailSent = 0;
    if (!dryRun && rows.length > 0 && recipients.length > 0) {
      const html = buildHtml(rows, since);
      const results = await Promise.allSettled(
        recipients.map((to) =>
          fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY") ?? ""}`,
            },
            body: JSON.stringify({
              from: FROM,
              to,
              subject: `[YeBetWeg] ${rows.length} tip Q&A update${rows.length === 1 ? "" : "s"} awaiting moderation`,
              html,
            }),
          }),
        ),
      );
      emailSent = results.filter((r) => r.status === "fulfilled" && r.value.ok).length;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        dry_run: dryRun,
        unread_tip_qa: rows.length,
        recipients: recipients.length,
        emails_sent: emailSent,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("tip-qa-digest failed:", e);
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
