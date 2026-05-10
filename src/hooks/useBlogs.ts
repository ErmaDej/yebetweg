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

export function useBlogs(category?: string) {
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBlogs() {
      setLoading(true)
      let query = supabase.from("blogs").select("*").order("created_at", { ascending: false })
      if (category && category !== "all") {
        query = query.eq("category", category)
      }
      const { data, error } = await query
      if (!error && data) {
        setBlogs(data as Blog[])
      }
      setLoading(false)
    }
    fetchBlogs()
  }, [category])

  return { blogs, loading }
}
