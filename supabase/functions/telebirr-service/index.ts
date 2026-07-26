import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
}

// TeleBirr API Configuration (allow override for local mocking)
const TELEBIRR_API_URL = Deno.env.get("TELEBIRR_API_URL") || "https://api.telebirr.com/v1"

interface TeleBirrPaymentRequest {
  appId: string
  fabricAppId: string
  shortCode: string
  amount: number
  phoneNumber: string
  subject: string
  description: string
  reference: string
  notifyUrl: string
  returnUrl: string
}

interface TeleBirrPaymentResponse {
  code: string
  msg: string
  data?: {
    prepayId: string
    codeUrl: string
    reference: string
    qrCode?: string
  }
}

interface TeleBirrQueryResponse {
  code: string
  msg: string
  data?: {
    status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED"
    amount: string
    outTradeNo: string
    transactionId: string
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  // GET requests are used to query payment status
  if (req.method === "GET") {
    const url = new URL(req.url)
    const reference = url.searchParams.get("reference")

    if (!reference) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing reference query parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    const apiKey = Deno.env.get("TELEBIRR_API_KEY") || Deno.env.get("VITE_TELEBIRR_API_KEY")
    const authHeader = apiKey?.startsWith("Bearer ") ? apiKey : `Bearer ${apiKey}`

    try {
      const queryUrl = `${TELEBIRR_API_URL}/payment/query?outTradeNo=${encodeURIComponent(reference)}`
      const response = await fetch(queryUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
      })

      const data: TeleBirrQueryResponse = await response.json()

      if (!response.ok) {
        return new Response(
          JSON.stringify({ success: false, error: data.msg || `HTTP ${response.status}` }),
          {
            status: response.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        )
      }

      return new Response(
        JSON.stringify({
          success: data.code === "0000",
          status: data.data?.status,
          data: data.data,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Query failed",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }
  }

  // Only allow POST requests for payment initialization
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
    console.log("[TeleBirr Service] Processing payment request")

    // Dev bypass: when ALLOW_DEV_BYPASS=true and `x-dev-auth` matches DEV_BYPASS_TOKEN,
    // allow proceeding without external auth (for local testing only).
    const allowDevBypass = Deno.env.get("ALLOW_DEV_BYPASS") === "true"
    const devBypassToken = Deno.env.get("DEV_BYPASS_TOKEN")
    if (allowDevBypass && devBypassToken) {
      const devHeader = req.headers.get("x-dev-auth")
      if (devHeader && devHeader === devBypassToken) {
        console.log("[TeleBirr Service] Dev bypass token accepted; proceeding in dev mode")
      }
    }

    // Get environment variables (support both server-side and VITE-prefixed names)
    const apiKey = Deno.env.get("TELEBIRR_API_KEY") || Deno.env.get("VITE_TELEBIRR_API_KEY")
    const merchantAppId = Deno.env.get("TELEBIRR_MERCHANT_APP_ID") || Deno.env.get("VITE_TELEBIRR_MERCHANT_APP_ID")
    const fabricAppId = Deno.env.get("TELEBIRR_FABRIC_APP_ID") || Deno.env.get("VITE_TELEBIRR_FABRIC_APP_ID")
    const shortCode = Deno.env.get("TELEBIRR_SHORT_CODE") || Deno.env.get("VITE_TELEBIRR_SHORT_CODE")

    // Validate environment variables
    if (!apiKey || !merchantAppId || !fabricAppId || !shortCode) {
      console.error("[TeleBirr Service] Missing required environment variables")
      console.error({
        hasApiKey: !!apiKey,
        hasMerchantAppId: !!merchantAppId,
        hasFabricAppId: !!fabricAppId,
        hasShortCode: !!shortCode,
      })
      return new Response(
        JSON.stringify({
          success: false,
          error: "Server configuration error: Missing TeleBirr credentials",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Parse request body
    const body = await req.json()
    console.log("[TeleBirr Service] Request body received:", {
      amount: body.amount,
      phoneNumber: body.phoneNumber?.replace(/(?<=.{3}).(?=.*(?:.{3})+$)/g, "X"),
      reference: body.reference,
    })

    // Validate request body
    const {
      amount,
      phoneNumber,
      subject,
      description,
      reference,
      notifyUrl,
      returnUrl,
    } = body

    if (!amount || !phoneNumber || !reference || !notifyUrl || !returnUrl) {
      console.error("[TeleBirr Service] Missing required request fields")
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required payment parameters",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    if (amount <= 0) {
      console.error("[TeleBirr Service] Invalid amount:", amount)
      return new Response(
        JSON.stringify({
          success: false,
          error: "Amount must be greater than zero",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Prepare TeleBirr payment request
    const paymentRequest: TeleBirrPaymentRequest = {
      appId: merchantAppId,
      fabricAppId: fabricAppId,
      shortCode: shortCode,
      amount: amount,
      phoneNumber: phoneNumber,
      subject: subject || "YeBetWeg Payment",
      description: description || "Payment for YeBetWeg services",
      reference: reference,
      notifyUrl: notifyUrl,
      returnUrl: returnUrl,
    }

    const telebirrUrl = `${TELEBIRR_API_URL}/payment/create`
    const authHeader = apiKey.startsWith("Bearer ") ? apiKey : `Bearer ${apiKey}`
    console.log("[TeleBirr Service] Sending payment request to TeleBirr API...", { telebirrUrl, authHeaderMasked: authHeader && authHeader.slice(0, 12) + '...' })

    // Make request to TeleBirr API
    const telebirrResponse = await fetch(telebirrUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(paymentRequest),
    })

    console.log("[TeleBirr Service] TeleBirr API response status:", telebirrResponse.status)

    const telebirrData: TeleBirrPaymentResponse = await telebirrResponse.json()

    console.log("[TeleBirr Service] TeleBirr API response:", {
      code: telebirrData.code,
      msg: telebirrData.msg,
      hasData: !!telebirrData.data,
    })

    // Check if TeleBirr response was successful
    if (!telebirrResponse.ok) {
      console.error("[TeleBirr Service] TeleBirr API HTTP error:", {
        status: telebirrResponse.status,
        code: telebirrData.code,
        msg: telebirrData.msg,
      })
      return new Response(
        JSON.stringify({
          success: false,
          error: telebirrData.msg || `HTTP ${telebirrResponse.status}: Payment initialization failed`,
          code: telebirrData.code,
        }),
        {
          status: telebirrResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Check TeleBirr API response code
    if (telebirrData.code !== "0000") {
      console.error("[TeleBirr Service] TeleBirr API error response:", {
        code: telebirrData.code,
        msg: telebirrData.msg,
      })
      return new Response(
        JSON.stringify({
          success: false,
          error: telebirrData.msg || `API error: ${telebirrData.code}`,
          code: telebirrData.code,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Validate response data
    if (!telebirrData.data) {
      console.error("[TeleBirr Service] TeleBirr returned no data")
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid response from TeleBirr: missing payment data",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    console.log("[TeleBirr Service] Payment initialization successful:", {
      reference: reference,
      prepayId: telebirrData.data.prepayId?.substring(0, 8) + "...",
    })

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        prepayId: telebirrData.data.prepayId,
        reference: telebirrData.data.reference,
        toPayUrl: telebirrData.data.codeUrl,
        qrCode: telebirrData.data.qrCode || telebirrData.data.codeUrl,
        codeUrl: telebirrData.data.codeUrl,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    console.error("[TeleBirr Service] Unexpected error:", error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
