import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export interface DashboardInquiry {
  id: string
  subject: string | null
  is_read: boolean | null
  created_at: string
}

export interface DashboardListing {
  id: string
  title_en: string | null
  status: string | null
  created_at: string
}

export interface DashboardRfq {
  id: string
  requester_name: string
  city: string
  project_type: string | null
  status: string | null
  created_at: string
}

export interface DashboardPayment {
  id: string
  amount: number | null
  currency: string | null
  method: string | null
  reference: string | null
  status: string | null
  created_at: string
}

export interface DashboardStats {
  inquiries: number
  listings: number
  rfqs: number
  payments: number
  unread: number
}

export interface DashboardData {
  stats: DashboardStats
  recentInquiries: DashboardInquiry[]
  recentListings: DashboardListing[]
  recentRfqs: DashboardRfq[]
  recentPayments: DashboardPayment[]
}

export type ActivityKind = "inquiry" | "listing" | "rfq" | "payment"

export interface ActivityItem {
  id: string
  kind: ActivityKind
  title: string
  subtitle?: string | null
  status?: string | null
  amount?: number | null
  createdAt: string
}

export function buildActivityFeed(data: DashboardData): ActivityItem[] {
  const items: ActivityItem[] = []

  for (const inquiry of data.recentInquiries) {
    items.push({
      id: inquiry.id,
      kind: "inquiry",
      title: inquiry.subject || "Inquiry",
      status: inquiry.is_read ? "read" : "unread",
      createdAt: inquiry.created_at,
    })
  }

  for (const listing of data.recentListings) {
    items.push({
      id: listing.id,
      kind: "listing",
      title: listing.title_en || "Listing",
      status: listing.status || undefined,
      createdAt: listing.created_at,
    })
  }

  for (const rfq of data.recentRfqs) {
    items.push({
      id: rfq.id,
      kind: "rfq",
      title: rfq.project_type || "Request for Quotation",
      subtitle: rfq.city,
      status: rfq.status || undefined,
      createdAt: rfq.created_at,
    })
  }

  for (const payment of data.recentPayments) {
    items.push({
      id: payment.id,
      kind: "payment",
      title: payment.reference || "Payment",
      subtitle: payment.method,
      status: payment.status || undefined,
      amount: payment.amount,
      createdAt: payment.created_at,
    })
  }

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function useDashboardData(userId: string | null) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!userId) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [inquiries, unreadInquiries, listings, rfqs, payments] = await Promise.all([
        supabase
          .from("inquiries")
          .select("id, subject, is_read, created_at", { count: "exact" })
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("inquiries")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("is_read", false),
        supabase
          .from("listings")
          .select("id, title_en, status, created_at", { count: "exact" })
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("rfq_requests")
          .select("id, requester_name, city, project_type, status, created_at", { count: "exact" })
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("subscription_payments")
          .select("id, amount, currency, method, reference, status, created_at", { count: "exact" })
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5),
      ])

      const failed = [inquiries, unreadInquiries, listings, rfqs, payments].find((r) => r.error)
      if (failed?.error) {
        throw failed.error
      }

      setData({
        stats: {
          inquiries: inquiries.count ?? 0,
          listings: listings.count ?? 0,
          rfqs: rfqs.count ?? 0,
          payments: payments.count ?? 0,
          unread: unreadInquiries.count ?? 0,
        },
        recentInquiries: (inquiries.data ?? []) as DashboardInquiry[],
        recentListings: (listings.data ?? []) as DashboardListing[],
        recentRfqs: (rfqs.data ?? []) as DashboardRfq[],
        recentPayments: (payments.data ?? []) as DashboardPayment[],
      })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message
  }
  return "Failed to load dashboard data"
}
