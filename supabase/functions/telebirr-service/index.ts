import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
}

// ---------------------------------------------------------------------------
// TeleBirr REST gateway (EtCH H5 / C2B "Subscription payment" API).
//
// Protocol (validated against the TeleBirr sandbox gateway):
//   1. Fabric token:  POST {BASE}/payment/v1/token
//        X-APP-Key: {fabric_app_id}
//        body: { "appSecret": "..." }
//        -> { token: "Bearer <access_token>", expirationDate: "YYYYMMDDHHMMSS" }
//   2. Pre-order:      POST {BASE}/payment/v1/merchant/preOrder
//        X-APP-Key: {fabric_app_id}
//        Authorization: Bearer <access_token>
//        body: Alipay-style top-level params + biz_content + sign_type + sign
//        sign = RSA-PSS(SHA-256, 32-byte salt) over ASCII-sorted, flattened
//               params (top-level + biz_content inner), joined as k=v&...
//        -> { result: "SUCCESS", code: "0", biz_content: { prepay_id } }
//   3. Checkout URL:  {WEB_BASE_URL}appid=...&merch_code=...&nonce_str=...
//        &prepay_id=...&timestamp=...&sign_type=SHA256WithRSA&sign=...&
//        version=1.0&trade_type=Checkout   (signed fields: appid, merch_code,
//        nonce_str, prepay_id, timestamp — ASCII sorted)
//
// Required env (set via Project Settings -> Functions -> Environment Variables):
//   TELEBIRR_BASE_URL        gateway base, e.g. https://api.telebirr.com/apiaccess/payment/gateway
//   TELEBIRR_WEB_BASE_URL    checkout host, e.g. https://...paygate?
//   TELEBIRR_FABRIC_APP_ID   fabric app id (X-APP-Key)
//   TELEBIRR_APP_SECRET      fabric app secret
//   TELEBIRR_MERCHANT_APP_ID numeric merchant app id
//   TELEBIRR_MERCHANT_CODE   merchant short code
//   TELEBIRR_PRIVATE_KEY_PEM RSA private key (PKCS#8 or PKCS#1 PEM) used to sign
//   TELEBIRR_PUBLIC_KEY_PEM  platform public key (for webhook verification)
//   TELEBIRR_INSECURE_TLS    "true" to skip TLS verification (sandbox only)
// ---------------------------------------------------------------------------

const TELEBIRR_BASE_URL = (
  Deno.env.get("TELEBIRR_BASE_URL") ||
  Deno.env.get("VITE_TELEBIRR_API_URL")
)?.replace(/\/+$/, "")

const WEB_BASE_URL = (Deno.env.get("TELEBIRR_WEB_BASE_URL") || "").replace(/\/+$/, "")

const FABRIC_APP_ID =
  Deno.env.get("TELEBIRR_FABRIC_APP_ID") || Deno.env.get("VITE_TELEBIRR_FABRIC_APP_ID")

const APP_SECRET =
  Deno.env.get("TELEBIRR_APP_SECRET") || Deno.env.get("VITE_TELEBIRR_APP_SECRET")

const MERCHANT_APP_ID =
  Deno.env.get("TELEBIRR_MERCHANT_APP_ID") || Deno.env.get("VITE_TELEBIRR_MERCHANT_APP_ID")

const MERCHANT_CODE =
  Deno.env.get("TELEBIRR_MERCHANT_CODE") ||
  Deno.env.get("VITE_TELEBIRR_SHORT_CODE")

const PRIVATE_KEY_PEM = Deno.env.get("TELEBIRR_PRIVATE_KEY_PEM")

const INSECURE_TLS = (Deno.env.get("TELEBIRR_INSECURE_TLS") || "").toLowerCase() === "true"

// In-memory fabric token cache (honors the token's effectiveDate/expirationDate).
let tokenCache: { accessToken: string; expiresAt: number } | null = null

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })

// ---- Base64 / DER helpers -------------------------------------------------
const b64dec = (b64: string): Uint8Array => {
  const bin = atob(b64.replace(/\s+/g, ""))
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}
const pemToDer = (pem: string): Uint8Array => {
  const m = pem.match(/-----BEGIN ([^-]+)-----([\s\S]*?)-----END [^-]+-----/)
  if (!m) throw new Error("Invalid PEM format")
  return b64dec(m[2].replace(/\s+/g, ""))
}
const b64 = (bytes: Uint8Array): string => {
  let s = ""
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}
const randHex = (n: number): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, "0")).join("")

