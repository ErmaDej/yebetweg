import { useState } from "react"
import { Send, MapPin, Phone, Mail, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLanguage } from "@/lib/i18n"
import { useInView } from "@/hooks/useInView"
import { supabase } from "@/lib/supabase"
import { TelegramIcon } from "@/components/icons/telegram-icon"
import { validateContactForm, sanitizeText } from "@/lib/validation"

export function ContactSection() {
  const { t, language } = useLanguage()
  const { ref, isInView } = useInView()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")
  const [subject, setSubject] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")

    const fd = new FormData(e.currentTarget)
    const formData = {
      name: fd.get("name"),
      email: fd.get("email"),
      phone: fd.get("phone"),
      message: fd.get("message"),
    }

    // Validate form data
    const validationErrors = validateContactForm(formData)
    if (validationErrors.length > 0) {
      setError(validationErrors[0].message)
      return
    }

    // Sanitize data before insert
    const { error: insertError } = await supabase
      .from("inquiries")
      .insert({
        name: sanitizeText(formData.name as string, 100),
        email: (formData.email as string).toLowerCase().trim(),
        phone: sanitizeText(formData.phone as string, 20),
        subject: subject || "general",
        message: sanitizeText(formData.message as string, 5000),
      })

    if (insertError) {
      setError("Failed to submit inquiry. Please try again.")
      return
    }

    setSent(true)
  }

  return (
    <section id="contact" ref={ref} className="py-16 sm:py-24 bg-muted/30">
      <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">{t("contact.title")}</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">{t("contact.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="overflow-hidden border-border/50">
            <CardContent className="p-6">
              {sent ? (
                <div className="py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent mx-auto mb-4">
                    <Send className="h-8 w-8" />
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    {language === "en" ? "Inquiry sent successfully!" : "ጥያቄ በተሳካ ሁኔታ ተልኳል!"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {language === "en" ? "We will get back to you within 24 hours." : "በ24 ሰዓት ውስጥ እንመልስልዎታለን።"}
                  </p>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                      {error}
                    </div>
                  )}
                  <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>{t("contact.name")}</Label>
                      <Input name="name" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("contact.phone")}</Label>
                      <Input name="phone" placeholder="+251..." />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("contact.email")}</Label>
                    <Input name="email" type="email" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("contact.subject")}</Label>
                    <Select value={subject} onValueChange={setSubject}>
                      <SelectTrigger>
                        <SelectValue placeholder={language === "en" ? "Select subject" : "ርዕሰ ጉዳይ ይምረጡ"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">{t("contact.general")}</SelectItem>
                        <SelectItem value="consultation">{t("contact.consultation")}</SelectItem>
                        <SelectItem value="listing">{t("contact.listing")}</SelectItem>
                        <SelectItem value="hiring">{t("contact.hiring")}</SelectItem>
                        <SelectItem value="advertising">{t("contact.advertising")}</SelectItem>
                        <SelectItem value="support">{t("contact.support")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("contact.message")}</Label>
                    <Textarea name="message" rows={4} required />
                  </div>
                  <Button type="submit" className="w-full gap-2">
                    <Send className="h-4 w-4" />
                    {t("contact.send")}
                  </Button>
                </form>
                </>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="overflow-hidden border-border/50">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">
                  {language === "en" ? "Contact Information" : "የግንኙነት መረጃ"}
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Bole, Addis Ababa</p>
                      <p className="text-xs text-muted-foreground">
                        {language === "en" ? "Near Edna Mall, 3rd Floor" : "አድና ሞል አጠገት፣ 3ኛ ፎቅ"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">+251 911 234 567</p>
                      <p className="text-xs text-muted-foreground">
                        {language === "en" ? "Telegram: @yebetweg" : "ቴሌግራም: @yebetweg"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">info@yebetweg.com</p>
                      <p className="text-xs text-muted-foreground">
                        {language === "en" ? "We respond within 24 hours" : "በ24 ሰዓት ውስጥ እንመልሳለን"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">
                        {language === "en" ? "Mon - Sat: 8:00 AM - 6:00 PM" : "ሰኞ - ቅዳሜ: 8:00 - 6:00"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {language === "en" ? "Sunday: Closed" : "እሁድ: ዕረፍት"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-border/50 bg-gradient-to-br from-primary/5 to-accent/5">
              <CardContent className="p-6 text-center">
                <p className="text-sm font-medium mb-2">
                  {language === "en"
                    ? "Join our Telegram for instant construction tips"
                    : "ለፈጣን የግንባታ ምክሮች ቴሌግራማችንን ይቀላጸፉ"}
                </p>
                <Button size="sm" className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90" asChild>
                  <a href="https://t.me/yebetweg" target="_blank" rel="noopener noreferrer">
                    <TelegramIcon className="h-4 w-4" />
                    {t("social.joinTelegram")}
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
