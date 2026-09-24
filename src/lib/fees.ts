/**
 * Chapa pass-through fee model ("who pays the gateway fee" = the buyer).
 *
 * Chapa charges the merchant (YeBetWeg) a transaction fee on every successful
 * payment (~2% domestic, ~1% international, settled in ETB). Instead of
 * absorbing it — which would eat the 2% marketplace commission — buyers pay a
 * checkout fee on top of the listed price, so the business nets the full
 * listed price ("pass-through" model).
 *
 *   buyer pays (gross) = base / (1 - feeRate), rounded UP to 2 decimals
 *   checkout fee       = gross - base
 *
 * Chapa's fee is levied on the *charged* amount, so grossing up by
 * 1/(1-rate) makes Chapa's cut come out of the fee, leaving exactly `base`.
 *
 * Example (2%): plan 1,000 ETB → buyer pays 1,020.41 → Chapa ≈ 20.41 →
 * YeBetWeg nets 1,000.00.
 */

export const CHAPA_FEE_RATE = 0.02
export const CHAPA_FEE_LABEL_EN = "Checkout fee (payment processing)"
export const CHAPA_FEE_LABEL_AM = "የመክፈያ አገልግሎት ክፍያ"

/**
 * Admin-configurable fee rates per payment method (app_settings key
 * 'fee_config', served to the client by the public get_fee_config() RPC and
 * applied server-side by checkout_fee_rate(method)).
 */
export type FeeConfig = {
  default_rate: number
  methods: Record<string, number>
}

const MAX_FEE_RATE = 0.1

function clampRate(rate: number): number {
  return Math.min(Math.max(rate, 0), MAX_FEE_RATE)
}

/** Rate for a specific method; unknown methods fall back to default_rate. */
export function resolveFeeRate(config: FeeConfig | null, method?: string | null): number {
  if (!config) return CHAPA_FEE_RATE
  const m = method ? config.methods?.[method] : undefined
  if (typeof m === "number") return clampRate(m)
  if (typeof config.default_rate === "number") return clampRate(config.default_rate)
  return CHAPA_FEE_RATE
}

/**
 * Rate used at initiate time: the buyer's channel isn't known until Chapa's
 * chooser, so charge with the HIGHEST configured rate — the buyer can then
 * only over-pay the fee (business windfall), never under-pay.
 */
export function conservativeFeeRate(config: FeeConfig | null): number {
  if (!config) return CHAPA_FEE_RATE
  const rates = [config.default_rate ?? CHAPA_FEE_RATE, ...Object.values(config.methods ?? {})]
  return clampRate(Math.max(...rates.filter((r) => typeof r === "number")))
}

export type FeeSplit = {
  /** Listed price — what the business intends to net. */
  base: number
  /** Fee added on top of base at checkout. */
  fee: number
  /** What the buyer is charged at Chapa (base + fee). */
  gross: number
}

function round2(n: number): number {
  // Avoid float drift: 500/0.98 = 510.2040816... → 510.21
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function floor2(n: number): number {
  return Math.floor((n + Number.EPSILON) * 100) / 100
}

/** Gross-up a base price into the amount the buyer is charged. */
export function withCheckoutFee(base: number, feeRate: number = CHAPA_FEE_RATE): FeeSplit {
  const safeBase = Math.max(0, round2(base))
  const gross = Math.ceil((safeBase / (1 - feeRate)) * 100) / 100
  return { base: safeBase, fee: round2(gross - safeBase), gross: round2(gross) }
}

/**
 * Inverse: given what the buyer paid, split it into base + fee.
 *
 * The gross-up CEILs, so paid×feeRate lands in [base, base+feeRate·0.01) —
 * flooring (not rounding) recovers the exact listed base. Rounding could
 * overstate it by 1¢ (e.g. paid 510.21 → base 500.01).
 */
export function splitPaidAmount(
  gross: number,
  feeRate: number = CHAPA_FEE_RATE,
): FeeSplit {
  const paid = Math.max(0, round2(gross))
  const base = floor2(paid * (1 - feeRate))
  return { base, fee: round2(paid - base), gross: paid }
}

export function formatFeeBreakdown(split: FeeSplit, language: "en" | "am"): string {
  if (language === "am") {
    return `ዋጋ: ${split.base.toFixed(2)} ETB + ${CHAPA_FEE_LABEL_AM}: ${split.fee.toFixed(2)} ETB = ${split.gross.toFixed(2)} ETB`
  }
  return `Price: ${split.base.toFixed(2)} ETB + ${CHAPA_FEE_LABEL_EN}: ${split.fee.toFixed(2)} ETB = ${split.gross.toFixed(2)} ETB`
}
