import { useState, useEffect, useCallback, useRef, useMemo } from "react"

// ── Types ──────────────────────────────────────────────────────────

export interface SortOption {
  field: string
  direction: "asc" | "desc"
}

export interface FilterGroup<T> {
  label: string
  key: keyof T | string
  type: "text" | "select" | "multi-select" | "range" | "toggle"
  placeholder?: string
  options?: { value: string; label: string }[]
  rangeMin?: number
  rangeMax?: number
  rangeStep?: number
}

export interface SmartSearchState<T> {
  query: string
  filters: Record<string, any>
  sort: SortOption
  page: number
  pageSize: number
}

export interface SmartSearchResult<T> {
  /** Filtered & sorted items for current page */
  items: T[]
  /** Total count before pagination */
  totalCount: number
  /** Total pages */
  pageCount: number
  /** Whether a fetch is in progress */
  loading: boolean
  /** Error message if any */
  error: string | null
  /** Current state (useful for reset) */
  state: SmartSearchState<T>
  /** Set the search query (debounced) */
  setQuery: (q: string) => void
  /** Set/clear a single filter value */
  setFilter: (key: string, value: any) => void
  /** Set multiple filters at once */
  setFilters: (filters: Record<string, any>) => void
  /** Clear all filters (optional preserve query) */
  clearFilters: (preserveQuery?: boolean) => void
  /** Change sort field/direction */
  setSort: (field: string, direction?: "asc" | "desc") => void
  /** Toggle sort direction for a field */
  toggleSort: (field: string) => void
  /** Go to a specific page */
  setPage: (page: number) => void
  /** Change page size */
  setPageSize: (size: number) => void
  /** Reset everything */
  reset: () => void
  /** All unique values for a given field (for filter options) */
  getFacets: (field: keyof T) => string[]
}

// ── Debounce hook ──────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// ── Default sort builder ──────────────────────────────────────────

function defaultSort(field: string): SortOption {
  return { field, direction: "desc" }
}

// ── Main hook ──────────────────────────────────────────────────────

export function useSmartSearch<T extends Record<string, any>>({
  data,
  initialPageSize = 10,
  defaultSortField = "created_at",
  debounceMs = 300,
  searchableFields = [],
  clientSide = true,
}: {
  /** Full raw dataset (for client-side filtering) */
  data: T[]
  /** Rows per page */
  initialPageSize?: number
  /** Default sort field */
  defaultSortField?: string
  /** Debounce delay for query */
  debounceMs?: number
  /** Fields to search against for text query */
  searchableFields?: (keyof T)[]
  /** Whether filtering is client-side (true) or just pagination */
  clientSide?: boolean
}): SmartSearchResult<T> {
  const [query, setQueryRaw] = useState("")
  const [filters, setFiltersState] = useState<Record<string, any>>({})
  const [sort, setSortState] = useState<SortOption>(defaultSort(defaultSortField))
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debouncedQuery = useDebounce(query, debounceMs)

  const initialFilters = useRef<Record<string, any>>({})
  const initialSort = useRef<SortOption>(defaultSort(defaultSortField))

  // ── Derived filtered dataset ──────────────────────────────────────

  const filtered = useMemo(() => {
    if (!clientSide) return { items: [], totalCount: 0 }

    setLoading(true)
    setError(null)

    try {
      let result = [...data]

      // Text search
      if (debouncedQuery.trim() && searchableFields.length > 0) {
        const q = debouncedQuery.toLowerCase().trim()
        result = result.filter((item) =>
          searchableFields.some((field) => {
            const val = item[field]
            return val != null && String(val).toLowerCase().includes(q)
          }),
        )
      }

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "" || value === "all") return

        if (Array.isArray(value)) {
          // Multi-select: item must match any value
          if (value.length > 0) {
            result = result.filter((item) => value.includes(String(item[key])))
          }
        } else if (typeof value === "object" && "min" in value && "max" in value) {
          // Range filter
          const { min, max } = value as { min?: number; max?: number }
          result = result.filter((item) => {
            const v = Number(item[key])
            if (isNaN(v)) return false
            if (min !== undefined && v < min) return false
            if (max !== undefined && v > max) return false
            return true
          })
        } else {
          // Single value filter
          result = result.filter((item) => String(item[key]) === String(value))
        }
      })

      // Sort
      result.sort((a, b) => {
        const aVal = a[sort.field]
        const bVal = b[sort.field]
        if (aVal == null && bVal == null) return 0
        if (aVal == null) return 1
        if (bVal == null) return -1

        let cmp = 0
        if (typeof aVal === "number" && typeof bVal === "number") {
          cmp = aVal - bVal
        } else if (aVal instanceof Date && bVal instanceof Date) {
          cmp = aVal.getTime() - bVal.getTime()
        } else {
          cmp = String(aVal).localeCompare(String(bVal))
        }
        return sort.direction === "desc" ? -cmp : cmp
      })

      setLoading(false)
      return { items: result, totalCount: result.length }
    } catch (err: any) {
      setError(err.message || "Filter error")
      setLoading(false)
      return { items: [], totalCount: 0 }
    }
  }, [data, debouncedQuery, filters, sort, searchableFields, clientSide])

  // ── Pagination ────────────────────────────────────────────────────

  const pageCount = Math.max(1, Math.ceil(filtered.totalCount / pageSize))

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.items.slice(start, start + pageSize)
  }, [filtered.items, page, pageSize])

  // Auto-clamp page when filters reduce results
  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount)
    }
  }, [page, pageCount])

  // ── Actions ───────────────────────────────────────────────────────

  const setQuery = useCallback((q: string) => {
    setQueryRaw(q)
    setPage(1)
  }, [])

  const setFilter = useCallback((key: string, value: any) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }, [])

  const setFilters = useCallback((newFilters: Record<string, any>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }))
    setPage(1)
  }, [])

  const clearFilters = useCallback((preserveQuery = false) => {
    setFiltersState({})
    if (!preserveQuery) setQueryRaw("")
    setPage(1)
  }, [])

  const setSort = useCallback((field: string, direction?: "asc" | "desc") => {
    setSortState((prev) => ({
      field,
      direction: direction ?? prev.direction,
    }))
    setPage(1)
  }, [])

  const toggleSort = useCallback((field: string) => {
    setSortState((prev) => ({
      field,
      direction: prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }))
    setPage(1)
  }, [])

  const reset = useCallback(() => {
    setQueryRaw("")
    setFiltersState({})
    setSortState(initialSort.current)
    setPage(1)
  }, [])

  const getFacets = useCallback(
    (field: keyof T): string[] => {
      const values = new Set<string>()
      data.forEach((item) => {
        const v = item[field]
        if (v != null && v !== "") values.add(String(v))
      })
      return Array.from(values).sort()
    },
    [data],
  )

  // ── Return ────────────────────────────────────────────────────────

  return {
    items: paginatedItems,
    totalCount: filtered.totalCount,
    pageCount,
    loading,
    error,
    state: { query, filters, sort, page, pageSize },
    setQuery,
    setFilter,
    setFilters,
    clearFilters,
    setSort,
    toggleSort,
    setPage,
    setPageSize,
    reset,
    getFacets,
  }
}

