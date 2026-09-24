import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus, FileSpreadsheet, Printer, Landmark } from "lucide-react"
import { useLanguage } from "@/lib/i18n"

/**
 * Revenue analytics + Ethiopian tax reporting, computed from the
 * subscription_payments ledger (same rows the Revenue Monitor loads).
 *
 * Analytics:
 *  - Month-over-month growth (absolute + %) with per-month deltas
 *  - Churn indicators from premium_subscriptions: cancellations (is_active
 *    flipped false), expirations in-window, and net subscriber movement
 *  - Simplex churn rate = churned in month / active at month start
 *
 * Ethiopian tax context (FRS-small / general):
 *  - VAT rate: 15% (VAT Proclamation 285/2002, as amended)
 *  - Turnover Tax (ToT): 2% for taxpayers below the VAT registration threshold
 *  - This report is a SUMMARY computed from recorded sales (subscription
 *    payments). It is not a substitute for the taxpayer's official books —
 *    amounts are exclusive of VAT unless the business is VAT-registered, in
 *    which case output VAT is computed and shown per period.
 */

type LedgerRow = {
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

type SubRow = {
  tier: string | null
  is_active: boolean | null
  status: string | null
  starts_at: string | null
  expires_at: string | null
  created_at: string
}

type Props = {
  ledger: LedgerRow[]
  subscriptions: SubRow[]
  business: {
    legalName: string
    tin: string
    vatRegistered: boolean
    address: string
  }
}

const VAT_RATE = 0.15
const TOT_RATE = 0.02

function fmtETB(n: number): string {
  return new Intl.NumberFormat("en-ET", { maximumFractionDigits: 2 }).format(n) + " ETB"
}

function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

function monthLabel(key: string, am: boolean): string {
  const [y, m] = key.split("-").map(Number)
  const d = new Date(y, m - 1, 1)
  return d.toLocaleDateString(am ? "am-ET" : "en", { month: "short", year: "2-digit" })
}

function lastNMonths(n: number): string[] {
  const out: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    out.push(new Date(now.getFullYear(), now.getMonth() - i, 1).toISOString().slice(0, 7))
  }
  return out
}

type MonthlyStat = {
  month: string
  revenue: number
  payments: number
  growth: number | null // ETB delta vs previous month
  growthPct: number | null
  churned: number
  newSubs: number
  activeStart: number
  churnRate: number | null
}

export function computeMonthlyStats(ledger: LedgerRow[], subs: SubRow[]): MonthlyStat[] {
  const months = lastNMonths(12)
  const revenue = new Map<string, { total: number; count: number }>()
  for (const r of ledger) {
    if (r.status !== "completed") continue
    const k = monthKey(r.created_at)
    const cur = revenue.get(k) ?? { total: 0, count: 0 }
    // Net revenue (base_amount): what YeBetWeg keeps after the pass-through
    // checkout fee. Falls back to amount for legacy rows without the split.
    revenue.set(k, { total: cur.total + Number(r.base_amount ?? r.amount ?? 0), count: cur.count + 1 })
  }

  // Subscriber movement per month: new subs by starts_at/created_at, churned by
  // an inactive row whose expiry (or update) falls in the month.
  const activeStart = new Map<string, number>()
  const churned = new Map<string, number>()
  const newSubs = new Map<string, number>()
  for (const m of months) {
    activeStart.set(m, 0)
    churned.set(m, 0)
    newSubs.set(m, 0)
  }
  for (const s of subs) {
    const startKey = monthKey(s.starts_at || s.created_at)
    if (newSubs.has(startKey)) newSubs.set(startKey, (newSubs.get(startKey) ?? 0) + 1)
    const endKey = s.expires_at ? monthKey(s.expires_at) : null
    const churnedNow = !s.is_active || s.status === "expired" || s.status === "cancelled"
    if (churnedNow && endKey && churned.has(endKey)) {
      churned.set(endKey, (churned.get(endKey) ?? 0) + 1)
    }
    // Per-month active-at-start: started before the month began and not ended
    // before it. Computed per month so late joiners raise later months.
    for (const m of months) {
      const [y, mm] = m.split("-").map(Number)
      const monthStart = new Date(y, mm - 1, 1)
      const started = new Date(s.starts_at || s.created_at)
      const ended = s.expires_at ? new Date(s.expires_at) : null
      if (started < monthStart && (!ended || ended >= monthStart)) {
        activeStart.set(m, (activeStart.get(m) ?? 0) + 1)
      }
    }
  }

  return months.map((m, i) => {
    const rev = revenue.get(m) ?? { total: 0, count: 0 }
    const prev = i > 0 ? (revenue.get(months[i - 1]) ?? { total: 0, count: 0 }) : null
    const growth = prev ? rev.total - prev.total : null
    const growthPct = prev && prev.total > 0 ? (growth! / prev.total) * 100 : prev ? null : null
    const churn = churned.get(m) ?? 0
    const act = activeStart.get(m) ?? 0
    return {
      month: m,
      revenue: rev.total,
      payments: rev.count,
      growth,
      growthPct,
      churned: churn,
      newSubs: newSubs.get(m) ?? 0,
      activeStart: act,
      churnRate: act + churn > 0 ? churn / (act + churn) : null,
    }
  })
}

