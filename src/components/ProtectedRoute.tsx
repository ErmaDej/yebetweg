import { useAuthContext } from "@/context/AuthContext"
import { useLanguage } from "@/lib/i18n"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  showAuthPrompt?: boolean
}

export function ProtectedRoute({
  children,
  fallback,
  showAuthPrompt = true,
}: ProtectedRouteProps) {
  const { user, loading } = useAuthContext()
  const { language } = useLanguage()

  if (loading) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
    )
  }

  if (!user) {
    return (
      showAuthPrompt && (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <h2 className="text-2xl font-bold">
            {language === "en" ? "Sign In Required" : "ግቤት ያስፈልግዎል"}
          </h2>
          <p className="text-muted-foreground">
            {language === "en"
              ? "Please sign in to access this page"
              : "ይህንን ገጽ ለመድረስ እባክዎ ይግቡ"}
          </p>
        </div>
      )
    )
  }

  return <>{children}</>
}

export function useRequireAuth() {
  const { user, loading } = useAuthContext()
  return { isAuthenticated: !!user, loading }
}