// ---- RSA-PSS (SHA-256, 32-byte salt) signing -------------------------------
async function importRsaPssPrivate(pem: string) {
  const der = pemToDer(pem)
  const algo = { name: "RSA-PSS", hash: "SHA-256" }
  // Accept PKCS#8 first (BEGIN PRIVATE KEY), then PKCS#1 (BEGIN RSA PRIVATE KEY).
  const formats: ("pkcs8" | "pkcs1" | "spki")[] = ["pkcs8", "pkcs1", "spki"]
  for (const fmt of formats) {
    try {
      return await crypto.subtle.importKey(fmt, der, algo, false, ["sign"])
    } catch {
      continue
    }
  }
  throw new Error("Unsupported private key PEM format (use PKCS#8 or PKCS#1)")
}
async function rsaPssSign(derivation: string, pem: string): Promise<string> {
  const key = await importRsaPssPrivate(pem)
  const sig = await crypto.subtle.sign(
    { name: "RSA-PSS", saltLength: 32 },
    key,
    new TextEncoder().encode(derivation),
  )
  return b64(new Uint8Array(sig))
}

// Alipay/SHA256WithRSA-style sign string: ASCII-sort flattened params, join k=v&...
const buildSignString = (params: Record<string, string>): string =>
  Object.keys(params)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .map((k) => `${k}=${params[k]}`)
    .join("&")

// ---- Fabric token (cached) ------------------------------------------------
interface TokenResp {
  token: string
  effectiveDate?: string
  expirationDate?: string
}
async function getFabricToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt - Date.now() > 60_000) {
    return tokenCache.accessToken
  }
  const res = await fetch(`${TELEBIRR_BASE_URL}/payment/v1/token`, {
    method: "POST",
    headers: {
      "X-APP-Key": FABRIC_APP_ID!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ appSecret: APP_SECRET }),
    // Allow self-signed sandbox gateway certs when explicitly enabled.
    ...(INSECURE_TLS ? { deno: { tls: { rejectTlsCerts: false } } } : {}),
  })
  let data: TokenResp | null = null
  try {
    data = (await res.json()) as TokenResp
  } catch {
    const raw = await res.text().catch(() => "")
    throw new Error(`TeleBirr token request failed (HTTP ${res.status}): ${raw.slice(0, 300)}`)
  }
  if (!data || !data.token) {
    throw new Error(`TeleBirr token request failed (HTTP ${res.status})`)
  }
  const raw = data.token.startsWith("Bearer ") ? data.token.slice(7) : data.token
  const expiresAt = parseEffectiveDate(data.expirationDate)
  tokenCache = { accessToken: raw, expiresAt: expiresAt ?? Date.now() + 55 * 60 * 1000 }
  return raw
}

// Parse "YYYYMMDDHHMMSS" (UTC) into epoch ms.
function parseEffectiveDate(s?: string): number | null {
  const m = s?.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/)
  if (!m) return null
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])
}

// ---- Payment initialization ------------------------------------------------
interface InitBody {
  amount: number
  reference: string
  notifyUrl: string
  returnUrl: string
  subject?: string
  description?: string
  phoneNumber?: string
}