export function RevenueAnalytics({ ledger, subscriptions, business }: Props) {
  const { language } = useLanguage()
  const am = language === "am"
  const [period, setPeriod] = useState<string>(() => new Date().toISOString().slice(0, 7))
  const [tin, setTin] = useState(business.tin)
  const [legalName, setLegalName] = useState(business.legalName)
  const [vatRegistered, setVatRegistered] = useState(business.vatRegistered)
  const [address, setAddress] = useState(business.address)

  const stats = useMemo(() => computeMonthlyStats(ledger, subscriptions), [ledger, subscriptions])
  const maxRev = Math.max(1, ...stats.map((s) => s.revenue))
  const latest = stats[stats.length - 1]
  const prev = stats[stats.length - 2]
  const momGrowth = latest && prev && prev.revenue > 0 ? ((latest.revenue - prev.revenue) / prev.revenue) * 100 : null

  // --- Tax period summary (Ethiopian calendar-neutral: calendar month) ---
  const taxSummary = useMemo(() => {
    const inPeriod = ledger.filter(
      (r) => r.status === "completed" && monthKey(r.created_at) === period,
    )
    // Pass-through model: the buyer-paid gross includes the checkout fee that
    // covers Chapa. The business's taxable sales figure is the NET revenue
    // (base_amount) — the fee is a processing cost, not income.
    const gross = inPeriod.reduce((a, r) => a + Number(r.amount ?? 0), 0)
    const fees = inPeriod.reduce((a, r) => a + Number(r.gateway_fee ?? 0), 0)
    const netRevenue = inPeriod.reduce(
      (a, r) => a + Number(r.base_amount ?? r.amount ?? 0),
      0,
    )
    // Canonical pricing is VAT-inclusive at face value; if VAT-registered,
    // separate output VAT (15/115 of the net revenue) and show net sales.
    const vat = vatRegistered ? netRevenue - netRevenue / (1 + VAT_RATE) : 0
    const net = netRevenue - vat
    const tot = !vatRegistered ? netRevenue * TOT_RATE : 0
    return {
      payments: inPeriod.length,
      gross,
      fees,
      netRevenue,
      vat,
      net,
      tot,
      dueLabel: vatRegistered ? "VAT (15%)" : "Turnover Tax (2%)",
      due: vatRegistered ? vat : tot,
    }
  }, [ledger, period, vatRegistered])

  const periodRows = useMemo(
    () =>
      ledger.filter((r) => r.status === "completed" && monthKey(r.created_at) === period),
    [ledger, period],
  )

  const exportTaxCsv = () => {
    const esc = (v: string | number | null | undefined) => {
      const s = v === null || v === undefined ? "" : String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const header = [
      "tax_period", "legal_name", "tin", "address", "vat_registered",
      "payment_date", "reference", "tier", "method",
      "buyer_paid_etb", "checkout_fee_etb", "net_revenue_etb",
      "output_vat_etb", "net_sales_etb", "tot_etb",
    ]
    const lines = periodRows.map((r) => {
      const buyerPaid = Number(r.amount ?? 0)
      const fee = Number(r.gateway_fee ?? 0)
      const netRev = Number(r.base_amount ?? buyerPaid - fee)
      const vat = vatRegistered ? netRev - netRev / (1 + VAT_RATE) : 0
      const net = netRev - vat
      const tot = !vatRegistered ? netRev * TOT_RATE : 0
      return [
        period, legalName, tin, address, vatRegistered ? "yes" : "no",
        new Date(r.created_at).toISOString(), r.reference ?? "",
        String(r.metadata?.tier ?? ""), r.method ?? "",
        buyerPaid.toFixed(2), fee.toFixed(2), netRev.toFixed(2),
        vat.toFixed(2), net.toFixed(2), tot.toFixed(2),
      ].map(esc).join(",")
    })
    const totals = [
      `TOTALS,,,,,,${periodRows.length} payments,,,,`,
      `${taxSummary.gross.toFixed(2)}`, `${taxSummary.fees.toFixed(2)}`,
      `${taxSummary.netRevenue.toFixed(2)}`,
      taxSummary.vat.toFixed(2), taxSummary.net.toFixed(2), taxSummary.tot.toFixed(2),
    ].join(",")
    const blob = new Blob(["\uFEFF" + [header.join(","), ...lines, totals].join("\n")], {
      type: "text/csv;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `yebetweg-tax-${period}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const printReport = () => {
    const win = window.open("", "_blank", "width=820,height=1000")
    if (!win) return
    const rows = periodRows
      .map(
        (r) => {
          const buyerPaid = Number(r.amount ?? 0)
          const fee = Number(r.gateway_fee ?? 0)
          const netRev = Number(r.base_amount ?? buyerPaid - fee)
          return `<tr>
          <td>${new Date(r.created_at).toLocaleDateString()}</td>
          <td>${r.reference ?? ""}</td>
          <td>${r.metadata?.tier ?? ""}</td>
          <td style="text-align:right">${buyerPaid.toFixed(2)}</td>
          <td style="text-align:right">${fee.toFixed(2)}</td>
          <td style="text-align:right">${netRev.toFixed(2)}</td>
          <td style="text-align:right">${(vatRegistered ? netRev - netRev / (1 + VAT_RATE) : 0).toFixed(2)}</td>
          <td style="text-align:right">${(!vatRegistered ? netRev * TOT_RATE : 0).toFixed(2)}</td>
        </tr>`
        },
      )
      .join("")
    win.document.write(`<!doctype html><html><head><title>Tax summary ${period}</title>
      <style>
        body{font-family:system-ui,sans-serif;margin:32px;color:#111}
        h1{font-size:20px;margin:0 0 4px} h2{font-size:14px;margin:24px 0 8px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}
        th{background:#f3f4f6}
        .meta{color:#444;font-size:13px;line-height:1.6}
        .totals td{font-weight:700;background:#fafafa}
        .disclaimer{margin-top:20px;font-size:11px;color:#666}
      </style></head><body>
      <h1>Sales / Revenue Tax Summary — ${period}</h1>
      <div class="meta">
        <strong>${legalName}</strong><br/>
        TIN: ${tin}<br/>
        Address: ${address}<br/>
        Tax scheme: ${vatRegistered ? "VAT-registered (15%)" : "Turnover Tax (2%)"}
      </div>
      <h2>Payments in period (${rows.length})</h2>
      <table><thead><tr><th>Date</th><th>Reference</th><th>Tier</th>
        <th style="text-align:right">Buyer paid (gross ETB)</th>
        <th style="text-align:right">Checkout fee</th>
        <th style="text-align:right">Net revenue ETB</th>
        <th style="text-align:right">Output VAT</th>
        <th style="text-align:right">ToT</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot class="totals"><tr>
        <td colspan="3">Totals</td>
        <td style="text-align:right">${taxSummary.gross.toFixed(2)}</td>
        <td style="text-align:right">${taxSummary.fees.toFixed(2)}</td>
        <td style="text-align:right">${taxSummary.netRevenue.toFixed(2)}</td>
        <td style="text-align:right">${taxSummary.vat.toFixed(2)}</td>
        <td style="text-align:right">${taxSummary.tot.toFixed(2)}</td>
      </tr></tfoot></table>
      <p class="disclaimer">Computer-generated summary from the YeBetWeg subscription ledger.
      Verify against your official books before filing with the Ministry of Revenue.
      Amounts in Ethiopian Birr (ETB).</p>
      </body></html>`)
    win.document.close()
    win.print()
  }

  const growthBadge = (s: MonthlyStat) => {
    if (s.growth === null) return null
    if (s.growth > 0)
      return (
        <Badge className="gap-1 border-transparent bg-green-100 text-green-700">
          <TrendingUp className="h-3 w-3" />+{s.growthPct?.toFixed(0)}%
        </Badge>
      )
    if (s.growth < 0)
      return (
        <Badge className="gap-1 border-transparent bg-red-100 text-red-700">
          <TrendingDown className="h-3 w-3" />
          {s.growthPct?.toFixed(0)}%
        </Badge>
      )
    return (
      <Badge variant="outline" className="gap-1">
        <Minus className="h-3 w-3" /> 0%
      </Badge>
    )
  }

  return (
    <div className="space-y-4">
      {/* MoM growth */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4" />
            {am ? "የወር እድገት ትንተና" : "Month-over-month growth"}
            {momGrowth !== null && (
              <Badge
                className={
                  momGrowth >= 0
                    ? "border-transparent bg-green-100 text-green-700"
                    : "border-transparent bg-red-100 text-red-700"
                }
              >
                {momGrowth >= 0 ? "+" : ""}
                {momGrowth.toFixed(1)}% {am ? "ይህ ወር" : "this month"}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-1.5 pr-2 font-medium">{am ? "ወር" : "Month"}</th>
                  <th className="py-1.5 pr-2 font-medium">{am ? "ገቢ" : "Revenue"}</th>
                  <th className="py-1.5 pr-2 font-medium">{am ? "ክፍያዎች" : "Payments"}</th>
                  <th className="py-1.5 pr-2 font-medium">Δ {am ? "ከወር" : "MoM"}</th>
                  <th className="py-1.5 pr-2 font-medium">{am ? "አዳዲስ" : "New subs"}</th>
                  <th className="py-1.5 font-medium">{am ? "ስንቀት" : "Churn"}</th>
                </tr>
              </thead>
              <tbody>
                {[...stats].reverse().map((s) => (
                  <tr key={s.month} className="border-b border-border/40">
                    <td className="py-1.5 pr-2 whitespace-nowrap">{monthLabel(s.month, am)}</td>
                    <td className="py-1.5 pr-2 font-medium">{fmtETB(s.revenue)}</td>
                    <td className="py-1.5 pr-2">{s.payments}</td>
                    <td className="py-1.5 pr-2">
                      {s.growth === null ? "—" : `${s.growth >= 0 ? "+" : ""}${s.growth.toFixed(0)}`}{" "}
                      {growthBadge(s)}
                    </td>
                    <td className="py-1.5 pr-2">{s.newSubs}</td>
                    <td className="py-1.5">
                      {s.churnRate !== null ? `${(s.churnRate * 100).toFixed(1)}% (${s.churned})` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* revenue bars with growth overlay */}
          <div className="mt-4 flex h-24 items-end gap-1.5" role="img" aria-label={am ? "የገቢ እድገት" : "Revenue growth chart"}>
            {stats.map((s) => (
              <div key={s.month} className="group relative flex-1">
                <div
                  className={`w-full rounded-t transition-all ${
                    s.growth !== null && s.growth < 0 ? "bg-red-400/80" : "bg-primary/80"
                  }`}
                  style={{ height: `${Math.max(2, (s.revenue / maxRev) * 100)}%` }}
                />
                <div className="pointer-events-none absolute -top-9 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background group-hover:block">
                  {monthLabel(s.month, am)}: {fmtETB(s.revenue)}
                  {s.growth !== null ? ` (${s.growth >= 0 ? "+" : ""}${s.growthPct?.toFixed(0)}%)` : ""}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ethiopian tax report */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Landmark className="h-4 w-4" />
            {am ? "የግብር ዘገባ ማጠቃለያ (የኢትዮጵያ ገቢዎች ሚኒስቴር)" : "Ethiopian revenue / tax period summary"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label className="text-xs">
              <span className="mb-1 block text-muted-foreground">{am ? "የወር ወቅት" : "Period (month)"}</span>
              <Input type="month" value={period} max={new Date().toISOString().slice(0, 7)}
                onChange={(e) => setPeriod(e.target.value)} className="h-8 text-xs" />
            </label>
            <label className="text-xs">
              <span className="mb-1 block text-muted-foreground">{am ? "የተቋሙ ስም" : "Legal name"}</span>
              <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} className="h-8 text-xs" />
            </label>
            <label className="text-xs">
              <span className="mb-1 block text-muted-foreground">TIN</span>
              <Input value={tin} onChange={(e) => setTin(e.target.value)} className="h-8 text-xs" />
            </label>
            <label className="text-xs">
              <span className="mb-1 block text-muted-foreground">{am ? "አድራሻ" : "Address"}</span>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} className="h-8 text-xs" />
            </label>
          </div>

          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={vatRegistered}
              onChange={(e) => setVatRegistered(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            {am
              ? "በተመዝገበ ተቋም (ቫት 15%) ነኝ — ካልሆነ የግሩፕ ተከራይ ተከራይ 2% ይተገበራል"
              : "VAT-registered (15% output VAT) — if unchecked, Turnover Tax 2% applies instead"}
          </label>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {am ? "ክፍያዎች" : "Payments"}
              </p>
              <p className="text-lg font-bold">{taxSummary.payments}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {am ? "በተጠቃሚ የተከፈለ" : "Buyer paid (gross)"}
              </p>
              <p className="text-lg font-bold">{fmtETB(taxSummary.gross)}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {am ? "የመክፈያ ክፍያ" : "Checkout fees"}
              </p>
              <p className="text-lg font-bold text-muted-foreground">−{fmtETB(taxSummary.fees)}</p>
            </div>
            <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
              <p className="text-[10px] uppercase tracking-wide text-primary">
                {am ? "ንጹህ ገቢ (የግብር መሰረት)" : "Net revenue (tax base)"}
              </p>
              <p className="text-lg font-bold text-primary">{fmtETB(taxSummary.netRevenue)}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {am ? "ካለ ቫት ሽያጭ" : "Sales excl. VAT"}
              </p>
              <p className="text-lg font-bold">{fmtETB(taxSummary.net)}</p>
            </div>
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
              <p className="text-[10px] uppercase tracking-wide text-amber-700">{taxSummary.dueLabel}</p>
              <p className="text-lg font-bold text-amber-700">{fmtETB(taxSummary.due)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={printReport}>
              <Printer className="mr-1 h-3.5 w-3.5" />
              {am ? "አትም (MoR ቅርጸት)" : "Print (MoR-ready)"}
            </Button>
            <Button size="sm" variant="outline" onClick={exportTaxCsv} disabled={periodRows.length === 0}>
              <FileSpreadsheet className="mr-1 h-3.5 w-3.5" />
              {am ? "የግብር CSV" : "Tax CSV"}
            </Button>
          </div>
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            {am
              ? "ከሰርተፍኬሽን ክፍያ መዝገብ የተሰላ ማጠቃለያ ብቻ ነው — ከመክፈል በፊት ከኦፊሴላዊ መጽሐፍትዎ ያረጋግጡ።"
              : "Computed summary from the subscription ledger only — reconcile against your official books before filing with the Ministry of Revenue. VAT per Proclamation 285/2002; ToT per Proclamation 308/2002. Under the pass-through model, buyers pay a +2% checkout fee covering the Chapa transaction fee; the tax base is the NET revenue the business keeps, not the buyer-paid gross."}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
