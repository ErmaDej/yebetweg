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
  access_level?: "free" | "premium"
  city?: string
  specification?: string
  source_type?: "admin_verified" | "supplier_quoted" | "community_reported" | "telegram_observed"
  source_name?: string
  vat_included?: boolean
  confidence_score?: number
  last_verified_at?: string
  trend_direction?: "up" | "down" | "stable"
  freshness_status?: "verified" | "supplier_quoted" | "community_reported" | "expired" | "needs_confirmation"
}

export interface MarketPricesFilter {
  category?: string
  search?: string
  city?: string
  source_type?: string
  freshness_status?: string
  price_min?: number
  price_max?: number
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
