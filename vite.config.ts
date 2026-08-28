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
    // Code splitting for better performance
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-tabs', '@radix-ui/react-tooltip', '@radix-ui/react-avatar', '@radix-ui/react-label'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-query': ['@tanstack/react-query', '@tanstack/react-query-devtools'],
          'vendor-charts': ['recharts', 'chart.js', 'react-chartjs-2'],
          'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge', 'lucide-react'],
          'vendor-supabase': ['@supabase/supabase-js'],
          // Feature chunks
          'feature-dashboard': ['./src/pages/Dashboard.tsx', './src/hooks/useDashboardData.ts', './src/components/assistant/AssistantCard.tsx'],
          'feature-payment': ['./src/pages/PaymentPage.tsx', './src/pages/PaymentSuccessPage.tsx', './src/lib/chapa.ts', './src/lib/telebirr.ts', './src/hooks/usePayment.ts'],
          'feature-marketplace': ['./src/components/sections/MarketplaceSection.tsx', './src/components/sections/RfqModal.tsx', './src/hooks/useListings.ts'],
          'feature-professionals': ['./src/components/sections/ProfessionalsSection.tsx', './src/hooks/useProfessionals.ts'],
          'feature-boq': ['./src/components/sections/BoqLiteSection.tsx', './src/hooks/useBoqEstimates.ts', './src/hooks/useCityMultipliers.ts'],
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Minification
    minify: 'esbuild',
    cssCodeSplit: true,
    // Generate source maps for production debugging
    sourcemap: true,
    // Report chunk sizes
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000,
  },
  // Performance optimizations
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