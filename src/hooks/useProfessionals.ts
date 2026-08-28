import { useQuery } from "@tanstack/react-query"
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

function fetchProfessionals({
  specialty,
  page = 1,
  pageSize = 6,
  searchQuery,
}: {
  specialty?: string
  page?: number
  pageSize?: number
  searchQuery?: string
}) {
  return async () => {
    const term = sanitizeSearchTerm(searchQuery ?? "")

    let query = supabase
      .from("professionals")
      .select("*", { count: "exact" })
      .order("rating", { ascending: false })

    if (specialty && specialty !== "all") {
      query = query.eq("specialty", specialty)
    }

    if (term) {
      query = query.or(orIlike(["name", "specialty", "location"], term))
      query = query.range(0, SEARCH_FETCH_CAP - 1)
    } else {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)
    }

    const { data, error, count } = await query
    if (error) throw error
    return { data: data as Professional[], total: count ?? 0 }
  }
}

export function useProfessionals({
  specialty,
  page = 1,
  pageSize = 6,
  searchQuery,
}: {
  specialty?: string
  page?: number
  pageSize?: number
  searchQuery?: string
}) {
  return useQuery({
    queryKey: ["professionals", specialty, page, pageSize, searchQuery],
    queryFn: fetchProfessionals({ specialty, page, pageSize, searchQuery }),
    placeholderData: (prev) => prev,
  })
}