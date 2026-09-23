import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

// Vitest configuration — shares the app's alias/JSX pipeline but is fully
// separate from the production build config (vite.config.ts).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // jsdom for anything touching DOM/React; node env for pure logic. The
    // .tsx component suites opt in via their per-file docblock.
    environment: "node",
    environmentMatchGlobs: [
      ["tests/**/*.tsx", "jsdom"],
      ["tests/**/*dom*.test.ts", "jsdom"],
    ],
    // CI has no .env; supabase.ts throws at import time without these.
    setupFiles: ["tests/setup.env.ts"],
    globals: false,
    include: ["tests/**/*.{test,spec}.{ts,tsx,mjs}"],
    // The 0-tests silent pass must never happen again: a suite file whose
    // collection hook fails still fails the run.
    passWithNoTests: false,
    restoreMocks: true,
    coverage: {
      reporter: ["text", "lcov"],
      include: ["src/lib/**", "src/hooks/**", "src/context/**"],
    },
    typecheck: {
      enabled: false,
    },
  },
})
