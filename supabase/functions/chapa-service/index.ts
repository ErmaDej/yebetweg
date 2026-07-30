import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
}

const CHAPA_API_URL = "https://api.chapa.co/v1"

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const secretKey = Deno.env.get("CHAPA_SECRET_KEY")
  if (!secretKey) {
    return new Response(
      JSON.stringify({ success: false, error: "Server configuration error: Missing Chapa secret key" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  // GET — verify transaction status
  if (req.method === "GET") {
    const url = new URL(req.url)
    const txRef = url.searchParams.get("tx_ref")
    if (!txRef) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing tx_ref query parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const verifyRes = await fetch(`${CHAPA_API_URL}/transaction/verify/${txRef}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    })
    const verifyData = await verifyRes.json()

    if (!verifyRes.ok) {
      return new Response(
        JSON.stringify({ success: false, error: verifyData.message || `Chapa verify error: ${verifyRes.status}` }),
        { status: verifyRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    return new Response(
      JSON.stringify({ success: true, status: verifyData.data?.status }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
    const body = await req.json()
    const { amount, currency, email, first_name, last_name, tx_ref, callback_url, return_url, customization } = body

    if (!amount || !email || !tx_ref) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required payment parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const chapaResponse = await fetch(`${CHAPA_API_URL}/initialize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify({
        amount,
        currency: currency || "ETB",
        email,
        first_name: first_name || "",
        last_name: last_name || "",
        tx_ref,
        callback_url,
        return_url,
        customization: customization || {
          title: "YeBetWeg Premium Subscription",
          description: "Payment for YeBetWeg premium membership",
        },
      }),
    })

    const data = await chapaResponse.json()

    if (!chapaResponse.ok || data.status !== "success") {
      return new Response(
        JSON.stringify({
          success: false,
          error: data.message || `Chapa API error: ${chapaResponse.status}`,
        }),
        { status: chapaResponse.ok ? 400 : chapaResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkoutUrl: data.data.checkout_url,
        reference: data.data.reference || tx_ref,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
