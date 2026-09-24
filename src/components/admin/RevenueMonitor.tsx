import { useCallback, useEffect, useMemo, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  RefreshCw,
  Download,
  Wallet,
  TrendingUp,
  Clock,
  Wrench,
  BarChart3,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useLanguage } from "@/lib/i18n"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { DataPagination, useDataPagination } from "@/components/ui/data-pagination"
import { ConfirmActionDialog } from "@/components/admin/ConfirmActionDialog"
import { RevenueAnalytics } from "@/components/admin/RevenueAnalytics"

/**
 * Admin revenue monitoring & reporting:
 *  - KPIs from the subscription_payments ledger (this month, last 30d, all-time,
 *    active-subscriber MRR at canonical pricing)
 *  - last-12-months revenue bars + tier split
 *  - payment ledger table with search + date range
 *  - pending-payment reconciliation (heals payments that succeeded at Chapa but
 *    never activated — e.g. the pre-fix /payment/success 404 era)
 *  - tax-ready CSV export (ETB amounts, VAT 0 default, reference + tier + dates)
 */

type LedgerRow = {
  id: string
  amount: number | null
  base_amount?: number | null
  gateway_fee?: number | null
  currency: string | null
  method: string | null
  reference: string | null
  status: string | null
  created_at: string
  metadata: Record<string, unknown> | null
  payer?: { full_name?: string | null; email?: string | null } | null
}

type PendingSub = {
  id: string
  user_id: string
  tier: string | null
  chapa_reference: string | null
  created_at: string
  user?: { full_name?: string | null; email?: string | null } | null
}

type SubRow = {
  tier: string | null
  is_active: boolean | null
  status: string | null
  starts_at: string | null
  expires_at: string | null
  created_at: string
}

const LEDGER_SELECT =
  "id, amount, base_amount, gateway_fee, currency, method, reference, status, created_at, metadata, payer:users(full_name, email)"
const PENDING_SELECT =
  "id, user_id, tier, chapa_reference, created_at, user:users(full_name, email)"

const CANONICAL_PRICE: Record<string, number> = { premium: 500, pro: 1000 }

function fmtETB(n: number): string {
  return new Intl.NumberFormat("en-ET", { maximumFractionDigits: 2 }).format(n) + " ETB"
}

function monthKey(iso: string): string {
  return iso.slice(0, 7) // YYYY-MM
}

export function buildCsv(rows: LedgerRow[]): string {
  // Tax-ready layout: one row per payment with the full pass-through split:
  // gross (buyer-paid) = net revenue (base) + checkout fee (covers Chapa).
  // Net revenue is the tax-reportable figure; the fee is a processing cost.
  const header = [
    "payment_date",
    "reference",
    "tier",
    "method",
    "gross_etb",
    "checkout_fee_etb",
    "net_revenue_etb",
    "currency",
    "vat_rate",
    "vat_on_net_etb",
    "payer_name",
    "payer_email",
    "status",
  ]
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = rows.map((r) => {
    const tier = (r.metadata?.tier as string) || ""
    const gross = Number(r.amount ?? 0)
    const fee = Number(r.gateway_fee ?? 0)
    const net = Number(r.base_amount ?? gross - fee)
    return [
      new Date(r.created_at).toISOString(),
      r.reference ?? "",
      tier,
      r.method ?? "",
      gross.toFixed(2),
      fee.toFixed(2),
      net.toFixed(2),
      r.currency ?? "ETB",
      "0",
      "0.00",
      r.payer?.full_name ?? "",
      r.payer?.email ?? "",
      r.status ?? "",
    ]
      .map(esc)
      .join(",")
  })
  return [header.join(","), ...lines].join("\n")
}

