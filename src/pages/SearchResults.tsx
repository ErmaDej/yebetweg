import { useState } from "react"
import { useSearch, useAdvancedFilter, type SearchFilters } from "@/hooks/useSearch"
import { useLanguage } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Search, Star, TrendingUp } from "lucide-react"
import { Loader2 } from "lucide-react"

export function SearchResults() {
  const { language } = useLanguage()
  const { results, loading, totalCount, search, clearSearch } = useSearch()
  const { filters, updateFilter, resetFilters } = useAdvancedFilter()
  const [showFilters, setShowFilters] = useState(false)
  const [localQuery, setLocalQuery] = useState("")

  const categories = [
    { value: "knowledge", label: language === "en" ? "Knowledge Hub" : "ቦታ ሕዋሳ" },
    { value: "tips", label: language === "en" ? "Tips" : "ጠቃሚ ምክር" },
    { value: "marketplace", label: language === "en" ? "Marketplace" : "ገበያ" },
    { value: "professionals", label: language === "en" ? "Professionals" : "ሙያተኞች" },
    { value: "market", label: language === "en" ? "Market Prices" : "ገበያ ዋጋ" },
  ]

  const handleSearch = () => {
    if (localQuery.trim()) {
      search({ ...filters, query: localQuery })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const handleCategoryFilter = (category: string) => {
    updateFilter({ category: filters.category === category ? undefined : category })
    search({ ...filters, category: filters.category === category ? undefined : category, query: localQuery })
  }

  const handlePriceRangeChange = (range: number[]) => {
    updateFilter({ priceRange: [range[0], range[1]] })
  }

  const handleSortChange = (sortBy: SearchFilters["sortBy"]) => {
    updateFilter({ sortBy })
    search({ ...filters, sortBy, query: localQuery })
  }

  const handleClear = () => {
    setLocalQuery("")
    clearSearch()
    resetFilters()
  }

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

  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">
            {language === "en" ? "Search Results" : "ፍለጋ ውጤቶች"}
          </h1>

          {/* Search Bar */}
          <div className="flex gap-2">
            <Input
              placeholder={language === "en" ? "Search..." : "ይፈልጉ..."}
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading} className="px-6">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Result Count */}
          {results.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              {language === "en"
                ? `Found ${totalCount} result${totalCount !== 1 ? "s" : ""}`
                : `${totalCount} ውጤት ተገኝ`}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Button
              variant="outline"
              className="w-full lg:hidden mb-4"
              onClick={() => setShowFilters(!showFilters)}
            >
              {language === "en" ? "Filters" : "ማጣሪያዎች"}
            </Button>

            {(showFilters || window.innerWidth >= 1024) && (
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
                      {categories.map((cat) => (
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
                    <Label className="text-sm font-medium mb-2 block">
                      {language === "en" ? "Price Range" : "ዋጋ ክልል"}
                    </Label>
                    <Slider
                      defaultValue={[0, 10000]}
                      min={0}
                      max={10000}
                      step={100}
                      onValueChange={handlePriceRangeChange}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>ETB {filters.priceRange?.[0] || 0}</span>
                      <span>ETB {filters.priceRange?.[1] || 10000}</span>
                    </div>
                  </div>

                  {/* Sort Options */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      {language === "en" ? "Sort By" : "አሳ ደርድር"}
                    </Label>
                    <div className="space-y-2">
                      {[
                        { value: "relevance", label: language === "en" ? "Relevance" : "ተገቢነት" },
                        { value: "recent", label: language === "en" ? "Recent" : "አሉታዊ" },
                        { value: "popular", label: language === "en" ? "Popular" : "ታዋቂ" },
                        { value: "price-low", label: language === "en" ? "Price: Low to High" : "ዋጋ: ዝቅተኛ ወደ ከፍተኛ" },
                        { value: "price-high", label: language === "en" ? "Price: High to Low" : "ዋጋ: ከፍተኛ ወደ ዝቅተኛ" },
                      ].map((opt) => (
                        <Button
                          key={opt.value}
                          variant={filters.sortBy === opt.value ? "default" : "outline"}
                          className="w-full justify-start text-sm"
                          onClick={() => handleSortChange(opt.value as any)}
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Reset Filters */}
                  {(filters.category || filters.priceRange) && (
                    <Button variant="outline" className="w-full" onClick={handleClear}>
                      {language === "en" ? "Clear All" : "ሁሉንም ሰርዝ"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-4">
                {results.map((result) => (
                  <a key={`${result.type}-${result.id}`} href={result.url}>
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex gap-4">
                          {result.image && (
                            <img
                              src={result.image}
                              alt={result.title}
                              className="h-24 w-24 object-cover rounded-lg flex-shrink-0"
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="text-lg font-semibold">{result.title}</h3>
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {result.description}
                                </p>
                              </div>
                              <Badge className={getTypeColor(result.type)}>
                                {getTypeLabel(result.type)}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-4 mt-4 text-sm">
                              {result.category && (
                                <span className="text-muted-foreground">{result.category}</span>
                              )}
                              {result.rating && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  <span>{result.rating.toFixed(1)}</span>
                                </div>
                              )}
                              {result.price && (
                                <div className="flex items-center gap-1 font-semibold">
                                  <TrendingUp className="h-4 w-4" />
                                  <span>ETB {result.price}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">
                    {language === "en" ? "No Results" : "ምንም ውጤት የለም"}
                  </h3>
                  <p className="text-muted-foreground">
                    {language === "en"
                      ? "Try adjusting your search terms or filters"
                      : "የፍለጋ ቃላትዎን ወይም ማጣሪያዎን ይመለሱ"}
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
