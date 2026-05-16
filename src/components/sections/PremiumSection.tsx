import { Check, X, Crown, Zap, CreditCard, Smartphone, Loader2 } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useLanguage } from "@/lib/i18n"
import { useInView } from "@/hooks/useInView"
import { usePayment } from "@/hooks/usePayment"
import { useState } from "react"
import type { Subscription } from "@/types/payment"
import { navigateTo } from "@/lib/navigation"

type PremiumTier = "free" | "premium" | "pro"

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

const tierRank: Record<PremiumTier, number> = {
  free: 0,
  premium: 1,
  pro: 2,
}

function FeatureCell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="h-4 w-4 text-green-500 mx-auto" />
  if (value === false) return <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
  return <span className="text-xs text-muted-foreground">{value === "limited" ? "Limited" : value}</span>
}

export function PremiumSection({
  activePlan = "free",
  subscription,
}: {
  activePlan?: PremiumTier
  subscription?: Subscription | null
}) {
  const { t, language } = useLanguage()
  const { ref, isInView } = useInView()
  const { loading, error, initiatePayment, tierPrices } = usePayment()
  const [selectedTier, setSelectedTier] = useState<PremiumTier | null>(null)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"chapa" | "telebirr">("chapa")

  const handleChoosePlan = (tier: PremiumTier, method: "chapa" | "telebirr") => {
    setSelectedTier(tier)
    setPaymentMethod(method)
    setPaymentDialogOpen(true)
  }

  const handlePayment = async () => {
    if (!selectedTier) return

    const result = await initiatePayment(
      selectedTier,
      paymentMethod,
      paymentMethod === "telebirr" ? phoneNumber : undefined,
    )

    if (result.success && result.redirectUrl) {
      window.location.href = result.redirectUrl
    }
  }

  return (
    <>
      <section id="premium" ref={ref} className="py-16 sm:py-24 bg-muted/30">
        <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">{t("premium.title")}</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">{t("premium.subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
            {tiers.map((tier) => {
              const isCurrentPlan = activePlan === tier.key
              const isLowerPlan = tierRank[tier.key] < tierRank[activePlan]
              const isPaidPlan = tier.price > 0

              return (
              <Card
                key={tier.key}
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
                  isCurrentPlan
                    ? "border-primary shadow-md"
                    : tier.highlight
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
                  {isCurrentPlan && (
                    <Badge variant="outline" className="mt-2 border-primary text-primary">
                      {language === "en" ? "Current plan" : "የአሁኑ እቅድ"}
                    </Badge>
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
                  {isCurrentPlan ? (
                    <Button className="w-full mt-4" variant="outline" disabled>
                      {language === "en" ? "Active" : "ንቁ"}
                    </Button>
                  ) : isPaidPlan ? (
                    <div className="flex flex-col gap-2 mt-4">
                      <Button
                        className={`w-full ${
                          tier.highlight
                            ? "bg-accent text-accent-foreground hover:bg-accent/90"
                            : ""
                        }`}
                        variant={tier.highlight ? "default" : "outline"}
                        disabled={isLowerPlan}
                        onClick={() => handleChoosePlan(tier.key, "chapa")}
                      >
                        {isLowerPlan
                          ? language === "en" ? "Included" : "ተካቷል"
                          : language === "en" ? "Pay with Chapa" : "በቻፓ ይክፈሉ"}
                      </Button>
                      <Button
                        className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                        disabled={isLowerPlan}
                        onClick={() => handleChoosePlan(tier.key, "telebirr")}
                      >
                        {isLowerPlan
                          ? language === "en" ? "Included" : "ተካቷል"
                          : language === "en" ? "Pay with TeleBirr" : "በቴሌቢር ይክፈሉ"}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full mt-6"
                      variant="outline"
                    >
                      {t("premium.getStarted")}
                    </Button>
                  )}
                </CardContent>
              </Card>
              )
            })}
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

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-border/60 bg-white/90 p-6 shadow-sm">
              <p className="text-sm font-semibold text-foreground mb-2">
                {activePlan === "free"
                  ? t("premium.paymentHeadline")
                  : language === "en"
                    ? `Your ${activePlan} plan is active`
                    : `የ${activePlan} እቅድዎ ንቁ ነው`}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {activePlan === "free"
                  ? t("premium.paymentDescription")
                  : subscription
                    ? language === "en"
                      ? `Renews or ends on ${new Date(subscription.expiresAt).toLocaleDateString("en-US")}. Premium features on this page now follow your session.`
                      : `${new Date(subscription.expiresAt).toLocaleDateString("am-ET")} ይታደሳል ወይም ያበቃል። የፕሪሚየም ባህሪዎች አሁን እንደ ክፍለጊዜዎ ይሰራሉ።`
                    : language === "en"
                      ? "Premium features on this page now follow your session."
                      : "የፕሪሚየም ባህሪዎች አሁን እንደ ክፍለጊዜዎ ይሰራሉ።"}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button
                  variant="outline"
                  className="gap-2 w-full sm:w-auto"
                  onClick={() => activePlan === "free" ? handleChoosePlan("premium", "chapa") : navigateTo("/dashboard")}
                >
                  <CreditCard className="h-4 w-4" />
                  {activePlan === "free" ? language === "en" ? "Pay with Chapa" : "በቻፓ ይክፈሉ" : language === "en" ? "Manage from dashboard" : "ከዳሽቦርድ ያስተዳድሩ"}
                </Button>
                <Button
                  className="gap-2 w-full sm:w-auto bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => activePlan === "free" ? handleChoosePlan("premium", "telebirr") : navigateTo("/dashboard")}
                >
                  <Smartphone className="h-4 w-4" />
                  {activePlan === "free" ? language === "en" ? "Pay with TeleBirr" : "በቴሌቢር ይክፈሉ" : language === "en" ? "View subscription" : "ምዝገባ ይመልከቱ"}
                </Button>
              </div>
            </div>
            <div className="rounded-3xl border border-border/60 bg-muted/70 p-6 shadow-sm">
              <p className="text-sm font-semibold text-foreground mb-2">
                {language === "en" ? "How payment works" : "ክፍያ እንዴት እንደሚሰራ"}
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• {language === "en" ? "Choose your plan and payment method." : "እቅድዎን ይምረጡ እና የክፍያ ዘዴን ይምረጡ።"}</li>
                <li>• {language === "en" ? "Chapa is ideal for online card and bank payments." : "ቻፓ ለቀርድ እና ባንክ ክፍያዎች ተስማሚ ነው።"}</li>
                <li>• {language === "en" ? "TeleBirr offers fast mobile money checkout." : "ቴሌቢር ፈጣን የሞባይል ገንዘብ ክፍያ ይሰጣል።"}</li>
                <li>• {language === "en" ? "Your phone number is required to complete TeleBirr payments." : "የቴሌቢር ክፍያ ለማጠናቀቅ የስልክ ቁጥርዎ ያስፈልጋል።"}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedTier && paymentMethod === "chapa" 
                ? (language === "en" ? "Pay with Chapa" : "በቻፓ ይክፈሉ")
                : (language === "en" ? "Pay with TeleBirr" : "በቴሌቢር ይክፈሉ")
              }
            </DialogTitle>
            <DialogDescription>
              {selectedTier && (
                language === "en"
                  ? `Complete your payment of ETB ${tierPrices[selectedTier] || 0} for ${selectedTier} membership`
                  : `ለ${selectedTier} አባልነት የETB ${tierPrices[selectedTier] || 0} ክፍያ ያጠናቀቁ`
              )}
            </DialogDescription>
          </DialogHeader>

          {paymentMethod === "telebirr" && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="phone">
                  {language === "en" ? "Phone Number" : "ስልክ ቁጥር"}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+2519XXXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {language === "en"
                    ? "Enter your TeleBirr registered phone number"
                    : "የቴሌቢር ስልክ ቁጥርዎን ያስገቡ"
                  }
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              {language === "en" ? "Cancel" : "ሰርዝ"}
            </Button>
            <Button onClick={handlePayment} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {language === "en" ? "Processing..." : "በማስညት..."}
                </>
              ) : (
                language === "en" ? "Confirm Payment" : "ክፍያ ያረጋግጅ"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
