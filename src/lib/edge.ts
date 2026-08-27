import { supabase, supabaseAnonKey, supabaseUrl } from "./supabase"

const CUSTOM_AUTH_USER_KEY = "yebetweg-custom-auth-user"

function getCustomAuthUserId(): string | null {
  if (typeof window === "undefined") return null
  try {
    const stored = window.localStorage.getItem(CUSTOM_AUTH_USER_KEY)
    if (!stored) return null
    return (JSON.parse(stored) as { id?: string })?.id ?? null
  } catch {
    return null
  }
}

export class EdgeError extends Error {
  status?: number
  code?: string
  constructor(message: string, opts?: { status?: number; code?: string }) {
    super(message)
    this.name = "EdgeError"
    this.status = opts?.status
    this.code = opts?.code
  }
}

export interface CallEdgeOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  query?: Record<string, string | undefined>
  /** When true, inject _customUserId if no session (kept until auth consolidation) */
  requireAuth?: boolean
  timeoutMs?: number
  signal?: AbortSignal
}

function buildUrl(functionName: string, query?: Record<string, string | undefined>): string {
  const base = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/${functionName}`
  if (!query) return base
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== "") params.set(k, v)
  }
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

async function getAuthHeaders(requireAuth?: boolean): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    apikey: supabaseAnonKey,
  }
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`
    } else {
      headers.Authorization = `Bearer ${supabaseAnonKey}`
      if (requireAuth) {
        const customUserId = getCustomAuthUserId()
        // Caller will inject body._customUserId when needed; we just ensure header is present
        if (customUserId) {
          // no-op: body injection handled in callEdge
        }
      }
    }
  } catch {
    headers.Authorization = `Bearer ${supabaseAnonKey}`
  }
  return headers
}

/**
 * Single, typed entry-point for all Supabase Edge Function calls.
 *
 * - Centralizes anon key / URL derivation (no more per-file `import.meta.env` reads)
 * - Timeout + abort support
 * - Safe JSON parsing (text → JSON fallback)
 * - Structured EdgeError with status
 * - Custom-auth fallback injection when requireAuth and no session
 */
export async function callEdge<T>(functionName: string, opts: CallEdgeOptions = {}): Promise<T> {
  const {
    method = "POST",
    body,
    query,
    requireAuth = false,
    timeoutMs = 15000,
    signal: outerSignal,
  } = opts

  const url = buildUrl(functionName, query)
  const headers: Record<string, string> = {
    ...(await getAuthHeaders(requireAuth)),
  }

  // Only send Content-Type when there is a body
  const hasBody = body !== undefined && method !== "GET"
  if (hasBody) headers["Content-Type"] = "application/json"

  // Inject _customUserId when required and no session — centralized here
  let payload: unknown = body
  if (requireAuth && hasBody && typeof body === "object" && body !== null) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) {
        const customUserId = getCustomAuthUserId()
        if (customUserId) {
          payload = { ...(body as Record<string, unknown>), _customUserId: customUserId }
        }
      }
    } catch {
      // ignore — fall through with original body
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  // Merge outer signal
  if (outerSignal) {
    if (outerSignal.aborted) controller.abort()
    else outerSignal.addEventListener("abort", () => controller.abort(), { once: true })
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: hasBody ? JSON.stringify(payload) : undefined,
      signal: controller.signal,
    })

    const rawText = await response.text()
    let data: unknown = null
    if (rawText) {
      try {
        data = JSON.parse(rawText)
      } catch {
        // Non-JSON (e.g., HTML error page)
        if (!response.ok) {
          throw new EdgeError(`Edge function ${functionName} failed: ${rawText.slice(0, 500)}`, {
            status: response.status,
          })
        }
        // For OK but non-JSON, return text as-is
        return rawText as unknown as T
      }
    }

    if (!response.ok) {
      const msg =
        typeof (data as { error?: unknown })?.error === "string"
          ? (data as { error: string }).error
          : typeof (data as { message?: unknown })?.message === "string"
            ? (data as { message: string }).message
            : `Edge function ${functionName} failed: HTTP ${response.status}`
      throw new EdgeError(msg, { status: response.status })
    }

    return data as T
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new EdgeError(`Edge function ${functionName} timed out after ${timeoutMs}ms`, {
        status: 408,
        code: "TIMEOUT",
      })
    }
    throw e
  } finally {
    clearTimeout(timeout)
  }
}
