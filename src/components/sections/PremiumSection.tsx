import { Check, X, Crown, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useLanguage } from "@/lib/i18n"
import { useInView } from "@/hooks/useInView"

const tiers = [
  {
    key: "free" as const,
    price: 0,
    highlight: false,
    features: {
      blogs: true,
      prices: "limited",
      tips: "limited",
      listings: true,
      contact: false,
      priority: false,
      analytics: false,
      consultation: false,
      alerts: false,
      report: false,
    },
  },
  {
    key: "premium" as const,
    price: 500,
    highlight: true,
    features: {
      blogs: true,
      prices: true,
      tips: true,
      listings: true,
      contact: true,
      priority: true,
      analytics: false,
      consultation: false,
      alerts: false,
      report: true,
    },
  },
  {
    key: "pro" as const,
    price: 1200,
    highlight: false,
    features: {
      blogs: true,
      prices: true,
      tips: true,
      listings: true,
      contact: true,
      priority: true,
      analytics: true,
      consultation: true,
      alerts: true,
      report: true,
    },
  },
]

const featureKeys = [
  "premium.feature.blogs",
  "premium.feature.prices",
  "premium.feature.tips",
  "premium.feature.listings",
  "premium.feature.contact",
  "premium.feature.priority",
  "premium.feature.analytics",
  "premium.feature.consultation",
  "premium.feature.alerts",
  "premium.feature.report",
] as const

function FeatureCell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="h-4 w-4 text-green-500 mx-auto" />
  if (value === false) return <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
  return <span className="text-xs text-muted-foreground">{value === "limited" ? "Limited" : value}</span>
}

export function PremiumSection() {
  const { t, language } = useLanguage()
  const { ref, isInView } = useInView()

  return (
    <section id="premium" ref={ref} className="py-16 sm:py-24 bg-muted/30">
      <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">{t("premium.title")}</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">{t("premium.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          {tiers.map((tier) => (
            <Card
              key={tier.key}
              className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
                tier.highlight
                  ? "border-accent shadow-md scale-[1.02]"
                  : "border-border/50"
              }`}
            >
              {tier.highlight && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-accent" />
              )}
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-2">
                  {tier.highlight ? (
                    <Crown className="h-8 w-8 text-accent" />
                  ) : tier.key === "pro" ? (
                    <Zap className="h-8 w-8 text-primary" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm font-bold">
                      F
                    </div>
                  )}
                </div>
                <CardTitle className="text-xl">
                  {tier.key === "free" ? t("premium.free") : tier.key === "premium" ? "Premium" : t("premium.pro")}
                </CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{tier.price.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground"> {t("common.etb")}{t("premium.month")}</span>
                </div>
                {tier.highlight && (
                  <Badge className="mt-2 bg-accent text-accent-foreground">Popular</Badge>
                )}
              </CardHeader>
              <CardContent className="pt-4">
                <ul className="space-y-2">
                  {Object.entries(tier.features).map(([key, value]) => (
                    <li key={key} className="flex items-center gap-2 text-sm">
                      {value === true ? (
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                      ) : value === false ? (
                        <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      ) : (
                        <span className="h-4 w-4 flex items-center justify-center text-xs text-muted-foreground shrink-0">~</span>
                      )}
                      <span className={value === false ? "text-muted-foreground/60" : "text-foreground"}>
                        {t(featureKeys.find(fk => fk.endsWith(key)) as any)}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full mt-6 ${
                    tier.highlight
                      ? "bg-accent text-accent-foreground hover:bg-accent/90"
                      : ""
                  }`}
                  variant={tier.highlight ? "default" : "outline"}
                >
                  {tier.price === 0 ? t("premium.getStarted") : t("premium.choosePlan")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="overflow-hidden border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">
              {language === "en" ? "Feature Comparison" : "የባህሪ ንጽጽር"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === "en" ? "Feature" : "ባህሪ"}</TableHead>
                  <TableHead className="text-center">{t("premium.free")}</TableHead>
                  <TableHead className="text-center bg-accent/5">Premium</TableHead>
                  <TableHead className="text-center">{t("premium.pro")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {featureKeys.map((fk) => {
                  const featureId = fk.split(".").pop() as string
                  return (
                    <TableRow key={fk}>
                      <TableCell className="text-sm">{t(fk)}</TableCell>
                      {tiers.map((tier) => (
                        <TableCell key={tier.key} className="text-center">
                          <FeatureCell value={tier.features[featureId as keyof typeof tier.features]} />
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            {language === "en"
              ? "Payment via Chapa — Ethiopia's leading payment processor"
              : "በቻፓ ክፍያ — የኢትዮጵያ ዋነኛ ክፍያ አቀማመጃ"}
          </p>
          <Button variant="outline" className="gap-2">
            <Zap className="h-4 w-4" />
            {language === "en" ? "Pay with Chapa" : "በቻፓ ይክፈሉ"}
          </Button>
        </div>
      </div>
    </section>
  )
}
