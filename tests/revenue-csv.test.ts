// Tax-ready CSV export from the Revenue monitor (pure builder).
import { describe, expect, it } from "vitest"
import { buildCsv } from "@/components/admin/RevenueMonitor"

const rows = [
  {
    id: "r1",
    // Pass-through row as written by the hardened RPC: buyer paid 510 gross,
    // 10 ETB covered the Chapa checkout fee, 500 ETB is net revenue.
    amount: 510,
    base_amount: 500,
    gateway_fee: 10,
    currency: "ETB",
    method: "chapa",
    reference: "YBTEST1",
    status: "completed",
    created_at: "2026-09-23T10:00:00.000Z",
    metadata: { tier: "premium" },
    payer: { full_name: "Doe, John", email: "j@d.com" },
  },
  {
    id: "r2",
    // Legacy row predating the fee split: fee columns fall back to zero.
    amount: 1000,
    currency: "ETB",
    method: "chapa",
    reference: "YBTEST2",
    status: "completed",
    created_at: "2026-09-20T10:00:00.000Z",
    metadata: { tier: "pro" },
    payer: null,
  },
] as unknown as Parameters<typeof buildCsv>[0]

describe("buildCsv (tax-ready revenue export)", () => {
  it("emits a header plus one row per payment with the pass-through split", () => {
    const csv = buildCsv(rows)
    const lines = csv.split("\n")
    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe(
      "payment_date,reference,tier,method,gross_etb,checkout_fee_etb,net_revenue_etb,currency,vat_rate,vat_on_net_etb,payer_name,payer_email,status",
    )
    expect(lines[1]).toContain("YBTEST1")
    expect(lines[1]).toContain("premium")
    expect(lines[1]).toContain("500.00") // net revenue = tax-reportable base
  })

  it("splits gross into checkout fee + net revenue", () => {
    const csv = buildCsv(rows)
    // gross = 510.00, fee = 10.00, net = 500.00
    expect(csv).toContain("510.00")
    expect(csv).toContain("10.00")
  })

  it("treats legacy rows without fee columns as fee-free", () => {
    const csv = buildCsv(rows)
    const pro = csv.split("\n")[2]
    expect(pro).toContain("YBTEST2")
    expect(pro).toContain("1000.00") // net = gross when no fee recorded
  })

  it("escapes commas and quotes in payer names (RFC 4180)", () => {
    const csv = buildCsv(rows)
    expect(csv).toContain('"Doe, John"')
  })

  it("renders missing payer as empty cells, not the string null", () => {
    const csv = buildCsv(rows)
    const pro = csv.split("\n")[2]
    expect(pro).toContain("YBTEST2")
    expect(pro).not.toContain("null")
  })
})
