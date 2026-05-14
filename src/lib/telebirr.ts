const TELEBIRR_API_KEY = import.meta.env.VITE_TELEBIRR_API_KEY
const TELEBIRR_APP_ID = import.meta.env.VITE_TELEBIRR_APP_ID
const TELEBIRR_FABRIC_APP_ID = import.meta.env.VITE_TELEBIRR_FABRIC_APP_ID
const TELEBIRR_SHORT_CODE = import.meta.env.VITE_TELEBIRR_SHORT_CODE
const TELEBIRR_BASE_URL = "https://api.telebirr.com/v1"

export interface TeleBirrPaymentRequest {
  appId: string
  fabricAppId: string
  shortCode: string
  amount: number
  phoneNumber: string
  subject: string
  description: string
  reference: string
  notifyUrl: string
  returnUrl: string
}

export interface TeleBirrPaymentResponse {
  code: string
  msg: string
  data?: {
    prepayId: string
    codeUrl: string
    reference: string
    qrCode: string
  }
}

export interface TeleBirrQueryResult {
  code: string
  msg: string
  data?: {
    status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED"
    amount: string
    reference: string
    transactionId: string
  }
}

export interface InitializeTeleBirrPaymentParams {
  amount: number
  phoneNumber: string
  reference: string
  notifyUrl: string
  returnUrl: string
  subject?: string
  description?: string
}

export interface InitializeTeleBirrResult {
  success: boolean
  prepayId?: string
  reference?: string
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
    const requestBody: TeleBirrPaymentRequest = {
      appId: TELEBIRR_APP_ID,
      fabricAppId: TELEBIRR_FABRIC_APP_ID,
      shortCode: TELEBIRR_SHORT_CODE,
      amount: params.amount,
      phoneNumber: params.phoneNumber,
      subject: params.subject || "YeBetWeg Premium Subscription",
      description:
        params.description || "Payment for YeBetWeg premium membership",
      reference: params.reference,
      notifyUrl: params.notifyUrl,
      returnUrl: params.returnUrl,
    }

    const response = await fetch(`${TELEBIRR_BASE_URL}/payment/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: TELEBIRR_API_KEY,
      },
      body: JSON.stringify(requestBody),
    })

    const data: TeleBirrPaymentResponse = await response.json()

    if (!response.ok || data.code !== "0000") {
      return {
        success: false,
        error: data.msg || "Failed to initialize TeleBirr payment",
      }
    }

    if (data.data) {
      return {
        success: true,
        prepayId: data.data.prepayId,
        reference: data.data.reference,
        qrCode: data.data.qrCode,
      }
    }

    return {
      success: false,
      error: "Invalid response from TeleBirr",
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    }
  }
}

export async function queryTeleBirrPayment(
  reference: string,
): Promise<QueryTeleBirrResult> {
  try {
    const response = await fetch(
      `${TELEBIRR_BASE_URL}/payment/query?reference=${reference}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: TELEBIRR_API_KEY,
        },
      },
    )

    const data: TeleBirrQueryResult = await response.json()

    if (!response.ok || data.code !== "0000") {
      return {
        success: false,
        error: data.msg || "Failed to query TeleBirr payment",
      }
    }

    if (data.data) {
      return {
        success: true,
        status: data.data.status,
        data: data.data,
      }
    }

    return {
      success: false,
      error: "Invalid response from TeleBirr",
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
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