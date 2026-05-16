import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

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

export function useBlogs(category?: string, page = 1, pageSize = 6) {
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    async function fetchBlogs() {
      setLoading(true)
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      let query = supabase
        .from("blogs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to)

      if (category && category !== "all") {
        query = query.eq("category", category)
      }
      const { data, error, count } = await query
      if (!error && data) {
        setBlogs(data as Blog[])
        setTotal(count ?? 0)
      } else {
        setBlogs([])
        setTotal(0)
      }
      setLoading(false)
    }
    fetchBlogs()
  }, [category, page, pageSize])

  return { blogs, loading, total }
}
