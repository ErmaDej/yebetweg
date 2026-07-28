import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"

export type SiteLog = {
  id: string
  user_id: string | null
  project_name: string
  date: string
  work_completed: string
  labor_count: number
  materials_used: string
  payments: number
  delay_reason: string
  notes: string
  created_at: string
  updated_at: string
}

export function useSiteLogs(userId?: string) {
  const [logs, setLogs] = useState<SiteLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from("site_logs")
      .select("*")
      .order("date", { ascending: false })

    if (userId) {
      query = query.eq("user_id", userId)
    }

    const { data, error } = await query
    if (!error && data) {
      setLogs(data as SiteLog[])
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const createLog = async (log: Omit<SiteLog, "id" | "created_at" | "updated_at">) => {
    const { data, error } = await supabase
      .from("site_logs")
      .insert(log)
      .select()
      .single()

    if (!error && data) {
      setLogs((prev) => [data as SiteLog, ...prev])
      return { data: data as SiteLog, error: null }
    }
    return { data: null, error }
  }

  const updateLog = async (id: string, updates: Partial<SiteLog>) => {
    const { data, error } = await supabase
      .from("site_logs")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (!error && data) {
      setLogs((prev) => prev.map((l) => (l.id === id ? (data as SiteLog) : l)))
      return { data: data as SiteLog, error: null }
    }
    return { data: null, error }
  }

  const deleteLog = async (id: string) => {
    const { error } = await supabase
      .from("site_logs")
      .delete()
      .eq("id", id)

    if (!error) {
      setLogs((prev) => prev.filter((l) => l.id !== id))
    }
    return { error }
  }

  return { logs, loading, createLog, updateLog, deleteLog, refresh: fetchLogs }
}
