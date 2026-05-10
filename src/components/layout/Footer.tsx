import { useState } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/lib/i18n"
import { supabase } from "@/lib/supabase"
import { TelegramIcon } from "@/components/icons/telegram-icon"
import { YeBetWegLogoMarkOnly } from "@/components/icons/logo-image"
import { validateEmailSubscription } from "@/lib/validation"

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

export function Footer() {
  const { t, language } = useLanguage()
  const [email, setEmail] = useState("")
  const [subscribed, setSubscribed] = useState(false)
  const [subscribeError, setSubscribeError] = useState("")

  const handleSubscribe = async () => {
    setSubscribeError("")
    if (!email) return

    const validationErrors = validateEmailSubscription(email)
    if (validationErrors.length > 0) {
      setSubscribeError(validationErrors[0].message)
      return
    }

    const { error } = await supabase
      .from("subscribers")
      .insert({ email: email.toLowerCase().trim(), language_preference: language })
    if (error) {
      setSubscribeError("Failed to subscribe. Please try again.")
      return
    }
    setSubscribed(true)
    setEmail("")
  }

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground overflow-hidden">
                <YeBetWegLogoMarkOnly size="md" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-lg font-bold">YeBetWeg</span>
                <span className="text-[10px] text-muted-foreground">የቤት-ወግ</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              {language === "en"
                ? "Ethiopia's leading construction knowledge platform connecting homeowners, professionals, and the building industry."
                : "በኢትዮጵያ ዋነኛ የግንባታ እውቀት መድረክ ቤት ባለቤቶችን፣ ባለሙያዎችን እና የግንባታ ኢንዱስትሪን ያገናኛል።"}
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{t("footer.quickLinks")}</h3>
            <div className="space-y-2">
              <a href="#knowledge" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("nav.knowledge")}
              </a>
              <a href="#tips" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("nav.tips")}
              </a>
              <a href="#market" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("nav.market")}
              </a>
              <a href="#marketplace" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("nav.marketplace")}
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{t("footer.audience.homeowners")}</h3>
            <div className="space-y-2">
              <a href="#tips" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("nav.tips")}
              </a>
              <a href="#market" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("nav.market")}
              </a>
              <a href="#premium" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("nav.premium")}
              </a>
              <a href="#contact" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("nav.contact")}
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{t("footer.newsletter")}</h3>
            {subscribed ? (
              <p className="text-sm text-accent font-medium">
                {language === "en" ? "Subscribed successfully!" : "በተሳካ ሁኔታ ተመዝግበዋል!"}
              </p>
            ) : (
              <div className="space-y-1.5">
                {subscribeError && (
                  <p className="text-xs text-destructive">{subscribeError}</p>
                )}
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder={t("footer.newsletterPlaceholder")}
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setSubscribeError("") }}
                    onKeyDown={(e) => e.key === "Enter" && handleSubscribe()}
                    className="h-9 text-sm"
                  />
                  <Button size="sm" onClick={handleSubscribe} className="h-9 shrink-0">
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <a
                href="https://youtube.com/@yebetweg"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-youtube hover:bg-youtube/10 transition-all duration-200 transform hover:scale-110"
                title="YouTube"
              >
                <YouTubeIcon className="h-4 w-4" />
              </a>
              <a
                href="https://t.me/yebetweg"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-telegram hover:bg-telegram/10 transition-all duration-200 transform hover:scale-110"
                title="Telegram"
              >
                <TelegramIcon className="h-4 w-4" />
              </a>
              <a
                href="https://facebook.com/yebetweg"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-facebook hover:bg-facebook/10 transition-all duration-200 transform hover:scale-110"
                title="Facebook"
              >
                <FacebookIcon className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {t("footer.copyright")}
          </p>
          <p className="text-xs text-muted-foreground">
            {language === "en"
              ? "Construction Knowledge Hub & Marketplace"
              : "የግንባታ እውቀት ማዕከል እና ገበያ"}
          </p>
        </div>
      </div>
    </footer>
  )
}
