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
      throw new Error("Missing environment variables")
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // TeleBirr usually sends a body with transaction details
    // The format can vary, but we'll try to extract common fields
    const body = await req.json()
    console.log("TeleBirr Webhook received:", body)

    // Log the raw event first
    const { error: logError } = await supabase
      .from("payment_webhook_events")
      .insert({
        gateway: "telebirr",
        external_id: body.msisdn || body.transactionId || "unknown",
        payload: body,
        status: "received",
      })

    if (logError) console.error("Error logging webhook:", logError)

    // Basic TeleBirr notification logic
    // Usually includes a reference and status
    // If we have a successful transaction, activate the subscription
    
    // Note: TeleBirr specific fields might need adjustment based on actual API version
    const reference = body.outTradeNo || body.reference
    const status = body.status === "SUCCESS" || body.code === "0" ? "success" : "failed"

    if (status === "success" && reference) {
      const { data, error: rpcError } = await supabase.rpc("activate_subscription", {
        p_gateway: "telebirr",
        p_reference: reference,
        p_external_id: body.transactionId || body.msisdn,
      })

      if (rpcError) {
        console.error("Error activating subscription via RPC:", rpcError)
        return new Response(JSON.stringify({ error: rpcError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      console.log("Subscription activated successfully:", data)
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("TeleBirr Webhook error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
