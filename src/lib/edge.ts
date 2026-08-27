import { supabase, supabaseAnonKey, supabaseUrl } from "./supabase"

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

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    apikey: supabaseAnonKey,
  }
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    headers.Authorization = `Bearer ${session?.access_token ?? supabaseAnonKey}`
  } catch {
    headers.Authorization = `Bearer ${supabaseAnonKey}`
  }
  return headers
}

/**
 * Single, typed entry-point for all Supabase Edge Function calls.
 *
 * - Centralizes anon key / URL derivation
 * - Timeout + abort support
 * - Safe JSON parsing (text → JSON fallback)
 * - Structured EdgeError with status
 */
export async function callEdge<T>(functionName: string, opts: CallEdgeOptions = {}): Promise<T> {
  const {
    method = "POST",
    body,
    query,
    timeoutMs = 15000,
    signal: outerSignal,
  } = opts

  const url = buildUrl(functionName, query)
  const headers: Record<string, string> = {
    ...(await getAuthHeaders()),
  }

  const hasBody = body !== undefined && method !== "GET"
  if (hasBody) headers["Content-Type"] = "application/json"

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  if (outerSignal) {
    if (outerSignal.aborted) controller.abort()
    else outerSignal.addEventListener("abort", () => controller.abort(), { once: true })
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: hasBody ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    const rawText = await response.text()
    let data: unknown = null
    if (rawText) {
      try {
        data = JSON.parse(rawText)
      } catch {
        if (!response.ok) {
          throw new EdgeError(`Edge function ${functionName} failed: ${rawText.slice(0, 500)}`, {
            status: response.status,
          })
        }
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
