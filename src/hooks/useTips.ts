import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { sanitizeSearchTerm, orIlike } from "@/lib/searchUtils"

export type Tip = {
  id: string
  title_am: string
  title_en: string
  content: string
  category: string
  is_premium: boolean
  icon: string | null
  created_at: string
}

const SEARCH_FETCH_CAP = 200

export function useTips(
  category?: string,
  page = 1,
  pageSize = 6,
  searchQuery?: string,
  isPremium?: boolean
) {
  const [tips, setTips] = useState<Tip[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function fetchTips() {
      setLoading(true)
      const term = sanitizeSearchTerm(searchQuery ?? "")

      let query = supabase
        .from("tips")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })

      if (category && category !== "all") {
        query = query.eq("category", category)
      }
      if (isPremium !== undefined) {
        query = query.eq("is_premium", isPremium)
      }

      if (term) {
        // Search mode: fetch the full server-side match set so pagination
        // operates across every page of the results, not just one.
        query = query.or(orIlike(["title_en", "title_am"], term))
        query = query.range(0, SEARCH_FETCH_CAP - 1)
      } else {
        const from = (page - 1) * pageSize
        const to = from + pageSize - 1
        query = query.range(from, to)
      }

      const { data, error, count } = await query
      if (cancelled) return
      if (!error && data) {
        setTips(data as Tip[])
        setTotal(count ?? 0)
      } else {
        if (error) console.warn("[useTips] fetch failed:", error.message)
        setTips([])
        setTotal(0)
      }
      setLoading(false)
    }
    fetchTips()

    return () => {
      cancelled = true
    }
  }, [category, page, pageSize, searchQuery, isPremium])

  return { tips, loading, total }
}

// Distinct tip categories for filter chips. The tips table is small, so a
// single lightweight column select is enough to build the facet list.
export function useTipCategories() {
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    supabase
      .from("tips")
      .select("category")
      .then(({ data }) => {
        if (cancelled || !data) return
        setCategories(
          Array.from(new Set(data.map((row) => row.category).filter(Boolean)))
            .sort()
            .map(String)
        )
      })
    return () => {
      cancelled = true
    }
  }, [])

  return categories
}
