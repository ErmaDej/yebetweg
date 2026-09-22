import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { useAuthContext } from "@/context/AuthContext"

export type BoqInputs = {
  projectType: string
  city: string // canonical key e.g. "addis_ababa"
  cityLabel: string
  area: number
  floors: number
  finishLevel: string
  contingency: number
}

export type BoqOutputs = {
  total: number
  perM2: number
  structure: number
  material: number
  labor: number
  overhead: number
  // Persisted by BoqLiteSection since the multi-city phase — optional here so
  // older saved rows without a breakdown still type-check.
  materialBreakdown?: Array<{ key: string; amount: number; live: boolean }>
  otherMaterials?: number
}

export type BoqEstimate = {
  id: string
  user_id: string
  inputs: BoqInputs
  outputs: BoqOutputs
  created_at: string
  updated_at: string
  /** Set by 20260921020000 (share links) — null until that migration is applied. */
  share_token?: string | null
}

async function fetchUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return null
  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("auth_uid", session.user.id)
    .maybeSingle()
  return (profile as { id?: string } | null)?.id ?? null
}

export function useBoqEstimates() {
  const { user } = useAuthContext()

  return useQuery({
    queryKey: ["boq_estimates", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<BoqEstimate[]> => {
      const userId = await fetchUserId()
      if (!userId) return []
      const { data, error } = await supabase
        .from("boq_estimates")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20)
      if (error) {
        // Table may not exist yet (migration pending) — degrade gracefully
        if (error.code === "42P01") return []
        throw error
      }
      return (data as BoqEstimate[]) ?? []
    },
  })
}

export function useCreateBoqEstimate() {
  const queryClient = useQueryClient()
  const { user } = useAuthContext()

  return useMutation({
    mutationFn: async (payload: { inputs: BoqInputs; outputs: BoqOutputs }) => {
      const userId = await fetchUserId()
      if (!userId) throw new Error("Please sign in to save estimates.")
      const { data, error } = await supabase
        .from("boq_estimates")
        .insert({
          user_id: userId,
          inputs: payload.inputs,
          outputs: payload.outputs,
        })
        .select()
        .single()
      if (error) throw error
      return data as BoqEstimate
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boq_estimates", user?.id] })
    },
  })
}

/** Rotate an estimate's share token — invalidates the previous permalink. */
export function useRotateShareToken() {
  return useMutation({
    mutationFn: async (estimateId: string) => {
      const { data, error } = await supabase.rpc("rotate_boq_share_token", {
        p_estimate_id: estimateId,
      })
      if (error) throw error
      const result = data as { success: boolean; share_token?: string; error?: string }
      if (!result.success) throw new Error(result.error ?? "Failed to rotate link")
      return result.share_token!
    },
  })
}

export function useDeleteBoqEstimate() {
  const queryClient = useQueryClient()
  const { user } = useAuthContext()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("boq_estimates").delete().eq("id", id)
      if (error) throw error
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boq_estimates", user?.id] })
    },
  })
}
