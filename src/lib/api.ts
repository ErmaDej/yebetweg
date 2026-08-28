import { callEdge } from "./edge"

// Re-export for callers that still import from here
export { supabaseUrl, supabaseAnonKey } from "./supabase"

/** Send a notification (email or SMS) via the server‑side Resend wrapper — currently a stub edge function */
export async function sendNotification(payload: {
  userId: string
  type: "email" | "sms"
  subject?: string
  message: string
}): Promise<void> {
  await callEdge<void>("notify_user", { body: payload })
}

export async function requestSmsOtp(phone: string): Promise<void> {
  await callEdge<void>("request_otp", { body: { phone } })
}

export async function verifySmsOtp(phone: string, code: string): Promise<boolean> {
  const result = await callEdge<{ verified: boolean }>("verify_otp", {
    body: { phone, code },
  })
  return result.verified ?? false
}

export async function callAdminAction(
  action: string,
  payload?: Record<string, unknown>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  return callEdge<any>("admin_actions", { body: { action, payload }, requireAuth: true })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchAnalytics(metric: string, days = 30): Promise<any> {
  return callEdge<any>("fetch_analytics", { body: { metric, days } })
}
