import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const token = authHeader.replace("Bearer ", "")
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") {
    return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const { action, payload } = body
  if (!action) {
    return new Response(JSON.stringify({ error: "Action missing" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
    switch (action) {
      case "view_analytics": {
        const [users, subscriptions, payments, listings, professionals, inquiries, blogs, tips, ads] =
          await Promise.all([
            supabase.from("users").select("id", { count: "exact", head: true }),
            supabase.from("premium_subscriptions").select("id", { count: "exact", head: true }).eq("is_active", true),
            supabase.from("subscription_payments").select("id, amount", { count: "exact", head: true }),
            supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "pending"),
            supabase.from("professionals").select("id", { count: "exact", head: true }),
            supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("is_read", false),
            supabase.from("blogs").select("id", { count: "exact", head: true }),
            supabase.from("tips").select("id", { count: "exact", head: true }),
            supabase.from("ads").select("id", { count: "exact", head: true }),
          ])

        return new Response(
          JSON.stringify({
            success: true,
            action,
            data: {
              users: users.count || 0,
              subscriptions: subscriptions.count || 0,
              payments: payments.count || 0,
              pendingListings: listings.count || 0,
              professionals: professionals.count || 0,
              inquiries: inquiries.count || 0,
              blogs: blogs.count || 0,
              tips: tips.count || 0,
              ads: ads.count || 0,
            },
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
      }

      case "manage_blogs": {
        const { data: blogs } = await supabase
          .from("blogs")
          .select("id, title_en, category, created_at")
          .order("created_at", { ascending: false })

        return new Response(
          JSON.stringify({ success: true, action, data: blogs || [] }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
      }

      case "manage_tips": {
        const { data: tips } = await supabase
          .from("tips")
          .select("id, title_en, category, access_level, created_at")
          .order("created_at", { ascending: false })

        return new Response(
          JSON.stringify({ success: true, action, data: tips || [] }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
      }

      case "manage_ads": {
        const { data: ads } = await supabase
          .from("ads")
          .select("id, title, position, is_active, created_at")
          .order("created_at", { ascending: false })

        return new Response(
          JSON.stringify({ success: true, action, data: ads || [] }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
      }

      case "moderate_listings": {
        const listingId = payload?.listingId
        const status = payload?.status

        if (listingId && status) {
          const { error: updateError } = await supabase
            .from("listings")
            .update({ status })
            .eq("id", listingId)

          if (updateError) throw updateError

          return new Response(
            JSON.stringify({ success: true, action, message: `Listing ${listingId} ${status}` }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          )
        }

        const { data: listings } = await supabase
          .from("listings")
          .select("id, title_en, category, status, created_at")
          .order("created_at", { ascending: false })

        return new Response(
          JSON.stringify({ success: true, action, data: listings || [] }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
      }

      case "verify_professionals": {
        const professionalId = payload?.professionalId
        const isVerified = payload?.verified

        if (professionalId && isVerified !== undefined) {
          const { error: updateError } = await supabase
            .from("professionals")
            .update({ is_verified: isVerified })
            .eq("id", professionalId)

          if (updateError) throw updateError

          return new Response(
            JSON.stringify({ success: true, action, message: `Professional ${professionalId} verification: ${isVerified}` }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          )
        }

        const { data: professionals } = await supabase
          .from("professionals")
          .select("id, name, specialty, is_verified, created_at")
          .order("created_at", { ascending: false })

        return new Response(
          JSON.stringify({ success: true, action, data: professionals || [] }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
      }

      case "manage_users": {
        const { data: users } = await supabase
          .from("users")
          .select("id, email, username, role, status, created_at")
          .order("created_at", { ascending: false })

        return new Response(
          JSON.stringify({ success: true, action, data: users || [] }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
      }

      case "ban_users": {
        const userId = payload?.userId
        const banStatus = payload?.status || "suspended"

        if (!userId) {
          return new Response(
            JSON.stringify({ error: "Missing userId in payload" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          )
        }

        const { error: updateError } = await supabase
          .from("users")
          .update({ status: banStatus })
          .eq("id", userId)

        if (updateError) throw updateError

        return new Response(
          JSON.stringify({ success: true, action, message: `User ${userId} status set to ${banStatus}` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
      }

      case "manage_payments": {
        const { data: payments } = await supabase
          .from("subscription_payments")
          .select("id, amount, currency, method, reference, status, created_at")
          .order("created_at", { ascending: false })
          .limit(50)

        return new Response(
          JSON.stringify({ success: true, action, data: payments || [] }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
    }
  } catch (error) {
    console.error(`[admin_actions] ${action} failed:`, error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
