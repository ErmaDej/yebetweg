import { useState, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useLanguage, type Language } from "@/lib/i18n"
import {
  PER_TABLE_SEARCH_LIMIT,
  sanitizeSearchTerm,
  orIlike,
  truncateWords,
} from "@/lib/searchUtils"

export interface SearchFilters {
  query: string
  category?: string
  priceRange?: [number, number]
  premium?: boolean
  sortBy?: "relevance" | "recent" | "popular" | "price-low" | "price-high"
}

export interface SearchResult {
  id: string
  type: "blog" | "tip" | "listing" | "professional" | "price"
  title: string
  description: string
  image?: string
  category?: string
  rating?: number
  price?: number
  premium?: boolean
  url?: string
  created_at?: string
}

interface BlogRow {
  id: string
  title_en: string | null
  title_am: string | null
  content: string | null
  category: string | null
  image_url: string | null
  created_at: string | null
}

interface TipRow {
  id: string
  title_en: string | null
  title_am: string | null
  content: string | null
  category: string | null
  is_premium: boolean | null
}

interface ListingRow {
  id: string
  title_en: string | null
  title_am: string | null
  description: string | null
  images: string[] | null
  category: string | null
  price: number | null
  location: string | null
  created_at: string | null
}

interface ProfessionalRow {
  id: string
  name: string | null
  specialty: string | null
  rating: number | null
  experience_years: number | null
  location: string | null
  portfolio_images: string[] | null
  created_at: string | null
}

interface MarketPriceRow {
  id: string
  material_en: string | null
  material_am: string | null
  category: string | null
  price: number | null
  unit: string | null
  city: string | null
  access_level: string | null
  updated_at: string | null
}

function pick(lang: Language, en: string | null, am: string | null): string {
  return (lang === "am" ? am || en : en || am) || ""
}

async function searchBlogs(term: string, language: Language): Promise<SearchResult[]> {
  let query = supabase
    .from("blogs")
    .select("id, title_en, title_am, content, category, image_url, created_at")
    .limit(PER_TABLE_SEARCH_LIMIT)
  if (term) query = query.or(orIlike(["title_en", "title_am"], term))
  const { data, error } = await query
  if (error) throw error
  return (data as BlogRow[]).map((b) => ({
    id: b.id,
    type: "blog" as const,
    title: pick(language, b.title_en, b.title_am),
    description: truncateWords(b.content ?? "", 160),
    image: b.image_url ?? undefined,
    category: b.category ?? undefined,
    created_at: b.created_at ?? undefined,
    url: "/#knowledge",
  }))
}

async function searchTips(term: string, language: Language): Promise<SearchResult[]> {
  let query = supabase
    .from("tips")
    .select("id, title_en, title_am, content, category, is_premium")
    .limit(PER_TABLE_SEARCH_LIMIT)
  if (term) query = query.or(orIlike(["title_en", "title_am"], term))
  const { data, error } = await query
  if (error) throw error
  return (data as TipRow[]).map((t) => ({
    id: t.id,
    type: "tip" as const,
    title: pick(language, t.title_en, t.title_am),
    description: truncateWords(t.content ?? "", 160),
    category: t.category ?? undefined,
    premium: t.is_premium ?? false,
    url: "/#tips",
  }))
}

async function searchListings(term: string, language: Language): Promise<SearchResult[]> {
  let query = supabase
    .from("listings")
    .select("id, title_en, title_am, description, images, category, price, location, created_at")
    .limit(PER_TABLE_SEARCH_LIMIT)
  if (term) query = query.or(orIlike(["title_en", "title_am", "description", "location"], term))
  const { data, error } = await query
  if (error) throw error
  return (data as ListingRow[]).map((l) => ({
    id: l.id,
    type: "listing" as const,
    title: pick(language, l.title_en, l.title_am),
    description: truncateWords(l.description ?? "", 160),
    image: l.images?.[0] ?? undefined,
    category: l.category ?? undefined,
    price: l.price ?? undefined,
    created_at: l.created_at ?? undefined,
    url: "/#marketplace",
  }))
}

async function searchProfessionals(term: string, language: Language): Promise<SearchResult[]> {
  let query = supabase
    .from("professionals")
    .select(
      "id, name, specialty, rating, experience_years, location, portfolio_images, created_at"
    )
    .order("rating", { ascending: false })
    .limit(PER_TABLE_SEARCH_LIMIT)
  if (term) query = query.or(orIlike(["name", "specialty", "location"], term))
  const { data, error } = await query
  if (error) throw error
  return (data as ProfessionalRow[]).map((p) => {
    const parts =
      language === "am"
        ? [p.specialty, p.experience_years != null ? `${p.experience_years} ዓመት ልምድ` : null, p.location]
        : [
            p.specialty,
            p.experience_years != null ? `${p.experience_years} yrs experience` : null,
            p.location,
          ]
    return {
      id: p.id,
      type: "professional" as const,
      title: p.name || "",
      description: parts.filter(Boolean).join(" · "),
      image: p.portfolio_images?.[0] ?? undefined,
      category: p.specialty ?? undefined,
      rating: p.rating ?? undefined,
      created_at: p.created_at ?? undefined,
      url: "/#professionals",
    }
  })
}

