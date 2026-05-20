const TELEBIRR_API_KEY = import.meta.env.VITE_TELEBIRR_API_KEY
const TELEBIRR_MERCHANT_APP_ID = import.meta.env.VITE_TELEBIRR_MERCHANT_APP_ID
const TELEBIRR_FABRIC_APP_ID = import.meta.env.VITE_TELEBIRR_FABRIC_APP_ID
const TELEBIRR_SHORT_CODE = import.meta.env.VITE_TELEBIRR_SHORT_CODE
const TELEBIRR_APP_SECRET = import.meta.env.VITE_TELEBIRR_APP_SECRET
import * as CryptoJS from "crypto-js"

const TELEBIRR_BASE_URL = "https://api.telebirr.com/v1"

// Validate required environment variables
function validateTeleBirrConfig(): string | null {
  if (!TELEBIRR_API_KEY) {
    return "VITE_TELEBIRR_API_KEY is not configured"
  }
  if (!TELEBIRR_MERCHANT_APP_ID) {
    return "VITE_TELEBIRR_MERCHANT_APP_ID is not configured"
  }
  if (!TELEBIRR_FABRIC_APP_ID) {
    return "VITE_TELEBIRR_FABRIC_APP_ID is not configured"
  }
  if (!TELEBIRR_SHORT_CODE) {
    return "VITE_TELEBIRR_SHORT_CODE is not configured"
  }
  if (!TELEBIRR_APP_SECRET) {
    return "VITE_TELEBIRR_APP_SECRET is not configured"
  }
  return null
}

if (typeof window !== "undefined") {
  const configError = validateTeleBirrConfig()
  if (configError) {
    console.warn(`[TeleBirr Config Warning] ${configError}`)
  }
}

export interface TeleBirrPaymentRequest {
  appId: string
  fabricAppId: string
  nonce: string
  publicKey: string
  shortCode: string
  amount: number
  phoneNumber: string
  subject: string
  description: string
  outTradeNo: string // Renamed from reference to outTradeNo
  receiveName: string
  returnUrl: string
  timeoutExpress: string
  sign: string
}

export interface TeleBirrPaymentResponse {
  code: number
  msg: string
  data?: {
    toPayUrl: string
    payExchangeId: string
    outTradeNo: string
    qrCode: string
  }
  success: boolean
  message: string
}

export interface TeleBirrQueryResult {
  code: string
  msg: string
  data?: {
    status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED"
    amount: string
    outTradeNo: string
    transactionId: string
  }
}

export interface InitializeTeleBirrPaymentParams {
  amount: number
  phoneNumber: string
  reference: string // This will be mapped to outTradeNo
  notifyUrl: string
  returnUrl: string
  subject?: string
  description?: string
}

export interface InitializeTeleBirrResult {
  success: boolean
  toPayUrl?: string
  outTradeNo?: string
  qrCode?: string
  error?: string
}

export interface QueryTeleBirrResult {
  success: boolean
  status?: string
  data?: TeleBirrQueryResult["data"]
  error?: string
}

