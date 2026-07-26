import { supabase } from "@/lib/supabase"

const SERVICE_PATH = "/functions/v1/chapa-service"

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

function getServiceUrl(): string | null {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  if (!supabaseUrl) return null
  return `${supabaseUrl.replace(/\/$/, "")}${SERVICE_PATH}`
}

function getHeaders(sessionToken?: string): Record<string, string> {
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  return {
    "Content-Type": "application/json",
    apikey: supabaseAnonKey || "",
    Authorization: `Bearer ${sessionToken || supabaseAnonKey || ""}`,
  }
}

export async function initializeChapaPayment(
  params: InitializePaymentParams,
): Promise<InitializePaymentResult> {
  try {
    const serviceUrl = getServiceUrl()
    if (!serviceUrl) {
      return {
        success: false,
        error: "Payment service is not configured",
      }
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const response = await fetch(serviceUrl, {
      method: "POST",
      headers: getHeaders(session?.access_token),
      body: JSON.stringify(params),
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.message || "Failed to initialize payment",
      }
    }

    return {
      success: true,
      checkoutUrl: data.checkoutUrl || data.data?.checkout_url,
      reference: data.reference || data.data?.reference,
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
    const serviceUrl = getServiceUrl()
    if (!serviceUrl) {
      return {
        success: false,
        error: "Payment service is not configured",
      }
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const response = await fetch(`${serviceUrl}?tx_ref=${encodeURIComponent(tx_ref)}`, {
      method: "GET",
      headers: getHeaders(session?.access_token),
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.message || "Failed to verify payment",
      }
    }

    return {
      success: true,
      status: data.status || data.data?.status,
      data: data.data,
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
