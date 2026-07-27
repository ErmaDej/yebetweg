import { Shield, FlaskConical, Clock, ArrowDownToLine, Paintbrush, Droplets, Zap, Wrench, Palette, HardHat, Lock, SearchX } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/lib/i18n"
import { useTips, type Tip } from "@/hooks/useTips"
import { useSmartSearch } from "@/hooks/useSmartSearch"
import { SmartSearchBar } from "@/components/search/SmartSearchBar"
import { useInView } from "@/hooks/useInView"
import { navigateTo } from "@/lib/navigation"
import type { PremiumTier } from "@/types/payment"

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
  const { tips, loading } = useTips()
  const { ref, isInView } = useInView()
  const canReadPremium = activePlan === "premium" || activePlan === "pro"

  // Client-side smart search for tips
  const smartSearch = useSmartSearch<Tip>({
    data: tips,
    initialPageSize: 50,
    defaultSortField: "created_at",
    searchableFields: ["title_en", "title_am", "content", "category"],
  })

  const searchableTips = smartSearch.items

  // Get unique categories for filter chips
  const tipCategories = smartSearch.getFacets("category")

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

        {/* Smart Search Bar with category filter chips */}
        <div className="mb-6 max-w-xl mx-auto">
          <SmartSearchBar
            query={smartSearch.state.query}
            onQueryChange={smartSearch.setQuery}
            chips={[
              ...(smartSearch.state.filters.category
                ? [{
                    key: "category",
                    label: language === "en" ? "Category" : "ምድብ",
                    value: smartSearch.state.filters.category,
                    onRemove: () => smartSearch.setFilter("category", undefined),
                  }]
                : []),
              ...(smartSearch.state.filters.is_premium !== undefined
                ? [{
                    key: "premium",
                    label: "",
                    value: smartSearch.state.filters.is_premium
                      ? (language === "en" ? "Premium" : "ፕሪሚየም")
                      : (language === "en" ? "Free" : "ነፃ"),
                    onRemove: () => smartSearch.setFilter("is_premium", undefined),
                  }]
                : []),
            ]}
            totalCount={smartSearch.totalCount}
            placeholder={language === "en" ? "Search tips..." : "ምክሮች ይፈልጉ..."}
            compact
          />
        </div>

        {/* Category & Premium filter badges */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {tipCategories.slice(0, 10).map((cat) => {
            const isActive = smartSearch.state.filters.category === cat
            return (
              <Badge
                key={cat}
                variant={isActive ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => smartSearch.setFilter("category", isActive ? undefined : cat)}
              >
                {cat}
              </Badge>
            )
          })}
          <Badge
            variant={smartSearch.state.filters.is_premium === true ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() =>
              smartSearch.setFilter(
                "is_premium",
                smartSearch.state.filters.is_premium === true ? undefined : true,
              )
            }
          >
            {language === "en" ? "Premium" : "ፕሪሚየም"} ✨
          </Badge>
          <Badge
            variant={smartSearch.state.filters.is_premium === false ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() =>
              smartSearch.setFilter(
                "is_premium",
                smartSearch.state.filters.is_premium === false ? undefined : false,
              )
            }
          >
            {language === "en" ? "Free" : "ነፃ"}
          </Badge>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <TipSkeleton key={i} />)}
          </div>
        ) : searchableTips.length === 0 ? (
          <div className="p-12 text-center">
            <SearchX className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">
              {language === "en" ? "No matching tips" : "ምንም የሚዛመድ ምክር የለም"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {language === "en"
                ? "Try adjusting your search or filters"
                : "እባክዎ ፍለጋዎን ወይም ማጣሪያዎን ያስተካክሉ"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchableTips.map((tip, i) => (
              <TipCard key={tip.id} tip={tip} index={i} canReadPremium={canReadPremium} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