export async function initializeTeleBirrPayment(
  params: InitializeTeleBirrPaymentParams,
): Promise<InitializeTeleBirrResult> {
  try {
    // Validate input parameters
    if (!params.phoneNumber || !params.amount || !params.reference) {
      return {
        success: false,
        error: "Missing required payment parameters",
      }
    }

    if (params.amount <= 0) {
      return {
        success: false,
        error: "Amount must be greater than zero",
      }
    }

    console.debug("[TeleBirr Client] Initializing payment:", {
      reference: params.reference,
      amount: params.amount,
      phone: params.phoneNumber.replace(/(?<=.{3}).(?=.*(?:.{3})+$)/g, "X"), // Mask phone for security
    })

    // Call backend service instead of direct API call
    const serviceUrl = `${window.location.origin}/functions/v1/telebirr-service`
    
    console.debug("[TeleBirr Client] Calling backend service:", serviceUrl)

    const response = await fetch(serviceUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: params.amount,
        phoneNumber: params.phoneNumber,
        subject: params.subject || "YeBetWeg Premium Subscription",
        description:
          params.description || "Payment for YeBetWeg premium membership",
        reference: params.reference,
        notifyUrl: params.notifyUrl,
        returnUrl: params.returnUrl,
      }),
    })

    const data = await response.json()

    console.debug("[TeleBirr Client] Service response received:", {
      status: response.status,
      success: data.success,
      hasData: !!data.data?.payExchangeId,
    })

    if (!response.ok || !data.success) {
      console.error("[TeleBirr Client] Service error:", {
        status: response.status,
        message: data.message || data.msg,
        code: data.code,
      })
      return {
        success: false,
        error: data.message || data.msg || `Service error: ${response.status}`,
      }
    }

    if (!data.data?.toPayUrl) {
      console.error("[TeleBirr Client] Invalid response: missing toPayUrl")
      return {
        success: false,
        error: "Invalid response from payment service: missing toPayUrl",
      }
    }

    console.info("[TeleBirr Client] Payment initialized successfully:", {
      reference: params.reference,
      payExchangeId: data.data.payExchangeId?.substring(0, 8) + "...",
      toPayUrl: data.data.toPayUrl,
    })

    return {
      success: true,
      toPayUrl: data.data.toPayUrl,
      outTradeNo: data.data.outTradeNo,
      qrCode: data.data.qrCode,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("[TeleBirr Client] Payment initialization error:", errorMessage)
    return {
      success: false,
      error:
        error instanceof Error
          ? `Network error: ${error.message}`
          : "Network error occurred while initializing payment",
    }
  }
}

export async function queryTeleBirrPayment(
  reference: string,
): Promise<QueryTeleBirrResult> {
  try {
    // Validate configuration
    const configError = validateTeleBirrConfig()
    if (configError) {
      console.error(`[TeleBirr] Configuration error: ${configError}`)
      return {
        success: false,
        error: "Payment service is not properly configured",
      }
    }

    if (!reference) {
      return {
        success: false,
        error: "Reference is required to query payment status",
      }
    }

    console.debug("[TeleBirr] Querying payment status:", { reference })

    const authHeader = TELEBIRR_API_KEY?.startsWith("Bearer ")
      ? TELEBIRR_API_KEY
      : `Bearer ${TELEBIRR_API_KEY}`

    const response = await fetch(
      `${TELEBIRR_BASE_URL}/payment/query?outTradeNo=${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
      },
    )

    const data: TeleBirrQueryResult = await response.json()

    console.debug("[TeleBirr] Query response received:", {
      code: data.code,
      msg: data.msg,
      status: data.data?.status,
    })

    if (!response.ok) {
      console.error("[TeleBirr] Query HTTP error:", {
        status: response.status,
        message: data.msg,
      })
      return {
        success: false,
        error: data.msg || `HTTP ${response.status}: Failed to query payment`,
      }
    }

    if (data.code !== "0000") {
      console.error("[TeleBirr] Query API error:", {
        code: data.code,
        message: data.msg,
      })
      return {
        success: false,
        error: data.msg || `Error code ${data.code}: Failed to query payment status`,
      }
    }

    if (!data.data) {
      console.warn("[TeleBirr] Query returned no data:", { reference })
      return {
        success: false,
        error: "Invalid response from TeleBirr: missing payment data",
      }
    }

    console.info("[TeleBirr] Payment status queried successfully:", {
      reference,
      status: data.data.status,
    })

    return {
      success: true,
      status: data.data.status,
      data: data.data,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("[TeleBirr] Query error:", errorMessage)
    return {
      success: false,
      error:
        error instanceof Error
          ? `Network error: ${error.message}`
          : "Network error occurred while querying payment status",
    }
  }
}

export function validateEthiopianPhoneNumber(phone: string): boolean {
  const phoneRegex = /^(\+251|0)?9\d{8}$/
  return phoneRegex.test(phone)
}

export function formatEthiopianPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "")
  if (cleaned.startsWith("251")) {
    return "+" + cleaned
  }
  if (cleaned.startsWith("0")) {
    return "+251" + cleaned.slice(1)
  }
  return cleaned
}