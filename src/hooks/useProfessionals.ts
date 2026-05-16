import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export type Professional = {
  id: string
  name: string
  specialty: string
  rating: number
  experience_years: number
  location: string
  phone: string
  email: string
  is_verified: boolean
  portfolio_images: string[]
  created_at: string
}

export function useProfessionals(specialty?: string, page = 1, pageSize = 6) {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    async function fetchProfessionals() {
      setLoading(true)
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      let query = supabase
        .from("professionals")
        .select("*", { count: "exact" })
        .order("rating", { ascending: false })
        .range(from, to)

      if (specialty && specialty !== "all") {
        query = query.eq("specialty", specialty)
      }
      const { data, error, count } = await query
      if (!error && data) {
        setProfessionals(data as Professional[])
        setTotal(count ?? 0)
      } else {
        setProfessionals([])
        setTotal(0)
      }
      setLoading(false)
    }
    fetchProfessionals()
  }, [specialty, page, pageSize])

  return { professionals, loading, total }
}
