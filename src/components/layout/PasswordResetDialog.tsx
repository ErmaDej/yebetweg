import { useState } from "react"
import { Mail, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useLanguage } from "@/lib/i18n"
import { useAuthContext } from "@/context/AuthContext"

interface PasswordResetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onBackToSignIn?: () => void
}

export function PasswordResetDialog({
  open,
  onOpenChange,
  onBackToSignIn,
}: PasswordResetDialogProps) {
  const { language } = useLanguage()
  const { loading, resetPassword } = useAuthContext()
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const result = await resetPassword(email)
    if (result.error) {
      setError(result.error)
    } else {
      setSubmitted(true)
    }
  }

  const handleBack = () => {
    setEmail("")
    setSubmitted(false)
    setError(null)
    onBackToSignIn?.()
  }

  const handleClose = () => {
    setEmail("")
    setSubmitted(false)
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {language === "en" ? "Reset Password" : "የሚስጥር ቃል ዳግም ያስጀምሩ"}
          </DialogTitle>
          <DialogDescription>
            {submitted
              ? language === "en"
                ? "Check your email for password reset instructions"
                : "የሚስጥር ቃል ዳግም ለማስጀመር መመሪያዎን ለ ኢሜይል ይመልከቱ"
              : language === "en"
              ? "Enter your email address and we'll send you a link to reset your password"
              : "የኢሜይል አድራሻዎን ያስገቡ እና ይህ የሚስጥር ቃል ዳግም ተዋወቅ ሊንክ እንልክልዎ"}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {language === "en"
                ? `Check your email at ${email} for instructions to reset your password.`
                : `${email} ላይ ያለውን ኢሜይል ይመልከቱ ወደ የሚስጥር ቃል ዳግም ተዋወቅ መመሪያዎን`}
            </p>
            <Button
              onClick={handleClose}
              className="w-full"
            >
              {language === "en" ? "Done" : "ተሳክቷል"}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div>
              <Label htmlFor="reset-email">
                {language === "en" ? "Email Address" : "ኢሜይል አድራሻ"}
              </Label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={language === "en" ? "you@example.com" : "you@example.com"}
                required
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {language === "en" ? "Back" : "ተመለስ"}
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading
                  ? language === "en"
                    ? "Sending..."
                    : "በመላክ ላይ..."
                  : language === "en"
                  ? "Send Reset Link"
                  : "ዳግም ተዋወቅ ሊንክ ይላኩ"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
