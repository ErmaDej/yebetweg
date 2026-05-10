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

export function useListings(listingType?: string) {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchListings() {
      setLoading(true)
      let query = supabase.from("listings").select("*").order("created_at", { ascending: false })
      if (listingType && listingType !== "all") {
        query = query.eq("listing_type", listingType)
      }
      const { data, error } = await query
      if (!error && data) {
        setListings(data as Listing[])
      }
      setLoading(false)
    }
    fetchListings()
  }, [listingType])

  return { listings, loading }
}
