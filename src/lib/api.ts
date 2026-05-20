/**
 * API wrapper for client‑side calls to Supabase edge functions.
 * Functions here use the public Supabase URL and anon key, so they are safe to call from the browser.
 */

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Helper to call a Supabase edge function */
async function callFunction<T>(functionName: string, body: Record<string, any>): Promise<T> {
  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apiKey: supabaseAnonKey,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Function ${functionName} failed: ${err}`);
  }
  return response.json();
}

// ---- Notification helpers -------------------------------------------------
/** Send a notification (email or SMS) via the server‑side Resend wrapper */
export async function sendNotification(payload: {
  userId: string;
  type: "email" | "sms";
  subject?: string;
  message: string;
}): Promise<void> {
  await callFunction<void>("notify_user", payload);
}

// ---- OTP verification ------------------------------------------------------
export async function requestSmsOtp(phone: string): Promise<void> {
  await callFunction<void>("request_otp", { phone });
}

export async function verifySmsOtp(phone: string, code: string): Promise<boolean> {
  const result = await callFunction<{ verified: boolean }>("verify_otp", { phone, code });
  return result.verified;
}

// ---- Admin actions --------------------------------------------------------
export async function callAdminAction(action: string, payload?: Record<string, any>): Promise<any> {
  return await callFunction<any>("admin_actions", { action, payload });
}

// ---- Analytics ------------------------------------------------------------
export async function fetchAnalytics(metric: string, days: number = 30): Promise<any> {
  return await callFunction<any>("fetch_analytics", { metric, days });
}
