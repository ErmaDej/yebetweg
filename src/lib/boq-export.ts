import type { BoqEstimate } from "@/hooks/useBoqEstimates"
import type { ActualsSummary } from "@/hooks/useBoqActuals"
import type { PremiumTier } from "@/types/payment"

// ============================================================================
// Pro report export — print-ready BOQ report (with actuals variance) + CSV
// ============================================================================
// Gating: premium+ unlocks the classic CSV/print export of an estimate (and
// may attach logged actuals); the Pro report wraps it in a shareable branded
// cover sheet (client • prepared-for • date) — the "hand to a contractor or
// bank" artifact.

export type ProReportMeta = {
  clientName: string
  preparedBy: string
  notes?: string
  includeActuals: boolean
}

export const canExportBoq = (plan: PremiumTier) => plan === "premium" || plan === "pro"

export function formatEtb(n: number): string {
  return Math.round(n).toLocaleString("en-US")
}

type Section = { label: string; amount: number; indent?: boolean; note?: string }

/** One source of truth for the report rows — used by BOTH the CSV and the print sheet. */
export function buildReportRows(
  estimate: BoqEstimate,
  actuals: ActualsSummary | null,
  labels: { city: string; projectType: string; finish: string; cat: Record<string, string> }
): { meta: string[][]; sections: Section[] } {
  const i = estimate.inputs
  const o = estimate.outputs
  const meta: string[][] = [
    [labels.projectType, i.projectType],
    [labels.city, i.cityLabel || i.city],
    ["Area", `${i.area} m² · ${i.floors} floor${i.floors === 1 ? "" : "s"}`],
    ["Finish level", i.finishLevel],
    ["Contingency", `${i.contingency}%`],
    ["Date", new Date(estimate.created_at).toISOString().slice(0, 10)],
  ]

  const sections: Section[] = [
    { label: labels.cat.structure, amount: Number(o.structure) },
    { label: labels.cat.material, amount: Number(o.material) },
    ...(o.materialBreakdown ?? []).map((m) => ({
      label: `— ${labels.cat[m.key] ?? m.key}`,
      amount: Number(m.amount),
      indent: true,
      note: m.live ? "live" : "est.",
    })),
    ...((o.otherMaterials ?? 0) > 0
      ? [{ label: `— ${labels.cat.other}`, amount: Number(o.otherMaterials ?? 0), indent: true, note: "est." }]
      : []),
    { label: labels.cat.labor, amount: Number(o.labor) },
    { label: labels.cat.overhead, amount: Number(o.overhead) },
    { label: "TOTAL", amount: Number(o.total) },
  ]

  if (actuals && actuals.count > 0) {
    sections.push({ label: "", amount: 0 })
    for (const e of actuals.entries) {
      sections.push({
        label: `Actual: ${labels.cat[e.category] ?? e.category}${e.description ? ` (${e.description})` : ""}`,
        amount: Number(e.amount),
        indent: true,
      })
    }
    sections.push({ label: "ACTUAL TOTAL", amount: actuals.total })
    sections.push({
      label: "VARIANCE",
      amount: actuals.total - Number(o.total),
    })
  }

  return { meta, sections }
}

