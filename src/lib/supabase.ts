import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let _supabase: SupabaseClient | null = null
if (supabaseUrl && supabaseAnonKey) {
	_supabase = createClient(supabaseUrl, supabaseAnonKey)
} else {
	// When deploying to platforms like Vercel, ensure `VITE_SUPABASE_URL` and
	// `VITE_SUPABASE_ANON_KEY` are configured as environment variables.
	// Avoid calling `createClient` with undefined values which throws at import time.
	// Export a null client so callers can handle absence gracefully.
	// eslint-disable-next-line no-console
	console.warn("Supabase client not initialized: missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY")
}

export const supabase: SupabaseClient | null = _supabase
