import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
}

// ---------------------------------------------------------------------------
// TeleBirr Gateway Service (Ethio Telecom PreOrder & H5 / InApp Gateway)
//
// Verified Protocol against Ethio Telecom Developer Gateway:
//   1. Fabric token: POST {BASE}/payment/v1/token
//        X-APP-Key: {fabric_app_id}
//        body: { "appSecret": "..." }
//        -> { token: "Bearer <token>", expirationDate: "YYYYMMDDHHMMSS" }
//   2. Pre-order: POST {BASE}/payment/v1/merchant/preOrder
//        X-APP-Key: {fabric_app_id}
//        Authorization: {token}
//        body: { timestamp, nonce_str, method, version, biz_content, sign, sign_type }
//        sign = RSA-PSS (SHA-256 with 32-byte salt) over ASCII-sorted non-excluded fields
//        -> { result: "SUCCESS", code: "0", biz_content: { prepay_id } }
//   3. RawRequest & Checkout:
//        rawRequest = appid=...&merch_code=...&nonce_str=...&prepay_id=...&timestamp=...&sign=...&sign_type=SHA256WithRSA
//        checkoutUrl = {WEB_BASE_URL}{rawRequest}
// ---------------------------------------------------------------------------

const DEFAULT_PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC/ZcoOng1sJZ4CegopQVCw3HYqqVRLEudgT+dDpS8fRVy7zBgqZunju2VRCQuHeWs7yWgc9QGd4/8kRSLY+jlvKNeZ60yWcqEY+eKyQMmcjOz2Sn41fcVNgF+HV3DGiV4b23B6BCMjnpEFIb9d99/TsjsFSc7gCPgfl2yWDxE/Y1B2tVE6op2qd63YsMVFQGdre/CQYvFJENpQaBLMq4hHyBDgluUXlF0uA1X7UM0ZjbFC6ZIB/Hn1+pl5Ua8dKYrkVaecolmJT/s7c/+/1JeN+ja8luBoONsoODt2mTeVJHLF9Y3oh5rI+IY8HukIZJ1U6O7/JcjH3aRJTZagXUS9AgMBAAECggEBALBIBx8JcWFfEDZFwuAWeUQ7+VX3mVx/770kOuNx24HYt718D/HV0avfKETHqOfA7AQnz42EF1Yd7Rux1ZO0e3unSVRJhMO4linT1XjJ9ScMISAColWQHk3wY4va/FLPqG7N4L1w3BBtdjIc0A2zRGLNcFDBlxl/CVDHfcqD3CXdLukm/friX6TvnrbTyfAFicYgu0+UtDvfxTL3pRL3u3WTkDvnFK5YXhoazLctNOFrNiiIpCW6dJ7WRYRXuXhz7C0rENHyBtJ0zura1WD5oDbRZ8ON4v1KV4QofWiTFXJpbDgZdEeJJmFmt5HIi+Ny3P5n31WwZpRMHGeHrV23//0CgYEA+2/gYjYWOW3JgMDLX7r8fGPTo1ljkOUHuH98H/a/lE3wnnKKx+2ngRNZX4RfvNG4LLeWTz9plxR2RAqqOTbX8fj/NA/sS4mru9zvzMY1925FcX3WsWKBgKlLryl0vPScq4ejMLSCmypGz4VgLMYZqT4NYIkU2Lo1G1MiDoLy0CcCgYEAwt77exynUhM7AlyjhAA2wSINXLKsdFFF1u976x9kVhOfmbAutfMJPEQWb2WXaOJQMvMpgg2rU5aVsyEcuHsRH/2zatrxrGqLqgxaiqPz4ELINIh1iYK/hdRpr1vATHoebOv1wt8/9qxITNKtQTgQbqYci3KV1lPsOrBAB5S57nsCgYAvw+cagS/jpQmcngOEoh8I+mXgKEET64517DIGWHe4kr3dO+FFbc5eZPCbhqgxVJ3qUM4LK/7BJq/46RXBXLvVSfohR80Z5INtYuFjQ1xJLveeQcuhUxdK+95W3kdBBi8lHtVPkVsmYvekwK+ukcuaLSGZbzE4otcn47kajKHYDQKBgDbQyIbJ+ZsRw8CXVHu2H7DWJlIUBIS3s+CQ/xeVfgDkhjmSIKGX2to0AOeW+S9MseiTE/L8a1wY+MUppE2UeK26DLUbH24zjlPoI7PqCJjl0DFOzVlACSXZKV1lfsNEeriC61/EstZtgezyOkAlSCIH4fGr6tAeTU349Bnt0RtvAoGBAObgxjeH6JGpdLz1BbMj8xUHuYQkbxNeIPhH29CySn0vfhwg9VxAtIoOhvZeCfnsCRTj9OZjepCeUqDiDSoFznglrKhfeKUndHjvg+9kiae92iI6qJudPCHMNwP8wMSphkxUqnXFR3lr9A765GA980818UWZdrhrjLKtIIZdh+X1
-----END PRIVATE KEY-----`

const getCleanEnv = (name: string, fallback: string): string => {
  const val = Deno.env.get(name)
  if (!val || !val.trim()) return fallback
  return val.trim().replace(/^["']|["']$/g, "")
}

const TELEBIRR_BASE_URL = (
  getCleanEnv("TELEBIRR_BASE_URL", "") ||
  getCleanEnv("VITE_TELEBIRR_API_URL", "") ||
  "https://developerportal.ethiotelebirr.et:38443/apiaccess/payment/gateway"
).replace(/\/+$/, "")

const WEB_BASE_URL = (
  getCleanEnv("TELEBIRR_WEB_BASE_URL", "") ||
  "https://developerportal.ethiotelebirr.et:38443/payment/web/checkout?"
).trim()

const FABRIC_APP_ID =
  getCleanEnv("TELEBIRR_FABRIC_APP_ID", "") ||
  getCleanEnv("VITE_TELEBIRR_FABRIC_APP_ID", "") ||
  "c4182ef8-9249-458a-985e-06d191f4d505"

const APP_SECRET =
  getCleanEnv("TELEBIRR_APP_SECRET", "") ||
  getCleanEnv("VITE_TELEBIRR_APP_SECRET", "") ||
  "fad0f06383c6297f545876694b974599"

const MERCHANT_APP_ID =
  getCleanEnv("TELEBIRR_MERCHANT_APP_ID", "") ||
  getCleanEnv("VITE_TELEBIRR_MERCHANT_APP_ID", "") ||
  "1504661904051204"

const MERCHANT_CODE =
  getCleanEnv("TELEBIRR_MERCHANT_CODE", "") ||
  getCleanEnv("VITE_TELEBIRR_SHORT_CODE", "") ||
  "2159"

// The verified RSA private key paired with TeleBirr Merchant App ID 1504661904051204
const PRIVATE_KEY_PEM = DEFAULT_PRIVATE_KEY_PEM

// Ethio Telecom's gateway (developerportal.ethiotelebirr.et:38443) does not provide its intermediate CA certificate
// during the TLS handshake, causing 'UnknownIssuer' errors with Deno's default root store.
// We explicitly supply the GlobalSign intermediate & root CA certificates.
const GLOBALSIGN_INTERMEDIATE_CA = `-----BEGIN CERTIFICATE-----
MIIElzCCA3+gAwIBAgIRAIPahmyfUtUakxi40OfAMWkwDQYJKoZIhvcNAQELBQAw
TDEgMB4GA1UECxMXR2xvYmFsU2lnbiBSb290IENBIC0gUjMxEzARBgNVBAoTCkds
b2JhbFNpZ24xEzARBgNVBAMTCkdsb2JhbFNpZ24wHhcNMjUwNzE2MDMwNTQ2WhcN
MjcwNzE2MDAwMDAwWjBTMQswCQYDVQQGEwJCRTEZMBcGA1UEChMQR2xvYmFsU2ln
biBudi1zYTEpMCcGA1UEAxMgR2xvYmFsU2lnbiBHQ0MgUjMgRVYgVExTIENBIDIw
MjUwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDEG4l4CpUk556CyXIA
B3ihV2b8sWMNGwnW0wCpuaHHA5rlXpSWE1AD6r9hyGhQOrc45nPOj6Fvsqw8dFZw
FpAJzlk6FxhYP1ve8KPJvIpt6f5v28jOlzfs8c7dJ8ZmqKHB0Zj6RbAvA9vAl2A3
j0mu+ooXN3/QaFvVihDV/SRyOfFBlhPAsRk8y97tLPWx7/4YzfE6NSLKsU1yF+tf
BTttbaXTH/cWY/KQE3ZHTFRo6XouemjPBP9CDXeTR11tm37Bgn3QOj93FHdi1JJp
eNBGEOGvM8qhTV/77kDiUyOvsp4jZOhas6kIRn8nWK7fCPNdFJYi1Ctvd7gnQ1gB
lW71AgMBAAGjggFrMIIBZzAOBgNVHQ8BAf8EBAMCAYYwHQYDVR0lBBYwFAYIKwYB
BQUHAwEGCCsGAQUFBwMCMBIGA1UdEwEB/wQIMAYBAf8CAQAwHQYDVR0OBBYEFGMQ
f+QoM5r4R2BZUn5XEMdN+BcWMB8GA1UdIwQYMBaAFI/wS3+oLkUkrk1Q+mOai97i
3Ru8MHsGCCsGAQUFBwEBBG8wbTAuBggrBgEFBQcwAYYiaHR0cDovL29jc3AyLmds
b2JhbHNpZ24uY29tL3Jvb3RyMzA7BggrBgEFBQcwAoYvaHR0cDovL3NlY3VyZS5n
bG9iYWxzaWduLmNvbS9jYWNlcnQvcm9vdC1yMy5jcnQwNgYDVR0fBC8wLTAroCmg
J4YlaHR0cDovL2NybC5nbG9iYWxzaWduLmNvbS9yb290LXIzLmNybDAtBgNVHSAE
JjAkMAcGBWeBDAEBMAwGCisGAQQBoDIKAQEwCwYJKwYBBAGgMgEBMA0GCSqGSIb3
DQEBCwUAA4IBAQCtcTjIgw+tiW7E+sCTJ36nrC0IOxMpwE+nTaUG1xQJb+QE18vF
cPvEiqv8OonEBkQJFQ1N5YdDu9kydDYXBmIheYD9Z//TlUBnLL7HBje1ugplB0xE
jpU52q0XLxe6nHfeEKnslZ/Q/eDEsjZKxwF51SlGO6ap+09hfdbfMXDkTsfa+yXg
dIxZRCud0QEBTZAow0iCs3rf5wVALhhh2ePEwqxEm1LkUhvkJMLSCobYcJ+vXprK
JijbpPM602H1kqxNcD/nE7aCNm7g5GTaT04SCGYiQJ32r9mhx34peuYz05pY+AA3
aVB22PDvfoNyGZyClRtNt4KKg8dGJlYEhc3D
-----END CERTIFICATE-----`

const GLOBALSIGN_ROOT_CA = `-----BEGIN CERTIFICATE-----
MIIDXzCCAkegAwIBAgILBAAAAAABIVhTCKIwDQYJKoZIhvcNAQELBQAwTDEgMB4G
A1UECxMXR2xvYmFsU2lnbiBSb290IENBIC0gUjMxEzARBgNVBAoTCkdsb2JhbFNp
Z24xEzARBgNVBAMTCkdsb2JhbFNpZ24wHhcNMDkwMzE4MTAwMDAwWhcNMjkwMzE4
MTAwMDAwWjBMMSAwHgYDVQQLExdHbG9iYWxTaWduIFJvb3QgQ0EgLSBSMzETMBEG
A1UEChMKR2xvYmFsU2lnbjETMBEGA1UEAxMKR2xvYmFsU2lnbjCCASIwDQYJKoZI
hvcNAQEBBQADggEPADCCAQoCggEBAMwldpB5BngiFvXAg7aEyiie/QV2EcWtiHL8
RgJDx7KKnQRfJMsuS+FggkbhUqsMgUdwbN1k0ev1LKMPgj0MK66X17YUhhB5uzsT
gHeMCOFJ0mpiLx9e+pZo34knlTifBtc+ycsmWQ1z3rDI6SYOgxXG71uL0gRgykmm
KPZpO/bLyCiR5Z2KYVc3rHQU3HTgOu5yLy6c+9C7v/U9AOEGM+iCK65TpjoWc4zd
QQ4gOsC0p6Hpsk+QLjJg6VfLuQSSaGjlOCZgdbKfd/+RFO+uIEn8rUAVSNECMWEZ
XriX7613t2Saer9fwRPvm2L7DWzgVGkWqQPabumDk3F2xmmFghcCAwEAAaNCMEAw
DgYDVR0PAQH/BAQDAgEGMA8GA1UdEwEB/wQFMAMBAf8wHQYDVR0OBBYEFI/wS3+o
LkUkrk1Q+mOai97i3Ru8MA0GCSqGSIb3DQEBCwUAA4IBAQBLQNvAUKr+yAzv95ZU
RUm7lgAJQayzE4aGKAczymvmdLm6AC2upArT9fHxD4q/c2dKg8dEe3jgr25sbwMp
jjM5RcOO5LlXbKr8EpbsU8Yt5CRsuZRj+9xTaGdWPoO4zzUhw8lo/s7awlOqzJCK
6fBdRoyV3XpYKBovHd7NADdBj+1EbddTKJd+82cEHhXXipa0095MJ6RMG3NzdvQX
mcIfeg7jLQitChws/zyrVQ4PkX4268NXSb7hLi18YIvDQVETI53O9zJrlAGomecs
Mx86OyXShkDOOyyGeMlhLxS67ttVb9+E7gUJTb0o2HLO02JQZR7rkpeDMdmztcpH
WD9f
-----END CERTIFICATE-----`

let customHttpClient: unknown = undefined
try {
  if (typeof (Deno as any).createHttpClient === "function") {
    customHttpClient = (Deno as any).createHttpClient({
      caCerts: [GLOBALSIGN_INTERMEDIATE_CA, GLOBALSIGN_ROOT_CA],
    })
  }
} catch (err) {
  console.warn("[TeleBirr Service] Custom HttpClient init warning:", err)
}

function telebirrFetch(url: string, init: RequestInit): Promise<Response> {
  const options: RequestInit & { client?: unknown } = { ...init }
  if (customHttpClient) {
    options.client = customHttpClient
  }
  return fetch(url, options as RequestInit)
}

// In-memory fabric token cache (honors the token's effectiveDate/expirationDate).
let tokenCache: { accessToken: string; expiresAt: number } | null = null

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })

// ---- Base64 / DER helpers -------------------------------------------------
const b64dec = (b64Str: string): Uint8Array => {
  const bin = atob(b64Str.replace(/\s+/g, ""))
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}

const pemToDer = (pem: string): Uint8Array => {
  const cleanPem = pem.replace(/\\n/g, "\n").replace(/\\r/g, "").trim()
  const m = cleanPem.match(/-----BEGIN ([^-]+)-----([\s\S]*?)-----END [^-]+-----/)
  if (!m) throw new Error("Invalid PEM format")
  return b64dec(m[2].replace(/\s+/g, ""))
}

const b64 = (bytes: Uint8Array): string => {
  let s = ""
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

const randHex = (n: number): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("")

// ---- RSA-PSS (SHA-256, 32-byte salt) signing -------------------------------
async function importRsaPssPrivate(pem: string) {
  const der = pemToDer(pem)
  const algo = { name: "RSA-PSS", hash: "SHA-256" }
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
    new TextEncoder().encode(derivation)
  )
  return b64(new Uint8Array(sig))
}

const excludeFields = [
  "sign",
  "sign_type",
  "header",
  "refund_info",
  "openType",
  "raw_request",
  "biz_content",
]

function buildSignString(requestObject: Record<string, any>): string {
  const fields: string[] = []
  const fieldMap: Record<string, any> = {}

  for (const key in requestObject) {
    if (
      excludeFields.includes(key) ||
      requestObject[key] === undefined ||
      requestObject[key] === null
    ) {
      continue
    }
    fields.push(key)
    fieldMap[key] = requestObject[key]
  }

  if (requestObject.biz_content && typeof requestObject.biz_content === "object") {
    const biz = requestObject.biz_content
    for (const key in biz) {
      if (
        excludeFields.includes(key) ||
        biz[key] === undefined ||
        biz[key] === null
      ) {
        continue
      }
      fields.push(key)
      fieldMap[key] = biz[key]
    }
  }

  fields.sort()
  return fields.map((k) => `${k}=${fieldMap[k]}`).join("&")
}

// ---- Fabric token (cached) ------------------------------------------------
interface TokenResp {
  token: string
  effectiveDate?: string
  expirationDate?: string
  errorCode?: string | null
  errorMsg?: string | null
}

async function getFabricToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt - Date.now() > 60_000) {
    return tokenCache.accessToken
  }

  const res = await telebirrFetch(`${TELEBIRR_BASE_URL}/payment/v1/token`, {
    method: "POST",
    headers: {
      "X-APP-Key": FABRIC_APP_ID,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ appSecret: APP_SECRET }),
  })

  let data: TokenResp | null = null
  try {
    data = (await res.json()) as TokenResp
  } catch {
    const raw = await res.text().catch(() => "")
    throw new Error(`TeleBirr token request failed (HTTP ${res.status}): ${raw.slice(0, 300)}`)
  }

  if (!data || !data.token) {
    throw new Error(
      data?.errorMsg || `TeleBirr token request failed (HTTP ${res.status})`
    )
  }

  const raw = data.token.startsWith("Bearer ") ? data.token.slice(7) : data.token
  const expiresAt = parseEffectiveDate(data.expirationDate)
  tokenCache = { accessToken: raw, expiresAt: expiresAt ?? Date.now() + 55 * 60 * 1000 }
  return raw
}

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
  nonce_str?: string
  sign?: string
  sign_type?: string
  biz_content?: {
    prepay_id?: string
    merch_order_id?: string
    [k: string]: unknown
  }
  [k: string]: unknown
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405)
  }

  try {
    const body = (await req.json()) as InitBody & Record<string, unknown>

    const amount = Number(body.amount)
    const reference = String(body.reference || "")
    const notifyUrl = String(body.notifyUrl || "")
    const returnUrl = String(body.returnUrl || "")
    const subject = String(body.subject || "YeBetWeg Subscription Payment")

    if (!amount || !(amount > 0)) {
      return json({ success: false, error: "Invalid amount" }, 400)
    }
    if (!reference || !/^[A-Za-z0-9]+$/.test(reference)) {
      return json(
        { success: false, error: "Invalid reference (alphanumeric only)" },
        400
      )
    }
    if (!notifyUrl || !returnUrl) {
      return json(
        { success: false, error: "notifyUrl and returnUrl are required" },
        400
      )
    }

    const accessToken = await getFabricToken()

    // 10-digit UNIX timestamp in seconds
    const timestamp = String(Math.floor(Date.now() / 1000))
    const nonceStr = randHex(16).toUpperCase()

    const bizContent: Record<string, any> = {
      appid: String(MERCHANT_APP_ID),
      merch_code: String(MERCHANT_CODE),
      merch_order_id: reference,
      trade_type: "InApp",
      title: subject.slice(0, 100),
      total_amount: amount.toFixed(2),
      trans_currency: "ETB",
      timeout_express: "120m",
      payee_identifier: String(MERCHANT_CODE),
      payee_identifier_type: "04",
      payee_type: "5000",
      redirect_url: returnUrl,
      notify_url: notifyUrl,
    }

    const preOrderReq: Record<string, any> = {
      timestamp,
      nonce_str: nonceStr,
      method: "payment.preorder",
      biz_content: bizContent,
    }

    const signStr = buildSignString(preOrderReq)
    const sign = await rsaPssSign(signStr, PRIVATE_KEY_PEM)

    preOrderReq.sign = sign
    preOrderReq.sign_type = "SHA256WithRSA"

    const poRes = await telebirrFetch(`${TELEBIRR_BASE_URL}/payment/v1/merchant/preOrder`, {
      method: "POST",
      headers: {
        "X-APP-Key": FABRIC_APP_ID,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preOrderReq),
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
        502
      )
    }

    if (poRes.status !== 200 || po.result !== "SUCCESS" || po.code !== "0") {
      return json(
        {
          success: false,
          error:
            po.msg ||
            (po as any).errorMsg ||
            `TeleBirr pre-order failed (result=${po.result}, code=${po.code})`,
          code: po.code || String(poRes.status),
          telebirr_status: poRes.status,
          telebirr_body: rawBody.slice(0, 2000),
        },
        poRes.status === 200 ? 400 : poRes.status
      )
    }

    const prepayId = po.biz_content?.prepay_id
    if (!prepayId) {
      return json(
        { success: false, error: "TeleBirr returned success but no prepay_id" },
        502
      )
    }

    // Build the raw request & hosted checkout URL
    const cTimestamp = String(Math.floor(Date.now() / 1000))
    const cNonce = randHex(16).toUpperCase()
    const rawReqMap: Record<string, string> = {
      appid: String(MERCHANT_APP_ID),
      merch_code: String(MERCHANT_CODE),
      nonce_str: cNonce,
      prepay_id: prepayId,
      timestamp: cTimestamp,
    }
    const cSignStr = buildSignString(rawReqMap)
    const cSign = await rsaPssSign(cSignStr, PRIVATE_KEY_PEM)

    const rawRequest = [
      `appid=${rawReqMap.appid}`,
      `merch_code=${rawReqMap.merch_code}`,
      `nonce_str=${rawReqMap.nonce_str}`,
      `prepay_id=${rawReqMap.prepay_id}`,
      `timestamp=${rawReqMap.timestamp}`,
      `sign=${cSign}`,
      `sign_type=SHA256WithRSA`,
    ].join("&")

    const checkoutBase = WEB_BASE_URL.endsWith("?")
      ? WEB_BASE_URL
      : WEB_BASE_URL.includes("?")
      ? `${WEB_BASE_URL}&`
      : `${WEB_BASE_URL}?`

    const checkoutUrl = `${checkoutBase}${rawRequest}`

    return json({
      success: true,
      prepayId,
      reference,
      rawRequest,
      checkoutUrl,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred"
    console.error("[TeleBirr Service] Unexpected error:", error)
    return json({ success: false, error: message }, 500)
  }
})
