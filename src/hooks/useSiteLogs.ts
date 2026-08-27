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
    if (!userId) {
      setLogs([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("site_logs")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false })

      if (!error && data) {
        setLogs(data as SiteLog[])
      } else {
        setLogs([])
      }
    } catch {
      setLogs([])
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const createLog = async (log: Omit<SiteLog, "id" | "created_at" | "updated_at">) => {
    try {
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
    } catch {
      return { data: null, error: new Error("table not available") }
    }
  }

  const updateLog = async (id: string, updates: Partial<SiteLog>) => {
    try {
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
    } catch {
      return { data: null, error: new Error("table not available") }
    }
  }

  const deleteLog = async (id: string) => {
    try {
      const { error } = await supabase
        .from("site_logs")
        .delete()
        .eq("id", id)

      if (!error) {
        setLogs((prev) => prev.filter((l) => l.id !== id))
      }
      return { error }
    } catch {
      return { error: new Error("table not available") }
    }
  }

  return { logs, loading, createLog, updateLog, deleteLog, refresh: fetchLogs }
}
