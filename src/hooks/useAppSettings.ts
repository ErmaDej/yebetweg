import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

// ============================================================================
// app_settings — admin-only KV store (supabase/migrations/20260924140000).
// The tax report's business profile lives here under key 'tax_profile' so it
// survives reloads and is shared across admins (one business = one profile).
// ============================================================================

export type TaxProfile = {
  legal_name: string
  tin: string
  address: string
  vat_registered: boolean
}

const DEFAULT_TAX_PROFILE: TaxProfile = {
  legal_name: "YeBetWeg",
  tin: "",
  address: "Addis Ababa, Ethiopia",
  vat_registered: false,
}

/** Load one settings row by key (admin-only via RLS). */
export function useAppSetting<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle()
      if (cancelled) return
      if (error) {
        setError(error.message)
        setIsLoading(false)
        return
      }
      // Merge so partial rows keep new fields added later.
      const stored = (data?.value ?? null) as Partial<T> | null
      setValue(stored ? { ...fallback, ...stored } : fallback)
      setIsLoading(false)
    })()
    return () => {
      cancelled = true
    }
    // `fallback` intentionally excluded: callers pass module constants.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const save = useCallback(
    async (next: T): Promise<string | null> => {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key, value: next }, { onConflict: "key" })
      return error ? error.message : null
    },
    [key],
  )

  return { value, setValue, save, isLoading, error }
}

export { DEFAULT_TAX_PROFILE }
