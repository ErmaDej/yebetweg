import { useState } from "react"
import { useAuthContext } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/lib/i18n"

export function PasswordUpdateForm() {
  const { updatePassword, loading, error: contextError } = useAuthContext()
  const { language } = useLanguage()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!password || !confirmPassword) {
      setError(language === "am" ? "ሁለቱም መስኮች ያስፈልጋሉ" : "Both password fields are required")
      return
    }

    if (password !== confirmPassword) {
      setError(
        language === "am"
          ? "የተለየዩ ሐረጅዎች መምሳስ አለባቸው"
          : "Passwords do not match"
      )
      return
    }

    if (password.length < 8) {
      setError(
        language === "am"
          ? "የተለየው ሐረግ ከ8 ቁምፆ በላይ ከሆነ የታመመ ይሆናል"
          : "Password must be at least 8 characters"
      )
      return
    }

    const result = await updatePassword(password)
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setPassword("")
      setConfirmPassword("")
      setTimeout(() => {
        window.location.href = "/dashboard"
      }, 2000)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 border rounded-lg shadow-sm bg-card">
      <h2 className="text-2xl font-bold mb-6">
        {language === "am" ? "የተለየዩን ሐረግ ያዘምኑ" : "Update Password"}
      </h2>

      {(error || contextError) && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive text-destructive rounded">
          {error || contextError}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-500/10 border border-green-500 text-green-500 rounded">
          {language === "am"
            ? "ሐረግዎ በተሳካ ሁኔታ ተቀይሮ ተቀምጫል። ወደ ዳሽቦርድ እንደገና ይመለሱ።"
            : "Password updated successfully! Redirecting to dashboard..."}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            {language === "am" ? "አዲስ ሐረግ" : "New Password"}
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={language === "am" ? "ሐረግዎን ያስገቡ" : "Enter new password"}
            disabled={loading || success}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
            {language === "am" ? "አዲስ ሐረግ አረጋግጡ" : "Confirm Password"}
          </label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={language === "am" ? "ሐረግ አረጋግጡ" : "Confirm password"}
            disabled={loading || success}
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading || success}>
          {loading
            ? language === "am"
              ? "እያሰናበተ ነው..."
              : "Updating..."
            : language === "am"
              ? "ሐረግ ያዘምኑ"
              : "Update Password"}
        </Button>
      </form>
    </div>
  )
}
