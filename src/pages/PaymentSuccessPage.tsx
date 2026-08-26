import { useEffect, useRef, useState } from "react"
import { useLanguage } from "@/lib/i18n"
import { activateChapaPayment } from "@/lib/chapa"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

export function PaymentSuccessPage() {
  const { language } = useLanguage()
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading")
  const [message, setMessage] = useState("")

  // Idempotency guard: track references we've already verified successfully in this session
  const verifiedRefs = useRef<Set<string>>(new Set())
  // Mounted guard to prevent re-verification on unmount/remount
  const mountedRef = useRef(false)

  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true

    const verifyPayment = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const reference = urlParams.get("reference")

      if (!reference) {
        setStatus("failed")
        setMessage(
          language === "am"
            ? "የክፍያ መረጃ አግኝተዋል"
            : "Payment reference not found"
        )
        return
      }

      // Idempotency: skip if already verified in this session
      if (verifiedRefs.current.has(reference)) {
        setStatus("success")
        setMessage(
          language === "am"
            ? "ክፍያዎ በተሳካይ ተጠናቅል"
            : "Payment completed successfully"
        )
        return
      }

      const result = await activateChapaPayment(reference)

      if (result.success) {
        verifiedRefs.current.add(reference)
        setStatus("success")
        setMessage(
          language === "am"
            ? "ክፍያዎ በተሳካይ ተጠናቅል"
            : "Payment completed successfully"
        )
      } else {
        setStatus("failed")
        setMessage(
          language === "am"
            ? "ክፍያ ማረጋገጥ አልተሳካም"
            : result.error || "Payment verification failed"
        )
      }
    }

    verifyPayment()
  }, []) // Run once on mount only — no language dep, no re-verification on language toggle

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {status === "loading" && (
          <>
            <Loader2 className="h-16 w-16 animate-spin mx-auto text-accent" />
            <h1 className="text-2xl font-bold">
              {language === "am" ? "ክፍያ በመፈጠም" : "Processing Payment"}
            </h1>
            <p className="text-muted-foreground">
              {language === "am"
                ? "ክፍያዎን እንደምንም መሰረታዊ ለማረጋገጥ እንደምንም እናጋጠመዎታለን"
                : "We are verifying your payment, please wait..."}
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
            <h1 className="text-2xl font-bold text-green-600">
              {language === "am" ? "ክፍያ በተሳካይ ተጠናቅል" : "Payment Successful"}
            </h1>
            <p className="text-muted-foreground">{message}</p>
            <p className="text-sm text-muted-foreground">
              {language === "am"
                ? "የእርስዎ ፕሪሚየም አባልነት አሁን ንቁ ነው። ወደ ዳሽቦርድ ይሂዱ እና ልዩ ባህሪያትን ይጠቀሙ።"
                : "Your premium membership is now active. Go to your dashboard to access exclusive features."}
            </p>
            <a
              href="/dashboard"
              className="inline-block mt-2 px-6 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90"
            >
              {language === "am" ? "ወደ ዳሽቦርድ" : "Go to Dashboard"}
            </a>
            <a
              href="/"
              className="inline-block mt-2 px-6 py-2 text-muted-foreground hover:text-foreground underline text-sm"
            >
              {language === "am" ? "ወደ ቤት ገጽ" : "Back to Home"}
            </a>
          </>
        )}

        {status === "failed" && (
          <>
            <XCircle className="h-16 w-16 mx-auto text-red-500" />
            <h1 className="text-2xl font-bold text-red-600">
              {language === "am" ? "ክፍያ አልተሳካይም" : "Payment Failed"}
            </h1>
            <p className="text-muted-foreground">{message}</p>
            <a
              href="/#premium"
              className="inline-block mt-4 px-6 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90"
            >
              {language === "am" ? "ደግሞ ይሞክሩ" : "Try Again"}
            </a>
          </>
        )}
      </div>
    </div>
  )
}