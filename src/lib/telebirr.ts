// TeleBirr is proxied through the Supabase Edge Function `telebirr-service`,
// which holds the merchant private key and signs requests server-side. The
// client only needs the Supabase URL/anon key — never TeleBirr credentials.
import { callEdge, EdgeError } from "./edge"

export interface InitializeTeleBirrPaymentParams {
  amount: number
  reference: string
  notifyUrl: string
  returnUrl: string
  subject?: string
  description?: string
  phoneNumber?: string
}

export interface InitializeTeleBirrResult {
  success: boolean
  checkoutUrl?: string
  prepayId?: string
  reference?: string
  rawRequest?: string
  error?: string
}

export async function initializeTeleBirrPayment(
  params: InitializeTeleBirrPaymentParams
): Promise<InitializeTeleBirrResult> {
  try {
    if (!params.amount || params.amount <= 0) {
      return { success: false, error: "Amount must be greater than zero" }
    }
    if (!params.reference || !/^[A-Za-z0-9]+$/.test(params.reference)) {
      return { success: false, error: "Invalid reference" }
    }

    const data = await callEdge<{
      success: boolean
      checkoutUrl?: string
      prepayId?: string
      reference?: string
      rawRequest?: string
      error?: string
    }>("telebirr-service", {
      method: "POST",
      body: {
        amount: params.amount,
        reference: params.reference,
        notifyUrl: params.notifyUrl,
        returnUrl: params.returnUrl,
        subject: params.subject,
        description: params.description,
        phoneNumber: params.phoneNumber,
      },
    })

    if (!data.success) {
      return { success: false, error: data.error || "Service error" }
    }

    return {
      success: true,
      checkoutUrl: data.checkoutUrl,
      prepayId: data.prepayId,
      reference: data.reference,
      rawRequest: data.rawRequest,
    }
  } catch (error) {
    const msg =
      error instanceof EdgeError
        ? error.message
        : error instanceof Error
          ? `Network error: ${error.message}`
          : "Network error occurred while initializing payment"
    return { success: false, error: msg }
  }
}

export function validateEthiopianPhoneNumber(phone: string): boolean {
  if (!phone) return false
  const cleaned = phone.replace(/[\s\-()]/g, "")
  const phoneRegex = /^(\+251|251|0)?[79]\d{8}$/
  return phoneRegex.test(cleaned)
}

export function formatEthiopianPhoneNumber(phone: string): string {
  if (!phone) return ""
  const cleaned = phone.replace(/\D/g, "")
  if (cleaned.startsWith("251") && cleaned.length >= 12) {
    return "+" + cleaned.slice(0, 12)
  }
  if (cleaned.startsWith("0") && cleaned.length >= 10) {
    return "+251" + cleaned.slice(1, 10)
  }
  if ((cleaned.startsWith("9") || cleaned.startsWith("7")) && cleaned.length === 9) {
    return "+251" + cleaned
  }
  return phone.trim()
}
