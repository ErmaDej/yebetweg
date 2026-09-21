import { describe, it, expect } from "vitest"
import { newRfqDraft, rfqDraftRespond } from "@/lib/assistant"
import { aggregateMonthlySpend, aggregateByCategory, type BoqActual } from "@/hooks/useBoqActuals"

const actual = (over: Partial<BoqActual> = {}): BoqActual => ({
  id: "a1",
  boq_estimate_id: "e1",
  user_id: "u1",
  category: "material",
  description: null,
  amount: 100,
  spent_at: "2026-09-15",
  created_at: "2026-09-15T00:00:00Z",
  ...over,
})

describe("rfqDraftRespond", () => {
  it("walks material → city → budget → confirm and emits a pre-filled context", () => {
    let s = newRfqDraft()
    let r = rfqDraftRespond(s, "Grade 60 rebar", "en")
    expect(r.session.step).toBe("city")
    expect(r.session.material).toBe("Grade 60 Rebar")

    r = rfqDraftRespond(r.session, "addis ababa", "en")
    expect(r.session.step).toBe("budget")
    expect(r.session.city).toBe("Addis Ababa")

    r = rfqDraftRespond(r.session, "about 450,000 birr", "en")
    expect(r.session.step).toBe("confirm")
    expect(r.session.budget).toBe(450000)

    r = rfqDraftRespond(r.session, "send", "en")
    expect(r.session.active).toBe(false)
    expect(r.completed).toMatchObject({
      sourceType: "manual",
      itemName: "Grade 60 Rebar",
      city: "Addis Ababa",
      targetPrice: 450000,
    })
  })

  it("supports skipping the budget", () => {
    let r = rfqDraftRespond(newRfqDraft(), "cement", "en")
    r = rfqDraftRespond(r.session, "Adama", "en")
    r = rfqDraftRespond(r.session, "skip", "en")
    expect(r.session.step).toBe("confirm")
    expect(r.session.budget).toBeNull()
    r = rfqDraftRespond(r.session, "send", "en")
    expect(r.completed?.targetPrice).toBeNull()
  })

  it("cancels at any step", () => {
    let r = rfqDraftRespond(newRfqDraft(), "cement", "en")
    r = rfqDraftRespond(r.session, "never mind", "en")
    expect(r.session.active).toBe(false)
    expect(r.completed).toBeUndefined()
  })

  it("re-prompts when an answer is unusable", () => {
    const r0 = newRfqDraft()
    const r1 = rfqDraftRespond(r0, "   ", "en")
    expect(r1.session.step).toBe("material")
    const r2 = rfqDraftRespond(r1.session, "cement", "en")
    const r3 = rfqDraftRespond(r2.session, "hawassa", "en")
    const r4 = rfqDraftRespond(r3.session, "banana", "en")
    expect(r4.session.step).toBe("budget")
  })

  it("works in Amharic", () => {
    let r = rfqDraftRespond(newRfqDraft(), "ሲሚንቶ", "am")
    expect(r.session.step).toBe("city")
    r = rfqDraftRespond(r.session, "አዲስ አበባ", "am")
    expect(r.session.step).toBe("budget")
    r = rfqDraftRespond(r.session, "ላክ", "en") // confirm words are language-agnostic
    expect(r.completed).toBeUndefined()
  })
})

describe("aggregateMonthlySpend", () => {
  it("fills a continuous zero-filled series ending at the current month", () => {
    const pts = aggregateMonthlySpend([actual({ spent_at: "2026-09-02", amount: 300 })], 6)
    expect(pts.length).toBe(6)
    expect(pts[5].month).toBe("2026-09")
    expect(pts[5].total).toBe(300)
    expect(pts.every((p, i) => i === 5 || p.total === 0)).toBe(true)
  })

  it("sums multiple entries per month and ignores malformed dates", () => {
    const pts = aggregateMonthlySpend(
      [
        actual({ spent_at: "2026-08-01", amount: 100 }),
        actual({ spent_at: "2026-08-20", amount: 250 }),
        actual({ spent_at: "not-a-date", amount: 999 }),
      ],
      3
    )
    expect(pts.find((p) => p.month === "2026-08")?.total).toBe(350)
  })
})

describe("aggregateByCategory", () => {
  it("computes percentages in fixed category order", () => {
    const slices = aggregateByCategory([
      actual({ category: "material", amount: 600 }),
      actual({ category: "labor", amount: 400 }),
    ])
    expect(slices.map((s) => s.category)).toEqual(["material", "labor"])
    expect(slices[0].pct).toBeCloseTo(60)
    expect(slices[1].pct).toBeCloseTo(40)
  })

  it("omits empty categories and returns [] for no entries", () => {
    expect(aggregateByCategory([actual({ category: "other", amount: 50 })]).map((s) => s.category)).toEqual(["other"])
    expect(aggregateByCategory([])).toEqual([])
  })
})
