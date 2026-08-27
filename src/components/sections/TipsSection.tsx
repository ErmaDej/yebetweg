import { useEffect, useMemo, useState } from "react"
import { Shield, FlaskConical, Clock, ArrowDownToLine, Paintbrush, Droplets, Zap, Wrench, Palette, HardHat, Lock, SearchX } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useLanguage } from "@/lib/i18n"
import { useTips, useTipCategories } from "@/hooks/useTips"
import { SmartSearchBar } from "@/components/search/SmartSearchBar"
import { useInView } from "@/hooks/useInView"
import { navigateTo } from "@/lib/navigation"
import type { PremiumTier } from "@/types/payment"

const TIPS_PER_PAGE = 9

function getVisiblePages(currentPage: number, pageCount: number) {
  const start = Math.max(1, Math.min(currentPage - 1, pageCount - 2))
  return Array.from({ length: Math.min(3, pageCount) }, (_, index) => start + index)
}

const iconMap: Record<string, any> = {
  shield: Shield,
  "flask-conical": FlaskConical,
  clock: Clock,
  "arrow-down-to-line": ArrowDownToLine,
  paintbrush: Paintbrush,
  droplets: Droplets,
  zap: Zap,
  wrench: Wrench,
  palette: Palette,
  "hard-hat": HardHat,
}

