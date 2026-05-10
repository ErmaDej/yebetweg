import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export type Tip = {
  id: string
  title_am: string
  title_en: string
  content: string
  category: string
  is_premium: boolean
  icon: string
  created_at: string
}

export function useTips() {
  const [tips, setTips] = useState<Tip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTips() {
      setLoading(true)
      const { data, error } = await supabase
        .from("tips")
        .select("*")
        .order("created_at", { ascending: false })
      if (!error && data) {
        setTips(data as Tip[])
      }
      setLoading(false)
    }
    fetchTips()
  }, [])

  return { tips, loading }
}
