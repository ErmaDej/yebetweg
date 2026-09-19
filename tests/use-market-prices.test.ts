// Unit tests for useMarketPrices' data path (node env — no rendering needed):
//   - prefers the premium-gated get_visible_market_prices RPC
//   - falls back to a direct table select when the RPC errors or throws
//   - fires refresh_market_price_freshness best-effort alongside the RPC
// Uses the shared Supabase query-builder mock (tests/helpers/supabase-mock.ts).
// Note: awaiting a mocked builder resolves the full SupabaseResult envelope
// ({ data, error }) — pass wrapped results to createQueryBuilder.
import { describe, it, expect, vi, beforeEach } from "vitest"
import { createQueryBuilder, mockSupabaseModule } from "./helpers/supabase-mock"

const FREE_ROW = {
  id: "p1",
  material_en: "Cement (50kg)",
  material_am: "ሲሜንት",
  category: "cement",
  price: 780,
  unit: "quintal",
  access_level: "free" as const,
}

const PREMIUM_ROW = {
  id: "p2",
  material_en: "Rebar",
  material_am: "ብረት",
  category: "steel",
  price: 92,
  unit: "kg",
  access_level: "premium" as const,
}

const ALL_ROWS = [FREE_ROW, PREMIUM_ROW]

async function loadHookWith(overrides: Parameters<typeof mockSupabaseModule>[0]) {
  mockSupabaseModule(overrides)
  return await import("@/hooks/useMarketPrices")
}

describe("useMarketPrices data path", () => {
  beforeEach(() => {
    // Drop the dynamically imported hook so each test's doMock registration
    // is picked up by a fresh module evaluation.
    vi.resetModules()
  })

  it("prefers the premium-gated RPC and never touches the table", async () => {
    const rpcBuilder = createQueryBuilder({ data: ALL_ROWS, error: null })
    const rpc = vi.fn(() => rpcBuilder.builder)
    const from = vi.fn(() => {
      throw new Error("table must not be read when the RPC works")
    })

    const { fetchMarketPrices } = await loadHookWith({ rpc, from })
    const rows = await fetchMarketPrices({})()

    expect(rows).toEqual(ALL_ROWS)
    expect(rpc).toHaveBeenCalledWith("get_visible_market_prices")
    expect(rpc.mock.calls.some(([fn]) => fn === "refresh_market_price_freshness")).toBe(true)
    expect(from).not.toHaveBeenCalled()
  })

  it("falls back to a direct table select (with category filter) when the RPC errors", async () => {
    const rpcBuilder = createQueryBuilder({
      data: null,
      error: { message: "schema cache: function get_visible_market_prices not found" },
    })
    const tableBuilder = createQueryBuilder({ data: [FREE_ROW], error: null })
    const rpc = vi.fn(() => rpcBuilder.builder)
    const from = vi.fn(() => tableBuilder.builder)

    const { fetchMarketPrices } = await loadHookWith({ rpc, from })
    const rows = await fetchMarketPrices({ category: "cement" })()

    expect(rows).toEqual([FREE_ROW])
    expect(from).toHaveBeenCalledWith("market_prices")
    expect(tableBuilder.calls.map((c) => c.method)).toEqual(["select", "order", "eq"])
    expect(tableBuilder.calls.find((c) => c.method === "eq")?.args).toEqual([
      "category",
      "cement",
    ])
  })

  it("falls back to the table without a category filter when the RPC throws", async () => {
    const rpc = vi.fn(() => {
      throw new Error("network down")
    })
    const tableBuilder = createQueryBuilder({ data: ALL_ROWS, error: null })
    const from = vi.fn(() => tableBuilder.builder)

    const { fetchMarketPrices } = await loadHookWith({ rpc, from })
    const rows = await fetchMarketPrices({})()

    expect(rows).toEqual(ALL_ROWS)
    const methods = tableBuilder.calls.map((c) => c.method)
    expect(methods).toEqual(["select", "order"])
    expect(methods).not.toContain("eq")
    expect(tableBuilder.calls.find((c) => c.method === "order")?.args).toEqual([
      "category",
      { ascending: true },
    ])
  })
})
