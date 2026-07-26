import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

const CHAPA_BASE_URL = "https://api.chapa.co/v1"
const CHAPA_SECRET_KEY = Deno.env.get("CHAPA_SECRET_KEY") || Deno.env.get("VITE_CHAPA_SECRET_KEY") || ""

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (!CHAPA_SECRET_KEY) {
    return new Response(
      JSON.stringify({ success: false, error: "Server configuration error: missing Chapa secret" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }

  if (req.method === "POST") {
    try {
      const body = await req.json()
      const {
        amount,
        email,
        first_name,
        last_name,
        tx_ref,
        callback_url,
        return_url,
        customization,
      } = body

      if (!amount || !email || !first_name || !last_name || !tx_ref || !callback_url || !return_url) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing required payment parameters" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        )
      }

      const response = await fetch(`${CHAPA_BASE_URL}/transaction/initialize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
        },
        body: JSON.stringify({
          amount,
          currency: "ETB",
          email,
          first_name,
          last_name,
          tx_ref,
          callback_url,
          return_url,
          customization,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        return new Response(JSON.stringify({ success: false, error: data.message || "Chapa initialize failed", data }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    } catch (error) {
      return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unexpected error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
  }

  if (req.method === "GET") {
    const url = new URL(req.url)
    const tx_ref = url.searchParams.get("tx_ref")

    if (!tx_ref) {
      return new Response(JSON.stringify({ success: false, error: "Missing tx_ref query parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    try {
      const response = await fetch(`${CHAPA_BASE_URL}/transaction/verify/${encodeURIComponent(tx_ref)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
        },
      })

      const data = await response.json()
      if (!response.ok) {
        return new Response(JSON.stringify({ success: false, error: data.message || "Chapa verify failed", data }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    } catch (error) {
      return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unexpected error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
  }

  return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
    status: 405,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})
