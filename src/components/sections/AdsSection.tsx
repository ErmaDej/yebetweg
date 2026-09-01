import { useState, useEffect, useCallback } from "react"
import { Megaphone } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Image } from "@/components/ui/image"
import { useLanguage } from "@/lib/i18n"
import { supabase } from "@/lib/supabase"
import { isImageUrlValid } from "@/lib/url-validator"

interface Ad {
  id: string
  advertiser: string
  image_url: string
  link: string
  position: string
  is_active: boolean
  created_at?: string
}

const SAMPLE_ADS: Ad[] = [
  {
    id: "sample-leaderboard-1",
    advertiser: "ConstructPro Ethiopia",
    image_url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=900&q=80",
    link: "https://t.me/yebetweg",
    position: "leaderboard",
    is_active: true,
  },
  {
    id: "sample-leaderboard-2",
    advertiser: "Ethiopian Construction Materials",
    image_url: "https://images.unsplash.com/photo-1581092162562-40038cf6a398?w=900&q=80",
    link: "https://t.me/yebetweg",
    position: "leaderboard",
    is_active: true,
  },
  {
    id: "sample-leaderboard-3",
    advertiser: "BuildRight Ethiopia",
    image_url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=900&q=80",
    link: "https://t.me/yebetweg",
    position: "leaderboard",
    is_active: true,
  },
  {
    id: "sample-sidebar-1",
    advertiser: "Addis Build Materials",
    image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=500&q=80",
    link: "https://t.me/yebetweg",
    position: "sidebar",
    is_active: true,
  },
  {
    id: "sample-sidebar-2",
    advertiser: "Prime Steel Ethiopia",
    image_url: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=500&q=80",
    link: "https://t.me/yebetweg",
    position: "sidebar",
    is_active: true,
  },
  {
    id: "sample-native-1",
    advertiser: "Ethio Cement Co.",
    image_url: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=80",
    link: "https://t.me/yebetweg",
    position: "native_card",
    is_active: true,
  },
  {
    id: "sample-native-2",
    advertiser: "Modern Construction Addis",
    image_url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=80",
    link: "https://t.me/yebetweg",
    position: "native_card",
    is_active: true,
  },
]

function getSampleAds(position: string): Ad[] {
  return SAMPLE_ADS.filter((a) => a.position === position)
}

/** Animated carousel dot indicator */
function DotIndicator({
  count,
  active,
  onClick,
}: {
  count: number
  active: number
  onClick: (i: number) => void
}) {
  if (count <= 1) return null
  return (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          onClick={() => onClick(i)}
          aria-label={`Go to slide ${i + 1}`}
          className={`rounded-full transition-all duration-300 ${
            i === active
              ? "w-4 h-2 bg-accent"
              : "w-2 h-2 bg-accent/40 hover:bg-accent/60"
          }`}
        />
      ))}
    </div>
  )
}

/**
 * Leaderboard ad — centered, max-w-4xl, auto-cycling carousel with dot nav.
 */