export function RevenueMonitor() {
  const { language } = useLanguage()
  const am = language === "am"

  const [rows, setRows] = useState<LedgerRow[]>([])
  const [pending, setPending] = useState<PendingSub[]>([])
  const [subs, setSubs] = useState<SubRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [range, setRange] = useState<{ from: string; to: string }>({ from: "", to: "" })
  const [reconcileTarget, setReconcileTarget] = useState<PendingSub | null>(null)
  const [reconciling, setReconciling] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const yearAgo = new Date(Date.now() - 400 * 24 * 3600 * 1000).toISOString()
      const [ledgerRes, pendingRes, subsRes] = await Promise.all([
        supabase
          .from("subscription_payments")
          .select(LEDGER_SELECT)
          .gte("created_at", yearAgo)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("premium_subscriptions")
          .select(PENDING_SELECT)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("premium_subscriptions")
          .select("tier, is_active, status, starts_at, expires_at, created_at")
          .gte("created_at", yearAgo),
      ])
      if (ledgerRes.error) throw ledgerRes.error
      if (pendingRes.error) throw pendingRes.error
      if (subsRes.error) throw subsRes.error
      setRows((ledgerRes.data ?? []) as LedgerRow[])
      setPending((pendingRes.data ?? []) as PendingSub[])
      setSubs((subsRes.data ?? []) as SubRow[])
    } catch (e) {
      setError(e instanceof Error ? e.message : am ? "መጫን አልተቻለም።" : "Failed to load revenue data.")
    } finally {
      setLoading(false)
    }
  }, [am])

  useEffect(() => {
    void load()
  }, [load])

  const activeSubs = useMemo(() => {
    const tierCounts = new Map<string, number>()
    for (const s of subs) {
      if (s.is_active && s.status !== "expired" && s.status !== "cancelled") {
        tierCounts.set(s.tier ?? "unknown", (tierCounts.get(s.tier ?? "unknown") ?? 0) + 1)
      }
    }
    return [...tierCounts.entries()].map(([tier, count]) => ({ tier, count }))
  }, [subs])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (range.from && r.created_at < new Date(range.from).toISOString()) return false
      if (range.to && r.created_at > new Date(range.to + "T23:59:59Z").toISOString()) return false
      if (!q) return true
      const hay = [r.reference, r.payer?.full_name, r.payer?.email, r.metadata?.tier, r.method]
        .map((x) => String(x ?? "").toLowerCase())
        .join(" ")
      return hay.includes(q)
    })
  }, [rows, search, range])
  const { pageItems: ledgerPageItems, paginationProps: ledgerPagination } =
    useDataPagination(filtered, "revenue-ledger", 25)

  const kpis = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const d30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
    const completed = rows.filter((r) => r.status === "completed")
    // Net revenue (base_amount) is the headline figure: what YeBetWeg keeps
    // after the pass-through checkout fee that covers Chapa.
    const sumNet = (list: LedgerRow[]) =>
      list.reduce((a, r) => a + Number(r.base_amount ?? r.amount ?? 0), 0)
    const sumFees = (list: LedgerRow[]) =>
      list.reduce((a, r) => a + Number(r.gateway_fee ?? 0), 0)
    const mrr = activeSubs.reduce((a, s) => a + (CANONICAL_PRICE[s.tier] ?? 0) * s.count, 0)
    return {
      thisMonth: sumNet(completed.filter((r) => r.created_at >= monthStart)),
      last30: sumNet(completed.filter((r) => r.created_at >= d30)),
      allTime: sumNet(completed),
      feesThisMonth: sumFees(completed.filter((r) => r.created_at >= monthStart)),
      mrr,
      countThisMonth: completed.filter((r) => r.created_at >= monthStart).length,
    }
  }, [rows, activeSubs])

  const monthly = useMemo(() => {
    const buckets = new Map<string, number>()
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      buckets.set(d.toISOString().slice(0, 7), 0)
    }
    for (const r of rows) {
      if (r.status !== "completed") continue
      const k = monthKey(r.created_at)
      if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + Number(r.amount ?? 0))
    }
    return [...buckets.entries()].map(([month, total]) => ({ month, total }))
  }, [rows])

  const byTier = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>()
    for (const r of rows) {
      if (r.status !== "completed") continue
      const tier = String(r.metadata?.tier ?? "unknown")
      const cur = map.get(tier) ?? { total: 0, count: 0 }
      cur.total += Number(r.amount ?? 0)
      cur.count += 1
      map.set(tier, cur)
    }
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total)
  }, [rows])

  const maxMonthly = Math.max(1, ...monthly.map((m) => m.total))

  const reconcile = async () => {
    if (!reconcileTarget?.chapa_reference) return
    setReconciling(true)
    try {
      const { data, error: rpcErr } = await supabase.rpc("admin_activate_subscription", {
        p_reference: reconcileTarget.chapa_reference,
        p_note: "Reconciled from Revenue monitor (payment succeeded but activation failed)",
      })
      if (rpcErr) throw rpcErr
      const res = data as { success?: boolean; error?: string }
      if (res && res.success === false) throw new Error(res.error || "Activation failed")
      setReconcileTarget(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reconciliation failed")
    } finally {
      setReconciling(false)
    }
  }

  const exportCsv = () => {
    const csv = buildCsv(filtered)
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `yebetweg-revenue-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {am ? "በመጫን ላይ…" : "Loading revenue data…"}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5 text-xs">
            <Wallet className="h-3.5 w-3.5" />
            {am ? "አጠቃላይ" : "Overview"}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" />
            {am ? "ትንተና እና ግብር" : "Analytics & tax"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Wallet className="h-4 w-4" />
              {am ? "የዚህ ወር ገቢ" : "This month"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{fmtETB(kpis.thisMonth)}</p>
            <p className="text-xs text-muted-foreground">
              {am ? `${kpis.countThisMonth} ክፍያዎች` : `${kpis.countThisMonth} payments`}
              {kpis.feesThisMonth > 0 &&
                ` · ${am ? "ክፍያ ከፍሏል" : "fees"} ${fmtETB(kpis.feesThisMonth)}`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              {am ? "የመጨረሻ 30 ቀን" : "Last 30 days"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{fmtETB(kpis.last30)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" />
              {am ? "ሁሉም ጊዜ" : "All time"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{fmtETB(kpis.allTime)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              {am ? "ወርሃዊ ተመን (MRR)" : "Active-subscriber MRR"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{fmtETB(kpis.mrr)}</p>
            <p className="text-xs text-muted-foreground">
              {am
                ? activeSubs.map((s) => `${s.count} ${s.tier}`).join(", ")
                : activeSubs.map((s) => `${s.count}× ${s.tier}`).join(", ") || "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly bars + tier split */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {am ? "የወር በወር ገቢ (12 ወር)" : "Monthly revenue (12 months)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-32 items-end gap-1.5" role="img" aria-label={am ? "የወር ገቢ ቻርት" : "Monthly revenue chart"}>
              {monthly.map((m) => (
                <div key={m.month} className="group relative flex-1">
                  <div
                    className="w-full rounded-t bg-primary/80 transition-all group-hover:bg-primary"
                    style={{ height: `${Math.max(2, (m.total / maxMonthly) * 100)}%` }}
                  />
                  <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background group-hover:block">
                    {m.month}: {fmtETB(m.total)}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>{monthly[0]?.month}</span>
              <span>{monthly[monthly.length - 1]?.month}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{am ? "በእቅድ ገቢ" : "Revenue by tier"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {byTier.length === 0 && (
              <p className="text-xs text-muted-foreground">{am ? "እስካሁን መረጃ የለም።" : "No payments yet."}</p>
            )}
            {byTier.map(([tier, v]) => (
              <div key={tier} className="flex items-center justify-between text-xs">
                <span className="capitalize">{tier}</span>
                <span className="font-medium">
                  {fmtETB(v.total)} <span className="text-muted-foreground">({v.count}×)</span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Pending reconciliation */}
      {pending.length > 0 && (
        <Card className="border-amber-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
              <Wrench className="h-4 w-4 text-amber-500" />
              {am ? "ያልተከናወኑ ክፍያዎች" : "Pending payments"}
              <Badge variant="outline" className="ml-1 border-amber-500 text-amber-600">
                {pending.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {am
                ? "ክፍያው በቻፓ ተሳክቶ ንቁነት ያልተመዘገበለት ወይም ገና ያልተጠናቀቀ። ክፍያው በቻፓ ተረጋግጧል ከሆነ እዚህ ላይ ያረጋግጡ።"
                : "Payments that never completed activation (webhook or return-page failure). Verify at Chapa first; if paid, reconcile here."}
            </p>
            {pending.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border/60 p-2.5 text-xs"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {p.tier} — {p.user?.full_name || p.user?.email || p.user_id.slice(0, 8)}
                  </p>
                  <p className="truncate text-muted-foreground">
                    {p.chapa_reference ?? "—"} · {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setReconcileTarget(p)}>
                  {am ? "አንቁ" : "Activate"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Ledger */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center gap-2 pb-2">
          <CardTitle className="text-sm font-medium">
            {am ? "የክፍያ መዝገብ" : "Payment ledger"}
          </CardTitle>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={am ? "ፍለጋ…" : "Search…"}
              className="h-8 w-40 text-xs"
              aria-label={am ? "ክፍያዎችን ፈልግ" : "Search payments"}
            />
            <Input
              type="date"
              value={range.from}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              className="h-8 w-[130px] text-xs"
              aria-label={am ? "ከ ቀን" : "From date"}
            />
            <Input
              type="date"
              value={range.to}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              className="h-8 w-[130px] text-xs"
              aria-label={am ? "እስከ ቀን" : "To date"}
            />
            <Button size="sm" variant="outline" onClick={() => void load()} aria-label={am ? "እንደገና ጫን" : "Refresh"}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="mr-1 h-3.5 w-3.5" />
              {am ? "CSV አውጣ" : "Export CSV"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-1.5 pr-2 font-medium">{am ? "ቀን" : "Date"}</th>
                  <th className="py-1.5 pr-2 font-medium">{am ? "አባል" : "Payer"}</th>
                  <th className="py-1.5 pr-2 font-medium">{am ? "እቅድ" : "Tier"}</th>
                  <th className="py-1.5 pr-2 font-medium">{am ? "መጠን" : "Amount"}</th>
                  <th className="py-1.5 pr-2 font-medium">{am ? "የመክፈያ ክፍያ" : "Checkout fee"}</th>
                  <th className="py-1.5 pr-2 font-medium">{am ? "ንጹህ ገቢ" : "Net revenue"}</th>
                  <th className="py-1.5 pr-2 font-medium">{am ? "ማጣቀሻ" : "Reference"}</th>
                  <th className="py-1.5 font-medium">{am ? "ሁኔታ" : "Status"}</th>
                </tr>
              </thead>
              <tbody>
                {ledgerPageItems.map((r) => (
                  <tr key={r.id} className="border-b border-border/40">
                    <td className="py-1.5 pr-2 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="max-w-[160px] truncate py-1.5 pr-2">
                      {r.payer?.full_name || r.payer?.email || "—"}
                    </td>
                    <td className="py-1.5 pr-2 capitalize">{String(r.metadata?.tier ?? "—")}</td>
                    <td className="py-1.5 pr-2 font-medium">{fmtETB(Number(r.amount ?? 0))}</td>
                    <td className="py-1.5 pr-2 text-muted-foreground">
                      {fmtETB(Number(r.gateway_fee ?? 0))}
                    </td>
                    <td className="py-1.5 pr-2 font-medium">
                      {fmtETB(Number(r.base_amount ?? Number(r.amount ?? 0) - Number(r.gateway_fee ?? 0)))}
                    </td>
                    <td className="max-w-[140px] truncate py-1.5 pr-2 font-mono">{r.reference ?? "—"}</td>
                    <td className="py-1.5">
                      <Badge
                        variant="outline"
                        className={
                          r.status === "completed"
                            ? "border-green-500 text-green-600"
                            : "border-muted-foreground text-muted-foreground"
                        }
                      >
                        {r.status ?? "—"}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-4 text-center text-muted-foreground">
                      {am ? "መዝገብ ባዶ ነው።" : "No payments match."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <DataPagination {...ledgerPagination} />
          </div>
        </CardContent>
      </Card>

        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <RevenueAnalytics
            ledger={rows}
            subscriptions={subs}
            business={{
              legalName: "YeBetWeg",
              tin: "",
              vatRegistered: false,
              address: "Addis Ababa, Ethiopia",
            }}
          />
        </TabsContent>
      </Tabs>

      <ConfirmActionDialog
        open={reconcileTarget !== null}
        onOpenChange={(o) => !o && setReconcileTarget(null)}
        title={am ? "ክፍያን አንቁ" : "Activate this payment?"}
        description={
          reconcileTarget
            ? am
              ? `"${reconcileTarget.chapa_reference}" — ክፍያው በቻፓ ተረጋግጧል እንደᆞት አረጋግጡ። ይህ አባሉን ንቁ ያደርገዋል።`
              : `Reference "${reconcileTarget.chapa_reference}" — confirm the payment succeeded at Chapa before activating. This marks the subscription active and upgrades the member.`
            : ""
        }
        confirmLabel={am ? "አረጋግጥ" : "Confirm activation"}
        onConfirm={() => void reconcile()}
        busy={reconciling}
      />
    </div>
  )
}
