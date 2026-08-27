import { useQuery } from "@tanstack/react-query"
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
  city?: string
  specification?: string
  source_type?: string
  source_name?: string
  vat_included?: boolean
  confidence_score?: number
  last_verified_at?: string
  trend_direction?: "up" | "down" | "stable"
  freshness_status?: string
  access_level?: "free" | "premium"
}

function fetchMarketPrices({ category }: { category?: string }) {
  return async () => {
    let query = supabase
      .from("market_prices")
      .select("*")
      .order("category", { ascending: true })

    if (category && category !== "all") {
      query = query.eq("category", category)
    }

    const { data, error } = await query
    if (error) throw error
    return data as MarketPrice[]
  }
}

export function useMarketPrices(category?: string) {
  return useQuery({
    queryKey: ["market-prices", category],
    queryFn: fetchMarketPrices({ category }),
  })
}