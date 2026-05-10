import { useState, useEffect } from "react"
import { Megaphone } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n"
import { supabase } from "@/lib/supabase"
import { isImageUrlValid, getFallbackUrl } from "@/lib/url-validator"

interface Ad {
  id: string
  advertiser: string
  image_url: string
  link: string
  position: string
  is_active: boolean
}

export function AdSlot({ position }: { position: "leaderboard" | "sidebar" | "native_card" }) {
  const { t, language } = useLanguage()
  const [ad, setAd] = useState<Ad | null>(null)

  useEffect(() => {
    supabase
      .from("ads")
      .select("*")
      .eq("position", position)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setAd(data as Ad)
      })
  }, [position])

  if (!ad) return null

  const safeLink = getFallbackUrl(ad.link)
  const safeImage = isImageUrlValid(ad.image_url) ? ad.image_url : null

  if (position === "leaderboard") {
    return (
      <div className="w-full my-6">
        <p className="text-[10px] text-muted-foreground text-center mb-1">{t("ads.label")}</p>
        <Card className="overflow-hidden border-accent/20">
          {safeImage ? (
            <a href={safeLink} target="_blank" rel="noopener noreferrer">
              <img
                src={safeImage}
                alt={ad.advertiser}
                className="w-full h-20 sm:h-24 object-cover"
                loading="lazy"
              />
            </a>
          ) : (
            <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gradient-to-r from-accent/5 to-primary/5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{ad.advertiser}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="shrink-0" asChild>
                <a href={safeLink} target="_blank" rel="noopener noreferrer">
                  {language === "en" ? "Learn More" : "ተጨማሪ ይወቁ"}
                </a>
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    )
  }

  if (position === "sidebar") {
    return (
      <div className="w-full">
        <p className="text-[10px] text-muted-foreground text-center mb-1">{t("ads.label")}</p>
        <Card className="overflow-hidden border-accent/20">
          {safeImage ? (
            <a href={safeLink} target="_blank" rel="noopener noreferrer">
              <img
                src={safeImage}
                alt={ad.advertiser}
                className="w-full h-48 object-cover"
                loading="lazy"
              />
            </a>
          ) : (
            <CardContent className="p-4 text-center bg-gradient-to-br from-accent/5 to-primary/5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent mx-auto mb-3">
                <Megaphone className="h-6 w-6" />
              </div>
              <p className="font-semibold text-sm">{ad.advertiser}</p>
              <Button size="sm" variant="outline" className="mt-3" asChild>
                <a href={safeLink} target="_blank" rel="noopener noreferrer">
                  {language === "en" ? "Learn More" : "ተጨማሪ ይወቁ"}
                </a>
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full">
      <p className="text-[10px] text-muted-foreground text-center mb-1">{t("ads.label")}</p>
      <Card className="overflow-hidden border-accent/20">
        {safeImage ? (
          <a href={safeLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
            <img
              src={safeImage}
              alt={ad.advertiser}
              className="w-24 h-20 object-cover shrink-0"
              loading="lazy"
            />
            <div className="flex-1 min-w-0 p-3">
              <p className="font-semibold text-sm truncate">{ad.advertiser}</p>
              <Button size="sm" variant="outline" className="mt-2">
                {language === "en" ? "Learn More" : "ተጨማሪ ይወቁ"}
              </Button>
            </div>
          </a>
        ) : (
          <CardContent className="p-4 flex items-center gap-3 bg-gradient-to-br from-accent/5 to-primary/5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Megaphone className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{ad.advertiser}</p>
            </div>
            <Button size="sm" variant="outline" className="shrink-0" asChild>
              <a href={safeLink} target="_blank" rel="noopener noreferrer">
                {language === "en" ? "Learn More" : "ተጨማሪ ይወቁ"}
              </a>
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

export function AdvertiseWithUs() {
  const { t, language } = useLanguage()

  return (
    <Card className="overflow-hidden border-accent/30 bg-gradient-to-br from-accent/5 to-primary/5">
      <CardContent className="p-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent mx-auto mb-4">
          <Megaphone className="h-7 w-7" />
        </div>
        <h3 className="font-semibold text-lg">{t("ads.advertise")}</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
          {language === "en"
            ? "Reach Ethiopia's construction audience. Leaderboard, sidebar, and native card placements available."
            : "የኢትዮጵያ የግንባታ ታዳሚዎችን ይድረሱ። ሊደርቦርድ፣ ሳይድባር እና ነቲቭ ካርድ አቀማመጦች አሉ።"}
        </p>
        <Button className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90" asChild>
          <a href="#contact">{t("contact.send")}</a>
        </Button>
      </CardContent>
    </Card>
  )
}