async function searchMarketPrices(term: string, language: Language): Promise<SearchResult[]> {
  let query = supabase
    .from("market_prices")
    .select(
      "id, material_en, material_am, category, price, unit, city, access_level, updated_at"
    )
    .order("updated_at", { ascending: false })
    .limit(PER_TABLE_SEARCH_LIMIT)
  if (term) query = query.or(orIlike(["material_en", "material_am", "category"], term))
  const { data, error } = await query
  if (error) throw error
  return (data as MarketPriceRow[]).map((p) => ({
    id: p.id,
    type: "price" as const,
    title: pick(language, p.material_en, p.material_am),
    description: `${p.price ?? "—"} ETB / ${p.unit ?? ""}${p.city ? ` · ${p.city}` : ""}`,
    category: p.category ?? undefined,
    price: p.price ?? undefined,
    premium: p.access_level === "premium",
    created_at: p.updated_at ?? undefined,
    url: "/#market",
  }))
}

export function useSearch() {
  const { language } = useLanguage()
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const requestRef = useRef(0)

  const search = useCallback(
    async (filters: SearchFilters, limit: number = 20) => {
      const requestId = ++requestRef.current
      const term = sanitizeSearchTerm(filters.query)
      const hasCategory = Boolean(filters.category)

      if (!term && !hasCategory) {
        setResults([])
        setError(null)
        setTotalCount(0)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      const jobs: Array<Promise<SearchResult[]>> = []
      if (!hasCategory || filters.category === "knowledge") jobs.push(searchBlogs(term, language))
      if (!hasCategory || filters.category === "tips") jobs.push(searchTips(term, language))
      if (!hasCategory || filters.category === "marketplace") jobs.push(searchListings(term, language))
      if (!hasCategory || filters.category === "professionals") jobs.push(searchProfessionals(term, language))
      if (!hasCategory || filters.category === "market") jobs.push(searchMarketPrices(term, language))

      try {
        // All sources run in parallel; one failing source must not kill the rest.
        const settled = await Promise.allSettled(jobs)
        if (requestId !== requestRef.current) return

        const allResults: SearchResult[] = []
        let failedCount = 0
        for (const settledJob of settled) {
          if (settledJob.status === "fulfilled") allResults.push(...settledJob.value)
          else {
            failedCount++
            console.error("[useSearch] source failed:", settledJob.reason)
          }
        }

        let filteredResults = allResults
        if (filters.priceRange) {
          filteredResults = filteredResults.filter(
            (r) =>
              r.price != null &&
              r.price >= filters.priceRange![0] &&
              r.price <= filters.priceRange![1]
          )
        }

        switch (filters.sortBy) {
          case "recent":
            filteredResults = [...filteredResults].sort(
              (a, b) =>
                new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
            )
            break
          case "price-low":
            filteredResults = [...filteredResults].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
            break
          case "price-high":
            filteredResults = [...filteredResults].sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity))
            break
          case "popular":
            filteredResults = [...filteredResults].sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))
            break
          case "relevance":
          default:
            break
        }

        if (failedCount > 0 && filteredResults.length === 0) {
          setError(
            language === "am"
              ? "ፍለጋው አልተሳካም። እባክዎ እንደገና ይሞክሩ።"
              : "Search failed. Please try again."
          )
          setResults([])
          setTotalCount(0)
        } else {
          setResults(filteredResults.slice(0, limit))
          setTotalCount(filteredResults.length)
        }
      } catch (err: unknown) {
        if (requestId !== requestRef.current) return
        console.error("[useSearch] unexpected failure:", err)
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (requestId === requestRef.current) setLoading(false)
      }
    },
    [language]
  )

  const clearSearch = useCallback(() => {
    requestRef.current++ // invalidate any in-flight search
    setResults([])
    setError(null)
    setTotalCount(0)
    setLoading(false)
  }, [])

  return { results, loading, error, totalCount, search, clearSearch }
}

export function useAdvancedFilter() {
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    category: undefined,
    priceRange: undefined,
    sortBy: "relevance",
  })

  const updateFilter = useCallback((updates: Partial<SearchFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({
      query: "",
      category: undefined,
      priceRange: undefined,
      sortBy: "relevance",
    })
  }, [])

  return { filters, updateFilter, resetFilters }
}
