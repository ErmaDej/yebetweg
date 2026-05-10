import { useEffect, useState, useRef } from "react"
import { Play, Users, Search, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/lib/i18n"
import { useInView } from "@/hooks/useInView"

function useCountUp(end: number, duration: number, start: boolean) {
  const [count, setCount] = useState(0)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    if (!start) return
    let startTime: number | null = null

    function animate(timestamp: number) {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setCount(Math.floor(progress * end))
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      }
    }

    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [end, duration, start])

  return count
}

export function HeroSection() {
  const { t, language } = useLanguage()
  const { ref, isInView } = useInView()
  const [typed, setTyped] = useState("")
  const fullText = language === "en" ? "Humanity is Built" : "ቤት ይሠራ"

  const members = useCountUp(10000, 2000, isInView)
  const professionals = useCountUp(500, 2000, isInView)
  const listings = useCountUp(2000, 2000, isInView)

  useEffect(() => {
    if (!isInView) return
    let i = 0
    const interval = setInterval(() => {
      if (i <= fullText.length) {
        setTyped(fullText.slice(0, i))
        i++
      } else {
        clearInterval(interval)
      }
    }, 80)
    return () => clearInterval(interval)
  }, [isInView, fullText])

  return (
    <section
      id="hero"
      ref={ref}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/10" />

      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231A5276' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="absolute top-20 right-10 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div
          className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <div className="mb-6 flex justify-center neon-container">
            <div className="relative">
              {/* Rotating glow ring background */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 blur-xl animate-neon-rotate scale-150" />

              {/* Main logo with neon glow */}
              <img
                src="/Logo2x.png"
                alt="YeBetWeg"
                width={120}
                height={120}
                className="relative w-32 h-32 object-contain animate-neon-glow animate-neon-float"
                loading="eager"
                decoding="async"
              />

              {/* Shimmer overlay effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-white/5 to-transparent animate-neon-shimmer pointer-events-none" />
            </div>
          </div>

          <Badge variant="secondary" className="mb-6 text-xs font-medium">
            {language === "en" ? "Ethiopia's Construction Knowledge Platform" : "የኢትዮጵያ የግንባታ እውቀት መድረክ"}
          </Badge>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-foreground mb-2">
            <span className="animate-typewriter inline-block">{typed}</span>
          </h1>
          <p className="text-xl sm:text-2xl text-accent font-semibold mb-2">
            የቤት-ወግ
          </p>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            {t("hero.subline")}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
            <Button size="lg" className="gap-2" asChild>
              <a href="#knowledge">
                <Search className="h-4 w-4" />
                {t("hero.cta.explore")}
              </a>
            </Button>
            <Button size="lg" variant="outline" className="gap-2" asChild>
              <a href="https://t.me/yebetweg" target="_blank" rel="noopener noreferrer">
                <Users className="h-4 w-4" />
                {t("hero.cta.community")}
              </a>
            </Button>
            <Button size="lg" variant="outline" className="gap-2" asChild>
              <a href="#marketplace">
                <Play className="h-4 w-4" />
                {t("hero.cta.marketplace")}
                <ArrowRight className="h-3 w-3" />
              </a>
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
            {[
              { value: members, label: t("hero.stat.members"), suffix: "+" },
              { value: professionals, label: t("hero.stat.professionals"), suffix: "+" },
              { value: listings, label: t("hero.stat.listings"), suffix: "+" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-foreground">
                  {stat.value.toLocaleString()}{stat.suffix}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  )
}
