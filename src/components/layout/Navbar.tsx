import { useState, useEffect } from "react"
import { Menu, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { ModeToggle } from "@/components/mode-toggle"
import { useLanguage } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { YeBetWegLogoMarkOnly } from "@/components/icons/logo-image"

const navLinks = [
  { key: "nav.knowledge" as const, href: "#knowledge" },
  { key: "nav.tips" as const, href: "#tips" },
  { key: "nav.market" as const, href: "#market" },
  { key: "nav.marketplace" as const, href: "#marketplace" },
  { key: "nav.professionals" as const, href: "#professionals" },
  { key: "nav.premium" as const, href: "#premium" },
  { key: "nav.contact" as const, href: "#contact" },
]

export function Navbar() {
  const { t, language, setLanguage } = useLanguage()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-background/80 backdrop-blur-md border-b border-border shadow-sm"
          : "bg-transparent"
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-3 sm:px-4 md:px-6 lg:px-8">
        <a href="#hero" className="flex items-center gap-2 group shrink-0">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-105 overflow-hidden">
            <YeBetWegLogoMarkOnly size="md" />
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-lg font-bold tracking-tight text-foreground">YeBetWeg</span>
            <span className="text-[10px] text-muted-foreground">የቤት-ወግ</span>
          </div>
        </a>

        <div className="hidden lg:flex items-center gap-0.5 flex-1">
          {navLinks.map((link) => (
            <a
              key={link.key}
              href={link.href}
              className="px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground rounded-md hover:bg-accent/10 whitespace-nowrap"
            >
              {t(link.key)}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLanguage(language === "en" ? "am" : "en")}
            className="h-9 gap-1 px-2 text-xs md:text-sm font-medium"
            title={language === "en" ? "Switch to Amharic" : "Switch to English"}
          >
            <Globe className="h-4 w-4 shrink-0" />
            <span className="hidden xs:inline">
              {language === "en" ? "AM" : "EN"}
            </span>
          </Button>
          <ModeToggle />

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 sm:w-72">
              <SheetTitle className="flex items-center gap-2 mb-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0 overflow-hidden">
                  <YeBetWegLogoMarkOnly size="sm" />
                </div>
                <span className="font-bold text-base">YeBetWeg</span>
              </SheetTitle>
              <nav className="flex flex-col gap-1 mb-6">
                {navLinks.map((link) => (
                  <a
                    key={link.key}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground rounded-md hover:bg-accent/10"
                  >
                    {t(link.key)}
                  </a>
                ))}
              </nav>
              <div className="border-t pt-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground px-3">Settings</p>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    setLanguage(language === "en" ? "am" : "en")
                    setMobileOpen(false)
                  }}
                >
                  <Globe className="h-4 w-4 mr-2" />
                  {language === "en" ? "ወደ አማርኛ ይለውጡ" : "Switch to English"}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  )
}
