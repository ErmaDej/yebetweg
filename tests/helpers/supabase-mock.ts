import { vi } from "vitest"

export type SupabaseResult<T = unknown> = {
  data: T | null
  error: { message: string; code?: string } | null
  count?: number | null
}

/**
 * A thenable mock of the Supabase PostgREST query builder. Every builder
 * method returns the same builder; awaiting it resolves to `result`.
 * All calls are recorded in `calls` and exposed as `vi.fn()`s on `builder`
 * for argument assertions.
 */
export function createQueryBuilder<T = unknown>(result: SupabaseResult<T>) {
  const calls: Array<{ method: string; args: unknown[] }> = []

  const builder: Record<string, ReturnType<typeof vi.fn>> = {}

  const methods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "is", "in",
    "or", "contains", "containedBy", "rangeGt", "overlaps",
    "order", "range", "limit", "single", "maybeSingle",
    "textSearch", "returns",
  ]

  const promise: Promise<SupabaseResult<T>> = Promise.resolve(result)

  for (const method of methods) {
    const fn = vi.fn((...args: unknown[]) => {
      calls.push({ method, args })
      return builder
    })
    builder[method] = fn
  }

  // Awaiting the builder resolves the final result.
  ;(builder as unknown as PromiseLike<SupabaseResult<T>>).then = (
    onFulfilled?: (value: SupabaseResult<T>) => unknown,
    onRejected?: (reason: unknown) => unknown
  ) => promise.then(onFulfilled, onRejected)

  return { builder, calls } as {
    builder: Record<string, ReturnType<typeof vi.fn>> & PromiseLike<SupabaseResult<T>>
    calls: Array<{ method: string; args: unknown[] }>
  }
}

/** Installs a supabase client mock; applies to subsequent imports. */
export function mockSupabaseModule(overrides: {
  from?: (table: string) => unknown
  rpc?: (fn: string, args?: unknown) => unknown
  auth?: Record<string, unknown>
} = {}) {
  // Register by the alias specifier only: vitest resolves "@/lib/supabase"
  // through the same vite resolver the subjects use, so one registration
  // covers every import style. (Do NOT call vi.importMock inside a factory
  // for the same module — it deadlocks the import.)
  vi.doMock("@/lib/supabase", () => {
    const client = {
      from:
        overrides.from ??
        (() => {
          throw new Error("from() not configured for this test")
        }),
      rpc:
        overrides.rpc ??
        (() => {
          throw new Error("rpc() not configured for this test")
        }),
      auth: overrides.auth ?? {},
    }
    return { supabase: client }
  })
}
