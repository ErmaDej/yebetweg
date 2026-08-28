import { useMemo } from "react"
import { useMarketPrices } from "./useMarketPrices"

type City = "addis_ababa" | "adama" | "hawassa" | "bahir_dar" | "mekelle" | "dire_dawa" | "outside_addis"

// Static fallback — matches Addis Cost Estimator's heuristic and keeps BOQ working offline
const STATIC_MULTIPLIERS: Record<City, number> = {
  addis_ababa: 1,
  adama: 0.92,
  hawassa: 0.95,
  bahir_dar: 0.94,
  mekelle: 0.96,
  dire_dawa: 0.93,
  outside_addis: 0.9,
}

// Map DB city strings (as stored in market_prices.city) to City keys
const CITY_ALIASES: Record<string, City> = {
  "addis ababa": "addis_ababa",
  "addis_ababa": "addis_ababa",
  "adama": "adama",
  "nazret": "adama",
  "hawassa": "hawassa",
  "awassa": "hawassa",
  "bahir dar": "bahir_dar",
  "bahir_dar": "bahir_dar",
  "mekelle": "mekelle",
  "mekele": "mekelle",
  "dire dawa": "dire_dawa",
  "dire_dawa": "dire_dawa",
  "outside addis": "outside_addis",
  "outside_addis": "outside_addis",
}

function normalizeCity(raw?: string | null): City | null {
  if (!raw) return null
  const key = raw.trim().toLowerCase()
  return CITY_ALIASES[key] ?? null
}

export function useCityMultipliers() {
  const { data: prices } = useMarketPrices()

  const { multipliers, isLive, cityCounts } = useMemo(() => {
    if (!prices || prices.length === 0) {
      return { multipliers: STATIC_MULTIPLIERS, isLive: false, cityCounts: {} as Record<string, number> }
    }

    // Build per-city price baskets (simple average of all material prices in that city)
    const sums: Record<string, { total: number; count: number }> = {}
    for (const row of prices) {
      const city = normalizeCity(row.city)
      if (!city) continue
      if (!sums[city]) sums[city] = { total: 0, count: 0 }
      sums[city].total += Number(row.price) || 0
      sums[city].count += 1
    }

    const avgs: Record<string, number> = {}
    const counts: Record<string, number> = {}
    for (const [city, { total, count }] of Object.entries(sums)) {
      if (count >= 2) {
        avgs[city] = total / count
        counts[city] = count
      }
    }

    const addisAvg = avgs["addis_ababa"]
    if (!addisAvg) {
      return { multipliers: STATIC_MULTIPLIERS, isLive: false, cityCounts: counts }
    }

    const live: Record<City, number> = { ...STATIC_MULTIPLIERS }
    let hasLive = false
    for (const city of Object.keys(STATIC_MULTIPLIERS) as City[]) {
      if (avgs[city] && city !== "addis_ababa") {
        // Clamp to +-15% to avoid outlier distortion from sparse data
        const raw = avgs[city] / addisAvg
        live[city] = Math.min(1.15, Math.max(0.85, Number(raw.toFixed(3))))
        hasLive = true
      }
    }

    return { multipliers: live, isLive: hasLive, cityCounts: counts }
  }, [prices])

  return { multipliers, isLive, cityCounts }
}
