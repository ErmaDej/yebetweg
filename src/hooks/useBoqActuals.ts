import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { useAuthContext } from "@/context/AuthContext"
import { toast } from "sonner"
import type { BoqEstimate } from "./useBoqEstimates"

export type BoqActualCategory = "structure" | "material" | "labor" | "overhead" | "other"

export type BoqActual = {
  id: string
  boq_estimate_id: string
  user_id: string
  category: BoqActualCategory
  description: string | null
  amount: number
  spent_at: string
  created_at: string
}

export type ActualsSummary = {
  total: number
  byCategory: Record<BoqActualCategory, number>
  entries: BoqActual[]
  count: number
}

export function summarizeActuals(entries: BoqActual[]): ActualsSummary {
  const byCategory: Record<BoqActualCategory, number> = {
    structure: 0,
    material: 0,
    labor: 0,
    overhead: 0,
    other: 0,
  }
  let total = 0
  for (const e of entries) {
    const amt = Number(e.amount) || 0
    total += amt
    byCategory[e.category] = (byCategory[e.category] ?? 0) + amt
  }
  return { total, byCategory, entries, count: entries.length }
}

/**
 * Actuals for ALL of the signed-in user's estimates, keyed by estimate id.
 * One query for the whole dashboard instead of N per-estimate queries.
 */
export function useBoqActualsByEstimate() {
  const { user } = useAuthContext()

  return useQuery({
    queryKey: ["boq_actuals", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Record<string, ActualsSummary>> => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.user) return {}
      const { data: profile } = await supabase
        .from("users")
        .select("id")
        .eq("auth_uid", session.user.id)
        .maybeSingle()
      const userId = (profile as { id?: string } | null)?.id
      if (!userId) return {}

      const { data, error } = await supabase
        .from("boq_actuals")
        .select("*")
        .eq("user_id", userId)
        .order("spent_at", { ascending: false })
        .limit(500)
      if (error) {
        // Migration may not be applied yet — degrade to "no actuals"
        if (error.code === "42P01" || error.code === "PGRST205") return {}
        throw error
      }

      const rows = (data as BoqActual[]) ?? []
      const byEstimate: Record<string, ActualsSummary> = {}
      for (const row of rows) {
        if (!byEstimate[row.boq_estimate_id]) {
          byEstimate[row.boq_estimate_id] = summarizeActuals([])
        }
        byEstimate[row.boq_estimate_id].entries.push(row)
      }
      for (const key of Object.keys(byEstimate)) {
        byEstimate[key] = summarizeActuals(byEstimate[key].entries)
      }
      return byEstimate
    },
  })
}

export function useCreateBoqActual() {
  const queryClient = useQueryClient()
  const { user } = useAuthContext()

  return useMutation({
    mutationFn: async (payload: {
      boq_estimate_id: string
      category: BoqActualCategory
      description?: string | null
      amount: number
      spent_at?: string
    }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.user) throw new Error("Please sign in to log spending.")
      const { data: profile } = await supabase
        .from("users")
        .select("id")
        .eq("auth_uid", session.user.id)
        .maybeSingle()
      const userId = (profile as { id?: string } | null)?.id
      if (!userId) throw new Error("Please sign in to log spending.")

      const { data, error } = await supabase
        .from("boq_actuals")
        .insert({
          boq_estimate_id: payload.boq_estimate_id,
          user_id: userId,
          category: payload.category,
          description: payload.description?.trim() || null,
          amount: payload.amount,
          spent_at: payload.spent_at || new Date().toISOString().slice(0, 10),
        })
        .select()
        .single()
      if (error) throw error
      return data as BoqActual
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boq_actuals", user?.id] })
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Failed to log spending")
    },
  })
}

export function useDeleteBoqActual() {
  const queryClient = useQueryClient()
  const { user } = useAuthContext()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("boq_actuals").delete().eq("id", id)
      if (error) throw error
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boq_actuals", user?.id] })
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Failed to delete entry")
    },
  })
}

// ============================================================================
// Chart aggregation — pure functions (unit-tested in tests/boq-actuals.test.ts)
// ============================================================================

export type MonthlySpendPoint = { month: string; total: number }

/**
 * Continuous monthly series for the last `months` months (empty months are 0,
 * so trends don't lie by skipping gaps). Ends at the current month.
 */
export function aggregateMonthlySpend(entries: BoqActual[], months = 6): MonthlySpendPoint[] {
  const byMonth = new Map<string, number>()
  for (const e of entries) {
    const month = (e.spent_at || "").slice(0, 7)
    if (!/^\d{4}-\d{2}$/.test(month)) continue
    byMonth.set(month, (byMonth.get(month) ?? 0) + (Number(e.amount) || 0))
  }
  const points: MonthlySpendPoint[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    points.push({ month: key, total: byMonth.get(key) ?? 0 })
  }
  return points
}

export type CategorySlice = { category: BoqActualCategory; total: number; pct: number }

/** Category totals with percentages of the whole (0 pct when no entries). */
export function aggregateByCategory(entries: BoqActual[]): CategorySlice[] {
  const order: BoqActualCategory[] = ["material", "labor", "structure", "overhead", "other"]
  const totals = new Map<BoqActualCategory, number>()
  let grand = 0
  for (const e of entries) {
    const amt = Number(e.amount) || 0
    totals.set(e.category, (totals.get(e.category) ?? 0) + amt)
    grand += amt
  }
  return order
    .filter((c) => (totals.get(c) ?? 0) > 0)
    .map((c) => ({
      category: c,
      total: totals.get(c) ?? 0,
      pct: grand > 0 ? ((totals.get(c) ?? 0) / grand) * 100 : 0,
    }))
}

export type VarianceRow = {
  estimate: BoqEstimate
  actuals: ActualsSummary
  variance: number
  variancePct: number | null // null when estimate total is 0
}

export function buildVarianceRows(
  estimates: BoqEstimate[],
  actualsByEstimate: Record<string, ActualsSummary>
): VarianceRow[] {
  return estimates.map((estimate) => {
    const actuals = actualsByEstimate[estimate.id] ?? summarizeActuals([])
    const variance = actuals.total - (Number(estimate.outputs?.total) || 0)
    const estimated = Number(estimate.outputs?.total) || 0
    return {
      estimate,
      actuals,
      variance,
      variancePct: estimated > 0 ? (variance / estimated) * 100 : null,
    }
  })
}
