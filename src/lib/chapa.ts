import { callEdge, EdgeError } from "./edge"

export interface InitializePaymentParams {
  amount: number
  email: string
  first_name: string
  last_name: string
  tx_ref: string
  callback_url: string
  return_url: string
  customization?: {
    title?: string
    description?: string
    logo?: string
  }
  subscription?: {
    user_id: string
    tier: string
  }
}

export interface InitializePaymentResult {
  success: boolean
  checkoutUrl?: string
  reference?: string
  error?: string
}

export interface VerifyPaymentResult {
  success: boolean
  status?: string
  error?: string
}

export async function initializeChapaPayment(
  params: InitializePaymentParams
): Promise<InitializePaymentResult> {
  try {
    const data = await callEdge<{
      success: boolean
      checkoutUrl?: string
      reference?: string
      error?: string
    }>("chapa-service", {
      method: "POST",
      body: {
        amount: params.amount,
        currency: "ETB",
        email: params.email,
        first_name: params.first_name,
        last_name: params.last_name,
        tx_ref: params.tx_ref,
        callback_url: params.callback_url,
        return_url: params.return_url,
        customization: params.customization || {
          title: "YeBetWeg",
          description: "Premium membership",
        },
        ...(params.subscription ? { subscription: params.subscription } : {}),
      },
    })

    if (!data.success) {
      return { success: false, error: typeof data.error === "string" ? data.error : "Service error" }
    }

    return {
      success: true,
      checkoutUrl: data.checkoutUrl,
      reference: data.reference,
    }
  } catch (error) {
    const msg =
      error instanceof EdgeError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Network error"
    return { success: false, error: msg }
  }
}

export async function verifyChapaPayment(txRef: string): Promise<VerifyPaymentResult> {
  try {
    const data = await callEdge<{ success: boolean; status?: string; error?: string }>(
      "chapa-service",
      {
        method: "GET",
        query: { tx_ref: txRef },
      }
    )

    if (!data.success) {
      return { success: false, error: typeof data.error === "string" ? data.error : "Verify error" }
    }

    return { success: true, status: data.status }
  } catch (error) {
    const msg =
      error instanceof EdgeError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Network error"
    return { success: false, error: msg }
  }
}

export async function activateChapaPayment(txRef: string): Promise<VerifyPaymentResult> {
  try {
    const data = await callEdge<{ success: boolean; error?: string }>("chapa-service", {
      method: "POST",
      body: { action: "activate", tx_ref: txRef },
    })

    if (!data.success) {
      return { success: false, error: typeof data.error === "string" ? data.error : "Activation failed" }
    }

    return { success: true, status: "success" }
  } catch (error) {
    const msg =
      error instanceof EdgeError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Network error"
    return { success: false, error: msg }
  }
}

export function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "ETB",
    minimumFractionDigits: 2,
  }).format(amount)
}
