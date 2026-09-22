import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Bell, Check, CheckCheck, Inbox, RefreshCw, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/i18n"
import { useNotifications, type AppNotification } from "@/hooks/useNotifications"

type FilterKey = "all" | "unread" | "stale_prices" | "price_submission" | "rfq" | "info"

const FILTERS: { key: FilterKey; en: string; am: string }[] = [
  { key: "all", en: "All", am: "ሁሉም" },
  { key: "unread", en: "Unread", am: "ያልተነበበ" },
  { key: "price_submission", en: "Price submissions", am: "የዋጋ ማቅረቢያ" },
  { key: "stale_prices", en: "Stale prices", am: "ያረጁ ዋጋዎች" },
  { key: "rfq", en: "RFQs", am: "የዋጋ ጥያቄዎች" },
  { key: "info", en: "Other", am: "ሌሎች" },
]

function matchesFilter(n: AppNotification, f: FilterKey): boolean {
  if (f === "all") return true
  if (f === "unread") return n.read_at === null
  if (f === "info") return !["stale_prices", "price_submission", "rfq"].includes(n.type)
  return n.type === f
}

function timeAgo(iso: string, am: boolean): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return am ? "አሁን" : "now"
  if (mins < 60) return am ? `${mins} ደቂቃ በፊት` : `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return am ? `${hours} ሰዓት በፊት` : `${hours}h ago`
  const days = Math.floor(hours / 24)
  return am ? `${days} ቀን በፊት` : `${days}d ago`
}

function typeBadge(n: AppNotification, am: boolean) {
  switch (n.type) {
    case "stale_prices":
      return <Badge variant="destructive">{am ? "ዋጋ ማደስ" : "price refresh"}</Badge>
    case "price_submission":
      return <Badge variant="default">{am ? "ማረጋገጥ ይጠባበቃል" : "needs verification"}</Badge>
    case "rfq":
      return <Badge variant="outline">{am ? "የዋጋ ጥያቄ" : "RFQ"}</Badge>
    default:
      return <Badge variant="outline">{am ? "መረጃ" : "info"}</Badge>
  }
}

export function NotificationsPage() {
  const { language } = useLanguage()
  const navigate = useNavigate()
  const am = language === "am"
  const [filter, setFilter] = useState<FilterKey>("all")
  const { notifications, unreadCount, isLoading, error, refetch, markRead, markAllRead, isMarkingRead } =
    useNotifications(false)

  const filtered = useMemo(() => notifications.filter((n) => matchesFilter(n, filter)), [notifications, filter])

  // Read history = read items on the current page, newest first (the hook
  // fetches one recent page; older history lives in the DB, paged later).
  const unread = filtered.filter((n) => n.read_at === null)
  const read = filtered.filter((n) => n.read_at !== null)

  const openTarget = (n: AppNotification) => {
    if (n.read_at === null) markRead([n.id])
    if (n.link) navigate(n.link)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-24 pb-12 sm:px-6 md:pt-28">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Bell className="h-6 w-6 text-primary" aria-hidden="true" />
            {am ? "ማሳወቂያዎች" : "Notifications"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {am
              ? `${unreadCount} ያልተነበበ`
              : `${unreadCount} unread`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {am ? "አድስ" : "Refresh"}
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" disabled={isMarkingRead} onClick={() => markAllRead()} className="gap-2">
              <CheckCheck className="h-4 w-4" />
              {am ? "ሁሉንም አንብብ" : "Mark all read"}
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label={am ? "ማጣሪያ" : "Filter"}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              filter === f.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            {am ? f.am : f.en}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Bell className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              {am ? "ማሳወቂያዎችን መጫን አልተቻለም።" : "Couldn't load notifications."}
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => void refetch()}>
              {am ? "እንደገና ሞክር" : "Retry"}
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Inbox className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              {am ? "ምንም ማሳወቂያ የለም።" : "Nothing here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {unread.length > 0 && (
            <section aria-label={am ? "ያልተነበበ" : "Unread"}>
              <ul className="space-y-2">
                {unread.map((n) => (
                  <li key={n.id}>
                    <div className={cn(
                      "flex items-start gap-3 rounded-lg border border-border/60 bg-accent/30 p-4",
                    )}>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold leading-snug">{n.title}</p>
                          {typeBadge(n, am)}
                        </div>
                        {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground/70">
                          <Clock className="h-3 w-3" />
                          {timeAgo(n.created_at, am)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        {n.link && (
                          <Button variant="outline" size="sm" onClick={() => openTarget(n)}>
                            {am ? "ክፈት" : "Open"}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5"
                          disabled={isMarkingRead}
                          onClick={() => markRead([n.id])}
                        >
                          <Check className="h-3.5 w-3.5" />
                          {am ? "አንብብ" : "Mark read"}
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {read.length > 0 && (
            <section aria-label={am ? "የተነበበ ታሪክ" : "Read history"}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {am ? "የተነበበ ታሪክ" : "Read history"}
              </h2>
              <ul className="space-y-2">
                {read.map((n) => (
                  <li key={n.id}>
                    <div className="flex items-start gap-3 rounded-lg border border-border/40 p-4 opacity-75">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm leading-snug">{n.title}</p>
                          {typeBadge(n, am)}
                        </div>
                        {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground/60">
                          <Clock className="h-3 w-3" />
                          {timeAgo(n.created_at, am)}
                        </p>
                      </div>
                      {n.link && (
                        <Button variant="ghost" size="sm" onClick={() => navigate(n.link!)}>
                          {am ? "ክፈት" : "Open"}
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
