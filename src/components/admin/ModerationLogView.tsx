import { useEffect, useMemo, useState } from "react"
import { Loader2, RefreshCw, ScrollText, SearchX } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { useLanguage } from "@/lib/i18n"
import { DataPagination, useDataPagination } from "@/components/ui/data-pagination"

// ============================================================================
// Moderation log (admin) — the in-app window over public.moderation_log.
// Rows land here from the tip Q&A delete triggers (20260924000000: every
// question/answer deletion, whoever triggered it, with a content snapshot)
// and from payment reconciliations (admin_activate_subscription writes
// action='payment_reconciled', 20260924120000). Admin-only via RLS.
// ============================================================================

type LogRow = {
  id: string
  actor_id: string | null
  action: string
  target_id: string | null
  target_user_id: string | null
  detail: Record<string, unknown> | null
  created_at: string
  actor?: { full_name: string | null; email: string | null; role: string | null } | null
  target_user?: { full_name: string | null; email: string | null } | null
}

const LOG_SELECT =
  "id, actor_id, action, target_id, target_user_id, detail, created_at, " +
  "actor:users!moderation_log_actor_id_fkey(full_name, email, role), " +
  "target_user:users!moderation_log_target_user_id_fkey(full_name, email)"

/** One row per action type with its bilingual label + badge tone. */
const ACTION_META: Record<string, { en: string; am: string; tone: "default" | "secondary" | "destructive" | "outline" }> = {
  tip_question_delete: { en: "Question deleted", am: "ጥያቄ ተሰርዟል", tone: "destructive" },
  tip_answer_delete: { en: "Answer deleted", am: "መልስ ተሰርዟል", tone: "destructive" },
  payment_reconciled: { en: "Payment reconciled", am: "ክፍያ ተስተካክሏል", tone: "default" },
}

function actionLabel(action: string, am: boolean): string {
  return ACTION_META[action]?.[am ? "am" : "en"] ?? action
}

function actionTone(action: string): "default" | "secondary" | "destructive" | "outline" {
  return ACTION_META[action]?.tone ?? "outline"
}

/** Human summary of the JSON detail snapshot for a row. */
function detailSummary(detail: Record<string, unknown> | null): string {
  if (!detail) return ""
  const parts: string[] = []
  if (typeof detail.question === "string") parts.push(detail.question)
  if (typeof detail.answer === "string") parts.push(detail.answer)
  if (typeof detail.reference === "string") parts.push(`ref ${detail.reference}`)
  if (typeof detail.note === "string" && detail.note) parts.push(`note: ${detail.note}`)
  if (typeof detail.tip_id === "string") parts.push(`tip ${String(detail.tip_id).slice(0, 8)}`)
  // tier_pricing_updated: { previous: {...}, new: {...} } — show the per-tier diff.
  if (detail.new && typeof detail.new === "object" && detail.previous !== undefined) {
    const prev = (detail.previous ?? {}) as Record<string, unknown>
    const next = detail.new as Record<string, unknown>
    const diff = Object.keys(next)
      .map((k) =>
        prev[k] === next[k]
          ? `${k} ${String(next[k])} (unchanged)`
          : `${k} ${String(prev[k] ?? "—")} → ${String(next[k])}`
      )
      .join(", ")
    if (diff) parts.push(diff)
  }
  return parts.join(" · ")
}

export function ModerationLogView() {
  const { language } = useLanguage()
  const am = language === "am"
  const [rows, setRows] = useState<LogRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState<string>("all")

  const load = async () => {
    setIsLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from("moderation_log")
      .select(LOG_SELECT)
      .order("created_at", { ascending: false })
      .limit(500)
    if (error) setError(error.message)
    else setRows((data ?? []) as unknown as LogRow[])
    setIsLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const actions = useMemo(
    () => [...new Set(rows.map((r) => r.action))].sort(),
    [rows],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (actionFilter !== "all" && r.action !== actionFilter) return false
      if (!q) return true
      const hay = [
        actionLabel(r.action, false),
        r.actor?.full_name,
        r.actor?.email,
        r.target_user?.full_name,
        r.target_user?.email,
        detailSummary(r.detail),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [rows, search, actionFilter])

  const { pageItems, paginationProps } = useDataPagination(filtered, "admin-moderation-log", 25)

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <ScrollText className="h-4 w-4" />
            {am ? "የሞደራሲዮን መዝገብ" : "Moderation log"}
          </h3>
          <Badge variant="secondary" className="text-[10px]">
            {am ? `${filtered.length} ክፍይታዎች` : `${filtered.length} entries`}
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={am ? "ፈልግ…" : "Search content, actor, note…"}
              className="h-8 w-44 text-xs"
              aria-label={am ? "መዝገብ ፈልግ" : "Search moderation log"}
            />
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-8 w-40 text-xs" aria-label={am ? "የተግባር ማጣሪያ" : "Filter by action"}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{am ? "ሁሉም ተግባራት" : "All actions"}</SelectItem>
                {actions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {actionLabel(a, am)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8" onClick={() => void load()} disabled={isLoading} aria-label={am ? "እድሳት" : "Refresh"}>
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
            {error}
          </p>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
            <SearchX className="h-8 w-8 opacity-50" />
            <p className="text-xs">{am ? "ምንም መዝገብ አልተገኘም።" : "No moderation entries yet — deletions and reconciliations will appear here."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="p-2 font-medium">{am ? "ቀን" : "When"}</th>
                  <th className="p-2 font-medium">{am ? "ተግባር" : "Action"}</th>
                  <th className="p-2 font-medium">{am ? "በማን" : "Actor"}</th>
                  <th className="p-2 font-medium">{am ? "የይዘት ባለቤት" : "Content owner"}</th>
                  <th className="p-2 font-medium">{am ? "ዝርዝር" : "Detail"}</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((r) => (
                  <tr key={r.id} className="border-b align-top last:border-0 hover:bg-muted/30">
                    <td className="whitespace-nowrap p-2 text-muted-foreground">
                      {new Date(r.created_at).toLocaleString(undefined, {
                        year: "2-digit", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="p-2">
                      <Badge variant={actionTone(r.action)} className="text-[10px]">
                        {actionLabel(r.action, am)}
                      </Badge>
                    </td>
                    <td className="p-2">
                      {r.actor ? (
                        <span>
                          {r.actor.full_name || r.actor.email || "—"}
                          {r.actor.role === "admin" && (
                            <span className="ml-1 text-[10px] text-muted-foreground">({am ? "አስተዳዳሪ" : "admin"})</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{am ? "ሥርዓት" : "system"}</span>
                      )}
                    </td>
                    <td className="p-2 text-muted-foreground">
                      {r.target_user?.full_name || r.target_user?.email || "—"}
                    </td>
                    <td className="max-w-[360px] p-2">
                      <span className="line-clamp-2 text-muted-foreground">{detailSummary(r.detail) || "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <DataPagination {...paginationProps} className="border-t px-2" />
          </div>
        )}

        <p className="text-[10px] leading-relaxed text-muted-foreground">
          {am
            ? "ሁሉም የይዘት ማጥፋት እና የክፍያ ማስተካከያ ተግባራት ከመዝገብ ጋር ይመዘገባሉ።"
            : "Every Q&A deletion (owner or admin) and every payment reconciliation is recorded here automatically, with a content snapshot — for the audit trail."}
        </p>
      </CardContent>
    </Card>
  )
}
