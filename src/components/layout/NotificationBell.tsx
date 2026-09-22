import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Bell, BellRing, Check, CheckCheck, Clock, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/i18n"
import { useNotifications } from "@/hooks/useNotifications"

function timeAgo(iso: string, am: boolean): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return am ? "አሁን" : "now"
  if (mins < 60) return am ? `${mins} ደቂቃ` : `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return am ? `${hours} ሰዓት` : `${hours}h`
  const days = Math.floor(hours / 24)
  return am ? `${days} ቀን` : `${days}d`
}

export function NotificationBell({ isAdmin = false }: { isAdmin?: boolean }) {
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const { notifications, unreadCount, isLoading, error, markRead, markAllRead, isMarkingRead } =
    useNotifications(isAdmin)
  const [open, setOpen] = useState(false)

  const am = language === "am"

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-9 w-9 p-0"
          aria-label={`${t("notif.title")}${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
          // Announce unread-count changes to screen readers (count itself is
          // aria-hidden inside the button, so this is the single spoken source).
          aria-live={"polite"}
        >
          {unreadCount > 0 ? (
            <BellRing className="h-4 w-4 text-primary" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          {unreadCount > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground"
              aria-hidden="true"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
        <div className="flex items-center justify-between px-2 py-1">
          <DropdownMenuLabel className="p-0">{t("notif.title")}</DropdownMenuLabel>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              setOpen(false)
              navigate("/notifications")
            }}
          >
            {t("notif.viewAll")}
          </Button>
        </div>
        {unreadCount > 0 && (
          <div className="px-2 pb-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-full justify-center gap-1 px-2 text-xs"
              disabled={isMarkingRead}
              onClick={() => markAllRead()}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {t("notif.markAllRead")}
            </Button>
          </div>
        )}
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {t("notif.loading")}
            </p>
          ) : error ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {t("notif.error")}
            </p>
          ) : notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {t("notif.empty")}
            </p>
          ) : (
            <ul className="py-1">
              {notifications.map((n) => {
                const unread = n.read_at === null
                return (
                  <li key={n.id}>
                    <div
                      className={cn(
                        "flex w-full items-start gap-2 px-3 py-2 text-left text-sm",
                        unread && "bg-accent/40",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm leading-snug", unread && "font-semibold")}>
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {n.body}
                          </p>
                        )}
                        <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/70">
                          <Clock className="h-3 w-3" />
                          {timeAgo(n.created_at, am)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        {unread && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            title={t("notif.markRead")}
                            disabled={isMarkingRead}
                            onClick={() => markRead([n.id])}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {n.link && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              setOpen(false)
                              if (n.link) navigate(n.link)
                            }}
                            title={t("notif.viewAll")}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
