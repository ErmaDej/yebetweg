import { useState } from "react"
import { TrendingUp, TrendingDown, Lock, CircleAlert as AlertCircle } from "lucide-react"
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
import { useMarketPrices } from "@/hooks/useMarketPrices"
import { useInView } from "@/hooks/useInView"
import { navigateTo } from "@/lib/navigation"
import type { PremiumTier } from "@/types/payment"

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

export function MarketPricesSection({ activePlan = "free" }: { activePlan?: PremiumTier }) {
  const { t, language } = useLanguage()
  const [category, setCategory] = useState("all")
  const { prices, loading } = useMarketPrices(category)
  const { ref, isInView } = useInView()
  const canReadPremium = activePlan === "premium" || activePlan === "pro"

  return (
    <section id="market" ref={ref} className="py-16 sm:py-24 bg-background">
      <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">{t("market.title")}</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">{t("market.subtitle")}</p>
        </div>

        <ToggleGroup
          type="single"
          value={category}
          onValueChange={(v) => v && setCategory(v)}
          className="flex flex-wrap justify-center gap-2 mb-8"
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
            ) : (
              <div className="relative">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("market.material")}</TableHead>
                      <TableHead>{t("market.unit")}</TableHead>
                      <TableHead className="text-right">{t("market.price")}</TableHead>
                      <TableHead className="text-right">{t("market.change")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prices.map((price, i) => {
                      const isLocked = !canReadPremium && i >= FREE_ROWS
                      return (
                        <TableRow
                          key={price.id}
                          className={isLocked ? "relative" : ""}
                        >
                          <TableCell className={isLocked ? "premium-blur" : ""}>
                            {language === "am" ? price.material_am : price.material_en}
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
    </section>
  )
}
