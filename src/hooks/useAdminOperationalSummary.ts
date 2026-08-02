import { useEffect, useState, useCallback } from "react"
import { callAdminAction } from "@/lib/api"

export type OperationalSummary = {
  newRfqs: number
  newRfqsToday: number
  pendingVerifications: number
  churnRisk: number
  expiringSoon: number
  pendingListings: number
  failedPayments7d: number
  totalUsers: number
  activeSubscriptions: number
}

const emptySummary: OperationalSummary = {
  newRfqs: 0,
  newRfqsToday: 0,
  pendingVerifications: 0,
  churnRisk: 0,
  expiringSoon: 0,
  pendingListings: 0,
  failedPayments7d: 0,
  totalUsers: 0,
  activeSubscriptions: 0,
}

export function useAdminOperationalSummary() {
  const [summary, setSummary] = useState<OperationalSummary>(emptySummary)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await callAdminAction("operational_summary")
      const data = (result?.data ?? {}) as Partial<OperationalSummary>
      setSummary({
        newRfqs: data.newRfqs ?? 0,
        newRfqsToday: data.newRfqsToday ?? 0,
        pendingVerifications: data.pendingVerifications ?? 0,
        churnRisk: data.churnRisk ?? 0,
        expiringSoon: data.expiringSoon ?? 0,
        pendingListings: data.pendingListings ?? 0,
        failedPayments7d: data.failedPayments7d ?? 0,
        totalUsers: data.totalUsers ?? 0,
        activeSubscriptions: data.activeSubscriptions ?? 0,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load operational summary.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  return { summary, loading, error, refetch: fetchSummary }
}
