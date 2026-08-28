import { CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/lib/i18n"
import { useNavigate } from "react-router-dom"

export default function PaymentPage() {
  const { t, language } = useLanguage()
  const navigate = useNavigate()

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-4">{t("premium.title")}</h1>
      <p className="text-muted-foreground mb-8">{t("premium.subtitle")}</p>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{language === "en" ? "Chapa (Cards, Banks & Mobile Money)" : "ቻፓ (ካርድ፣ ባንክ እና የሞባይል ገንዘብ)"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {language === "en"
                ? "Use Chapa for secure online card, bank, and mobile money payments. You'll be redirected to a secure checkout."
                : "ቻፓን ለደህና የመስመር ላይ ካርድ፣ ባንክ እና የሞባይል ገንዘብ ክፍያዎች ይጠቀሙ። ወደ ደህና የሆነ መክፈያ ገፅ ይቀይራሉ።"}
            </p>
            <div className="flex gap-3">
              <Button onClick={() => navigate("/#premium")} className="gap-2">
                <CreditCard className="h-4 w-4" />
                {language === "en" ? "View Plans" : "እቅዶችን ይመልከቱ"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
