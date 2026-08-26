import { useState, useEffect } from "react"
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

export function useListings(listingType?: string, page = 1, pageSize = 6, searchQuery?: string) {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function fetchListings() {
      setLoading(true)
      const term = sanitizeSearchTerm(searchQuery ?? "")

      let query = supabase
        .from("listings")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })

      if (listingType && listingType !== "all") {
        query = query.eq("listing_type", listingType)
      }

      if (term) {
        // Search mode: fetch the full server-side match set so client-side
        // filtering/pagination operates across every page, not just one.
        query = query.or(orIlike(["title_en", "title_am", "description", "location"], term))
        query = query.range(0, SEARCH_FETCH_CAP - 1)
      } else {
        const from = (page - 1) * pageSize
        const to = from + pageSize - 1
        query = query.range(from, to)
      }

      const { data, error, count } = await query
      if (cancelled) return
      if (!error && data) {
        setListings(data as Listing[])
        setTotal(count ?? 0)
      } else {
        if (error) console.warn("[useListings] fetch failed:", error.message)
        setListings([])
        setTotal(0)
      }
      setLoading(false)
    }
    fetchListings()

    return () => {
      cancelled = true
    }
  }, [listingType, page, pageSize, searchQuery])

  return { listings, loading, total }
}
