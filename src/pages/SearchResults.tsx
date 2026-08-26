import { useCallback, useEffect, useRef, useState } from "react"
import { useSearch, useAdvancedFilter, type SearchFilters } from "@/hooks/useSearch"
import { useLanguage } from "@/lib/i18n"
import { navigateTo } from "@/lib/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Search, Star, TrendingUp, Loader2 } from "lucide-react"

const PRICE_MIN = 0
const PRICE_MAX = 10000

export function SearchResults() {
  const { language } = useLanguage()
  const { results, loading, error, totalCount, search, clearSearch } = useSearch()
  const { filters, updateFilter, resetFilters } = useAdvancedFilter()
  const [showFilters, setShowFilters] = useState(false)
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 1024
  )
  const initialQuery = useRef(
    (() => {
      if (typeof window === "undefined") return ""
      return new URLSearchParams(window.location.search).get("q") ?? ""
    })()
  )
  const [localQuery, setLocalQuery] = useState(initialQuery.current)
  const priceDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep desktop filter visibility reactive to viewport changes.
  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)")
    const handleChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    setIsDesktop(mediaQuery.matches)
    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  const runSearch = useCallback(
    (overrides?: Partial<SearchFilters>) => {
      search({ ...filters, query: localQuery, ...overrides })
    },
    [search, filters, localQuery]
  )

  // Auto-run the query passed from the navbar (?q=...) on first mount.
  useEffect(() => {
    if (initialQuery.current.trim()) {
      search({ ...filters, query: initialQuery.current })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") runSearch()
  }

  const handleCategoryFilter = (category: string) => {
    const nextCategory = filters.category === category ? undefined : category
    updateFilter({ category: nextCategory })
    search({ ...filters, category: nextCategory, query: localQuery })
  }

  const handlePriceRangeChange = (range: number[]) => {
    const nextRange: [number, number] = [range[0], range[1]]
    updateFilter({ priceRange: nextRange })
    if (priceDebounceRef.current) clearTimeout(priceDebounceRef.current)
    priceDebounceRef.current = setTimeout(() => {
      search({
        ...filters,
        priceRange: nextRange,
        query: localQuery,
      })
    }, 350)
  }

  const handleSortChange = (sortBy: SearchFilters["sortBy"]) => {
    updateFilter({ sortBy })
    search({ ...filters, sortBy, query: localQuery })
  }

  const handleClear = () => {
    setLocalQuery("")
    clearSearch()
    resetFilters()
    if (priceDebounceRef.current) clearTimeout(priceDebounceRef.current)
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState(window.history.state, "", window.location.pathname)
    }
  }

  useEffect(() => {
    return () => {
      if (priceDebounceRef.current) clearTimeout(priceDebounceRef.current)
    }
  }, [])

  const getTypeColor = (type: string) => {
    switch (type) {
      case "blog":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "tip":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "listing":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      case "professional":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      case "price":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      blog: language === "en" ? "Article" : "ጽሁፍ",
      tip: language === "en" ? "Tip" : "ምክር",
      listing: language === "en" ? "Listing" : "ዝርዝር",
      professional: language === "en" ? "Professional" : "ሙያተኛ",
      price: language === "en" ? "Price" : "ዋጋ",
    }
    return labels[type] || type
  }

  const hasActiveQuery = Boolean(localQuery.trim()) || Boolean(filters.category)

  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">
            {language === "en" ? "Search Results" : "የፍለጋ ውጤቶች"}
          </h1>

          {/* Search Bar */}
          <div className="flex gap-2">
            <Input
              aria-label={language === "en" ? "Search" : "ፈልግ"}
              placeholder={language === "en" ? "Search..." : "ይፈልጉ..."}
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button
              onClick={() => runSearch()}
              disabled={loading}
              className="px-6"
              aria-label={language === "en" ? "Run search" : "ፍለጋ አስጀምር"}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Result Count / Error */}
          {error ? (
            <p role="alert" className="text-sm text-destructive mt-2">
              {error}
            </p>
          ) : (
            results.length > 0 && (
              <p role="status" className="text-sm text-muted-foreground mt-2">
                {language === "en"
                  ? `Found ${totalCount} result${totalCount !== 1 ? "s" : ""}`
                  : `${totalCount} ውጤቶች ተገኝተዋል`}
              </p>
            )
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Button
              variant="outline"
              className="w-full lg:hidden mb-4"
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
            >
              {language === "en" ? "Filters" : "ማጣሪያዎች"}
            </Button>

            {(showFilters || isDesktop) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {language === "en" ? "Filters" : "ማጣሪያዎች"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Category Filter */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      {language === "en" ? "Category" : "ምድብ"}
                    </Label>
                    <div className="space-y-2">
                      {categories(language).map((cat) => (
                        <Button
                          key={cat.value}
                          variant={filters.category === cat.value ? "default" : "outline"}
                          className="w-full justify-start text-sm"
                          onClick={() => handleCategoryFilter(cat.value)}
                        >
                          {cat.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Price Range Filter */}
                  <div>
                    <Label htmlFor="search-price-range" className="text-sm font-medium mb-2 block">
                      {language === "en" ? "Price Range" : "የዋጋ ክልል"}
                    </Label>
                    <Slider
                      id="search-price-range"
                      value={filters.priceRange ?? [PRICE_MIN, PRICE_MAX]}
                      min={PRICE_MIN}
                      max={PRICE_MAX}
                      step={100}
                      onValueChange={handlePriceRangeChange}
                      className="mt-2"
                      aria-label={
                        language === "en" ? "Maximum price filter" : "የከፍተኛ ዋጋ ማጣሪያ"
                      }
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>ETB {filters.priceRange?.[0] ?? PRICE_MIN}</span>
                      <span>ETB {filters.priceRange?.[1] ?? PRICE_MAX}</span>
                    </div>
                  </div>

                  {/* Sort Options */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      {language === "en" ? "Sort By" : "ደርድር"}
                    </Label>
                    <div className="space-y-2">
                      {[
                        { value: "relevance", label: language === "en" ? "Relevance" : "ተገቢነት" },
                        { value: "recent", label: language === "en" ? "Recent" : "የቅርብ" },
                        { value: "popular", label: language === "en" ? "Popular" : "ታዋቂ" },
                        { value: "price-low", label: language === "en" ? "Price: Low to High" : "ዋጋ: ዝቅተኛ እስከ ከፍተኛ" },
                        { value: "price-high", label: language === "en" ? "Price: High to Low" : "ዋጋ: ከፍተኛ እስከ ዝቅተኛ" },
                      ].map((opt) => (
                        <Button
                          key={opt.value}
                          variant={(filters.sortBy ?? "relevance") === opt.value ? "default" : "outline"}
                          className="w-full justify-start text-sm"
                          onClick={() => handleSortChange(opt.value as SearchFilters["sortBy"])}
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Reset Filters */}
                  {(filters.category || filters.priceRange || localQuery) && (
                    <Button variant="outline" className="w-full" onClick={handleClear}>
                      {language === "en" ? "Clear All" : "ሁሉንም አጽዳ"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {loading ? (
              <div
                className="flex items-center justify-center h-64"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="sr-only">
                  {language === "en" ? "Searching…" : "በመፈለግ ላይ…"}
                </span>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-4">
                {results.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    type="button"
                    className="block w-full text-left"
                    onClick={() =>
                      result.url
                        ? navigateTo(result.url)
                        : scrollToHomeSection(result.type)
                    }
                  >
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex gap-4">
                          {result.image && (
                            <img
                              src={result.image}
                              alt=""
                              loading="lazy"
                              className="h-24 w-24 object-cover rounded-lg flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h3 className="text-lg font-semibold">{result.title}</h3>
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {result.description}
                                </p>
                              </div>
                              <Badge className={`flex-shrink-0 ${getTypeColor(result.type)}`}>
                                {getTypeLabel(result.type)}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-4 mt-4 text-sm flex-wrap">
                              {result.category && (
                                <span className="text-muted-foreground">{result.category}</span>
                              )}
                              {result.rating != null && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  <span>{result.rating.toFixed(1)}</span>
                                </div>
                              )}
                              {result.price != null && (
                                <div className="flex items-center gap-1 font-semibold">
                                  <TrendingUp className="h-4 w-4" />
                                  <span>ETB {result.price.toLocaleString()}</span>
                                </div>
                              )}
                              {result.premium && (
                                <Badge variant="outline">
                                  {language === "en" ? "Premium" : "ፕሪሚየም"}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">
                    {hasActiveQuery
                      ? language === "en"
                        ? "No Results"
                        : "ምንም ውጤት አልተገኘም"
                      : language === "en"
                        ? "Start Searching"
                        : "መፈለግ ይጀምሩ"}
                  </h3>
                  <p className="text-muted-foreground">
                    {hasActiveQuery
                      ? language === "en"
                        ? "Try adjusting your search terms or filters"
                        : "የፍለጋ ቃላትዎን ወይም ማጣሪያዎችዎን ይቀይሩ"
                      : language === "en"
                        ? "Type a term above or pick a category to explore YeBetWeg"
                        : "ከላይ ቃል ያስገቡ ወይም ምድብ ይምረጡ"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function categories(language: "en" | "am") {
  return [
    { value: "knowledge", label: language === "en" ? "Knowledge Hub" : "የእውቀት ማዕከል" },
    { value: "tips", label: language === "en" ? "Tips" : "ጠቃሚ ምክሮች" },
    { value: "marketplace", label: language === "en" ? "Marketplace" : "ገበያ" },
    { value: "professionals", label: language === "en" ? "Professionals" : "ሙያተኞች" },
    { value: "market", label: language === "en" ? "Market Prices" : "የገበያ ዋጋዎች" },
  ]
}

// Fallback for legacy "#" URLs — routes to the home section anchor.
function scrollToHomeSection(type: string) {
  const anchors: Record<string, string> = {
    blog: "/#knowledge",
    tip: "/#tips",
    listing: "/#marketplace",
    professional: "/#professionals",
    price: "/#market",
  }
  navigateTo(anchors[type] ?? "/")
}
