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
  // Fallback for email clients that strip link buttons: the user pastes the
  // 6-digit code from the confirmation email here instead.
  const [showCodeForm, setShowCodeForm] = useState(false)
  const [code, setCode] = useState("")
  const [codeEmail, setCodeEmail] = useState("")

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the token and type from URL parameters
        const params = new URLSearchParams(window.location.search)
        const token = params.get("token")
        const type = params.get("type")

        if (!token || !type) {
          // No token in the URL: offer the code-entry fallback rather than
          // bouncing the user home.
          if (!token) {
            setShowCodeForm(true)
            setMessage("Enter the 6-digit code from your confirmation email")
            return
          }
          setError("Invalid or missing authentication parameters")
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
              setTimeout(() => window.location.href = "/", 3000)
              return
            }
          } else {
            setError(sessionError?.message || "Failed to verify authentication")
            setTimeout(() => window.location.href = "/", 3000)
            return
          }
        }

        // Handle different callback types
        switch (type) {
          case "signup":
            setMessage("Email verified successfully! Redirecting...")
            clearError()
            setTimeout(() => window.location.href = "/dashboard", 2000)
            break

          case "recovery":
            setMessage("Password reset link verified. Redirecting to reset password...")
            clearError()
            // Redirect to a password reset page where the user can set a new password
            setTimeout(() => window.location.href = "/reset-password", 2000)
            break

          case "email_change":
            setMessage("Email change confirmed! Redirecting...")
            clearError()
            setTimeout(() => window.location.href = "/dashboard", 2000)
            break

          default:
            setMessage("Authentication verified! Redirecting...")
            clearError()
            setTimeout(() => window.location.href = "/", 2000)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred"
        setError(errorMessage)
        setTimeout(() => window.location.href = "/", 3000)
      }
    }

    handleAuthCallback()
  }, [clearError])

  async function handleCodeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    try {
      const { error: otpError } = await supabase.auth.verifyOtp({
        email: codeEmail.trim(),
        token: code.trim(),
        type: "signup",
      })
      if (otpError) {
        setError(otpError.message || "Invalid or expired code")
        return
      }
      setMessage("Email verified successfully! Redirecting...")
      clearError()
      setTimeout(() => window.location.href = "/dashboard", 1200)
    } catch {
      setError("An unexpected error occurred")
    }
  }

  if (showCodeForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <form onSubmit={handleCodeSubmit} className="text-center space-y-4 w-full max-w-sm px-4">
          <h1 className="text-3xl font-bold text-foreground">YeBetWeg</h1>
          <p className="text-muted-foreground">Enter the 6-digit code from your confirmation email.</p>
          <input
            type="email"
            required
            value={codeEmail}
            onChange={(e) => setCodeEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            type="text"
            required
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="6-digit code"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-center text-lg tracking-[0.4em]"
          />
          {error && <div className="text-red-500 text-sm font-semibold">{error}</div>}
          {message && !error && <div className="text-muted-foreground text-sm">{message}</div>}
          <button
            type="submit"
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Verify my email
          </button>
        </form>
      </div>
    )
  }

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
