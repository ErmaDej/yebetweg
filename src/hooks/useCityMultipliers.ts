import { useMemo } from "react"
import { useMarketPrices } from "./useMarketPrices"

export type City =
  | "addis_ababa"
  | "adama"
  | "hawassa"
  | "bahir_dar"
  | "mekelle"
  | "dire_dawa"
  | "outside_addis"

export type MaterialClass = "cement" | "steel" | "aggregate" | "finishing"

// Weighted importance of each material class in a typical residential build.
// Mirrors the BOQ cost split (structure ≈ 32% heavily cement/steel,
// finishing ≈ paint/HCB/electrical), so the basket is not a naive average.
const CLASS_WEIGHTS: Record<MaterialClass, number> = {
  cement: 0.35,
  steel: 0.3,
  aggregate: 0.15,
  finishing: 0.2,
}

const CLASS_BY_CATEGORY: Record<string, MaterialClass> = {
  cement: "cement",
  steel: "steel",
  rebar: "steel",
  aggregate: "aggregate",
  sand: "aggregate",
  finishing: "finishing",
  electrical: "finishing",
  plumbing: "finishing",
}

function classify(category: string): MaterialClass {
  return CLASS_BY_CATEGORY[category.toLowerCase()] ?? "finishing"
}

// Static fallback — keeps BOQ working offline / until live data exists.
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
  addis_ababa: "addis_ababa",
  adama: "adama",
  nazret: "adama",
  hawassa: "hawassa",
  awassa: "hawassa",
  "bahir dar": "bahir_dar",
  bahir_dar: "bahir_dar",
  mekelle: "mekelle",
  mekele: "mekelle",
  "dire dawa": "dire_dawa",
  dire_dawa: "dire_dawa",
  "outside addis": "outside_addis",
  outside_addis: "outside_addis",
}

export function normalizeCityKey(raw?: string | null): City | null {
  if (!raw) return null
  return CITY_ALIASES[raw.trim().toLowerCase()] ?? null
}

// Materials most representative of a build's cost basket, for the
// per-material replacement step.
const PRIORITY_MATERIALS = [
  "cement",
  "derba",
  "mugher",
  "rebar",
  "deformed bar",
  "sand",
  "aggregate",
  "concrete hollow",
  "hcb",
  "paint",
  "eucalyptus",
]

function isPriorityMaterial(materialEn: string): boolean {
  const lower = materialEn.toLowerCase()
  return PRIORITY_MATERIALS.some((m) => lower.includes(m))
}

interface MemoizedPrice {
  price: number
  updatedAt: number
}

export type CityPricingData = {
  multipliers: Record<City, number>
  isLive: boolean
  cityCounts: Record<string, number>
  basketSources: Record<string, number>
  cityMaterialPrices: Record<string, Record<string, number>>
  addisMaterialPrices: Record<string, number>
}

/**
 * Multi-city BOQ pricing sourced from market_prices:
 *
 * 1. Build per-city, class-weighted price baskets (cement/steel/aggregate/
 *    finishing weighted by their share of build cost).
 * 2. Compute each city's ratio to the Addis Ababa basket → base multiplier.
 * 3. Where ≥2 priority materials (cement, rebar, sand…) exist in both the
 *    city and Addis, blend the ratio toward the fresh per-material cross-city
 *    ratio (60% material / 40% basket) — fresh quotes outweigh stale ones.
 *
 * Conservative clamps keep a single outlier quote from tilting an estimate.
 */
