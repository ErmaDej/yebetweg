import { supabase } from "@/lib/supabase"

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
  params: InitializePaymentParams,
): Promise<InitializePaymentResult> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    const { data: { session } } = await supabase.auth.getSession()

    if (!supabaseUrl || !supabaseAnonKey) {
      return { success: false, error: "Payment service is not configured" }
    }

    const serviceUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/chapa-service`
    const response = await fetch(serviceUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${session?.access_token || supabaseAnonKey}`,
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
          title: "YeBetWeg",
          description: "Premium membership",
        },
        ...(params.subscription ? { subscription: params.subscription } : {}),
      }),
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      return { success: false, error: typeof data.error === "string" ? data.error : `Service error: ${response.status}` }
    }

    return {
      success: true,
      checkoutUrl: data.checkoutUrl,
      reference: data.reference,
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Network error" }
  }
}

export async function verifyChapaPayment(txRef: string): Promise<VerifyPaymentResult> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    const { data: { session } } = await supabase.auth.getSession()

    if (!supabaseUrl || !supabaseAnonKey) {
      return { success: false, error: "Payment service is not configured" }
    }

    const serviceUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/chapa-service?tx_ref=${encodeURIComponent(txRef)}`
    const response = await fetch(serviceUrl, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${session?.access_token || supabaseAnonKey}`,
      },
    })

    const data = await response.json()
    if (!response.ok || !data.success) {
      return { success: false, error: typeof data.error === "string" ? data.error : `Verify error: ${response.status}` }
    }

    return { success: true, status: data.status }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Network error" }
  }
}

export async function activateChapaPayment(txRef: string): Promise<VerifyPaymentResult> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    const { data: { session } } = await supabase.auth.getSession()

    if (!supabaseUrl || !supabaseAnonKey) {
      return { success: false, error: "Payment service is not configured" }
    }

    const serviceUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/chapa-service`
    const response = await fetch(serviceUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${session?.access_token || supabaseAnonKey}`,
      },
      body: JSON.stringify({ action: "activate", tx_ref: txRef }),
    })

    const result = await response.json()
    if (!response.ok || !result.success) {
      return { success: false, error: typeof result.error === "string" ? result.error : "Activation failed" }
    }

    return { success: true, status: "success" }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Network error" }
  }
}

export function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
    minimumFractionDigits: 2,
  }).format(amount)
}