function TipCard({ tip, index, canReadPremium }: { tip: any; index: number; canReadPremium: boolean }) {
  const { language, t } = useLanguage()
  const title = language === "am" ? tip.title_am : tip.title_en
  const IconComponent = iconMap[tip.icon] || Shield
  const isLocked = tip.is_premium && !canReadPremium

  return (
    <Card
      className={`group relative overflow-hidden border-border/50 hover:border-accent/50 transition-all duration-300 hover:shadow-lg ${tip.is_premium ? "" : ""}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {isLocked && (
        <div className="absolute inset-0 z-10 glassmorphism flex flex-col items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20">
            <Lock className="h-6 w-6 text-accent" />
          </div>
          <p className="text-sm font-semibold text-foreground">{t("tips.unlockPremium")}</p>
          <Button
            size="sm"
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => navigateTo("/#premium")}
          >
            {t("premium.choosePlan")}
          </Button>
        </div>
      )}
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <IconComponent className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm text-foreground line-clamp-1">{title}</h3>
              <Badge variant={tip.is_premium ? "default" : "secondary"} className="shrink-0 text-[10px]">
                {tip.is_premium ? t("tips.premium") : t("tips.free")}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-3">{tip.content}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TipSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function TipsSection({ activePlan = "free" }: { activePlan?: PremiumTier }) {
  const { t, language } = useLanguage()
  const { ref, isInView } = useInView()
  const canReadPremium = activePlan === "premium" || activePlan === "pro"

  // Server-driven filter state
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [premiumFilter, setPremiumFilter] = useState<boolean | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const [serverQuery, setServerQuery] = useState("")

  // Debounce the raw input before triggering server-side search
  useEffect(() => {
    const timer = setTimeout(() => setServerQuery(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const isSearching = Boolean(serverQuery.trim())
  const tipCategories = useTipCategories()

  // While searching the hook returns the full match set (page pinned to 1);
  // otherwise it server-paginates.
  const { data: tipsData, isLoading: loading } = useTips({
    category: selectedCategory,
    page: isSearching ? 1 : page,
    pageSize: TIPS_PER_PAGE,
    searchQuery: serverQuery,
    isPremium: premiumFilter,
  })

  const tips = tipsData?.data ?? []
  const total = tipsData?.total ?? 0

  const visibleTips = isSearching
    ? tips.slice((page - 1) * TIPS_PER_PAGE, page * TIPS_PER_PAGE)
    : tips
  const totalFiltered = isSearching ? tips.length : total
  const pageCount = Math.max(1, Math.ceil(totalFiltered / TIPS_PER_PAGE))
  const visiblePages = useMemo(() => getVisiblePages(page, pageCount), [page, pageCount])

  // Reset pagination whenever any filter changes
  useEffect(() => {
    setPage(1)
  }, [selectedCategory, premiumFilter, serverQuery])

  const goToPage = (nextPage: number) => {
    setPage(Math.min(Math.max(nextPage, 1), pageCount))
    document.getElementById("tips")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const toggleCategory = (cat: string) =>
    setSelectedCategory((prev) => (prev === cat ? "all" : cat))

  const togglePremium = (value: boolean) =>
    setPremiumFilter((prev) => (prev === value ? undefined : value))

  const tickerItems = [
    { text: language === "en" ? "Derba Cement: 8,200 ETB/Qtl" : "ዲርባ ሲሚንቶ: 8,200 ብር/ቆል", change: "+3.5%" },
    { text: language === "en" ? "Grade 60 Rebar: 14,500 ETB/Qtl" : "ግራድ 60 ራብር: 14,500 ብር/ቆል", change: "+7.3%" },
    { text: language === "en" ? "Awash Sand: 4,500 ETB/m³" : "አዋሽ አሸዋ: 4,500 ብር/ሜ³", change: "-2.3%" },
    { text: language === "en" ? "Mugher Cement: 7,800 ETB/Qtl" : "ሙገር ሲሚንቶ: 7,800 ብር/ቆል", change: "+5.2%" },
    { text: language === "en" ? "Eucalyptus 4x4: 850 ETB/pc" : "ዩካሊፕተስ 4x4: 850 ብር/ቁራፊ", change: "+8.5%" },
  ]

  return (
    <section id="tips" ref={ref} className="py-16 sm:py-24 bg-muted/30">
      <div className="w-full overflow-hidden bg-primary text-primary-foreground py-2 mb-10">
        <div className="animate-marquee whitespace-nowrap flex items-center gap-8">
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-2 text-sm">
              <span>{item.text}</span>
              <span className={item.change.startsWith("+") ? "text-red-300" : "text-green-300"}>
                {item.change}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">{t("tips.title")}</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">{t("tips.subtitle")}</p>
        </div>

        {/* Smart Search Bar with removable filter chips */}
        <div className="mb-6 max-w-xl mx-auto">
          <SmartSearchBar
            query={searchInput}
            onQueryChange={setSearchInput}
            chips={[
              ...(selectedCategory !== "all"
                ? [{
                    key: "category",
                    label: language === "en" ? "Category" : "ምድብ",
                    value: selectedCategory,
                    onRemove: () => setSelectedCategory("all"),
                  }]
                : []),
              ...(premiumFilter !== undefined
                ? [{
                    key: "premium",
                    label: "",
                    value: premiumFilter
                      ? (language === "en" ? "Premium" : "ፕሪሚየም")
                      : (language === "en" ? "Free" : "ነፃ"),
                    onRemove: () => setPremiumFilter(undefined),
                  }]
                : []),
            ]}
            totalCount={totalFiltered}
            placeholder={language === "en" ? "Search tips..." : "ምክሮች ይፈልጉ..."}
            compact
          />
        </div>

        {/* Category & Premium filter badges */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {(tipCategories.data?.slice(0, 10) ?? []).map((cat: string) => (
            <Badge
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => toggleCategory(cat)}
            >
              {cat}
            </Badge>
          ))}
          <Badge
            variant={premiumFilter === true ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => togglePremium(true)}
          >
            {language === "en" ? "Premium" : "ፕሪሚየም"} ✨
          </Badge>
          <Badge
            variant={premiumFilter === false ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => togglePremium(false)}
          >
            {language === "en" ? "Free" : "ነፃ"}
          </Badge>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: TIPS_PER_PAGE }).map((_, i) => <TipSkeleton key={i} />)}
          </div>
        ) : visibleTips.length === 0 ? (
          <div className="p-12 text-center">
            <SearchX className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">
              {language === "en" ? "No matching tips" : "ምንም የሚዛመድ ምክር የለም"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {language === "en"
                ? "Try adjusting your search or filters"
                : "እባክዎ ፍለጋዎን ወይም ማጣሪያዎችዎን ያስተካክሉ"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleTips.map((tip, i) => (
                <TipCard key={tip.id} tip={tip} index={i} canReadPremium={canReadPremium} />
              ))}
            </div>

            {pageCount > 1 && (
              <Pagination className="mt-8">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#tips"
                      aria-disabled={page === 1}
                      className={page === 1 ? "pointer-events-none opacity-50" : ""}
                      onClick={(event) => {
                        event.preventDefault()
                        goToPage(page - 1)
                      }}
                    />
                  </PaginationItem>
                  {visiblePages.map((pageNumber) => (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        href="#tips"
                        isActive={pageNumber === page}
                        onClick={(event) => {
                          event.preventDefault()
                          goToPage(pageNumber)
                        }}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#tips"
                      aria-disabled={page === pageCount}
                      className={page === pageCount ? "pointer-events-none opacity-50" : ""}
                      onClick={(event) => {
                        event.preventDefault()
                        goToPage(page + 1)
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
      </div>
    </section>
  )
}
