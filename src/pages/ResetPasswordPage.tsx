import { useAuthContext } from "@/context/AuthContext"
import { PasswordUpdateForm } from "@/components/layout/PasswordUpdateForm"
import { useLanguage } from "@/lib/i18n"

export function ResetPasswordPage() {
  const { user } = useAuthContext()
  const { language } = useLanguage()

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">YeBetWeg</h1>
          <p className="text-lg text-muted-foreground">
            {language === "am"
              ? "ይህን ገጽ ለመድረስ ስለ ወደ ሙከራ ወደ ሙከራ ሙከራ ወደ መግለጫ ወደ መግለጫ ሙከራ ወደ ሙከራ ሙከራ"
              : "You need to verify your email first. Please click the link in your password reset email."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <PasswordUpdateForm />
      </div>
    </div>
  )
}
