import { test, describe, it } from "node:test"
import assert from "node:assert/strict"
import crypto from "node:crypto"
import https from "node:https"
import http from "node:http"

// ---------------------------------------------------------------------------
// TeleBirr Implementation Test Suite
// Covers: Phone validation, RSA-PSS signature, PreOrder API payload,
// RawRequest formatting, Webhook parsing, Mock End-to-End, and Live Sandbox Gateway.
// ---------------------------------------------------------------------------

const TEST_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC/ZcoOng1sJZ4CegopQVCw3HYqqVRLEudgT+dDpS8fRVy7zBgqZunju2VRCQuHeWs7yWgc9QGd4/8kRSLY+jlvKNeZ60yWcqEY+eKyQMmcjOz2Sn41fcVNgF+HV3DGiV4b23B6BCMjnpEFIb9d99/TsjsFSc7gCPgfl2yWDxE/Y1B2tVE6op2qd63YsMVFQGdre/CQYvFJENpQaBLMq4hHyBDgluUXlF0uA1X7UM0ZjbFC6ZIB/Hn1+pl5Ua8dKYrkVaecolmJT/s7c/+/1JeN+ja8luBoONsoODt2mTeVJHLF9Y3oh5rI+IY8HukIZJ1U6O7/JcjH3aRJTZagXUS9AgMBAAECggEBALBIBx8JcWFfEDZFwuAWeUQ7+VX3mVx/770kOuNx24HYt718D/HV0avfKETHqOfA7AQnz42EF1Yd7Rux1ZO0e3unSVRJhMO4linT1XjJ9ScMISAColWQHk3wY4va/FLPqG7N4L1w3BBtdjIc0A2zRGLNcFDBlxl/CVDHfcqD3CXdLukm/friX6TvnrbTyfAFicYgu0+UtDvfxTL3pRL3u3WTkDvnFK5YXhoazLctNOFrNiiIpCW6dJ7WRYRXuXhz7C0rENHyBtJ0zura1WD5oDbRZ8ON4v1KV4QofWiTFXJpbDgZdEeJJmFmt5HIi+Ny3P5n31WwZpRMHGeHrV23//0CgYEA+2/gYjYWOW3JgMDLX7r8fGPTo1ljkOUHuH98H/a/lE3wnnKKx+2ngRNZX4RfvNG4LLeWTz9plxR2RAqqOTbX8fj/NA/sS4mru9zvzMY1925FcX3WsWKBgKlLryl0vPScq4ejMLSCmypGz4VgLMYZqT4NYIkU2Lo1G1MiDoLy0CcCgYEAwt77exynUhM7AlyjhAA2wSINXLKsdFFF1u976x9kVhOfmbAutfMJPEQWb2WXaOJQMvMpgg2rU5aVsyEcuHsRH/2zatrxrGqLqgxaiqPz4ELINIh1iYK/hdRpr1vATHoebOv1wt8/9qxITNKtQTgQbqYci3KV1lPsOrBAB5S57nsCgYAvw+cagS/jpQmcngOEoh8I+mXgKEET64517DIGWHe4kr3dO+FFbc5eZPCbhqgxVJ3qUM4LK/7BJq/46RXBXLvVSfohR80Z5INtYuFjQ1xJLveeQcuhUxdK+95W3kdBBi8lHtVPkVsmYvekwK+ukcuaLSGZbzE4otcn47kajKHYDQKBgDbQyIbJ+ZsRw8CXVHu2H7DWJlIUBIS3s+CQ/xeVfgDkhjmSIKGX2to0AOeW+S9MseiTE/L8a1wY+MUppE2UeK26DLUbH24zjlPoI7PqCJjl0DFOzVlACSXZKV1lfsNEeriC61/EstZtgezyOkAlSCIH4fGr6tAeTU349Bnt0RtvAoGBAObgxjeH6JGpdLz1BbMj8xUHuYQkbxNeIPhH29CySn0vfhwg9VxAtIoOhvZeCfnsCRTj9OZjepCeUqDiDSoFznglrKhfeKUndHjvg+9kiae92iI6qJudPCHMNwP8wMSphkxUqnXFR3lr9A765GA980818UWZdrhrjLKtIIZdh+X1
-----END PRIVATE KEY-----`

const excludeFields = [
  "sign",
  "sign_type",
  "header",
  "refund_info",
  "openType",
  "raw_request",
  "biz_content",
]

function validateEthiopianPhoneNumber(phone) {
  if (!phone) return false
  const cleaned = String(phone).replace(/[\s\-()]/g, "")
  const phoneRegex = /^(\+251|251|0)?[79]\d{8}$/
  return phoneRegex.test(cleaned)
}

function formatEthiopianPhoneNumber(phone) {
  if (!phone) return ""
  const cleaned = String(phone).replace(/\D/g, "")
  if (cleaned.startsWith("251") && cleaned.length >= 12) {
    return "+" + cleaned.slice(0, 12)
  }
  if (cleaned.startsWith("0") && cleaned.length >= 10) {
    return "+251" + cleaned.slice(1, 10)
  }
  if ((cleaned.startsWith("9") || cleaned.startsWith("7")) && cleaned.length === 9) {
    return "+251" + cleaned
  }
  return String(phone).trim()
}

function buildSignString(requestObject) {
  const fields = []
  const fieldMap = {}

  for (const key in requestObject) {
    if (excludeFields.includes(key) || requestObject[key] === undefined || requestObject[key] === null) {
      continue
    }
    fields.push(key)
    fieldMap[key] = requestObject[key]
  }

  if (requestObject.biz_content && typeof requestObject.biz_content === "object") {
    const biz = requestObject.biz_content
    for (const key in biz) {
      if (excludeFields.includes(key) || biz[key] === undefined || biz[key] === null) {
        continue
      }
      fields.push(key)
      fieldMap[key] = biz[key]
    }
  }

  fields.sort()
  return fields.map((k) => `${k}=${fieldMap[k]}`).join("&")
}

function signRsaPss(text, privateKeyPem) {
  const keyObj = crypto.createPrivateKey(privateKeyPem.trim())
  const signer = crypto.createSign("RSA-SHA256")
  signer.update(text)
  return signer.sign(
    {
      key: keyObj,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: 32,
    },
    "base64"
  )
}

function verifyRsaPss(text, signatureB64, privateKeyPem) {
  const pubKey = crypto.createPublicKey(crypto.createPrivateKey(privateKeyPem.trim()))
  const verifier = crypto.createVerify("RSA-SHA256")
  verifier.update(text)
  return verifier.verify(
    {
      key: pubKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: 32,
    },
    Buffer.from(signatureB64, "base64")
  )
}

async function httpsPost(urlStr, headers, bodyData, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr)
    const jsonBody = JSON.stringify(bodyData)
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(jsonBody),
        },
        rejectUnauthorized: false,
        timeout: timeoutMs,
      },
      (res) => {
        let data = ""
        res.on("data", (c) => (data += c))
        res.on("end", () => resolve({ status: res.statusCode, data }))
      }
    )
    req.on("error", reject)
    req.on("timeout", () => {
      req.destroy()
      reject(new Error(`Request to ${urlStr} timed out after ${timeoutMs}ms`))
    })
    req.write(jsonBody)
    req.end()
  })
}

describe("TeleBirr Payment Test Suite", () => {
  describe("1. Ethiopian Phone Number Validation & Formatting", () => {
    it("should accept valid Ethio Telecom numbers (09 series)", () => {
      assert.strictEqual(validateEthiopianPhoneNumber("0911223344"), true)
      assert.strictEqual(validateEthiopianPhoneNumber("+251911223344"), true)
      assert.strictEqual(validateEthiopianPhoneNumber("251911223344"), true)
      assert.strictEqual(validateEthiopianPhoneNumber("0911111111"), true)
    })

    it("should accept valid Safaricom Ethiopia numbers (07 series)", () => {
      assert.strictEqual(validateEthiopianPhoneNumber("0712345678"), true)
      assert.strictEqual(validateEthiopianPhoneNumber("+251712345678"), true)
      assert.strictEqual(validateEthiopianPhoneNumber("251712345678"), true)
    })

    it("should reject invalid phone numbers", () => {
      assert.strictEqual(validateEthiopianPhoneNumber(""), false)
      assert.strictEqual(validateEthiopianPhoneNumber("12345"), false)
      assert.strictEqual(validateEthiopianPhoneNumber("0812345678"), false)
      assert.strictEqual(validateEthiopianPhoneNumber("09112233445566"), false)
      assert.strictEqual(validateEthiopianPhoneNumber("invalid-phone"), false)
    })

    it("should format phone numbers to international standard (+251XXXXXXXXX)", () => {
      assert.strictEqual(formatEthiopianPhoneNumber("0911223344"), "+251911223344")
      assert.strictEqual(formatEthiopianPhoneNumber("+251911223344"), "+251911223344")
      assert.strictEqual(formatEthiopianPhoneNumber("0712345678"), "+251712345678")
      assert.strictEqual(formatEthiopianPhoneNumber("911223344"), "+251911223344")
    })
  })

  describe("2. TeleBirr Signing & Cryptography (RSA-PSS SHA256)", () => {
    it("should construct ASCII sorted string excluding sign and biz_content wrapper", () => {
      const sampleReq = {
        timestamp: "1715619420",
        nonce_str: "NONCE12345",
        method: "payment.preorder",
        version: "1.0",
        biz_content: {
          appid: "1504661904051204",
          merch_code: "2159",
          total_amount: "500.00",
          trade_type: "InApp",
        },
      }

      const signStr = buildSignString(sampleReq)
      assert.strictEqual(
        signStr,
        "appid=1504661904051204&merch_code=2159&method=payment.preorder&nonce_str=NONCE12345&timestamp=1715619420&total_amount=500.00&trade_type=InApp&version=1.0"
      )
    })

    it("should sign and verify using RSA-PSS with 32-byte salt", () => {
      const text = "appid=1504661904051204&merch_code=2159&total_amount=500.00"
      const sig = signRsaPss(text, TEST_PRIVATE_KEY)

      assert.ok(sig.length > 100, "Signature should be a valid Base64 string")
      const isValid = verifyRsaPss(text, sig, TEST_PRIVATE_KEY)
      assert.strictEqual(isValid, true, "Signature must verify against RSA public key")
    })
  })

  describe("3. PreOrder Request Payload & RawRequest Generation", () => {
    it("should generate conforming PreOrder request payload with 10-digit timestamp", () => {
      const orderId = "YB" + Date.now()
      const timestamp = String(Math.floor(Date.now() / 1000))
      const nonceStr = "ABCDEF1234567890"

      const reqObj = {
        timestamp,
        nonce_str: nonceStr,
        method: "payment.preorder",
        version: "1.0",
        biz_content: {
          appid: "1504661904051204",
          merch_code: "2159",
          merch_order_id: orderId,
          trade_type: "InApp",
          title: "YeBetWeg Premium Subscription",
          total_amount: "500.00",
          trans_currency: "ETB",
          timeout_express: "120m",
          payee_identifier: "2159",
          payee_identifier_type: "04",
          payee_type: "5000",
          redirect_url: "https://yebetweg.vercel.app/payment/success",
          notify_url: "https://jxyavtdmcloxnhuavokc.supabase.co/functions/v1/telebirr-webhook",
        },
      }

      assert.strictEqual(reqObj.timestamp.length, 10, "Timestamp must be 10-digit UNIX seconds")
      assert.strictEqual(reqObj.method, "payment.preorder")

      const signStr = buildSignString(reqObj)
      const sign = signRsaPss(signStr, TEST_PRIVATE_KEY)
      reqObj.sign = sign
      reqObj.sign_type = "SHA256WithRSA"

      assert.strictEqual(verifyRsaPss(signStr, reqObj.sign, TEST_PRIVATE_KEY), true)
    })

    it("should format rawRequest for web checkout and evaluate signature", () => {
      const prepayId = "PREPAY123456789"
      const timestamp = String(Math.floor(Date.now() / 1000))
      const nonceStr = "NONCE9876543210"

      const rawMap = {
        appid: "1504661904051204",
        merch_code: "2159",
        nonce_str: nonceStr,
        prepay_id: prepayId,
        timestamp: timestamp,
      }

      const signStr = buildSignString(rawMap)
      const sign = signRsaPss(signStr, TEST_PRIVATE_KEY)

      const rawRequest = [
        `appid=${rawMap.appid}`,
        `merch_code=${rawMap.merch_code}`,
        `nonce_str=${rawMap.nonce_str}`,
        `prepay_id=${rawMap.prepay_id}`,
        `timestamp=${rawMap.timestamp}`,
        `sign=${sign}`,
        `sign_type=SHA256WithRSA`,
      ].join("&")

      assert.ok(rawRequest.includes("prepay_id=PREPAY123456789"))
      assert.ok(rawRequest.includes("sign_type=SHA256WithRSA"))
      assert.strictEqual(verifyRsaPss(signStr, sign, TEST_PRIVATE_KEY), true)
    })
  })

  describe("4. Webhook Status & Reference Parsing", () => {
    function parseWebhookEvent(payload) {
      let biz = payload.biz_content || {}
      if (typeof biz === "string") {
        try { biz = JSON.parse(biz) } catch { biz = {} }
      }
      const reference =
        payload.merch_order_id ||
        payload.outTradeNo ||
        payload.reference ||
        biz.merch_order_id ||
        biz.outTradeNo ||
        biz.reference

      const statusRaw = String(
        payload.status ||
        payload.trade_status ||
        payload.code ||
        payload.result ||
        biz.status ||
        biz.trade_status ||
        ""
      ).toUpperCase()

      const isSuccess =
        statusRaw === "SUCCESS" ||
        statusRaw === "TRADE_SUCCESS" ||
        statusRaw === "0" ||
        statusRaw === "0000"

      return { reference, isSuccess }
    }

    it("should parse standard JSON webhook with top-level reference", () => {
      const event = {
        status: "SUCCESS",
        outTradeNo: "YB1720000000ABC",
        total_amount: "500.00",
      }
      const parsed = parseWebhookEvent(event)
      assert.strictEqual(parsed.reference, "YB1720000000ABC")
      assert.strictEqual(parsed.isSuccess, true)
    })

    it("should parse nested biz_content webhook format", () => {
      const event = {
        code: "0",
        result: "SUCCESS",
        biz_content: {
          merch_order_id: "YB9988776655",
          trade_status: "TRADE_SUCCESS",
        },
      }
      const parsed = parseWebhookEvent(event)
      assert.strictEqual(parsed.reference, "YB9988776655")
      assert.strictEqual(parsed.isSuccess, true)
    })
  })

  describe("5. Mock TeleBirr Gateway Service (Offline E2E Simulation)", () => {
    it("should simulate full payment flow: Token -> PreOrder -> RawRequest -> Webhook", async () => {
      // 1. Create a local mock server
      const server = http.createServer((req, res) => {
        let body = ""
        req.on("data", (chunk) => (body += chunk))
        req.on("end", () => {
          if (req.url === "/payment/v1/token") {
            res.writeHead(200, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ token: "Bearer mock_token_123", expirationDate: "20261231235959" }))
          } else if (req.url === "/payment/v1/merchant/preOrder") {
            const parsed = JSON.parse(body)
            assert.ok(parsed.sign, "PreOrder must include sign")
            assert.strictEqual(parsed.sign_type, "SHA256WithRSA")
            res.writeHead(200, { "Content-Type": "application/json" })
            res.end(
              JSON.stringify({
                result: "SUCCESS",
                code: "0",
                msg: "success",
                biz_content: {
                  prepay_id: "MOCK_PREPAY_998877",
                  merch_order_id: parsed.biz_content?.merch_order_id,
                },
              })
            )
          } else {
            res.writeHead(404)
            res.end()
          }
        })
      })

      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
      const port = server.address().port

      try {
        // Step 1: Token request
        const tokenRes = await new Promise((resolve, reject) => {
          const req = http.request(
            {
              hostname: "127.0.0.1",
              port,
              path: "/payment/v1/token",
              method: "POST",
              headers: { "X-APP-Key": "test_app", "Content-Type": "application/json" },
            },
            (res) => {
              let d = ""
              res.on("data", (c) => (d += c))
              res.on("end", () => resolve(JSON.parse(d)))
            }
          )
          req.on("error", reject)
          req.write(JSON.stringify({ appSecret: "secret" }))
          req.end()
        })

        assert.strictEqual(tokenRes.token, "Bearer mock_token_123")

        // Step 2: PreOrder
        const orderId = "YB" + Date.now()
        const preOrderPayload = {
          timestamp: String(Math.floor(Date.now() / 1000)),
          nonce_str: "TESTNONCE12345",
          method: "payment.preorder",
          version: "1.0",
          biz_content: {
            appid: "1504661904051204",
            merch_code: "2159",
            merch_order_id: orderId,
            trade_type: "InApp",
            title: "YeBetWeg Pro Plan",
            total_amount: "1000.00",
            trans_currency: "ETB",
          },
        }
        preOrderPayload.sign = signRsaPss(buildSignString(preOrderPayload), TEST_PRIVATE_KEY)
        preOrderPayload.sign_type = "SHA256WithRSA"

        const poRes = await new Promise((resolve, reject) => {
          const req = http.request(
            {
              hostname: "127.0.0.1",
              port,
              path: "/payment/v1/merchant/preOrder",
              method: "POST",
              headers: {
                "X-APP-Key": "test_app",
                Authorization: tokenRes.token,
                "Content-Type": "application/json",
              },
            },
            (res) => {
              let d = ""
              res.on("data", (c) => (d += c))
              res.on("end", () => resolve(JSON.parse(d)))
            }
          )
          req.on("error", reject)
          req.write(JSON.stringify(preOrderPayload))
          req.end()
        })

        assert.strictEqual(poRes.result, "SUCCESS")
        assert.strictEqual(poRes.biz_content?.prepay_id, "MOCK_PREPAY_998877")

        // Step 3: RawRequest generation
        const rawMap = {
          appid: "1504661904051204",
          merch_code: "2159",
          nonce_str: "TESTNONCE12345",
          prepay_id: poRes.biz_content.prepay_id,
          timestamp: String(Math.floor(Date.now() / 1000)),
        }
        const rawSign = signRsaPss(buildSignString(rawMap), TEST_PRIVATE_KEY)
        const rawRequest = `appid=${rawMap.appid}&merch_code=${rawMap.merch_code}&nonce_str=${rawMap.nonce_str}&prepay_id=${rawMap.prepay_id}&timestamp=${rawMap.timestamp}&sign=${rawSign}&sign_type=SHA256WithRSA`
        assert.ok(rawRequest.includes("prepay_id=MOCK_PREPAY_998877"))
      } finally {
        server.close()
      }
    })
  })
})
