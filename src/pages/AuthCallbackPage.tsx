import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuthContext } from "@/context/AuthContext"

/**
 * AuthCallbackPage handles Supabase auth callbacks from email links.
 * This page processes:
 * - Email verification links (type=signup)
 * - Password reset links (type=recovery)
 * - Email change verification (type=email_change)
 */
export function AuthCallbackPage() {
  const { clearError } = useAuthContext()
  const [message, setMessage] = useState("Processing authentication...")
  const [error, setError] = useState<string | null>(null)
  const [redirectPath, setRedirectPath] = useState<string>("/")

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the token and type from URL parameters
        const params = new URLSearchParams(window.location.search)
        const token = params.get("token")
        const type = params.get("type")

        if (!token || !type) {
          setError("Invalid or missing authentication parameters")
          setRedirectPath("/")
          setTimeout(() => window.location.href = "/", 3000)
          return
        }

        // Create a session from the token
        const { data, error: sessionError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: type as any,
        })

        if (sessionError || !data.session) {
          // For recovery emails, we set the session directly
          if (type === "recovery") {
            const { error: recoveryError } = await supabase.auth.verifyOtp({
              token_hash: token,
              type: "recovery",
            })

            if (recoveryError) {
              setError(recoveryError.message || "Failed to verify recovery token")
              setRedirectPath("/")
              setTimeout(() => window.location.href = "/", 3000)
              return
            }
          } else {
            setError(sessionError?.message || "Failed to verify authentication")
            setRedirectPath("/")
            setTimeout(() => window.location.href = "/", 3000)
            return
          }
        }

        // Handle different callback types
        switch (type) {
          case "signup":
            setMessage("Email verified successfully! Redirecting...")
            clearError()
            setRedirectPath("/dashboard")
            setTimeout(() => window.location.href = "/dashboard", 2000)
            break

          case "recovery":
            setMessage("Password reset link verified. Redirecting to reset password...")
            clearError()
            // Redirect to a password reset page where the user can set a new password
            setRedirectPath("/reset-password")
            setTimeout(() => window.location.href = "/reset-password", 2000)
            break

          case "email_change":
            setMessage("Email change confirmed! Redirecting...")
            clearError()
            setRedirectPath("/dashboard")
            setTimeout(() => window.location.href = "/dashboard", 2000)
            break

          default:
            setMessage("Authentication verified! Redirecting...")
            clearError()
            setRedirectPath("/")
            setTimeout(() => window.location.href = "/", 2000)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred"
        setError(errorMessage)
        setRedirectPath("/")
        setTimeout(() => window.location.href = "/", 3000)
      }
    }

    handleAuthCallback()
  }, [clearError])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-foreground">YeBetWeg</h1>
        {error ? (
          <>
            <div className="text-red-500 text-lg font-semibold">{error}</div>
            <p className="text-muted-foreground">Redirecting you back...</p>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <div className="inline-block">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </div>
            <p className="text-lg text-muted-foreground">{message}</p>
          </>
        )}
      </div>
    </div>
  )
}
