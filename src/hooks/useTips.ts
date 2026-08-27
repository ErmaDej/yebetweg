import { useQuery } from "@tanstack/react-query"
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

function fetchTips({
  category,
  page = 1,
  pageSize = 6,
  searchQuery,
  isPremium,
}: {
  category?: string
  page?: number
  pageSize?: number
  searchQuery?: string
  isPremium?: boolean
}) {
  return async () => {
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
      query = query.or(orIlike(["title_en", "title_am"], term))
      query = query.range(0, SEARCH_FETCH_CAP - 1)
    } else {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)
    }

    const { data, error, count } = await query
    if (error) throw error
    return { data: data as Tip[], total: count ?? 0 }
  }
}

export function useTips({
  category,
  page = 1,
  pageSize = 6,
  searchQuery,
  isPremium,
}: {
  category?: string
  page?: number
  pageSize?: number
  searchQuery?: string
  isPremium?: boolean
}) {
  return useQuery({
    queryKey: ["tips", category, page, pageSize, searchQuery, isPremium],
    queryFn: fetchTips({ category, page, pageSize, searchQuery, isPremium }),
    placeholderData: (prev) => prev,
  })
}

// Distinct tip categories for filter chips
export function useTipCategories() {
  return useQuery({
    queryKey: ["tip-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tips").select("category")
      if (error) throw error
      return Array.from(new Set(data.map((row) => row.category).filter(Boolean)))
        .sort()
        .map(String)
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}