interface PreOrderResponse {
  result?: string
  code?: string
  msg?: string
  biz_content?: {
    prepay_id?: string
    merch_order_id?: string
    [k: string]: unknown
  }
  [k: string]: unknown
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405)
  }

  try {
    const body = (await req.json()) as InitBody & Record<string, unknown>

    // Validate configuration
    const missing: string[] = []
    if (!TELEBIRR_BASE_URL) missing.push("TELEBIRR_BASE_URL")
    if (!WEB_BASE_URL) missing.push("TELEBIRR_WEB_BASE_URL")
    if (!FABRIC_APP_ID) missing.push("TELEBIRR_FABRIC_APP_ID")
    if (!APP_SECRET) missing.push("TELEBIRR_APP_SECRET")
    if (!MERCHANT_APP_ID) missing.push("TELEBIRR_MERCHANT_APP_ID")
    if (!MERCHANT_CODE) missing.push("TELEBIRR_MERCHANT_CODE")
    if (!PRIVATE_KEY_PEM) missing.push("TELEBIRR_PRIVATE_KEY_PEM")
    if (missing.length) {
      return json(
        {
          success: false,
          error: "TeleBirr gateway is not fully configured",
          missing,
        },
        500,
      )
    }

    // Validate request body
    const amount = Number(body.amount)
    const reference = String(body.reference || "")
    const notifyUrl = String(body.notifyUrl || "")
    const returnUrl = String(body.returnUrl || "")
    const subject = String(body.subject || "YeBetWeg Payment")
    const description = String(body.description || "Payment for YeBetWeg services")

    if (!amount || !(amount > 0)) {
      return json({ success: false, error: "Invalid amount" }, 400)
    }
    if (!reference || !/^[A-Za-z0-9]+$/.test(reference)) {
      return json(
        { success: false, error: "Invalid reference (alphanumeric only)" },
        400,
      )
    }
    if (!notifyUrl || !returnUrl) {
      return json({ success: false, error: "notifyUrl and returnUrl are required" }, 400)
    }

    const accessToken = await getFabricToken()

    // Build the signed pre-order (Alipay-style, RSA-PSS 32-byte salt).
    const timestamp = String(Date.now()) // 13-digit unix ms
    const nonceStr = randHex(16)
    const bizContent: Record<string, string> = {
      appid: String(MERCHANT_APP_ID),
      merch_code: String(MERCHANT_CODE),
      merch_order_id: reference,
      trade_type: "Checkout",
      title: subject.slice(0, 100),
      total_amount: amount.toFixed(2),
      trans_currency: "ETB",
      timeout_express: "30m",
      notify_url: notifyUrl,
      redirect_url: returnUrl,
    }

    const topLevel: Record<string, string> = {
      app_id: String(MERCHANT_APP_ID),
      method: "payment.preorder",
      charset: "utf-8",
      format: "JSON",
      version: "1.0",
      timestamp,
      nonce_str: nonceStr,
      access_token: accessToken,
    }

    const signParams: Record<string, string> = { ...topLevel }
    for (const k in bizContent) signParams[k] = bizContent[k]

    const signStr = buildSignString(signParams)
    const sign = await rsaPssSign(signStr, PRIVATE_KEY_PEM!)

    const preOrderBody = {
      ...topLevel,
      sign_type: "SHA256WithRSA",
      sign,
      biz_content: bizContent,
    }

    const poRes = await fetch(`${TELEBIRR_BASE_URL}/payment/v1/merchant/preOrder`, {
      method: "POST",
      headers: {
        "X-APP-Key": FABRIC_APP_ID!,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preOrderBody),
      ...(INSECURE_TLS ? { deno: { tls: { rejectTlsCerts: false } } } : {}),
    })

    const rawBody = await poRes.text().catch(() => "")
    let po: PreOrderResponse
    try {
      po = JSON.parse(rawBody) as PreOrderResponse
    } catch {
      return json(
        {
          success: false,
          error: `TeleBirr pre-order returned non-JSON (HTTP ${poRes.status})`,
          telebirr_status: poRes.status,
          telebirr_body: rawBody.slice(0, 2000),
        },
        502,
      )
    }

    if (poRes.status !== 200 || po.result !== "SUCCESS" || po.code !== "0") {
      return json(
        {
          success: false,
          error: po.msg || po.errorMsg || `TeleBirr pre-order failed (result=${po.result}, code=${po.code})`,
          code: po.code || String(poRes.status),
          telebirr_status: poRes.status,
          telebirr_body: rawBody.slice(0, 2000),
        },
        poRes.status === 200 ? 400 : poRes.status,
      )
    }

    const prepayId = po.biz_content?.prepay_id
    if (!prepayId) {
      return json(
        { success: false, error: "TeleBirr returned success but no prepay_id" },
        502,
      )
    }

    // Build the hosted checkout URL (signed: appid, merch_code, nonce_str, prepay_id, timestamp).
    const cTimestamp = String(Date.now())
    const cNonce = randHex(16)
    const checkoutParams: Record<string, string> = {
      appid: String(MERCHANT_APP_ID),
      merch_code: String(MERCHANT_CODE),
      nonce_str: cNonce,
      prepay_id: prepayId,
      timestamp: cTimestamp,
    }
    const cSignStr = buildSignString(checkoutParams)
    const cSign = await rsaPssSign(cSignStr, PRIVATE_KEY_PEM!)

    const checkoutUrl =
      `${WEB_BASE_URL}` +
      `appid=${encodeURIComponent(MERCHANT_APP_ID)}` +
      `&merch_code=${encodeURIComponent(MERCHANT_CODE)}` +
      `&nonce_str=${encodeURIComponent(cNonce)}` +
      `&prepay_id=${encodeURIComponent(prepayId)}` +
      `&timestamp=${cTimestamp}` +
      `&sign_type=SHA256WithRSA` +
      `&sign=${encodeURIComponent(cSign)}` +
      `&version=1.0` +
      `&trade_type=Checkout`

    return json({
      success: true,
      prepayId,
      reference,
      checkoutUrl,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred"
    console.error("[TeleBirr Service] Unexpected error:", error)
    return json({ success: false, error: message }, 500)
  }
})
