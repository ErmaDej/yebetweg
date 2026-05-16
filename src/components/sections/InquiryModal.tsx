import { useState } from "react"
import { useLanguage } from "@/lib/i18n"
import { useAuthContext } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Send, MessageCircle } from "lucide-react"

interface InquiryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  listingId?: string
  professionalId?: string
  listingTitle?: string
  professionalName?: string
}

export function InquiryModal({ open, onOpenChange, listingId, professionalId, listingTitle, professionalName }: InquiryModalProps) {
  const { language } = useLanguage()
  const { user } = useAuthContext()

  const [name, setName] = useState("")
  const [email, setEmail] = useState(user?.email || "")
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const subject = listingTitle
        ? (language === "en" ? `Inquiry about: ${listingTitle}` : `ስለ: ${listingTitle} ጥያቄ`)
        : professionalName
        ? (language === "en" ? `Contact request for: ${professionalName}` : `ለ: ${professionalName} የመገናኛ ጥያቄ`)
        : (language === "en" ? "General Inquiry" : "አጠቃላይ ጥያቄ")

      const { error: submitError } = await supabase.rpc("submit_inquiry", {
        p_name: name,
        p_email: email,
        p_phone: phone,
        p_subject: subject,
        p_message: message,
        p_listing_id: listingId || null,
        p_professional_id: professionalId || null,
      })

      if (submitError) throw submitError

      setSuccess(true)
      setName("")
      setEmail("")
      setPhone("")
      setMessage("")

      setTimeout(() => {
        onOpenChange(false)
        setSuccess(false)
      }, 2000)
    } catch (err: any) {
      setError(err.message || (language === "en" ? "Failed to send your inquiry. Please try again." : "ጥያቄዎን መላክ አልተሳካም። እባክዎ እንደገና ይሞክሩ።"))
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setError(null)
    setSuccess(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {listingTitle
              ? (language === "en" ? `Inquire about: ${listingTitle}` : `ስለ: ${listingTitle} ይጠይቁ`)
              : professionalName
              ? (language === "en" ? `Contact: ${professionalName}` : `አግኙ: ${professionalName}`)
              : (language === "en" ? "Send Inquiry" : "ጥያቄ ይላኩ")}
          </DialogTitle>
          <DialogDescription>
            {language === "en"
              ? "Fill in your details and we'll connect you with the seller or professional."
              : "ዝርዝሮችዎን ይሙሉ እና ከሻጩ ወይም ከባለሙያው ጋር እናገናኝዎታለን።"}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <Alert className="bg-green-100 border-green-400 text-green-700">
            <AlertDescription>
              {language === "en" ? "✅ Your inquiry has been sent successfully! The seller will contact you soon." : "✅ ጥያቄዎ በተሳካ ሁኔታ ተልኳል! ሻጩ በቅርቡ ያገኝዎታል።"}
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="inquiry-name">{language === "en" ? "Full Name" : "ሙሉ ስም"} *</Label>
              <Input
                id="inquiry-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={language === "en" ? "John Doe" : "ጆን ዶ"}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inquiry-email">{language === "en" ? "Email" : "ኢሜይል"} *</Label>
              <Input
                id="inquiry-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inquiry-phone">{language === "en" ? "Phone Number" : "ስልክ ቁጥር"}</Label>
              <Input
                id="inquiry-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+2519XXXXXXXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inquiry-message">{language === "en" ? "Message" : "መልእክት"} *</Label>
              <Textarea
                id="inquiry-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={language === "en"
                  ? "I am interested in this listing. Please provide more details..."
                  : "በዚህ ዝርዝር ላይ ፍላጎት አለኝ። እባክዎ ተጨማሪ ዝርዝሮችን ያቅርቡ..."}
                rows={4}
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                {language === "en" ? "Cancel" : "ሰርዝ"}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {language === "en" ? "Sending..." : "በመላክ ላይ..."}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {language === "en" ? "Send Inquiry" : "ጥያቄ ይላኩ"}
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
