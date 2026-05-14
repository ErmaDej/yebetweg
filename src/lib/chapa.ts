const CHAPA_SECRET_KEY = import.meta.env.VITE_CHAPA_SECRET_KEY
const CHAPA_BASE_URL = "https://api.chapa.co/v1"

export interface ChapaInitializeResponse {
  status: "success" | "failed"
  message: string
  data: {
    checkout_url: string
    reference: string
  }
}

export interface ChapaVerifyResponse {
  status: "success" | "failed"
  message: string
  data: {
    first_name: string
    last_name: string
    email: string
    currency: string
    amount: string
    charge: string
    mode: string
    method: string
    type: string
    status: string
    reference: string
    tracking_code: string
    created_at: string
    updated_at: string
  }
}

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
  data?: ChapaVerifyResponse["data"]
  error?: string
}

export async function initializeChapaPayment(
  params: InitializePaymentParams,
): Promise<InitializePaymentResult> {
  try {
    const response = await fetch(`${CHAPA_BASE_URL}/initialize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
      },
      body: JSON.stringify({
        amount: params.amount,
        currency: "ETB",
        email: params.email,
        first_name: params.first_name,
        last_name: params.last_name,
        tx_ref: params.tx_ref,
        callback_url: params.callback_url,
        return_url: params.return_url,
        customization: params.customization || {
          title: "YeBetWeg Premium Subscription",
          description: "Payment for YeBetWeg premium membership",
        },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Failed to initialize payment",
      }
    }

    if (data.status === "success") {
      return {
        success: true,
        checkoutUrl: data.data.checkout_url,
        reference: data.data.reference,
      }
    }

    return {
      success: false,
      error: data.message || "Payment initialization failed",
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    }
  }
}

export async function verifyChapaPayment(
  tx_ref: string,
): Promise<VerifyPaymentResult> {
  try {
    const response = await fetch(
      `${CHAPA_BASE_URL}/transaction/verify/${tx_ref}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
        },
      },
    )

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Failed to verify payment",
      }
    }

    if (data.status === "success") {
      return {
        success: true,
        status: data.data.status,
        data: data.data,
      }
    }

    return {
      success: false,
      error: data.message || "Payment verification failed",
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    }
  }
}

export function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
    minimumFractionDigits: 2,
  }).format(amount)
}