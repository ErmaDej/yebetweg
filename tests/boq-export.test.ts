import { describe, it, expect } from "vitest"
import { buildReportRows, buildCsv, buildProReportHtml, canExportBoq, openPrintWindow } from "@/lib/boq-export"
import type { BoqEstimate } from "@/hooks/useBoqEstimates"
import { summarizeActuals, type BoqActual } from "@/hooks/useBoqActuals"

const estimate = {
  id: "est-1",
  user_id: "u1",
  created_at: "2026-09-21T00:00:00Z",
  updated_at: "2026-09-21T00:00:00Z",
  inputs: {
    projectType: "residential",
    city: "addis_ababa",
    cityLabel: "Addis Ababa",
    area: 180,
    floors: 2,
    finishLevel: "standard",
    contingency: 10,
  },
  outputs: {
    total: 1_000_000,
    perM2: 5_555.56,
    structure: 320_000,
    material: 380_000,
    labor: 180_000,
    overhead: 120_000,
    materialBreakdown: [
      { key: "derba cement (opc)", amount: 200_000, live: true },
      { key: "grade 60 rebar 12mm", amount: 180_000, live: false },
    ],
    otherMaterials: 0,
  },
} as unknown as BoqEstimate

const actual = (over: Partial<BoqActual> = {}): BoqActual => ({
  id: "a1",
  boq_estimate_id: "est-1",
  user_id: "u1",
  category: "material",
  description: "cement delivery",
  amount: 250_000,
  spent_at: "2026-09-20",
  created_at: "2026-09-20T00:00:00Z",
  ...over,
})

const labels = {
  city: "Addis Ababa",
  projectType: "Residential house",
  finish: "Standard",
  cat: {
    structure: "Structure (32%)",
    material: "Materials (38%)",
    labor: "Labor (18%)",
    overhead: "Overhead (12%)",
    other: "other materials",
  } as Record<string, string>,
}

describe("canExportBoq", () => {
  it("gates free users and allows premium/pro", () => {
    expect(canExportBoq("free")).toBe(false)
    expect(canExportBoq("premium")).toBe(true)
    expect(canExportBoq("pro")).toBe(true)
  })
})

describe("buildReportRows", () => {
  it("builds estimate-only rows", () => {
    const { sections } = buildReportRows(estimate, null, labels)
    const total = sections.find((s) => s.label === "TOTAL")
    expect(total?.amount).toBe(1_000_000)
    expect(sections.some((s) => s.label.startsWith("Actual:"))).toBe(false)
  })

  it("appends actuals and variance when logged", () => {
    const actuals = summarizeActuals([actual({ amount: 250_000 }), actual({ id: "a2", category: "labor", amount: 100_000 })])
    const { sections } = buildReportRows(estimate, actuals, labels)
    expect(sections.filter((s) => s.label.startsWith("Actual:")).length).toBe(2)
    expect(sections.find((s) => s.label === "ACTUAL TOTAL")?.amount).toBe(350_000)
    expect(sections.find((s) => s.label === "VARIANCE")?.amount).toBe(-650_000)
  })
})

describe("buildCsv", () => {
  it("escapes quotes and includes variance rows", () => {
    const actuals = summarizeActuals([actual({ description: 'said "cheap"' })])
    const csv = buildCsv(estimate, actuals, labels)
    expect(csv).toContain('""cheap""')
    expect(csv).toContain("VARIANCE")
  })
})

describe("buildProReportHtml", () => {
  it("renders cover sheet, variance line, and escapes html", () => {
    const actuals = summarizeActuals([actual({ description: "<b>bold</b>" })])
    const html = buildProReportHtml(
      estimate,
      actuals,
      { clientName: "Ato <Bekele>", preparedBy: "Tester", includeActuals: true },
      labels
    )
    expect(html).toContain("Bill of Quantities")
    expect(html).toContain("&lt;b&gt;bold&lt;/b&gt;")
    expect(html).toContain("Ato &lt;Bekele&gt;")
    expect(html).toContain("VARIANCE")
    expect(html).toContain("includes 1 logged actual")
  })

  it("omits variance when no actuals", () => {
    const html = buildProReportHtml(estimate, null, { clientName: "", preparedBy: "", includeActuals: false }, labels)
    expect(html).not.toContain("VARIANCE")
    expect(html).not.toContain("includes")
  })
})

describe("openPrintWindow", () => {
  it("returns false when window.open is unavailable (popup blocked / SSR)", () => {
    const g = globalThis as unknown as { open?: unknown }
    const orig = g.open
    g.open = () => null
    try {
      expect(openPrintWindow("<html></html>")).toBe(false)
    } finally {
      g.open = orig
    }
  })
})
