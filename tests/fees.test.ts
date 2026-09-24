// Chapa pass-through fee model (src/lib/fees.ts) — pure math, no mocks.
import { describe, expect, it } from "vitest"
import {
  CHAPA_FEE_RATE,
  conservativeFeeRate,
  formatFeeBreakdown,
  resolveFeeRate,
  splitPaidAmount,
  withCheckoutFee,
  type FeeConfig,
} from "@/lib/fees"

const tierPrices = { premium: 500, pro: 1000 } as const

describe("withCheckoutFee (gross-up)", () => {
  it("matches the canonical SQL split (checkout_fee_split) for tier prices", () => {
    // ceil(base / 0.98): 500 → 510.21, 1000 → 1020.41 (float: 1020.4081…)
    expect(withCheckoutFee(tierPrices.premium)).toEqual({ base: 500, fee: 10.21, gross: 510.21 })
    expect(withCheckoutFee(tierPrices.pro)).toEqual({ base: 1000, fee: 20.41, gross: 1020.41 })
  })

  it("nets the full base: Chapa's 2% of gross lands on the fee, not the margin", () => {
    for (const base of [1, 7.5, 250, 500, 999.99, 1000, 4321.09]) {
      const { gross, fee } = withCheckoutFee(base)
      const chapaCut = gross * CHAPA_FEE_RATE
      const net = gross - chapaCut
      expect(net).toBeGreaterThanOrEqual(base - 1e-9) // never nets below listed price
      expect(net - base).toBeLessThan(0.02) // covers Chapa exactly, no windfall > 2¢
    }
  })

  it("rounds the gross UP so every cent of the fee goes to the gateway", () => {
    // 100 / 0.98 = 102.040816… → 102.05 (a plain round would give 102.04)
    expect(withCheckoutFee(100)).toEqual({ base: 100, fee: 2.05, gross: 102.05 })
    // 10 / 0.98 = 10.204… → 10.21
    expect(withCheckoutFee(10)).toEqual({ base: 10, fee: 0.21, gross: 10.21 })
  })

  it("keeps fee + base consistent for odd bases (no float drift)", () => {
    for (const base of [0.01, 0.07, 12.34, 199.99, 777.77]) {
      const { base: b, fee, gross } = withCheckoutFee(base)
      expect(b).toBe(base)
      expect(Number((b + fee).toFixed(2))).toBe(gross)
    }
  })

  it("clamps negatives to zero and passes zero through", () => {
    expect(withCheckoutFee(-50)).toEqual({ base: 0, fee: 0, gross: 0 })
    expect(withCheckoutFee(0)).toEqual({ base: 0, fee: 0, gross: 0 })
  })

  it("respects a custom fee rate (e.g. 1% international card)", () => {
    // ceil(1000 / 0.99) = 1010.11
    expect(withCheckoutFee(1000, 0.01)).toEqual({ base: 1000, fee: 10.11, gross: 1010.11 })
  })

  it("fee is strictly increasing in the base", () => {
    let prev = -1
    for (let base = 1; base <= 200; base++) {
      const { fee } = withCheckoutFee(base)
      expect(fee).toBeGreaterThanOrEqual(prev)
      prev = fee
    }
  })
})

describe("splitPaidAmount (inverse)", () => {
  it("round-trips: split(withCheckoutFee(b)) recovers the listed base exactly", () => {
    for (const base of [1, 5, 50, 100, 250, 500, 750, 1000, 1020.41, 4321.09]) {
      const { gross } = withCheckoutFee(base)
      const back = splitPaidAmount(gross)
      expect(back.base).toBe(base)
      expect(back.gross).toBe(gross)
      expect(Number((back.base + back.fee).toFixed(2))).toBe(gross)
    }
  })

  it("floor-splits buyer-paid grosses (conservative: never overstates the business base)", () => {
    // 510.21 × 0.98 = 500.0058 → floor to 500.00 (rounding would give 500.01)
    expect(splitPaidAmount(510.21)).toEqual({ base: 500, fee: 10.21, gross: 510.21 })
    // 102.05 × 0.98 = 100.009 → floor to 100.00 (rounding would give 100.01)
    expect(splitPaidAmount(102.05)).toEqual({ base: 100, fee: 2.05, gross: 102.05 })
    // 1020.41 × 0.98 = 1000.0018 → exactly the listed 1000.00
    expect(splitPaidAmount(1020.41)).toEqual({ base: 1000, fee: 20.41, gross: 1020.41 })
  })

  it("splits arbitrary buyer-paid amounts", () => {
    expect(splitPaidAmount(100)).toEqual({ base: 98, fee: 2, gross: 100 })
    expect(splitPaidAmount(0)).toEqual({ base: 0, fee: 0, gross: 0 })
    expect(splitPaidAmount(-5).base).toBe(0)
  })
})

describe("configurable fee rates", () => {
  const config: FeeConfig = {
    default_rate: 0.02,
    methods: { chapa: 0.02, telebirr: 0.02, chapa_card: 0.01 },
  }

  it("resolves the per-method rate with default fallback", () => {
    expect(resolveFeeRate(config, "chapa")).toBe(0.02)
    expect(resolveFeeRate(config, "chapa_card")).toBe(0.01)
    expect(resolveFeeRate(config, "unknown_method")).toBe(0.02)
    expect(resolveFeeRate(null, "chapa")).toBe(CHAPA_FEE_RATE)
  })

  it("charges at the highest configured rate at initiate time (conservative)", () => {
    expect(conservativeFeeRate(config)).toBe(0.02)
    // If cards were MORE expensive, the checkout must charge that higher rate.
    expect(conservativeFeeRate({ default_rate: 0.01, methods: { chapa_card: 0.03 } })).toBe(0.03)
    expect(conservativeFeeRate(null)).toBe(CHAPA_FEE_RATE)
  })

  it("applies a custom rate through the same gross-up math", () => {
    // ceil(500 / 0.99) = 505.06 for the 1% card rate
    expect(withCheckoutFee(500, resolveFeeRate(config, "chapa_card"))).toEqual({
      base: 500,
      fee: 5.06,
      gross: 505.06,
    })
  })
})

describe("formatFeeBreakdown", () => {
  it("renders the EN and AM strings with 2-decimal amounts", () => {
    const split = withCheckoutFee(500)
    expect(formatFeeBreakdown(split, "en")).toBe(
      "Price: 500.00 ETB + Checkout fee (payment processing): 10.21 ETB = 510.21 ETB",
    )
    expect(formatFeeBreakdown(split, "am")).toBe(
      "ዋጋ: 500.00 ETB + የመክፈያ አገልግሎት ክፍያ: 10.21 ETB = 510.21 ETB",
    )
  })
})
