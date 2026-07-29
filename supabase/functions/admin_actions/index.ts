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

  let body
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400)
  }

  let adminUserId: string | null = null

  // Try standard Supabase Auth JWT first
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (!authError && user) {
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("id, role, status")
        .or(`id.eq.${user.id},auth_uid.eq.${user.id}`)
        .single()

      if (!profileError && profile && profile.role === "admin" && profile.status === "active") {
        adminUserId = profile.id
      }
    }
  }

  // Fallback: custom auth via _customUserId in request body
  if (!adminUserId) {
    const customUserId = body?._customUserId
    if (customUserId) {
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("id, role, status")
        .eq("id", customUserId)
        .single()

      if (!profileError && profile && profile.role === "admin" && profile.status === "active") {
        adminUserId = profile.id
      }
    }
  }

  if (!adminUserId) {
    return jsonResponse({ error: "Unauthorized or insufficient permissions" }, 401)
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
        const deleteId = payload?.id
        if (deleteId && payload?.delete) {
          const { error: deleteError } = await supabase
            .from("blogs")
            .delete()
            .eq("id", deleteId)
          if (deleteError) throw deleteError
          return jsonResponse({ success: true, action, message: `Blog ${deleteId} deleted` })
        }

        const blogs = assertNoError(await supabase
          .from("blogs")
          .select("id, title_en, category, created_at")
          .order("created_at", { ascending: false }))

        return jsonResponse({ success: true, action, data: blogs || [] })
      }

      case "manage_tips": {
        const tipDeleteId = payload?.id
        if (tipDeleteId && payload?.delete) {
          const { error: deleteError } = await supabase
            .from("tips")
            .delete()
            .eq("id", tipDeleteId)
          if (deleteError) throw deleteError
          return jsonResponse({ success: true, action, message: `Tip ${tipDeleteId} deleted` })
        }

        const tips = assertNoError(await supabase
          .from("tips")
          .select("id, title_en, category, is_premium, created_at")
          .order("created_at", { ascending: false }))

        return jsonResponse({ success: true, action, data: tips || [] })
      }

      case "manage_ads": {
        const adDeleteId = payload?.id
        if (adDeleteId && payload?.delete) {
          const { error: deleteError } = await supabase
            .from("ads")
            .delete()
            .eq("id", adDeleteId)
          if (deleteError) throw deleteError
          return jsonResponse({ success: true, action, message: `Ad ${adDeleteId} deleted` })
        }

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
            admin_notes,
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

      case "manage_market_prices": {
        const priceId = payload?.priceId
        const { material_am, material_en, unit, price, change_percent, category, city, specification, source_type, source_name, vat_included, confidence_score, trend_direction, freshness_status, access_level } = payload || {}

        if (priceId && payload?.delete) {
          const { error: deleteError } = await supabase
            .from("market_prices")
            .delete()
            .eq("id", priceId)

          if (deleteError) throw deleteError

          return jsonResponse({ success: true, action, message: `Market price ${priceId} deleted` })
        }

        if (priceId) {
          const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
          if (material_am !== undefined) updates.material_am = material_am
          if (material_en !== undefined) updates.material_en = material_en
          if (unit !== undefined) updates.unit = unit
          if (price !== undefined) updates.price = price
          if (change_percent !== undefined) updates.change_percent = change_percent
          if (category !== undefined) updates.category = category
          if (city !== undefined) updates.city = city
          if (specification !== undefined) updates.specification = specification
          if (source_type !== undefined) updates.source_type = source_type
          if (source_name !== undefined) updates.source_name = source_name
          if (vat_included !== undefined) updates.vat_included = vat_included
          if (confidence_score !== undefined) updates.confidence_score = confidence_score
          if (trend_direction !== undefined) updates.trend_direction = trend_direction
          if (freshness_status !== undefined) updates.freshness_status = freshness_status
          if (access_level !== undefined) updates.access_level = access_level

          const { error: updateError } = await supabase
            .from("market_prices")
            .update(updates)
            .eq("id", priceId)

          if (updateError) throw updateError

          return jsonResponse({ success: true, action, message: `Market price ${priceId} updated` })
        }

        if (payload?.bulk) {
          const rows = payload?.rows
          if (!Array.isArray(rows) || rows.length === 0) {
            return jsonResponse({ error: "No rows provided for bulk import" }, 400)
          }

          const { data: inserted, error: insertError } = await supabase
            .from("market_prices")
            .insert(rows.map((r: Record<string, unknown>) => ({
              material_am: r.material_am || "",
              material_en: r.material_en || "",
              unit: r.unit || "",
              price: Number(r.price) || 0,
              change_percent: Number(r.change_percent) || 0,
              category: r.category || "cement",
              city: r.city || "Addis Ababa",
              specification: r.specification || "",
              source_type: r.source_type || "admin_verified",
              source_name: r.source_name || "YeBetWeg Market Desk",
              vat_included: Boolean(r.vat_included),
              confidence_score: Number(r.confidence_score) || 70,
              trend_direction: r.trend_direction || "stable",
              freshness_status: r.freshness_status || "verified",
              access_level: r.access_level || "free",
            })))
            .select()

          if (insertError) throw insertError

          return jsonResponse({ success: true, action, message: `${inserted?.length || 0} market prices imported` })
        }

        if (payload?.create) {
          const { data: inserted, error: insertError } = await supabase
            .from("market_prices")
            .insert({
              material_am: material_am || "",
              material_en: material_en || "",
              unit: unit || "",
              price: Number(price) || 0,
              change_percent: Number(change_percent) || 0,
              category: category || "cement",
              city: city || "Addis Ababa",
              specification: specification || "",
              source_type: source_type || "admin_verified",
              source_name: source_name || "YeBetWeg Market Desk",
              vat_included: Boolean(vat_included),
              confidence_score: Number(confidence_score) || 70,
              trend_direction: trend_direction || "stable",
              freshness_status: freshness_status || "verified",
              access_level: access_level || "free",
            })
            .select()

          if (insertError) throw insertError

          return jsonResponse({ success: true, action, data: inserted })
        }

        const prices = assertNoError(await supabase
          .from("market_prices")
          .select("*")
          .order("category", { ascending: true })
          .order("material_en", { ascending: true }))

        return jsonResponse({ success: true, action, data: prices || [] })
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400)
    }
  } catch (error) {
    console.error(`[admin_actions] ${action} failed:`, error)
    return jsonResponse({ error: error instanceof Error ? error.message : "Internal server error" }, 500)
  }
})
