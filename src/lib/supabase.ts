import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate env vars early with a meaningful error message
if (!supabaseUrl) {
  throw new Error(
    "Missing VITE_SUPABASE_URL environment variable. " +
    "Please ensure it is set in your Vercel project settings or .env file. " +
    `Current value: "${supabaseUrl}"`
  )
}

if (!supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_ANON_KEY environment variable. " +
    "Please ensure it is set in your Vercel project settings or .env file. " +
    `Current value: "${supabaseAnonKey}"`
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
