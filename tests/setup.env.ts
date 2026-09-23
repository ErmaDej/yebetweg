// Vitest global setup: the production app throws at import time when
// VITE_SUPABASE_URL is missing (src/lib/supabase.ts). CI has no .env file,
// so provide inert dummies BEFORE any module is imported. Tests mock the
// supabase client anyway — these values never hit the network.
process.env.VITE_SUPABASE_URL ??= "https://test-project.supabase.co"
process.env.VITE_SUPABASE_ANON_KEY ??= "test-anon-key"
