import { useState, useEffect, useCallback } from "react"
import { Check, X, RefreshCw, ShieldQuestion, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/lib/i18n"
import { supabase } from "@/lib/supabase"
import { callAdminAction } from "@/lib/api"

/**
 * Admin verification queue for community/Telegram price submissions.
 *
 * Entries are market_prices rows with source_type='telegram_observed' and
 * freshness_status='community_reported' — exactly what the /submitprice RPC
 * inserts and what price_submission notifications point at (meta.price_id).
 * Verify promotes the row to admin_verified; Reject expires it.
 */

type QueueRow = {
  id: string
  material_en: string
  city: string | null
  unit: string | null
  price: number | string
  source_name: string | null
  confidence_score: number | null
  created_at: string
  updated_at: string
}

export function TelegramPriceQueue() {
  const { language } = useLanguage()
  const am = language === "am"
  const [rows, setRows] = useState<QueueRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState("")

  const fetchQueue = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const { data, error: qErr } = await supabase
        .from("market_prices")
        .select("id, material_en, city, unit, price, source_name, confidence_score, created_at, updated_at")
        .eq("source_type", "telegram_observed")
        .eq("freshness_status", "community_reported")
        .order("created_at", { ascending: false })
        .limit(50)
      if (qErr) throw qErr
      setRows((data ?? []) as QueueRow[])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : am ? "መጫን አልተቻለም" : "Failed to load queue")
    }
    setLoading(false)
  }, [am])

  useEffect(() => {
    void fetchQueue()
  }, [fetchQueue])

  const act = async (row: QueueRow, verify: boolean) => {
    setBusyId(row.id)
    setNotice("")
    try {
      await callAdminAction("manage_market_prices", {
        priceId: row.id,
        freshness_status: verify ? "verified" : "expired",
        source_type: verify ? "admin_verified" : "telegram_observed",
        confidence_score: verify ? 90 : 20,
      })
      setNotice(
        verify
          ? am
            ? `${row.material_en} ተረጋግጧል።`
            : `${row.material_en} verified.`
          : am
            ? `${row.material_en} ተከልክሏል።`
            : `${row.material_en} rejected.`,
      )
      await fetchQueue()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : am ? "እርምጃው አልተሳካም" : "Action failed")
    }
    setBusyId(null)
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldQuestion className="h-5 w-5 text-primary" aria-hidden="true" />
            {am ? "የቴሌግራም ዋጋ ማረጋገጫ" : "Telegram price verification"}
          </CardTitle>
          <CardDescription>
            {am
              ? "ከ /submitprice የመጡ የማህበረሰብ ዋጋዎች — ከሆነ አረጋግጥ፣ ካልሆነ አትቀበል።"
              : "Community prices from /submitprice — verify to publish, reject to discard."}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {rows.length > 0 && (
            <Badge variant={rows.length > 10 ? "destructive" : "outline"}>
              {rows.length}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => void fetchQueue()} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {am ? "አድስ" : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {notice && (
          <p className="rounded-md border border-border/60 bg-accent/30 px-3 py-2 text-sm" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {am
              ? "ምንም የሚጠበቅ ዋጋ የለም — ሁሉም ተመልክቷል።"
              : "Queue is empty — every community price has been reviewed."}
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {r.material_en}
                    <span className="ms-2 text-xs text-muted-foreground">
                      {r.city ?? "—"} · {Number(r.price).toLocaleString()} ETB/{r.unit ?? "Qtl"}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {r.source_name ?? "Telegram supplier"} · confidence {r.confidence_score ?? "—"}% ·{" "}
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button size="sm" className="gap-1.5" disabled={busyId === r.id} onClick={() => act(r, true)}>
                    <Check className="h-3.5 w-3.5" />
                    {am ? "አረጋግጥ" : "Verify"}
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" disabled={busyId === r.id} onClick={() => act(r, false)}>
                    <X className="h-3.5 w-3.5" />
                    {am ? "አትቀበል" : "Reject"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    title={am ? "በዋናው ገጽ ይመልከቱ" : "See on the site"}
                    onClick={() => window.open("/#market", "_blank")}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
