import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Chunk splitting — group by package to avoid cross-chunk circular deps.
    // Never manually list .tsx/.ts source files; let Vite hoist shared deps naturally.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@tanstack/react-query') || id.includes('@tanstack/react-query-devtools')) {
              return 'vendor-query'
            }
            if (id.includes('@radix-ui/react-dialog') || id.includes('@radix-ui/react-dropdown-menu') ||
                id.includes('@radix-ui/react-select') || id.includes('@radix-ui/react-tabs') ||
                id.includes('@radix-ui/react-tooltip') || id.includes('@radix-ui/react-avatar') ||
                id.includes('@radix-ui/react-label') || id.includes('@radix-ui/react-checkbox') ||
                id.includes('@radix-ui/react-switch') || id.includes('@radix-ui/react-slot') ||
                id.includes('@radix-ui/react-visually-hidden') || id.includes('@radix-ui/react-alert-dialog')) {
              return 'vendor-ui'
            }
            if (id.includes('react-hook-form') || id.includes('@hookform/resolvers') || id.includes('zod')) {
              return 'vendor-forms'
            }
            if (id.includes('recharts') || id.includes('chart.js')) {
              return 'vendor-charts'
            }
            if (id.includes('@supabase/supabase-js')) {
              return 'vendor-supabase'
            }
            if (id.includes('lucide-react') || id.includes('clsx') || id.includes('tailwind-merge') ||
                id.includes('date-fns') || id.includes('class-variance-authority')) {
              return 'vendor-utils'
            }
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    minify: 'esbuild',
    cssCodeSplit: true,
    sourcemap: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'lucide-react',
    ],
  },
})
