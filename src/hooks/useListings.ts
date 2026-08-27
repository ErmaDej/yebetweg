import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { sanitizeSearchTerm, orIlike } from "@/lib/searchUtils"

export type Listing = {
  id: string
  listing_type: string
  title_am: string
  title_en: string
  description: string
  price: number
  location: string
  contact_phone: string
  contact_email: string
  images: string[]
  is_verified: boolean
  is_urgent: boolean
  category: string
  created_at: string
}

const SEARCH_FETCH_CAP = 200

function fetchListings({
  listingType,
  page = 1,
  pageSize = 6,
  searchQuery,
}: {
  listingType?: string
  page?: number
  pageSize?: number
  searchQuery?: string
}) {
  return async () => {
    const term = sanitizeSearchTerm(searchQuery ?? "")

    let query = supabase
      .from("listings")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })

    if (listingType && listingType !== "all") {
      query = query.eq("listing_type", listingType)
    }

    if (term) {
      query = query.or(orIlike(["title_en", "title_am", "description", "location"], term))
      query = query.range(0, SEARCH_FETCH_CAP - 1)
    } else {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)
    }

    const { data, error, count } = await query
    if (error) throw error
    return { data: data as Listing[], total: count ?? 0 }
  }
}

export function useListings({
  listingType,
  page = 1,
  pageSize = 6,
  searchQuery,
}: {
  listingType?: string
  page?: number
  pageSize?: number
  searchQuery?: string
}) {
  return useQuery({
    queryKey: ["listings", listingType, page, pageSize, searchQuery],
    queryFn: fetchListings({ listingType, page, pageSize, searchQuery }),
    placeholderData: (prev) => prev,
  })
}