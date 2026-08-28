import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Handle body in various formats (JSON, form urlencoded, raw text)
    let payload: Record<string, any> = {}
    const contentType = req.headers.get("content-type") || ""

    if (contentType.includes("application/json")) {
      payload = await req.json().catch(() => ({}))
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData().catch(() => null)
      if (formData) {
        formData.forEach((value, key) => {
          payload[key] = value.toString()
        })
      }
    } else {
      const raw = await req.text().catch(() => "")
      try {
        payload = JSON.parse(raw)
      } catch {
        payload = { rawText: raw }
      }
    }

    console.log("[TeleBirr Webhook] Received event:", JSON.stringify(payload))

    // Unpack biz_content if stringified or nested
    let biz: Record<string, any> = {}
    if (payload.biz_content) {
      if (typeof payload.biz_content === "string") {
        try {
          biz = JSON.parse(payload.biz_content)
        } catch {
          biz = {}
        }
      } else if (typeof payload.biz_content === "object") {
        biz = payload.biz_content
      }
    }

    // Extract reference from possible Telebirr notification fields
    const reference =
      payload.merch_order_id ||
      payload.merchOrderId ||
      payload.outTradeNo ||
      payload.out_trade_no ||
      payload.reference ||
      biz.merch_order_id ||
      biz.merchOrderId ||
      biz.outTradeNo ||
      biz.out_trade_no ||
      biz.reference

    const statusRaw = String(
      payload.status ||
      payload.trade_status ||
      payload.code ||
      payload.result ||
      biz.status ||
      biz.trade_status ||
      biz.code ||
      biz.result ||
      ""
    ).toUpperCase()

    const isSuccess =
      statusRaw === "SUCCESS" ||
      statusRaw === "TRADE_SUCCESS" ||
      statusRaw === "0" ||
      statusRaw === "0000" ||
      payload.code === "0" ||
      payload.result === "SUCCESS"

    // Log the event to payment_webhook_events
    const { error: logError } = await supabase
      .from("payment_webhook_events")
      .insert({
        gateway: "telebirr",
        event_type: statusRaw || "payment.notification",
        reference: reference || "unknown",
        payload: { top: payload, biz },
        status: isSuccess ? "processed" : "received",
      })

    if (logError) {
      console.error("[TeleBirr Webhook] Error logging event:", logError)
    }

    // If payment was successful, activate the subscription in Supabase
    if (isSuccess && reference) {
      const { data, error: rpcError } = await supabase.rpc("activate_subscription", {
        p_reference: reference,
        p_gateway: "telebirr",
      })

      if (rpcError) {
        console.error("[TeleBirr Webhook] RPC activation error:", rpcError)
        return new Response(JSON.stringify({ success: false, error: rpcError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      console.log("[TeleBirr Webhook] Subscription successfully activated:", data)
    }

    return new Response(JSON.stringify({ success: true, reference, status: isSuccess ? "active" : "pending" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Unknown webhook processing error"
    console.error("[TeleBirr Webhook] Error:", errMessage)
    return new Response(JSON.stringify({ error: errMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
