import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { sanitizeSearchTerm, orIlike } from "@/lib/searchUtils"

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

const SEARCH_FETCH_CAP = 200

export function useProfessionals(
  specialty?: string,
  page = 1,
  pageSize = 6,
  searchQuery?: string
) {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function fetchProfessionals() {
      setLoading(true)
      const term = sanitizeSearchTerm(searchQuery ?? "")

      let query = supabase
        .from("professionals")
        .select("*", { count: "exact" })
        .order("rating", { ascending: false })

      if (specialty && specialty !== "all") {
        query = query.eq("specialty", specialty)
      }

      if (term) {
        // Search mode: fetch the full server-side match set so client-side
        // filtering/pagination operates across every page, not just one.
        query = query.or(orIlike(["name", "specialty", "location"], term))
        query = query.range(0, SEARCH_FETCH_CAP - 1)
      } else {
        const from = (page - 1) * pageSize
        const to = from + pageSize - 1
        query = query.range(from, to)
      }

      const { data, error, count } = await query
      if (cancelled) return
      if (!error && data) {
        setProfessionals(data as Professional[])
        setTotal(count ?? 0)
      } else {
        if (error) console.warn("[useProfessionals] fetch failed:", error.message)
        setProfessionals([])
        setTotal(0)
      }
      setLoading(false)
    }
    fetchProfessionals()

    return () => {
      cancelled = true
    }
  }, [specialty, page, pageSize, searchQuery])

  return { professionals, loading, total }
}
