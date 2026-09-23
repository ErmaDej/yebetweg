import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Download } from "lucide-react"
import { useLanguage } from "@/lib/i18n"

/**
 * Graceful PWA install prompt.
 *
 * Chromium fires `beforeinstallprompt` when installability criteria are met;
 * the event must be captured and `prompt()` called from a user gesture, so we
 * stash it and surface a small dismissible banner instead of a jarring popup.
 * iOS Safari has no such event — there we show the manual "Add to Home
 * Screen" instructions once. Dismissal is remembered (localStorage) so we
 * never nag; the banner also waits until the second page visit to appear so
 * first-time visitors aren't interrupted.
 */

const DISMISS_KEY = "pwa-install-dismissed-at"
const DISMISS_COOLDOWN_DAYS = 14

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function recentlyDismissed(): boolean {
  const ts = Number(localStorage.getItem(DISMISS_KEY) ?? 0)
  if (!ts) return false
  return Date.now() - ts < DISMISS_COOLDOWN_DAYS * 24 * 3600 * 1000
}

export function InstallPrompt() {
  const { language } = useLanguage()
  const am = language === "am"

  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return

    // Count visits so the prompt only appears from the 2nd visit onward.
    const visits = Number(localStorage.getItem("pwa-visit-count") ?? 0) + 1
    localStorage.setItem("pwa-visit-count", String(visits))
    if (visits < 2) return

    const onBip = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener("beforeinstallprompt", onBip)

    // iOS Safari: no beforeinstallprompt — detect a touch-only Apple device.
    const isIos =
      /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1)
    if (isIos) {
      const t = window.setTimeout(() => setShowIosHint(true), 4000)
      return () => {
        window.removeEventListener("beforeinstallprompt", onBip)
        window.clearTimeout(t)
      }
    }

    return () => window.removeEventListener("beforeinstallprompt", onBip)
  }, [])

  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === "accepted") {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    }
    setDeferred(null)
    setVisible(false)
  }

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
    setShowIosHint(false)
  }

  if (isStandalone()) return null
  if (!visible && !showIosHint) return null

  return (
    <div
      role="region"
      aria-label={am ? "መተግበሪያውን ይጫኑ" : "Install app"}
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-border/70 bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Download className="h-5 w-5 text-primary" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {am ? "YeBetWegን ወደ መሣሪያዎ ይጫኑ" : "Install YeBetWeg on your device"}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {showIosHint
            ? am
              ? "በSafari የማጋሪያ አዝራር ይጫኑ → \"Add to Home Screen\" ይምረጡ።"
              : 'In Safari, tap the Share button, then "Add to Home Screen".'
            : am
              ? "ፈጣን መክፈቻ፣ ከመስመር ውጭ የሚሰራ።"
              : "Faster access, works offline."}
        </p>
      </div>
      {!showIosHint && (
        <Button size="sm" onClick={() => void install()} className="shrink-0">
          {am ? "ይጫኑ" : "Install"}
        </Button>
      )}
      <Button
        size="icon"
        variant="ghost"
        onClick={dismiss}
        aria-label={am ? "ዝጋ" : "Dismiss"}
        className="h-8 w-8 shrink-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
