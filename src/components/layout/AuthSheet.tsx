import { useState } from "react"
import { LogIn, LogOut, Key } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLanguage } from "@/lib/i18n"
import { useAuthContext } from "@/context/AuthContext"
import { PasswordResetDialog } from "./PasswordResetDialog"

interface AuthSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuthSheet({ open, onOpenChange }: AuthSheetProps) {
  const { language } = useLanguage()
  const { user, loading, error, signInWithPassword, signUp, signOut } = useAuthContext()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [messageType, setMessageType] = useState<"success" | "error">("success")
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin")
  const [resetOpen, setResetOpen] = useState(false)

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    const result = await signInWithPassword(email, password)
    if (result.error) {
      setMessage(result.error)
      setMessageType("error")
    } else {
      setMessage(language === "en" ? "Signed in successfully" : "በታማኝ ሁኔታ ገብተዋል")
      setMessageType("success")
      setEmail("")
      setPassword("")
      setTimeout(() => onOpenChange(false), 1500)
    }
  }

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    
    if (password !== confirmPassword) {
      setMessage(language === "en" ? "Passwords do not match" : "የሚስጥር ቃላት አይዛመዱም")
      setMessageType("error")
      return
    }

    const result = await signUp(email, password, fullName)
    if (result.error) {
      setMessage(result.error)
      setMessageType("error")
    } else {
      setMessage(language === "en" ? "Account created successfully! Check your email to verify." : "መለያ በተሳካ ሁኔታ ተፈጥሮ! ኢሜይሎችዎን ያረጋግጡ")
      setMessageType("success")
      setEmail("")
      setPassword("")
      setFullName("")
      setConfirmPassword("")
      setTimeout(() => onOpenChange(false), 2000)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    setMessage(language === "en" ? "Signed out successfully" : "በታማኝ ሁኔታ ወጣችሁ")
    setMessageType("success")
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-sm overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {language === "en" ? "Account" : "መለያ"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {user ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-border/60 bg-muted p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Key className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold truncate">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {language === "en" ? "Signed in" : "ተገብቷል"}
                    </p>
                  </div>
                </div>
              </div>
              <Button className="w-full" onClick={handleSignOut} variant="outline">
                <LogOut className="h-4 w-4 mr-2" />
                {language === "en" ? "Sign Out" : "ውጣ"}
              </Button>
              {message && (
                <p className={`text-sm ${messageType === "error" ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                  {message}
                </p>
              )}
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "signin" | "signup")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{language === "en" ? "Sign In" : "ግባ"}</TabsTrigger>
                <TabsTrigger value="signup">{language === "en" ? "Sign Up" : "ተመዝገብ"}</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-4 mt-4">
                <form className="space-y-4" onSubmit={handleSignIn}>
                  <div>
                    <Label htmlFor="signin-email">{language === "en" ? "Email" : "ኢሜይል"}</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={language === "en" ? "you@example.com" : "you@example.com"}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">{language === "en" ? "Password" : "የሚስጥር ቃል"}</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={language === "en" ? "••••••••" : "••••••••"}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setResetOpen(true)}
                      className="text-xs text-primary hover:underline"
                    >
                      {language === "en" ? "Forgot password?" : "የሚስጥር ቃል ረሱ?"}
                    </button>
                  </div>
                  {(error || message) && activeTab === "signin" ? (
                    <p className={`text-sm ${messageType === "error" ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                      {error ?? message}
                    </p>
                  ) : null}
                  <Button type="submit" className="w-full" disabled={loading}>
                    <LogIn className="h-4 w-4 mr-2" />
                    {loading ? (language === "en" ? "Signing in..." : "በመግባት ላይ...") : (language === "en" ? "Sign In" : "ግባ")}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-4">
                <form className="space-y-4" onSubmit={handleSignUp}>
                  <div>
                    <Label htmlFor="signup-name">{language === "en" ? "Full Name" : "ሙሉ ስም"}</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={language === "en" ? "John Doe" : "ጆን ዶ"}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="signup-email">{language === "en" ? "Email" : "ኢሜይል"}</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={language === "en" ? "you@example.com" : "you@example.com"}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="signup-password">{language === "en" ? "Password" : "የሚስጥር ቃል"}</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={language === "en" ? "••••••••" : "••••••••"}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="signup-confirm">{language === "en" ? "Confirm Password" : "የሚስጥር ቃል አረጋግጥ"}</Label>
                    <Input
                      id="signup-confirm"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={language === "en" ? "••••••••" : "••••••••"}
                      required
                    />
                  </div>
                  {(error || message) && activeTab === "signup" ? (
                    <p className={`text-sm ${messageType === "error" ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                      {error ?? message}
                    </p>
                  ) : null}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (language === "en" ? "Creating account..." : "መለያ በመፍጠር ላይ...") : (language === "en" ? "Sign Up" : "ተመዝገብ")}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </SheetContent>
      <PasswordResetDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        onBackToSignIn={() => setResetOpen(false)}
      />
    </Sheet>
  )
}
