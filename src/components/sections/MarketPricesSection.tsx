import { useState, useMemo } from "react"
import { TrendingUp, TrendingDown, Lock, CircleAlert as AlertCircle, MapPin, Send, ShieldCheck, SearchX } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useLanguage } from "@/lib/i18n"
import { useMarketPrices, type MarketPrice } from "@/hooks/useMarketPrices"
import { useSmartSearch } from "@/hooks/useSmartSearch"
import { SmartSearchBar } from "@/components/search/SmartSearchBar"
import { useInView } from "@/hooks/useInView"
import { navigateTo } from "@/lib/navigation"
import type { PremiumTier } from "@/types/payment"
import { RfqModal } from "./RfqModal"

const priceCategories = [
  { value: "all", label_en: "All", label_am: "ሁሉም" },
  { value: "cement", label_en: "Cement", label_am: "ሲሚንቶ" },
  { value: "steel", label_en: "Steel", label_am: "ብረት" },
  { value: "aggregate", label_en: "Aggregate", label_am: "አጋዘን" },
  { value: "wood", label_en: "Wood", label_am: "እንጨት" },
  { value: "finishing", label_en: "Finishing", label_am: "ማስጌጫ" },
  { value: "electrical", label_en: "Electrical", label_am: "ኤሌክትሪክ" },
]

const FREE_ROWS = 5

const sourceLabels = {
  en: {
    admin_verified: "Admin verified",
    supplier_quoted: "Supplier quoted",
    community_reported: "Community reported",
    telegram_observed: "Telegram observed",
    verified: "Verified",
    expired: "Expired",
    needs_confirmation: "Needs confirmation",
    trust: "Trust",
    source: "Source",
    city: "City",
    vatIncluded: "VAT incl.",
    vatExcluded: "VAT excl.",
    requestQuote: "Request quote",
  },
  am: {
    admin_verified: "በአስተዳዳሪ የተረጋገጠ",
    supplier_quoted: "የአቅራቢ ዋጋ",
    community_reported: "የማህበረሰብ ሪፖርት",
    telegram_observed: "ከቴሌግራም የታየ",
    verified: "የተረጋገጠ",
    expired: "ጊዜው ያለፈ",
    needs_confirmation: "ማረጋገጫ ይፈልጋል",
    trust: "እምነት",
    source: "ምንጭ",
    city: "ከተማ",
    vatIncluded: "VAT ጨምሮ",
    vatExcluded: "VAT ሳይጨምር",
    requestQuote: "ዋጋ ጠይቅ",
  },
}

function getFreshnessVariant(status?: string) {
  if (status === "expired" || status === "needs_confirmation") return "destructive"
  if (status === "supplier_quoted" || status === "verified") return "default"
  return "outline"
}

