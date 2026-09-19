// Unit tests for useTips' data path (node env — no rendering needed):
//   - paginates with an exact count (range window from page/pageSize)
//   - applies category and isPremium filters in the hook's order
//   - search path: sanitizes the term, builds the injection-safe or-filter,
//     and caps the fetch instead of paginating
// Uses the shared Supabase query-builder mock (tests/helpers/supabase-mock.ts).
// Awaiting a mocked builder resolves the SupabaseResult envelope
// ({ data, error, count }) — pass wrapped results to createQueryBuilder.
import { describe, it, expect, vi, beforeEach } from "vitest"
import { createQueryBuilder, mockSupabaseModule } from "./helpers/supabase-mock"

const TIPS = Array.from({ length: 7 }, (_, i) => ({
  id: `t${i + 1}`,
  title_en: `Tip ${i + 1}`,
  title_am: "ጠቃሚ ምክር",
  content: "content",
  category: i % 2 === 0 ? "construction" : "safety",
  is_premium: i === 0,
  icon: null,
  created_at: `2026-09-0${i + 1}T00:00:00Z`,
}))

async function loadHookWith(overrides: Parameters<typeof mockSupabaseModule>[0]) {
  mockSupabaseModule(overrides)
  return await import("@/hooks/useTips")
}

function makeTable(result: Parameters<typeof createQueryBuilder>[0]) {
  const table = createQueryBuilder(result)
  return { table, from: vi.fn(() => table.builder) }
}

describe("useTips data path", () => {
  beforeEach(() => {
    // Drop the dynamically imported hook so each test's doMock registration
    // is picked up by a fresh module evaluation.
    vi.resetModules()
  })

  it("paginates with an exact count: page 2 / pageSize 3 reads rows 4-6", async () => {
    // The mock returns the configured payload as-is (the server does the
    // range slicing), so configure the page-2 slice and assert the window.
    const { table, from } = makeTable({
      data: TIPS.slice(3, 6),
      error: null,
      count: TIPS.length,
    })

    const { fetchTips } = await loadHookWith({ from })
    const page = await fetchTips({ page: 2, pageSize: 3 })()

    expect(page).toEqual({ data: TIPS.slice(3, 6), total: 7 })
    expect(from).toHaveBeenCalledWith("tips")
    expect(table.calls.map((c) => c.method)).toEqual(["select", "order", "range"])
    expect(table.calls.find((c) => c.method === "select")?.args).toEqual([
      "*",
      { count: "exact" },
    ])
    expect(table.calls.find((c) => c.method === "range")?.args).toEqual([3, 5])
  })

  it("defaults to page 1 with pageSize 6 and applies no filters", async () => {
    const { table, from } = makeTable({ data: TIPS.slice(0, 6), error: null, count: 7 })

    const { fetchTips } = await loadHookWith({ from })
    const page = await fetchTips({})()

    expect(page.total).toBe(7)
    const methods = table.calls.map((c) => c.method)
    expect(methods).toEqual(["select", "order", "range"])
    expect(methods).not.toContain("eq")
    expect(table.calls.find((c) => c.method === "range")?.args).toEqual([0, 5])
  })

  it("applies category and isPremium filters before the range window", async () => {
    const { table, from } = makeTable({ data: [], error: null, count: 0 })

    const { fetchTips } = await loadHookWith({ from })
    await fetchTips({ category: "construction", isPremium: false, page: 1 })()

    expect(table.calls.map((c) => c.method)).toEqual(["select", "order", "eq", "eq", "range"])
    expect(table.calls.filter((c) => c.method === "eq").map((c) => c.args)).toEqual([
      ["category", "construction"],
      ["is_premium", false],
    ])
  })

  it("search path sanitizes the term, or-filters titles, and caps the fetch", async () => {
    const { table, from } = makeTable({ data: TIPS.slice(0, 2), error: null, count: 2 })

    const { fetchTips } = await loadHookWith({ from })
    const page = await fetchTips({ searchQuery: `concrete, (mix) 50%*` })()

    expect(page).toEqual({ data: TIPS.slice(0, 2), total: 2 })
    const methods = table.calls.map((c) => c.method)
    // sanitizeSearchTerm strips PostgREST-reserved chars: , ( ) % *
    expect(table.calls.find((c) => c.method === "or")?.args).toEqual([
      'title_en.ilike."%concrete mix 50%",title_am.ilike."%concrete mix 50%"',
    ])
    expect(methods).toEqual(["select", "order", "or", "range"])
    // Search caps results instead of paginating.
    expect(table.calls.find((c) => c.method === "range")?.args).toEqual([0, 199])
  })
})
