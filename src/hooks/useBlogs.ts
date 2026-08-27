import { useQuery } from "@tanstack/react-query"
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

function fetchBlogs({
  category,
  page = 1,
  pageSize = 6,
  searchQuery,
}: {
  category?: string
  page?: number
  pageSize?: number
  searchQuery?: string
}) {
  return async () => {
    const term = sanitizeSearchTerm(searchQuery ?? "")

    let query = supabase
      .from("blogs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })

    if (category && category !== "all") {
      query = query.eq("category", category)
    }

    if (term) {
      query = query.or(orIlike(["title_en", "title_am"], term))
      query = query.range(0, SEARCH_FETCH_CAP - 1)
    } else {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)
    }

    const { data, error, count } = await query
    if (error) throw error
    return { data: data as Blog[], total: count ?? 0 }
  }
}

export function useBlogs({
  category,
  page = 1,
  pageSize = 6,
  searchQuery,
}: {
  category?: string
  page?: number
  pageSize?: number
  searchQuery?: string
}) {
  return useQuery({
    queryKey: ["blogs", category, page, pageSize, searchQuery],
    queryFn: fetchBlogs({ category, page, pageSize, searchQuery }),
    placeholderData: (prev) => prev,
  })
}