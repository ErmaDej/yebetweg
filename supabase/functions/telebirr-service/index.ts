import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
}

// TeleBirr API Configuration
const TELEBIRR_API_URL = "https://api.telebirr.com/v1"

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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
    console.log("[TeleBirr Service] Processing payment request")

    // Get environment variables
    const apiKey = Deno.env.get("VITE_TELEBIRR_API_KEY")
    const merchantAppId = Deno.env.get("VITE_TELEBIRR_MERCHANT_APP_ID")
    const fabricAppId = Deno.env.get("VITE_TELEBIRR_FABRIC_APP_ID")
    const shortCode = Deno.env.get("VITE_TELEBIRR_SHORT_CODE")

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

    console.log("[TeleBirr Service] Sending payment request to TeleBirr API...")

    // Make request to TeleBirr API
    const telebirrResponse = await fetch(`${TELEBIRR_API_URL}/payment/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey.startsWith("Bearer ") ? apiKey : `Bearer ${apiKey}`,
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
