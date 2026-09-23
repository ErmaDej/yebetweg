// Tax-ready CSV export from the Revenue monitor (pure builder).
import { describe, expect, it } from "vitest"
import { buildCsv } from "@/components/admin/RevenueMonitor"

const rows = [
  {
    id: "r1",
    amount: 500,
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
    amount: 1000,
    currency: "ETB",
    method: "chapa",
    reference: "YBTEST2",
    status: "completed",
    created_at: "2026-09-20T10:00:00.000Z",
    metadata: { tier: "pro" },
    payer: null,
  },
] as Parameters<typeof buildCsv>[0]

describe("buildCsv (tax-ready revenue export)", () => {
  it("emits a header plus one row per payment with VAT columns", () => {
    const csv = buildCsv(rows)
    const lines = csv.split("\n")
    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe(
      "payment_date,reference,tier,method,amount_etb,currency,vat_rate,vat_etb,gross_etb,payer_name,payer_email,status",
    )
    expect(lines[1]).toContain("YBTEST1")
    expect(lines[1]).toContain("premium")
    expect(lines[1]).toContain("500.00")
    expect(lines[1]).toContain("0.00") // vat_etb default 0
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
