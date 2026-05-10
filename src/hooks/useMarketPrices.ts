import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export type MarketPrice = {
  id: string
  material_am: string
  material_en: string
  unit: string
  price: number
  change_percent: number
  category: string
  updated_at: string
}

export function useMarketPrices(category?: string) {
  const [prices, setPrices] = useState<MarketPrice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPrices() {
      setLoading(true)
      let query = supabase.from("market_prices").select("*").order("category", { ascending: true })
      if (category && category !== "all") {
        query = query.eq("category", category)
      }
      const { data, error } = await query
      if (!error && data) {
        setPrices(data as MarketPrice[])
      }
      setLoading(false)
    }
    fetchPrices()
  }, [category])

  return { prices, loading }
}
