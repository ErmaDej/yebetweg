import { useCallback, useEffect, useRef, useState } from "react"
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

export interface UseDashboardDataOptions {
  limit?: number
  refreshOnFocus?: boolean
}

export interface UseDashboardDataResult {
  data: DashboardData | null
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  refetch: () => Promise<void>
  loadMore: () => Promise<void>
}

interface PagedResult { data: DashboardData["recentInquiries" | "recentListings" | "recentRfqs" | "recentPayments"]; count: number | null; error?: string }

export function useDashboardData(
  userId: string | null,
  opts: UseDashboardDataOptions = {}
): UseDashboardDataResult {
  const { limit = 3, refreshOnFocus = true } = opts
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const pageRef = useRef(1)
  const mountedRef = useRef(true)

  const fetchPage = useCallback(async (page: number, signal?: AbortSignal): Promise<DashboardData | null> => {
    if (!userId) return null

    const from = (page - 1) * limit
    const to = from + limit - 1

    const [inquiries, unreadInquiries, listings, rfqs, payments] = await Promise.all([
      supabase
        .from("inquiries")
        .select("id, subject, is_read, created_at", { count: "exact" })
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(from, to)
        .abortSignal(signal),
      supabase
        .from("inquiries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false)
        .abortSignal(signal),
      supabase
        .from("listings")
        .select("id, title_en, status, created_at", { count: "exact" })
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(from, to)
        .abortSignal(signal),
      supabase
        .from("rfq_requests")
        .select("id, requester_name, city, project_type, status, created_at", { count: "exact" })
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(from, to)
        .abortSignal(signal),
      supabase
        .from("subscription_payments")
        .select("id, amount, currency, method, reference, status, created_at", { count: "exact" })
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(from, to)
        .abortSignal(signal),
    ])

    const failed = [inquiries, unreadInquiries, listings, rfqs, payments].find((r) => r.error)
    if (failed?.error) {
      throw failed.error
    }

    return {
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
    } as DashboardData
  }, [userId, limit])

  const mergeWithExisting = useCallback((fresh: DashboardData) => {
    setData((prev) => {
      if (!prev) return fresh
      return {
        stats: fresh.stats,
        recentInquiries: mergeUnique(prev.recentInquiries, fresh.recentInquiries, (a, b) => a.id === b.id),
        recentListings: mergeUnique(prev.recentListings, fresh.recentListings, (a, b) => a.id === b.id),
        recentRfqs: mergeUnique(prev.recentRfqs, fresh.recentRfqs, (a, b) => a.id === b.id),
        recentPayments: mergeUnique(prev.recentPayments, fresh.recentPayments, (a, b) => a.id === b.id),
      }
    })
  }, [])

  const refetch = useCallback(async () => {
    pageRef.current = 1
    setHasMore(true)
    setError(null)
    setLoading(true)
    try {
      const result = await fetchPage(1)
      if (mountedRef.current) {
        setData(result)
        setHasMore(
          (result?.recentInquiries.length ?? 0) === limit ||
            (result?.recentListings.length ?? 0) === limit ||
            (result?.recentRfqs.length ?? 0) === limit ||
            (result?.recentPayments.length ?? 0) === limit
        )
      }
    } catch (err) {
      if (mountedRef.current) setError(getErrorMessage(err))
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [fetchPage, limit])

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return
    pageRef.current += 1
    setLoadingMore(true)
    setError(null)
    try {
      const result = await fetchPage(pageRef.current)
      if (result && mountedRef.current) {
        mergeWithExisting(result)
        const exhaustedAll =
          (result.recentInquiries.length < limit &&
            result.recentListings.length < limit &&
            result.recentRfqs.length < limit &&
            result.recentPayments.length < limit)
        setHasMore(!exhaustedAll)
      }
    } catch (err) {
      if (mountedRef.current) setError(getErrorMessage(err))
    } finally {
      if (mountedRef.current) setLoadingMore(false)
    }
  }, [loading, loadingMore, hasMore, fetchPage, mergeWithExisting, limit])

  useEffect(() => {
    mountedRef.current = true
    if (!userId) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }
    refetch()
    return () => {
      mountedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    if (!refreshOnFocus) return
    const handleFocus = () => {
      if (document.visibilityState === "visible") refetch()
    }
    const onVisibility = () => {
      if (document.visibilityState === "visible") refetch()
    }
    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [refetch, refreshOnFocus])

  return { data, loading, loadingMore, error, hasMore, refetch, loadMore }
}

function mergeUnique<T>(existing: T[], incoming: T[], same: (a: T, b: T) => boolean): T[] {
  const out = [...existing]
  for (const item of incoming) {
    if (!out.some((e) => same(e, item))) out.push(item)
  }
  return out.sort((a: any, b: any) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
}

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message
  }
  return "Failed to load dashboard data"
}
