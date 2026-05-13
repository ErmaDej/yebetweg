import { useState } from "react"
import { LogIn, LogOut, Key } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useLanguage } from "@/lib/i18n"
import { useAuthContext } from "@/context/AuthContext"

interface AuthSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuthSheet({ open, onOpenChange }: AuthSheetProps) {
  const { language } = useLanguage()
  const { user, loading, error, signInWithPassword, signOut } = useAuthContext()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    const result = await signInWithPassword(email, password)
    if (result.error) {
      setMessage(result.error)
    } else {
      setMessage(language === "en" ? "Signed in successfully" : "በታማኝ ሁኔታ ገብተዋል")
    }
  }

  const handleSignOut = async () => {
    await signOut()
    setMessage(language === "en" ? "Signed out successfully" : "በታማኝ ሁኔታ ወጣችሁ")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-sm">
        <SheetHeader>
          <SheetTitle>
            {language === "en" ? "Account" : "መለያ"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {user ? (
            <div className="space-y-3 rounded-3xl border border-border/60 bg-muted p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {language === "en" ? "Signed in" : "ተገብቷል"}
                  </p>
                </div>
              </div>
              <Button className="w-full" onClick={handleSignOut} variant="outline">
                <LogOut className="h-4 w-4" />
                {language === "en" ? "Sign Out" : "ውጣ"}
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <Label htmlFor="auth-email">{language === "en" ? "Email" : "ኢሜይል"}</Label>
                <Input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={language === "en" ? "you@example.com" : "you@example.com"}
                  required
                />
              </div>
              <div>
                <Label htmlFor="auth-password">{language === "en" ? "Password" : "የሚስጥር ቃል"}</Label>
                <Input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={language === "en" ? "••••••••" : "••••••••"}
                  required
                />
              </div>
              {error || message ? (
                <p className="text-sm text-destructive">{error ?? message}</p>
              ) : null}
              <Button type="submit" className="w-full" disabled={loading}>
                <LogIn className="h-4 w-4" />
                {language === "en" ? "Sign In" : "ግባ"}
              </Button>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
