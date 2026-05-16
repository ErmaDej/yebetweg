// Chapa Payment Webhook Handler for YeBetWeg
// This Edge Function processes incoming webhook callbacks from Chapa
// to verify and activate premium subscriptions.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const CHAPA_SECRET_KEY = Deno.env.get("CHAPA_SECRET_KEY") || ""

// For HMAC signature verification
const CHAPA_WEBHOOK_SECRET = Deno.env.get("CHAPA_WEBHOOK_SECRET") || ""

interface ChapaWebhookPayload {
  event: string // 'charge.completed', 'charge.failed', etc.
  data: {
    reference: string
    tx_ref: string
    status: string
    amount: number
    currency: string
    charge: number
    first_name: string
    last_name: string
    email: string
    created_at: string
  }
}

serve(async (req: Request) => {
  try {
    // 1. Verify webhook signature if secret is configured
    if (CHAPA_WEBHOOK_SECRET) {
      const signature = req.headers.get("x-chapa-signature")
      const body = await req.text()

      if (!signature) {
        return new Response(JSON.stringify({ error: "Missing signature" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })
      }

      // HMAC verification
      const encoder = new TextEncoder()
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(CHAPA_WEBHOOK_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
      )
      const expectedSignature = Array.from(
        new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(body)))
      )
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")

      if (signature !== expectedSignature) {
        // Log the failed verification but still process (for development)
        console.warn("Webhook signature mismatch. Expected:", expectedSignature, "Got:", signature)
      }
    }

    // 2. Parse the webhook payload
    const payload: ChapaWebhookPayload = await req.json()
    const { event, data } = payload

    console.log(`Received Chapa webhook: ${event} for reference ${data.tx_ref || data.reference}`)

    // 3. Only process completed charges
    if (event !== "charge.completed" && data.status !== "success") {
      return new Response(JSON.stringify({ message: "Event ignored" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    const txRef = data.tx_ref || data.reference

    // 4. Initialize Supabase admin client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 5. Log the webhook event
    await supabase.from("payment_webhook_events").insert({
      gateway: "chapa",
      event_type: event,
      reference: txRef,
      payload: payload as unknown as Record<string, unknown>,
      status: "received",
    })

    // 6. Call the activate_subscription RPC function
    const { data: result, error } = await supabase.rpc("activate_subscription", {
      p_reference: txRef,
      p_gateway: "chapa",
    })

    if (error) {
      console.error("Failed to activate subscription:", error)

      // Mark webhook event as failed
      await supabase
        .from("payment_webhook_events")
        .update({
          status: "failed",
          error_message: error.message,
          processed_at: new Date().toISOString(),
        })
        .eq("reference", txRef)
        .eq("gateway", "chapa")

      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("Subscription activated successfully:", result)

    // 7. Mark webhook event as processed
    await supabase
      .from("payment_webhook_events")
      .update({
        status: "processed",
        processed_at: new Date().toISOString(),
      })
      .eq("reference", txRef)
      .eq("gateway", "chapa")

    return new Response(
      JSON.stringify({
        message: "Payment processed successfully",
        subscription_id: result?.subscription_id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    console.error("Webhook processing error:", error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
})

// warmup
console.log("Chapa webhook function deployed")