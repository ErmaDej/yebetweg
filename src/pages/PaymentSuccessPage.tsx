import { useEffect, useState } from "react"
import { useLanguage } from "@/lib/i18n"
import { useAuthContext } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

export function PaymentSuccessPage() {
  const { language } = useLanguage()
  const { user } = useAuthContext()
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
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

      try {
        const { data: subscription, error } = await supabase
          .from("premium_subscriptions")
          .select("*")
          .eq("chapa_reference", reference)
          .single()

        if (error || !subscription) {
          const { data: telebirrSub } = await supabase
            .from("premium_subscriptions")
            .select("*")
            .eq("telebirr_reference", reference)
            .single()

          if (telebirrSub) {
            await supabase
              .from("premium_subscriptions")
              .update({
                is_active: true,
                status: "active",
                updated_at: new Date().toISOString(),
              })
              .eq("id", telebirrSub.id)

            setStatus("success")
            setMessage(
              language === "am"
                ? "ክፍያዎ በተሳካይ ተጠናቅል"
                : "Payment completed successfully"
            )
            return
          }

          throw new Error("Subscription not found")
        }

        const updateData: Record<string, unknown> = {
          is_active: true,
          status: "active",
          updated_at: new Date().toISOString(),
        }

        await supabase
          .from("premium_subscriptions")
          .update(updateData)
          .eq("id", subscription.id)

        setStatus("success")
        setMessage(
          language === "am"
            ? "ክፍያዎ በተሳካይ ተጠናቅል"
            : "Payment completed successfully"
        )
      } catch (err) {
        setStatus("failed")
        setMessage(
          language === "am"
            ? "ክፍያ ለማረጋገጥ ስለተለየው የመረጃ ችግኝ የተወሰነ ሲሆን እባክዎ ደግဝበ ይጠብቁ"
            : "Payment verification failed. Please contact support."
        )
      }
    }

    verifyPayment()
  }, [language, user])

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
            <a
              href="/"
              className="inline-block mt-4 px-6 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90"
            >
              {language === "am" ? "ወደ ቤት ገጽ" : "Go to Home"}
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
              href="/"
              className="inline-block mt-4 px-6 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90"
            >
              {language === "am" ? "ወደ ቤት ገጽ" : "Go to Home"}
            </a>
          </>
        )}
      </div>
    </div>
  )
}