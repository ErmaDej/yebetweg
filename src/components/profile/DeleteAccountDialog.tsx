import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuthContext } from "@/context/AuthContext"
import { useLanguage } from "@/lib/i18n"

/**
 * Two-step account deletion:
 *   Step 1 — what will happen (irreversible; listings/RFQs anonymized,
 *            subscriptions/BOQ data erased) → "Continue".
 *   Step 2 — type DELETE to arm the button → RPC → sign out → home.
 */
export function DeleteAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { language } = useLanguage()
  const navigate = useNavigate()
  const { signOut } = useAuthContext()
  const [step, setStep] = useState<1 | 2>(1)
  const [typed, setTyped] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const am = language === "am"
  const armed = typed.trim().toUpperCase() === "DELETE"

  const reset = () => {
    setStep(1)
    setTyped("")
    setBusy(false)
    setError(null)
  }

  const handleDelete = async () => {
    setBusy(true)
    setError(null)
    try {
      const { data, error: rpcError } = await supabase.rpc("delete_own_account")
      const result = (data ?? {}) as { success?: boolean; error?: string }
      if (rpcError || result.success === false) {
        setError(result.error ?? rpcError?.message ?? (am ? "መሰረዝ አልተቻለም።" : "Deletion failed."))
        setBusy(false)
        return
      }
      await signOut()
      onOpenChange(false)
      reset()
      navigate("/")
    } catch (e) {
      setError(e instanceof Error ? e.message : am ? "መሰረዝ አልተቻለም።" : "Deletion failed.")
      setBusy(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <AlertDialogContent>
        {step === 1 ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {am ? "መለያዎን ይሰርዙ?" : "Delete your account?"}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2">
                  <span className="block">
                    {am
                      ? "ይህ ተግባር ወደኋላ አይመለስም። የBOQ ግምቶችዎ፣ የትክክለኛ ወጪ መዝገቦችዎ እና ክፍያ ታሪክዎ ይሰረዛሉ።"
                      : "This cannot be undone. Your saved BOQ estimates, actual spend records, and subscription history will be erased."}
                  </span>
                  <span className="block">
                    {am
                      ? "የፈጠራቸው ማስታወቂያዎች፣ ጥያቄዎች (RFQ) እና ጥያቄዎች ያለስም ይቀራሉ (የገበያ መዝገብ ለትክክል ይቀራል)።"
                      : "Listings, RFQs, and inquiries you created are anonymized but kept, so marketplace records stay accurate."}
                  </span>
                  <span className="block">
                    {am
                      ? "አስተዳዳሪ መለያዎች ራሳቸውን መሰረዝ አይችሉም።"
                      : "Admin accounts cannot self-delete."}
                  </span>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>{am ? "ተወው" : "Keep my account"}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={(e) => {
                  e.preventDefault()
                  setStep(2)
                }}
              >
                {am ? "ቀጥል" : "Continue"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {am ? "ለማረጋገጥ DELETE ይጻፉ" : "Type DELETE to confirm"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {am
                  ? "ይህ የመጨረሻው እርምጃ ነው። ለመቀጠል ከታች DELETE የሚለውን ቃል ይጻፉ።"
                  : "This is the final step. Type DELETE below to enable the button."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="DELETE"
              aria-label={am ? "ማረጋገጫ ቃል" : "Confirmation word"}
              autoComplete="off"
              spellCheck={false}
            />
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <AlertDialogFooter>
              <Button variant="ghost" disabled={busy} onClick={() => setStep(1)}>
                {am ? "ተመለስ" : "Back"}
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
                {am ? "ተወው" : "Cancel"}
              </Button>
              <Button variant="destructive" disabled={!armed || busy} onClick={() => void handleDelete()}>
                {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {am ? "መለያዬን ሰርዝ" : "Delete my account"}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
