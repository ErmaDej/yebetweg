import { useState, useCallback } from "react"
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
import { useUserProfile } from "@/hooks/useUserProfile"

const TIER_PRICES: Record<PremiumTier, number> = {
  free: 0,
  premium: 500,
  pro: 1000,
}

export function usePayment() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuthContext()
  const { profile } = useUserProfile()
  const { language } = useLanguage()

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

      const amount = TIER_PRICES[tier]
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
            description: `${tier.charAt(0).toUpperCase() + tier.slice(1)} - ETB ${amount}`,
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
    [user, profile, language, getUserName, generateTxRef],
  )

  return {
    loading,
    error,
    initiatePayment,
    tierPrices: TIER_PRICES,
    formatAmount,
  }
}