function LeaderboardSlot() {
  const [ads, setAds] = useState<Ad[]>([])
  const [active, setActive] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    supabase
      .from("ads")
      .select("*")
      .eq("position", "leaderboard")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        const dbAds: Ad[] = (data as Ad[]) ?? []
        setAds(dbAds.length > 0 ? dbAds : getSampleAds("leaderboard"))
      })
  }, [])

  const showSlide = useCallback(
    (index: number) => {
      if (isTransitioning || ads.length <= 1) return
      setIsTransitioning(true)
      setTimeout(() => {
        setActive(index)
        setIsTransitioning(false)
      }, 300)
    },
    [isTransitioning, ads.length]
  )

  useEffect(() => {
    if (ads.length <= 1) return
    const timer = setInterval(() => {
      showSlide((active + 1) % ads.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [active, ads.length, showSlide])

  if (ads.length === 0) return null

  const ad = ads[active]
  const safeLink = ad.link.startsWith("https://") ? ad.link : "#"
  const safeImage = isImageUrlValid(ad.image_url) ? ad.image_url : null

  return (
    <div className="w-full my-6">
      <p className="text-[10px] text-muted-foreground text-center mb-2">Sponsored</p>
      <div className="relative mx-auto max-w-4xl rounded-xl overflow-hidden shadow-sm border border-accent/20">
        {safeImage ? (
          <a href={safeLink} target="_blank" rel="noopener noreferrer" className="block relative">
            <Image
              src={safeImage}
              alt={ad.advertiser}
              className={`w-full h-28 sm:h-36 md:h-44 object-cover transition-all duration-500 ${
                isTransitioning ? "opacity-0 scale-105" : "opacity-100 scale-100"
              }`}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/10" />
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
              <p className="text-white text-xs font-medium">{ad.advertiser}</p>
            </div>
          </a>
        ) : (
          <CardContent className="p-4 flex items-center gap-3 bg-gradient-to-r from-accent/5 to-primary/5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent shrink-0">
              <Megaphone className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{ad.advertiser}</p>
            </div>
            <Button size="sm" variant="secondary" asChild className="shrink-0">
              <a href={safeLink} target="_blank" rel="noopener noreferrer">
                Learn More
              </a>
            </Button>
          </CardContent>
        )}
        <DotIndicator
          count={ads.length}
          active={active}
          onClick={(i) => showSlide(i)}
        />
        {/* Ad badge */}
        <div className="absolute top-2 right-2">
          <span className="text-[9px] text-white/70 bg-black/30 px-1.5 py-0.5 rounded backdrop-blur-sm">
            Ad
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Sidebar ad — stacked cards, picks 2 most recent.
 */
function SidebarSlot() {
  const [ads, setAds] = useState<Ad[]>([])

  useEffect(() => {
    supabase
      .from("ads")
      .select("*")
      .eq("position", "sidebar")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(2)
      .then(({ data }) => {
        const dbAds: Ad[] = (data as Ad[]) ?? []
        setAds(dbAds.length > 0 ? dbAds : getSampleAds("sidebar"))
      })
  }, [])

  if (ads.length === 0) return null

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-muted-foreground text-center">Sponsored</p>
      {ads.map((ad, i) => {
        const safeLink = ad.link.startsWith("https://") ? ad.link : "#"
        const safeImage = isImageUrlValid(ad.image_url) ? ad.image_url : null
        return (
          <Card
            key={ad.id}
            className="overflow-hidden border-accent/20 shadow-sm animate-fade-in-up"
            style={{ animationDelay: `${i * 120}ms`, animationFillMode: "both" }}
          >
            {safeImage ? (
              <a href={safeLink} target="_blank" rel="noopener noreferrer" className="block relative">
                <Image
                  src={safeImage}
                  alt={ad.advertiser}
                  className="w-full h-32 sm:h-36 object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-white text-xs font-medium truncate">{ad.advertiser}</p>
                </div>
                <div className="absolute top-1.5 right-1.5">
                  <span className="text-[8px] text-white/70 bg-black/30 px-1 py-0.5 rounded backdrop-blur-sm">
                    Ad
                  </span>
                </div>
              </a>
            ) : (
              <CardContent className="p-3 flex items-center gap-2 bg-gradient-to-br from-accent/5 to-primary/5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent shrink-0">
                  <Megaphone className="h-4 w-4" />
                </div>
                <p className="text-xs font-semibold truncate">{ad.advertiser}</p>
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}

/**
 * Native card ad — horizontal list, picks 2.
 */
function NativeCardSlot() {
  const [ads, setAds] = useState<Ad[]>([])

  useEffect(() => {
    supabase
      .from("ads")
      .select("*")
      .eq("position", "native_card")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(2)
      .then(({ data }) => {
        const dbAds: Ad[] = (data as Ad[]) ?? []
        setAds(dbAds.length > 0 ? dbAds : getSampleAds("native_card"))
      })
  }, [])

  if (ads.length === 0) return null

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-muted-foreground text-center">Sponsored</p>
      {ads.map((ad, i) => {
        const safeLink = ad.link.startsWith("https://") ? ad.link : "#"
        const safeImage = isImageUrlValid(ad.image_url) ? ad.image_url : null
        return (
          <Card
            key={ad.id}
            className="overflow-hidden border-accent/20 shadow-sm animate-fade-in-up"
            style={{ animationDelay: `${i * 120}ms`, animationFillMode: "both" }}
          >
            <div className="flex items-center gap-3">
              {safeImage ? (
                <a href={safeLink} target="_blank" rel="noopener noreferrer" className="shrink-0 relative">
                  <Image
                    src={safeImage}
                    alt={ad.advertiser}
                    className="w-24 h-20 object-cover"
                    loading="lazy"
                  />
                  <div className="absolute top-1 left-1">
                    <span className="text-[8px] text-white/70 bg-black/30 px-1 py-0.5 rounded backdrop-blur-sm">
                      Ad
                    </span>
                  </div>
                </a>
              ) : (
                <div className="shrink-0 w-24 h-20 bg-gradient-to-br from-accent/10 to-primary/10 flex items-center justify-center">
                  <Megaphone className="h-6 w-6 text-accent/50" />
                </div>
              )}
              <div className="flex-1 min-w-0 p-3">
                <p className="font-semibold text-sm truncate">{ad.advertiser}</p>
                <Button size="sm" variant="outline" className="mt-2" asChild>
                  <a href={safeLink} target="_blank" rel="noopener noreferrer">
                    Learn More
                  </a>
                </Button>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

/** Exported by position for App.tsx usage */
export function AdSlot({ position }: { position: "leaderboard" | "sidebar" | "native_card" }) {
  if (position === "leaderboard") return <LeaderboardSlot />
  if (position === "sidebar") return <SidebarSlot />
  return <NativeCardSlot />
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
