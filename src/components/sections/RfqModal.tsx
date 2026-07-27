import { useEffect, useState } from "react"
import { Loader2, Send } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuthContext } from "@/context/AuthContext"
import { useLanguage } from "@/lib/i18n"
import { supabase } from "@/lib/supabase"
import type { MarketPrice } from "@/hooks/useMarketPrices"

type RfqModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  marketPrice?: MarketPrice | null
}

export function RfqModal({ open, onOpenChange, marketPrice }: RfqModalProps) {
  const { language } = useLanguage()
  const { user } = useAuthContext()
  const [name, setName] = useState("")
  const [email, setEmail] = useState(user?.email || "")
  const [phone, setPhone] = useState("")
  const [quantity, setQuantity] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (open && user?.email) setEmail(user.email)
  }, [open, user?.email])

  const materialName = marketPrice
    ? language === "am"
      ? marketPrice.material_am
      : marketPrice.material_en
    : language === "en"
      ? "Selected material"
      : "የተመረጠ ቁሳቁስ"

  const handleClose = () => {
    onOpenChange(false)
    setError(null)
    setSuccess(false)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const { error: submitError } = await supabase.rpc("submit_rfq", {
        p_requester_name: name,
        p_requester_email: email,
        p_requester_phone: phone,
        p_city: marketPrice?.city || "Addis Ababa",
        p_project_type: "",
        p_message: message,
        p_source_type: marketPrice ? "market_price" : "manual",
        p_source_id: marketPrice?.id || null,
        p_material_name: materialName,
        p_specification: marketPrice?.specification || "",
        p_unit: marketPrice?.unit || "",
        p_quantity: quantity ? Number(quantity) : null,
        p_target_price: marketPrice?.price || null,
      })

      if (submitError) throw submitError

      setSuccess(true)
      setName("")
      setPhone("")
      setQuantity("")
      setMessage("")

      setTimeout(() => {
        handleClose()
      }, 1800)
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : language === "en"
            ? "Failed to submit quote request."
            : "የዋጋ ጥያቄውን ማስገባት አልተሳካም።",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {language === "en" ? "Request supplier quote" : "የአቅራቢ ዋጋ ጠይቅ"}
          </DialogTitle>
          <DialogDescription>
            {language === "en"
              ? `Send an RFQ for ${materialName}. YBW can route this to verified suppliers as the supplier network grows.`
              : `ለ ${materialName} የዋጋ ጥያቄ ይላኩ። YBW ይህንን ወደ የተረጋገጡ አቅራቢዎች ለማድረስ ይዘጋጃል።`}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <Alert className="border-green-400 bg-green-100 text-green-700">
            <AlertDescription>
              {language === "en" ? "RFQ submitted successfully." : "የዋጋ ጥያቄው ተልኳል።"}
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rfq-name">{language === "en" ? "Full name" : "ሙሉ ስም"} *</Label>
                <Input id="rfq-name" value={name} onChange={(event) => setName(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rfq-phone">{language === "en" ? "Phone" : "ስልክ"} *</Label>
                <Input id="rfq-phone" value={phone} onChange={(event) => setPhone(event.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rfq-email">{language === "en" ? "Email" : "ኢሜይል"} *</Label>
              <Input id="rfq-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rfq-quantity">{language === "en" ? "Quantity" : "መጠን"}</Label>
              <Input
                id="rfq-quantity"
                type="number"
                min={0}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder={marketPrice?.unit || ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rfq-message">{language === "en" ? "Message" : "መልእክት"}</Label>
              <Textarea
                id="rfq-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                placeholder={
                  language === "en"
                    ? "Delivery location, timeline, preferred grade, or project note..."
                    : "የማድረሻ ቦታ፣ ጊዜ፣ የሚፈለገው ጥራት ወይም የፕሮጀክት ማስታወሻ..."
                }
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                {language === "en" ? "Cancel" : "ሰርዝ"}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {language === "en" ? "Submit RFQ" : "ጥያቄ ላክ"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
