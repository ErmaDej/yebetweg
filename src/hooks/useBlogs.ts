import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { sanitizeSearchTerm, orIlike } from "@/lib/searchUtils"

export type Blog = {
  id: string
  title_am: string
  title_en: string
  content: string
  category: string
  image_url: string
  author: string
  slug: string
  is_featured: boolean
  created_at: string
}

const SEARCH_FETCH_CAP = 200

export function useBlogs(category?: string, page = 1, pageSize = 6, searchQuery?: string) {
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function fetchBlogs() {
      setLoading(true)
      const term = sanitizeSearchTerm(searchQuery ?? "")

      let query = supabase
        .from("blogs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })

      if (category && category !== "all") {
        query = query.eq("category", category)
      }

      if (term) {
        // Search mode: fetch the full server-side match set so client-side
        // filtering/pagination operates across every page, not just one.
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
        setBlogs(data as Blog[])
        setTotal(count ?? 0)
      } else {
        if (error) console.warn("[useBlogs] fetch failed:", error.message)
        setBlogs([])
        setTotal(0)
      }
      setLoading(false)
    }
    fetchBlogs()

    return () => {
      cancelled = true
    }
  }, [category, page, pageSize, searchQuery])

  return { blogs, loading, total }
}
