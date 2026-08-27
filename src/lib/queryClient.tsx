import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { useState } from "react"
import { toast } from "sonner"

function isSilentError(error: unknown): boolean {
  // Don't toast for aborted / cancelled requests
  if (error instanceof DOMException && error.name === "AbortError") return true
  return false
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            if (isSilentError(error)) return
            // Global fallback — individual components should still handle errors locally
            console.error("[query]", error)
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            const msg = error instanceof Error ? error.message : "Something went wrong"
            toast.error(msg.slice(0, 200))
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 30, // 30 minutes
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}