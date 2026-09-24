import { useState, useCallback, useEffect } from "react"
import { useAuthContext } from "@/context/AuthContext"
import { useLanguage } from "@/lib/i18n"
import type {
  PremiumTier,
  PaymentMethod,
} from "@/types/payment"
import {
  initializeChapaPayment,
  formatAmount,
} from "@/lib/chapa"
import { withCheckoutFee, conservativeFeeRate, type FeeConfig } from "@/lib/fees"
import { supabase } from "@/lib/supabase"
import { useUserProfile } from "@/hooks/useUserProfile"

const TIER_PRICES: Record<PremiumTier, number> = {
  free: 0,
  premium: 500,
  pro: 1000,
}

/** Fallback pricing when the admin-governed RPC is unavailable. */
export const FALLBACK_TIER_PRICING = { premium: 500, pro: 1000, currency: "ETB" } as const

export type TierPricing = { premium: number; pro: number; currency: string }

/**
 * Resolves admin-governed tier pricing (app_settings 'tier_pricing' via the
 * public get_tier_pricing() RPC), falling back to the built-in prices.
 * One shared loader: the pricing UI (checkout display + admin editor) and the
 * charge path all read the same values.
 */
export function useTierPricing() {
  const [pricing, setPricing] = useState<TierPricing>(FALLBACK_TIER_PRICING)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase.rpc("get_tier_pricing")
      if (!cancelled && !error && data && typeof data === "object") {
        const d = data as Record<string, unknown>
        const premium = Number(d.premium)
        const pro = Number(d.pro)
        if (Number.isFinite(premium) && premium > 0 && Number.isFinite(pro) && pro > 0) {
          setPricing({ premium, pro, currency: typeof d.currency === "string" ? d.currency : "ETB" })
        }
      }
      if (!cancelled) setLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  /** Full price map including the free tier. */
  const tierPrices: Record<PremiumTier, number> = {
    free: 0,
    premium: pricing.premium,
    pro: pricing.pro,
  }

  return { pricing, tierPrices, loaded }
}

export function usePayment() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuthContext()
  const { profile } = useUserProfile()
  const { language } = useLanguage()

  // Admin-governed prices (replaces the old hardcoded TIER_PRICES as the
  // source for display and charging).
  const { tierPrices } = useTierPricing()

  // Admin-configurable fee rates (app_settings 'fee_config' via the public
  // get_fee_config() RPC). Falls back to the built-in 2% until loaded or if
  // the RPC is unavailable.
  const [feeConfig, setFeeConfig] = useState<FeeConfig | null>(null)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase.rpc("get_fee_config")
      if (!cancelled && !error && data && typeof data === "object") {
        setFeeConfig(data as FeeConfig)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const getUserName = useCallback(() => {
    if (!user?.email) return "User"
    const email = user.email
    const name = email.split("@")[0].replace(/[._-]/g, " ")
    return name.charAt(0).toUpperCase() + name.slice(1)
  }, [user])

  const generateTxRef = useCallback(() => {
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `YB${timestamp}${random}`.slice(0, 32)
  }, [])

  const initiatePayment = useCallback(
    async (
      tier: PremiumTier,
      _method: PaymentMethod,
    ): Promise<{ success: boolean; redirectUrl?: string; reference?: string; error?: string }> => {
      if (!user) {
        return { success: false, error: "User not authenticated" }
      }

      if (!profile) {
        return {
          success: false,
          error: language === "am" ? "የተጠቃሚ መገለጫ ገና አልተዘጋጀም" : "User profile is not ready yet",
        }
      }

      if (tier === "free") {
        return { success: true, redirectUrl: "/" }
      }

      setLoading(true)
      setError(null)

      // Pass-through model: the buyer pays the listed price PLUS a checkout
      // fee that covers the gateway's transaction fee, so YeBetWeg nets the
      // full listed price (see src/lib/fees.ts). The channel isn't known
      // until Chapa's chooser, so charge with the highest configured rate —
      // a buyer on a cheaper channel can only over-pay the fee, never under-pay.
      const base = tierPrices[tier]
      const { fee, gross } = withCheckoutFee(base, conservativeFeeRate(feeConfig))
      const amount = gross
      const txRef = generateTxRef()
      const projectUrl = import.meta.env.VITE_SUPABASE_URL || window.location.origin
      const callbackUrl = `${projectUrl.replace(/\/$/, "")}/functions/v1/chapa-webhook`
      const returnUrl = `${window.location.origin}/payment/success?reference=${txRef}`

      try {
        const userName = getUserName()
        const userEmail = user.email || ""
        const [firstName, ...lastNameParts] = userName.split(" ")
        const lastName = lastNameParts.join(" ") || "User"

        if (_method !== "chapa") {
          return { success: false, error: "Invalid payment method" }
        }

        const result = await initializeChapaPayment({
          amount,
          email: userEmail,
          first_name: firstName,
          last_name: lastName,
          tx_ref: txRef,
          callback_url: callbackUrl,
          return_url: returnUrl,
          customization: {
            title: "YeBetWeg",
            description: `${tier.charAt(0).toUpperCase() + tier.slice(1)} - ETB ${amount.toFixed(2)} (incl. ETB ${fee.toFixed(2)} checkout fee)`,
          },
          subscription: {
            user_id: profile.id,
            tier,
          },
        })

        if (!result.success) {
          setError(result.error || "Failed to initialize payment")
          return { success: false, error: result.error }
        }

        return {
          success: true,
          redirectUrl: result.checkoutUrl,
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred"
        setError(errorMessage)
        return { success: false, error: errorMessage }
      } finally {
        setLoading(false)
      }
    },
    [user, profile, language, getUserName, generateTxRef, feeConfig, tierPrices],
  )

  return {
    loading,
    error,
    initiatePayment,
    tierPrices,
    /** Pass-through split of a tier price at the conservative (highest) rate. */
    feeSplitFor: (tier: PremiumTier) => withCheckoutFee(tierPrices[tier], conservativeFeeRate(feeConfig)),
    /** Raw fee configuration from get_fee_config() (null until loaded). */
    feeConfig,
    formatAmount,
  }
}
