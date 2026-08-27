import { createClient } from "@supabase/supabase-js"

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Validate env vars early with a meaningful error message
if (!supabaseUrl) {
  throw new Error(
    "Missing VITE_SUPABASE_URL environment variable. " +
    "Please ensure it is set in your Vercel project settings or .env file."
  )
}

if (!supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_ANON_KEY environment variable. " +
    "Please ensure it is set in your Vercel project settings or .env file."
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
