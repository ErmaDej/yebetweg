import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"

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
  url?: string
  created_at?: string
}

export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  const search = useCallback(async (filters: SearchFilters, limit: number = 20) => {
    if (!filters.query.trim() && !filters.category) {
      setResults([])
      return
    }

    try {
      setLoading(true)
      setError(null)
      const searchQuery = filters.query.toLowerCase().trim()
      const allResults: SearchResult[] = []

      // Search blogs
      if (!filters.category || filters.category === "knowledge") {
        const { data: blogs } = await supabase
          .from("blogs")
          .select("id, title, excerpt, image, category, created_at")
          .or(`title.ilike.%${searchQuery}%,excerpt.ilike.%${searchQuery}%`)
          .limit(limit)

        if (blogs) {
          allResults.push(
            ...blogs.map((b: any) => ({
              id: b.id,
              type: "blog" as const,
              title: b.title,
              description: b.excerpt,
              image: b.image,
              category: b.category,
              created_at: b.created_at,
              url: `#knowledge`,
            }))
          )
        }
      }

      // Search tips
      if (!filters.category || filters.category === "tips") {
        const { data: tips } = await supabase
          .from("tips")
          .select("id, title, content, category, is_premium")
          .or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
          .limit(limit)

        if (tips) {
          allResults.push(
            ...tips.map((t: any) => ({
              id: t.id,
              type: "tip" as const,
              title: t.title,
              description: t.content,
              category: t.category,
              premium: t.is_premium,
              url: `#tips`,
            }))
          )
        }
      }

      // Search listings
      if (!filters.category || filters.category === "marketplace") {
        const { data: listings } = await supabase
          .from("listings")
          .select("id, title, description, images, category, price, created_at")
          .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
          .limit(limit)

        if (listings) {
          allResults.push(
            ...listings.map((l: any) => ({
              id: l.id,
              type: "listing" as const,
              title: l.title,
              description: l.description,
              image: l.images?.[0],
              category: l.category,
              price: l.price,
              created_at: l.created_at,
              url: `#marketplace`,
            }))
          )
        }
      }

      // Search professionals
      if (!filters.category || filters.category === "professionals") {
        const { data: professionals } = await supabase
          .from("professionals")
          .select("id, name, bio, specialty, rating, image, created_at")
          .or(`name.ilike.%${searchQuery}%,specialty.ilike.%${searchQuery}%,bio.ilike.%${searchQuery}%`)
          .limit(limit)

        if (professionals) {
          allResults.push(
            ...professionals.map((p: any) => ({
              id: p.id,
              type: "professional" as const,
              title: p.name,
              description: p.bio,
              image: p.image,
              category: p.specialty,
              rating: p.rating,
              created_at: p.created_at,
              url: `#professionals`,
            }))
          )
        }
      }

      // Search market prices
      if (!filters.category || filters.category === "market") {
        const { data: prices } = await supabase
          .from("market_prices")
          .select("id, material, category, price, currency, updated_at")
          .or(`material.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`)
          .limit(limit)

        if (prices) {
          allResults.push(
            ...prices.map((p: any) => ({
              id: p.id,
              type: "price" as const,
              title: p.material,
              description: `${p.price} ${p.currency} per unit`,
              category: p.category,
              price: p.price,
              created_at: p.updated_at,
              url: `#market`,
            }))
          )
        }
      }

      // Apply price filter if provided
      let filteredResults = allResults
      if (filters.priceRange) {
        filteredResults = filteredResults.filter(
          (r) => r.price && r.price >= filters.priceRange![0] && r.price <= filters.priceRange![1]
        )
      }

      // Apply sorting
      if (filters.sortBy) {
        switch (filters.sortBy) {
          case "recent":
            filteredResults.sort((a, b) =>
              new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
            )
            break
          case "price-low":
            filteredResults.sort((a, b) => (a.price || 0) - (b.price || 0))
            break
          case "price-high":
            filteredResults.sort((a, b) => (b.price || 0) - (a.price || 0))
            break
          case "popular":
            filteredResults.sort((a, b) => (b.rating || 0) - (a.rating || 0))
            break
        }
      }

      setResults(filteredResults.slice(0, limit))
      setTotalCount(filteredResults.length)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const clearSearch = useCallback(() => {
    setResults([])
    setError(null)
    setTotalCount(0)
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
