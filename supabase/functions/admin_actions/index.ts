import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function assertNoError<T>(result: { data: T; error: unknown }) {
  if (result.error) throw result.error
  return result.data
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405)
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return jsonResponse({ error: "Missing Authorization header" }, 401)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse({ error: "Server configuration error" }, 500)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const token = authHeader.replace("Bearer ", "")
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401)
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, role, status")
    .or(`id.eq.${user.id},auth_uid.eq.${user.id}`)
    .single()

  if (profileError || !profile || profile.role !== "admin" || profile.status !== "active") {
    return jsonResponse({ error: "Forbidden: active admin role required" }, 403)
  }

  let body
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400)
  }

  const { action, payload } = body
  if (!action) {
    return jsonResponse({ error: "Action missing" }, 400)
  }

  try {
    switch (action) {
      case "view_analytics": {
        const [users, subscriptions, payments, paymentRows, listings, professionals, inquiries, rfqs, blogs, tips, ads] =
          await Promise.all([
            supabase.from("users").select("id", { count: "exact", head: true }),
            supabase.from("premium_subscriptions").select("id", { count: "exact", head: true }).eq("is_active", true),
            supabase.from("subscription_payments").select("id", { count: "exact", head: true }),
            supabase.from("subscription_payments").select("amount, status").eq("status", "completed"),
            supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "pending"),
            supabase.from("professionals").select("id", { count: "exact", head: true }),
            supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("is_read", false),
            supabase.from("rfq_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
            supabase.from("blogs").select("id", { count: "exact", head: true }),
            supabase.from("tips").select("id", { count: "exact", head: true }),
            supabase.from("ads").select("id", { count: "exact", head: true }),
          ])

        const countResults = [users, subscriptions, payments, listings, professionals, inquiries, rfqs, blogs, tips, ads]
        const failedCount = countResults.find((result) => result.error)
        if (failedCount?.error) throw failedCount.error
        if (paymentRows.error) throw paymentRows.error

        const revenue = (paymentRows.data || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0)

        return jsonResponse({
          success: true,
          action,
          data: {
            users: users.count || 0,
            subscriptions: subscriptions.count || 0,
            payments: payments.count || 0,
            revenue,
            pendingListings: listings.count || 0,
            professionals: professionals.count || 0,
            inquiries: inquiries.count || 0,
            rfqs: rfqs.count || 0,
            blogs: blogs.count || 0,
            tips: tips.count || 0,
            ads: ads.count || 0,
          },
        })
      }

      case "manage_blogs": {
        const blogs = assertNoError(await supabase
          .from("blogs")
          .select("id, title_en, category, created_at")
          .order("created_at", { ascending: false }))

        return jsonResponse({ success: true, action, data: blogs || [] })
      }

      case "manage_tips": {
        const tips = assertNoError(await supabase
          .from("tips")
          .select("id, title_en, category, is_premium, created_at")
          .order("created_at", { ascending: false }))

        return jsonResponse({ success: true, action, data: tips || [] })
      }

      case "manage_ads": {
        const ads = assertNoError(await supabase
          .from("ads")
          .select("id, advertiser, position, is_active, created_at")
          .order("created_at", { ascending: false }))

        return jsonResponse({ success: true, action, data: ads || [] })
      }

      case "moderate_listings": {
        const listingId = payload?.listingId
        const status = payload?.status
        const allowedStatuses = ["pending", "approved", "rejected", "sold"]

        if (listingId && status) {
          if (!allowedStatuses.includes(status)) {
            return jsonResponse({ error: `Invalid listing status: ${status}` }, 400)
          }

          const { error: updateError } = await supabase
            .from("listings")
            .update({ status })
            .eq("id", listingId)

          if (updateError) throw updateError

          return jsonResponse({ success: true, action, message: `Listing ${listingId} ${status}` })
        }

        const listings = assertNoError(await supabase
          .from("listings")
          .select("id, title_en, category, status, created_at")
          .order("created_at", { ascending: false }))

        return jsonResponse({ success: true, action, data: listings || [] })
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

          return jsonResponse({ success: true, action, message: `Professional ${professionalId} verification: ${isVerified}` })
        }

        const professionals = assertNoError(await supabase
          .from("professionals")
          .select("id, name, specialty, is_verified, created_at")
          .order("created_at", { ascending: false }))

        return jsonResponse({ success: true, action, data: professionals || [] })
      }

      case "manage_users": {
        const users = assertNoError(await supabase
          .from("users")
          .select("id, email, username, role, status, created_at")
          .order("created_at", { ascending: false }))

        return jsonResponse({ success: true, action, data: users || [] })
      }

      case "ban_users": {
        const userId = payload?.userId
        const banStatus = payload?.status || "suspended"
        const allowedStatuses = ["active", "suspended", "banned"]

        if (!userId) {
          const users = assertNoError(await supabase
            .from("users")
            .select("id, email, username, role, status, created_at")
            .neq("role", "admin")
            .order("created_at", { ascending: false }))

          return jsonResponse({
            success: true,
            action,
            data: users || [],
            message: "No user was changed. Send userId and status to update a user.",
          })
        }

        if (!allowedStatuses.includes(banStatus)) {
          return jsonResponse({ error: `Invalid user status: ${banStatus}` }, 400)
        }

        const { error: updateError } = await supabase
          .from("users")
          .update({ status: banStatus })
          .eq("id", userId)

        if (updateError) throw updateError

        return jsonResponse({ success: true, action, message: `User ${userId} status set to ${banStatus}` })
      }

      case "manage_payments": {
        const payments = assertNoError(await supabase
          .from("subscription_payments")
          .select("id, amount, currency, method, reference, status, created_at")
          .order("created_at", { ascending: false })
          .limit(50))

        return jsonResponse({ success: true, action, data: payments || [] })
      }

      case "manage_rfqs": {
        const rfqId = payload?.rfqId
        const status = payload?.status
        const allowedStatuses = ["new", "reviewing", "sent_to_supplier", "quoted", "closed", "spam"]

        if (rfqId && status) {
          if (!allowedStatuses.includes(status)) {
            return jsonResponse({ error: `Invalid RFQ status: ${status}` }, 400)
          }

          const { error: updateError } = await supabase
            .from("rfq_requests")
            .update({ status, updated_at: new Date().toISOString() })
            .eq("id", rfqId)

          if (updateError) throw updateError

          return jsonResponse({ success: true, action, message: `RFQ ${rfqId} status set to ${status}` })
        }

        const rfqs = assertNoError(await supabase
          .from("rfq_requests")
          .select(`
            id,
            requester_name,
            requester_email,
            requester_phone,
            city,
            source_type,
            status,
            created_at,
            rfq_items (
              material_name,
              specification,
              unit,
              quantity,
              target_price
            )
          `)
          .order("created_at", { ascending: false })
          .limit(50))

        return jsonResponse({ success: true, action, data: rfqs || [] })
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400)
    }
  } catch (error) {
    console.error(`[admin_actions] ${action} failed:`, error)
    return jsonResponse({ error: error instanceof Error ? error.message : "Internal server error" }, 500)
  }
})
