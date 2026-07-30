import { useState, useCallback } from "react"
import { useAuthContext } from "@/context/AuthContext"
import { useLanguage } from "@/lib/i18n"
import { supabase } from "@/lib/supabase"
import type {
  PremiumTier,
  PaymentMethod,
  CreateSubscriptionParams,
  Subscription,
} from "@/types/payment"
import {
  initializeChapaPayment,
  verifyChapaPayment,
  formatAmount,
} from "@/lib/chapa"
import {
  initializeTeleBirrPayment,
  validateEthiopianPhoneNumber,
  formatEthiopianPhoneNumber,
} from "@/lib/telebirr"
import { useUserProfile } from "@/hooks/useUserProfile"

const TIER_PRICES: Record<PremiumTier, number> = {
  free: 0,
  premium: 500,
  pro: 1200,
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
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `YB-${timestamp}-${random}`
  }, [])

  const createSubscriptionRecord = async (
    params: CreateSubscriptionParams,
  ): Promise<Subscription | null> => {
    const { data, error } = await supabase
      .from("premium_subscriptions")
      .insert({
        user_id: params.userId,
        tier: params.tier,
        payment_method: params.paymentMethod,
        chapa_reference: params.paymentMethod === "chapa" ? params.reference : null,
        telebirr_reference: params.paymentMethod === "telebirr" ? params.reference : null,
        starts_at: new Date().toISOString(),
        expires_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        is_active: false,
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      console.error("Failed to create subscription:", error)
      return null
    }

    return data as Subscription
  }

  const verifyChapaPaymentStatus = useCallback(
    async (
      reference: string,
    ): Promise<{ success: boolean; status?: string; error?: string }> => {
      try {
        const result = await verifyChapaPayment(reference)

        if (!result.success) {
          return { success: false, error: result.error || "Failed to verify Chapa payment" }
        }

        if (result.status?.toLowerCase() !== "success") {
          return {
            success: false,
            error: `Chapa payment status is not complete: ${result.status}`,
          }
        }

        const { data: subscription, error } = await supabase
          .from("premium_subscriptions")
          .select("id")
          .eq("chapa_reference", reference)
          .single()

        if (error || !subscription) {
          console.error("Chapa verification succeeded but subscription record was not found", error)
          return {
            success: false,
            error: "Payment verified but subscription record not found",
          }
        }

        const { error: updateError } = await supabase
          .from("premium_subscriptions")
          .update({
            is_active: true,
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscription.id)

        if (updateError) {
          console.error("Failed to activate subscription after Chapa verification:", updateError)
          return { success: false, error: updateError.message }
        }

        return { success: true, status: result.status }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unexpected verification error",
        }
      }
    },
    [],
  )

  const initiatePayment = useCallback(
    async (
      tier: PremiumTier,
      method: PaymentMethod,
      phoneNumber?: string,
    ): Promise<{ success: boolean; redirectUrl?: string; toPayUrl?: string; qrCode?: string; reference?: string; error?: string }> => {
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
      const callbackUrl = `${projectUrl.replace(/\/$/, "")}/functions/v1/${method}-webhook`
      const returnUrl = `${window.location.origin}/payment/success?reference=${txRef}`

      try {
        const userName = getUserName()
        const userEmail = user.email || ""
        const [firstName, ...lastNameParts] = userName.split(" ")
        const lastName = lastNameParts.join(" ") || "User"

        if (method === "chapa") {
          const result = await initializeChapaPayment({
            amount,
            email: userEmail,
            first_name: firstName,
            last_name: lastName,
            tx_ref: txRef,
            callback_url: callbackUrl,
            return_url: returnUrl,
            customization: {
              title: `YeBetWeg`,
              description: `${tier.charAt(0).toUpperCase() + tier.slice(1)} - ETB ${amount}`,
            },
          })

          if (!result.success) {
            setError(result.error || "Failed to initialize payment")
            return { success: false, error: result.error }
          }

          await createSubscriptionRecord({
            userId: profile.id,
            tier,
            paymentMethod: method,
            reference: txRef,
            amount,
          })

          return {
            success: true,
            redirectUrl: result.checkoutUrl,
          }
        }

        if (method === "telebirr") {
          if (!phoneNumber) {
            return {
              success: false,
              error: language === "am" ? "የስልክ ቁጥር ያስፈልጋል" : "Phone number is required",
            }
          }

          const formattedPhone = formatEthiopianPhoneNumber(phoneNumber)
          if (!validateEthiopianPhoneNumber(formattedPhone)) {
            return {
              success: false,
              error:
                language === "am"
                  ? "እባክዎ ትክክል የተለያዩ የኢትዮጵያ ስልክ ቁጥር ያስገቡ"
                  : "Please enter a valid Ethiopian phone number",
            }
          }

          const result = await initializeTeleBirrPayment({
            amount,
            phoneNumber: formattedPhone,
            reference: txRef,
            notifyUrl: callbackUrl,
            returnUrl,
            subject: `YeBetWeg ${tier} Subscription`,
            description: `Payment for ${tier} membership (ETB ${amount})`,
          })

          if (!result.success) {
            setError(result.error || "Failed to initialize TeleBirr payment")
            return { success: false, error: result.error }
          }

          await createSubscriptionRecord({
            userId: profile.id,
            tier,
            paymentMethod: method,
            reference: txRef,
            amount,
          })

          // Return TeleBirr specific data (qrCode / toPayUrl / outTradeNo)
          return {
            success: true,
            toPayUrl: result.toPayUrl,
            qrCode: result.qrCode,
            reference: result.outTradeNo,
          }
        }

        return { success: false, error: "Invalid payment method" }
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
    verifyChapaPaymentStatus,
    tierPrices: TIER_PRICES,
    formatAmount,
  }
}