export function MarketPricesSection({ activePlan = "free" }: { activePlan?: PremiumTier }) {
  const { t, language } = useLanguage()
  const [category, setCategory] = useState("all")
  const { prices, loading: fetchLoading } = useMarketPrices(category)
  const { ref, isInView } = useInView()
  const canReadPremium = activePlan === "premium" || activePlan === "pro"
  const trustText = sourceLabels[language]
  const [selectedRfqPrice, setSelectedRfqPrice] = useState<MarketPrice | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Client-side smart search & filter
  const smartSearch = useSmartSearch<MarketPrice>({
    data: prices,
    initialPageSize: 50,
    defaultSortField: "price",
    searchableFields: ["material_en", "material_am", "specification", "city", "source_name"],
  })

  const searchablePrices = smartSearch.items
  const totalFiltered = smartSearch.totalCount

  // Build filter chips from active filters
  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; value: string; onRemove: () => void }[] = []
    const vals = smartSearch.state.filters

    if (vals.source_type && vals.source_type !== "all") {
      const srcLabel = trustText[vals.source_type as keyof typeof trustText] || vals.source_type
      chips.push({
        key: "source_type",
        label: language === "en" ? "Source" : "ምንጭ",
        value: srcLabel,
        onRemove: () => smartSearch.setFilter("source_type", undefined),
      })
    }
    if (vals.freshness_status && vals.freshness_status !== "all") {
      const freshLabel = trustText[vals.freshness_status as keyof typeof trustText] || vals.freshness_status
      chips.push({
        key: "freshness_status",
        label: language === "en" ? "Status" : "ሁኔታ",
        value: freshLabel,
        onRemove: () => smartSearch.setFilter("freshness_status", undefined),
      })
    }
    if (vals.city) {
      chips.push({
        key: "city",
        label: language === "en" ? "City" : "ከተማ",
        value: vals.city,
        onRemove: () => smartSearch.setFilter("city", undefined),
      })
    }

    return chips
  }, [smartSearch.state.filters, smartSearch.setFilter, language, trustText])

  const loading = fetchLoading || smartSearch.loading

  return (
    <section id="market" ref={ref} className="py-16 sm:py-24 bg-background">
      <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">{t("market.title")}</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">{t("market.subtitle")}</p>
        </div>

        {/* Category Toggle */}
        <ToggleGroup
          type="single"
          value={category}
          onValueChange={(v) => v && setCategory(v)}
          className="flex flex-wrap justify-center gap-2 mb-6"
        >
          {priceCategories.map((cat) => (
            <ToggleGroupItem
              key={cat.value}
              value={cat.value}
              className="text-xs sm:text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {language === "am" ? cat.label_am : cat.label_en}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {/* Smart Search Bar */}
        <div className="mb-6">
          <SmartSearchBar
            query={smartSearch.state.query}
            onQueryChange={smartSearch.setQuery}
            chips={activeFilterChips}
            onToggleFilters={() => setFiltersOpen(!filtersOpen)}
            filtersOpen={filtersOpen}
            totalCount={totalFiltered}
            placeholder={language === "en" ? "Search materials, city, source..." : "ቁሶች፣ ከተማ፣ ምንጭ ይፈልጉ..."}
            compact
          />
        </div>

        {/* Filter Panel (collapsible) */}
        {filtersOpen && (
          <Card className="mb-6 border-border/50">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Source Type Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    {language === "en" ? "Source Type" : "የምንጭ አይነት"}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {["admin_verified", "supplier_quoted", "community_reported", "telegram_observed"].map((src) => {
                      const isActive = smartSearch.state.filters.source_type === src
                      return (
                        <Badge
                          key={src}
                          variant={isActive ? "default" : "outline"}
                          className="cursor-pointer text-xs"
                          onClick={() =>
                            smartSearch.setFilter(
                              "source_type",
                              isActive ? undefined : src,
                            )
                          }
                        >
                          {trustText[src as keyof typeof trustText]}
                        </Badge>
                      )
                    })}
                  </div>
                </div>

                {/* Freshness Status Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    {language === "en" ? "Status" : "ሁኔታ"}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {["verified", "supplier_quoted", "expired", "needs_confirmation"].map((status) => {
                      const isActive = smartSearch.state.filters.freshness_status === status
                      return (
                        <Badge
                          key={status}
                          variant={isActive ? "default" : "outline"}
                          className="cursor-pointer text-xs"
                          onClick={() =>
                            smartSearch.setFilter(
                              "freshness_status",
                              isActive ? undefined : status,
                            )
                          }
                        >
                          {trustText[status as keyof typeof trustText]}
                        </Badge>
                      )
                    })}
                  </div>
                </div>

                {/* City Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    {language === "en" ? "City" : "ከተማ"}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {smartSearch.getFacets("city").slice(0, 8).map((city) => {
                      const isActive = smartSearch.state.filters.city === city
                      return (
                        <Badge
                          key={city}
                          variant={isActive ? "default" : "outline"}
                          className="cursor-pointer text-xs"
                          onClick={() =>
                            smartSearch.setFilter(
                              "city",
                              isActive ? undefined : city,
                            )
                          }
                        >
                          {city}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Clear filters */}
              {Object.keys(smartSearch.state.filters).length > 0 && (
                <div className="mt-4 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => smartSearch.clearFilters(true)} className="text-xs">
                    {language === "en" ? "Clear filters" : "ማጣሪያዎች አጽዳ"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="overflow-hidden border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {language === "en" ? "Addis Ababa Construction Materials" : "አዲስ አበባ የግንባታ ቁሶች"}
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {language === "en" ? "Updated weekly" : "ሳምንታዊ ዝመና"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : searchablePrices.length === 0 ? (
              <div className="p-12 text-center">
                <SearchX className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">
                  {language === "en" ? "No matching prices" : "ምንም የሚዛመድ ዋጋ የለም"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === "en"
                    ? "Try adjusting your search or filters"
                    : "እባክዎ ፍለጋዎን ወይም ማጣሪያዎን ያስተካክሉ"}
                </p>
              </div>
            ) : (
              <div className="relative overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("market.material")}</TableHead>
                      <TableHead>{trustText.trust}</TableHead>
                      <TableHead>{t("market.unit")}</TableHead>
                      <TableHead className="text-right">{t("market.price")}</TableHead>
                      <TableHead className="text-right">{t("market.change")}</TableHead>
                      <TableHead className="text-right">{language === "en" ? "Action" : "እርምጃ"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchablePrices.map((price, i) => {
                      const isLocked = !canReadPremium && i >= FREE_ROWS
                      return (
                        <TableRow
                          key={price.id}
                          className={isLocked ? "relative" : ""}
                        >
                          <TableCell className={isLocked ? "premium-blur" : ""}>
                            <div className="space-y-1">
                              <div className="font-medium">{language === "am" ? price.material_am : price.material_en}</div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {price.city || "Addis Ababa"}
                                </span>
                                {price.specification && <span>{price.specification}</span>}
                                <span>{price.vat_included ? trustText.vatIncluded : trustText.vatExcluded}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className={isLocked ? "premium-blur" : ""}>
                            <div className="space-y-2">
                              <Badge variant={getFreshnessVariant(price.freshness_status)} className="whitespace-nowrap">
                                {trustText[price.freshness_status || "verified"]}
                              </Badge>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <ShieldCheck className="h-3 w-3" />
                                {price.confidence_score ?? 70}%
                              </div>
                              <div className="max-w-36 truncate text-xs text-muted-foreground">
                                {price.source_name || trustText[price.source_type || "admin_verified"]}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className={isLocked ? "premium-blur" : ""}>
                            {price.unit}
                          </TableCell>
                          <TableCell className={`text-right font-mono ${isLocked ? "premium-blur" : ""}`}>
                            {Number(price.price).toLocaleString()}
                          </TableCell>
                          <TableCell className={`text-right ${isLocked ? "premium-blur" : ""}`}>
                            <span className={`inline-flex items-center gap-1 text-sm ${Number(price.change_percent) > 0 ? "text-red-500" : "text-green-500"}`}>
                              {Number(price.change_percent) > 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {Math.abs(Number(price.change_percent))}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              disabled={isLocked}
                              onClick={() => setSelectedRfqPrice(price)}
                            >
                              <Send className="h-3.5 w-3.5" />
                              {trustText.requestQuote}
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>

                {!canReadPremium && prices.length > FREE_ROWS && (
                  <div className="absolute bottom-0 left-0 right-0 h-48 glassmorphism flex flex-col items-center justify-center gap-3 z-10">
                    <Lock className="h-8 w-8 text-accent" />
                    <p className="text-sm font-medium text-foreground text-center max-w-sm">
                      {t("market.unlock")}
                    </p>
                    <Button
                      className="bg-accent text-accent-foreground hover:bg-accent/90"
                      onClick={() => navigateTo("/#premium")}
                    >
                      {t("premium.choosePlan")}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="sm" className="gap-2 text-xs">
            <AlertCircle className="h-3 w-3" />
            {t("market.report")}
          </Button>
        </div>
      </div>
      <RfqModal
        open={Boolean(selectedRfqPrice)}
        onOpenChange={(open) => {
          if (!open) setSelectedRfqPrice(null)
        }}
        marketPrice={selectedRfqPrice}
      />
    </section>
  )
}