/** CSV for spreadsheets — mirrors the on-page export but includes actuals when present. */
export function buildCsv(
  estimate: BoqEstimate,
  actuals: ActualsSummary | null,
  labels: Parameters<typeof buildReportRows>[2]
): string {
  const { meta, sections } = buildReportRows(estimate, actuals, labels)
  const rows: string[][] = [["YeBetWeg BOQ — Planning Estimate"], ...meta, [], ["Item", "Amount (ETB)", "Note"]]
  for (const s of sections) rows.push([s.label, s.amount ? String(Math.round(s.amount)) : "", s.note ?? ""])
  rows.push([], ["Disclaimer", "Planning estimate only. Final BOQ needs drawings, site conditions, specifications, and current supplier quotes."])
  return rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/** Standalone print-ready HTML (branded cover sheet + sections + variance). Opens via window.open → print. */
export function buildProReportHtml(
  estimate: BoqEstimate,
  actuals: ActualsSummary | null,
  meta: ProReportMeta,
  labels: Parameters<typeof buildReportRows>[2]
): string {
  const { sections } = buildReportRows(estimate, actuals, labels)
  const i = estimate.inputs
  const o = estimate.outputs
  const today = new Date().toISOString().slice(0, 10)

  const rowsHtml = sections
    .map((s) => {
      if (!s.label && !s.amount) return `<tr class="spacer"><td colspan="3"></td></tr>`
      const total = s.label === "TOTAL" || s.label === "ACTUAL TOTAL" || s.label === "VARIANCE"
      const negative = s.label === "VARIANCE" && s.amount < 0
      return `<tr class="${total ? "total" : ""}">
        <td class="${s.indent ? "indent" : ""}">${esc(s.label)}${s.note ? ` <span class="note">(${s.note})</span>` : ""}</td>
        <td class="num">${s.amount ? formatEtb(s.amount) : "—"}</td>
        <td class="num">${total && s.label === "VARIANCE" ? (negative ? "under" : "over") : ""}</td>
      </tr>`
    })
    .join("\n")

  const variance = actuals && actuals.count > 0 ? actuals.total - Number(o.total) : null

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>YeBetWeg BOQ Report — ${esc(i.projectType)} · ${esc(i.cityLabel || i.city)}</title>
<style>
  @page { margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #1a2332; margin: 0; }
  .cover { border-bottom: 3px solid #1d4ed8; padding-bottom: 18px; margin-bottom: 22px; }
  .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 20px; color: #1d4ed8; }
  .brand .logo { width: 34px; height: 34px; border-radius: 8px; background: #1d4ed8; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 15px; }
  h1 { font-size: 21px; margin: 16px 0 4px; }
  .sub { color: #5b6472; font-size: 13px; margin: 0 0 14px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; font-size: 13px; }
  .meta div { display: flex; justify-content: space-between; border-bottom: 1px dotted #d7dbe2; padding: 3px 0; }
  .meta span:first-child { color: #5b6472; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 6px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #5b6472; border-bottom: 2px solid #1a2332; padding: 6px 4px; }
  td { padding: 6px 4px; border-bottom: 1px solid #e8ebf0; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  tr.total td { font-weight: 700; border-top: 2px solid #1a2332; border-bottom: none; font-size: 14px; }
  tr.spacer td { border: none; height: 10px; }
  td.indent { padding-left: 18px; color: #454f5e; }
  .note { color: #8a93a3; font-size: 11px; }
  .disclaimer { margin-top: 18px; font-size: 11px; color: #6a7382; border-top: 1px solid #e8ebf0; padding-top: 8px; }
  .actuals-badge { display: inline-block; font-size: 11px; background: #eef2ff; color: #1d4ed8; border-radius: 999px; padding: 2px 10px; margin-left: 8px; }
  .actions { margin: 14px 0; text-align: right; }
  .actions button { font: inherit; padding: 8px 16px; border-radius: 8px; border: 1px solid #1d4ed8; background: #1d4ed8; color: #fff; cursor: pointer; }
  @media print { .actions { display: none; } }
</style>
</head>
<body>
  <div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>

  <div class="cover">
    <div class="brand"><span class="logo">YW</span> YeBetWeg · የቤት-ወግ</div>
    <h1>Bill of Quantities — Planning Estimate
      ${actuals && actuals.count > 0 ? `<span class="actuals-badge">includes ${actuals.count} logged actual${actuals.count === 1 ? "" : "s"}</span>` : ""}
    </h1>
    <p class="sub">Prepared ${today}${meta.preparedBy ? ` · Prepared by ${esc(meta.preparedBy)}` : ""}${meta.clientName ? ` · For ${esc(meta.clientName)}` : ""}</p>
    <div class="meta">
      <div><span>Project type</span><span>${esc(labels.projectType)}</span></div>
      <div><span>City</span><span>${esc(i.cityLabel || i.city)}</span></div>
      <div><span>Built-up area</span><span>${i.area} m² · ${i.floors} floor${i.floors === 1 ? "" : "s"}</span></div>
      <div><span>Finish level</span><span>${esc(i.finishLevel)}</span></div>
      <div><span>Contingency</span><span>${i.contingency}%</span></div>
      <div><span>Cost per m²</span><span>${formatEtb(Number(o.perM2))} ETB</span></div>
    </div>
  </div>

  <table>
    <thead><tr><th>Item</th><th class="num">Amount (ETB)</th><th></th></tr></thead>
    <tbody>
${rowsHtml}
    </tbody>
  </table>
  ${variance !== null ? `<p class="disclaimer"><strong>Variance:</strong> actual spending is ${variance >= 0 ? "above" : "below"} the planning estimate by ${formatEtb(Math.abs(variance))} ETB.</p>` : ""}
  <p class="disclaimer">Planning estimate only — not a contract BOQ. Final BOQ requires drawings, site conditions, specifications, and current supplier quotes. Prices: YeBetWeg market data at time of estimate.</p>
  ${meta.notes ? `<p class="disclaimer"><strong>Notes:</strong> ${esc(meta.notes)}</p>` : ""}
</body>
</html>`
}

/** Open the print dialog in a popup; returns false when pop-ups are blocked or no DOM is available. */
export function openPrintWindow(html: string): boolean {
  if (typeof window === "undefined" || typeof window.open !== "function") return false
  const w = window.open("", "_blank", "width=880,height=1000")
  if (!w) return false
  w.document.open()
  w.document.write(html)
  w.document.close()
  return true
}

export function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
