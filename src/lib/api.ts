import { supabase } from "./supabase"

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const CUSTOM_AUTH_USER_KEY = "yebetweg-custom-auth-user"

function getCustomAuthUserId(): string | null {
  if (typeof window === "undefined") return null
  try {
    const stored = window.localStorage.getItem(CUSTOM_AUTH_USER_KEY)
    if (!stored) return null
    const user = JSON.parse(stored)
    return user?.id || null
  } catch {
    return null
  }
}

/** Helper to call a Supabase edge function with optional auth */
async function callFunction<T>(functionName: string, body: Record<string, any>, requireAuth = false): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: supabaseAnonKey,
  }

  if (requireAuth) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`
    } else {
      const customUserId = getCustomAuthUserId()
      if (customUserId) {
        headers["X-Custom-Auth-UserId"] = customUserId
      }
    }
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Function ${functionName} failed: ${err}`);
  }
  return response.json();
}

/** Send a notification (email or SMS) via the server‑side Resend wrapper */
export async function sendNotification(payload: {
  userId: string;
  type: "email" | "sms";
  subject?: string;
  message: string;
}): Promise<void> {
  await callFunction<void>("notify_user", payload);
}

export async function requestSmsOtp(phone: string): Promise<void> {
  await callFunction<void>("request_otp", { phone });
}

export async function verifySmsOtp(phone: string, code: string): Promise<boolean> {
  const result = await callFunction<{ verified: boolean }>("verify_otp", { phone, code });
  return result.verified;
}

export async function callAdminAction(action: string, payload?: Record<string, any>): Promise<any> {
  return await callFunction<any>("admin_actions", { action, payload }, true);
}

export async function fetchAnalytics(metric: string, days: number = 30): Promise<any> {
  return await callFunction<any>("fetch_analytics", { metric, days });
}
