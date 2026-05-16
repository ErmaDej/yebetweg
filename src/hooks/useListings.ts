import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

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

export function useListings(listingType?: string, page = 1, pageSize = 6) {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    async function fetchListings() {
      setLoading(true)
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      let query = supabase
        .from("listings")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to)

      if (listingType && listingType !== "all") {
        query = query.eq("listing_type", listingType)
      }
      const { data, error, count } = await query
      if (!error && data) {
        setListings(data as Listing[])
        setTotal(count ?? 0)
      } else {
        setListings([])
        setTotal(0)
      }
      setLoading(false)
    }
    fetchListings()
  }, [listingType, page, pageSize])

  return { listings, loading, total }
}
