/**
 * Supabase Edge Function: notify_user
 * Sends email or SMS using Resend API.
 */
import { serve } from "https://deno.land/x/sift@0.5.0/mod.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

serve(async (req) => {
  const { userId, type, subject, message } = await req.json();
  if (!userId || !type || !message) {
    return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
  }
  // Retrieve user email/phone from Supabase (simplified, assume payload includes contact)
  const payload = { to: "user@example.com", // placeholder
    subject: subject ?? "Notification",
    html: `<p>${message}</p>` };

  const url = type === "email" ? "https://api.resend.com/email" : "https://api.resend.com/sms";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    return new Response(JSON.stringify({ error: data }), { status: 500 });
  }
  return new Response(JSON.stringify({ success: true, data }));
});
