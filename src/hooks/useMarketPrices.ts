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

async function fetchViaRpc(category?: string): Promise<MarketPrice[] | null> {
  try {
    const { data, error } = await supabase.rpc("get_visible_market_prices")
    if (error) return null
    const rows = (data as MarketPrice[]) ?? []
    if (!category || category === "all") return rows
    return rows.filter((r) => r.category === category)
  } catch {
    return null
  }
}

function fetchMarketPrices({ category }: { category?: string }) {
  return async () => {
    // Prefer server-side premium-gated RPC (Phase 3). Falls back to direct select when migration pending.
    const rpcRows = await fetchViaRpc(category)
    if (rpcRows !== null) {
      // Best-effort freshness refresh (no-op if function missing or already fresh)
      supabase.rpc("refresh_market_price_freshness").then(() => {}, () => {})
      return rpcRows
    }

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