export function useCityMultipliers(): CityPricingData {
  const { data: prices } = useMarketPrices()

  return useMemo<CityPricingData>(() => {
    const empty: CityPricingData = {
      multipliers: STATIC_MULTIPLIERS,
      isLive: false,
      cityCounts: {},
      basketSources: {},
      cityMaterialPrices: {},
      addisMaterialPrices: {},
    }
    if (!prices || prices.length === 0) return empty

    // ---- 1) per-city, per-class buckets ------------------------------------
    const cityClass: Record<string, Record<MaterialClass, { total: number; count: number }>> = {}
    const cityCounts: Record<string, number> = {}

    for (const row of prices) {
      const city = normalizeCityKey(row.city)
      if (!city) continue
      const cls = classify(String(row.category ?? ""))
      if (!cityClass[city]) {
        cityClass[city] = {
          cement: { total: 0, count: 0 },
          steel: { total: 0, count: 0 },
          aggregate: { total: 0, count: 0 },
          finishing: { total: 0, count: 0 },
        }
        cityCounts[city] = 0
      }
      const bucket = cityClass[city][cls]
      bucket.total += Number(row.price) || 0
      bucket.count += 1
      cityCounts[city] += 1
    }

    // basket = Σ(class avg × weight) / Σ(weights present)
    function basket(city: City): { value: number; sources: number } | null {
      const classes = cityClass[city]
      if (!classes) return null
      let weightedSum = 0
      let weightTotal = 0
      let sources = 0
      for (const cls of Object.keys(CLASS_WEIGHTS) as MaterialClass[]) {
        const b = classes[cls]
        if (b.count >= 1) {
          weightedSum += (b.total / b.count) * CLASS_WEIGHTS[cls]
          weightTotal += CLASS_WEIGHTS[cls]
          sources += b.count
        }
      }
      if (weightTotal === 0) return null
      return { value: weightedSum / weightTotal, sources }
    }

    const addis = basket("addis_ababa")
    if (!addis || addis.value <= 0) {
      return { ...empty, cityCounts }
    }

    const multipliers: Record<City, number> = { ...STATIC_MULTIPLIERS }
    const basketSources: Record<string, number> = {}
    const cityMaterialPrices: Record<string, Record<string, number>> = {}
    const addisMaterialPrices: Record<string, number> = {}
    let hasLive = false

    // Most recently verified price per (city, material) for priority materials
    const byCityMaterial = new Map<string, Map<string, MemoizedPrice>>()
    const push = (city: City, material: string, row: (typeof prices)[number]) => {
      let perMaterial = byCityMaterial.get(city)
      if (!perMaterial) {
        perMaterial = new Map()
        byCityMaterial.set(city, perMaterial)
      }
      const key = material.trim().toLowerCase()
      const t = Date.parse(String(row.last_verified_at || row.updated_at || "")) || 0
      const prev = perMaterial.get(key)
      if (!prev || t >= prev.updatedAt) {
        perMaterial.set(key, { price: Number(row.price) || 0, updatedAt: t })
      }
    }

    // ---- 2) whole-basket ratios per city ------------------------------------
    const basketRatios: Partial<Record<City, number>> = {}
    for (const city of Object.keys(STATIC_MULTIPLIERS) as City[]) {
      if (city === "addis_ababa") continue
      const b = basket(city)
      if (!b) continue
      basketRatios[city] = b.value / addis.value
      basketSources[city] = b.sources
      hasLive = true
    }

    // ---- 3) per-material ratio replacement ----------------------------------
    // Collect priority-material prices per city (fresh = latest verified)
    for (const row of prices) {
      const city = normalizeCityKey(row.city)
      if (!city || !isPriorityMaterial(String(row.material_en ?? ""))) continue
      push(city, String(row.material_en), row)
    }

    const addisMap = byCityMaterial.get("addis_ababa")
    for (const [key, memo] of addisMap ?? []) {
      if (memo.price > 0) addisMaterialPrices[key] = memo.price
    }
    if (addisMap && addisMap.size > 0) {
      cityMaterialPrices["addis_ababa"] = Object.fromEntries(
        [...addisMap.entries()].filter(([, m]) => m.price > 0).map(([k, m]) => [k, m.price]),
      )
    }

    for (const city of Object.keys(basketRatios) as City[]) {
      let matchSum = 0
      let matchCount = 0
      for (const [key, memo] of byCityMaterial.get(city) ?? []) {
        const addisMemo = addisMap?.get(key)
        if (memo.price > 0 && addisMemo && addisMemo.price > 0) {
          matchSum += memo.price / addisMemo.price
          matchCount += 1
        }
      }

      let ratio = basketRatios[city] as number
      const materialRatio = matchCount >= 2 ? matchSum / matchCount : null
      if (materialRatio != null) {
        // 60% per-material (fresh), 40% whole-basket (stable)
        ratio = 0.6 * materialRatio + 0.4 * (basketRatios[city] as number)
      }

      // Clamp: ±20% around Addis for live-derived multipliers
      multipliers[city] = Math.min(1.2, Math.max(0.8, Number(ratio.toFixed(3))))
    }

    // Per-material price maps for non-Addis cities (for the BOQ breakdown)
    for (const city of Object.keys(basketRatios) as City[]) {
      const perMaterial = byCityMaterial.get(city)
      if (!perMaterial) continue
      const entries = [...perMaterial.entries()].filter(([k, m]) => m.price > 0 && addisMaterialPrices[k])
      if (entries.length > 0) {
        cityMaterialPrices[city] = Object.fromEntries(entries.map(([k, m]) => [k, m.price]))
      }
    }

    return { multipliers, isLive: hasLive, cityCounts, basketSources, cityMaterialPrices, addisMaterialPrices }
  }, [prices])
}
