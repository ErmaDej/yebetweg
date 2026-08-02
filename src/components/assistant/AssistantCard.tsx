import { useState, useRef, useEffect } from "react"
import { Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/lib/i18n"
import { assistantGreeting, answerQuestion, type AssistantContext, type AssistantMessage } from "@/lib/assistant"
import type { UserProfile } from "@/hooks/useUserProfile"
import type { PremiumTier } from "@/types/payment"

export type AssistantCardProps = {
  language: "en" | "am"
  profile: UserProfile | null
  plan: PremiumTier
  openRfqs: number
  unreadInquiries: number
}

const QUICK_INTENT_KEYS: ReadonlyArray<keyof typeof labels.en> = ["myRfqs", "profile", "prices", "boq", "pro"]

const labels = {
  en: {
    myRfqs: "My RFQs",
    profile: "Profile strength",
    prices: "Market prices",
    boq: "BOQ estimate",
    pro: "Find a pro",
    send: "Send",
    placeholder: "Ask about RFQs, profile, prices, BOQ...",
    title: "YeBetWeg Assistant",
    subtitle: "Rule-based help with your account and stats — no question too small.",
  },
  am: {
    myRfqs: "የዋጋ ጥያቄዎች",
    profile: "የግምገማ ጥንኩር",
    prices: "የገበያ ዋጋዎች",
    boq: "BOQ ወልታዊ",
    pro: "ባለሙያ ይፈልጉ",
    send: "አስቀምጥ",
    placeholder: "ለዋጋ ጥያቄዎች፣ ግምገማ፣ ዋጋ ጥያቄ ይጠይቁ።",
    title: "የYeBetWeg ረዳት",
    subtitle: "በመረጽዎ መረጃ የተመሠረተ ምክር።",
  },
}

export function AssistantCard({ language, profile, plan, openRfqs, unreadInquiries }: AssistantCardProps) {
  const { t } = useLanguage()
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const l = labels[language]

  const ctx: AssistantContext = { openRfqs, unreadInquiries, profile, plan }

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([assistantGreeting(ctx, language)])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const addMessage = (msg: AssistantMessage) => setMessages((prev) => [...prev, msg])

  const handleSend = (content?: string) => {
    const text = (content ?? input).trim()
    if (!text || sending) return
    setInput("")
    addMessage({ role: "user", content: text })
    setSending(true)
    setTimeout(() => {
      addMessage(answerQuestion(text, ctx, language))
      setSending(false)
    }, 320)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !sending) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleQuick = (key: keyof typeof l) => {
    if (sending) return
    handleSend(l[key])
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-accent/15">
          <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M12 3.75c.436.713 2.316 4.027 3.82 6.47.235.397.43.692.43 1.043 0 .72-.535 1.338-1.263 1.49-.352.071-.775.131-1.236.179-.922.093-1.767-.391-2.28-.99-.16-.187-.14-.215-.076-.43l.285-1.28c.042-.19.076-.378.076-.567 0 .285-.034.57-.09 1.28-.19 1.45-.77 2.79-1.69 3.76-.23.24-.5.46-1.01.46h-1.69c-1.32 0-2.4-1.07-2.4-2.4 0-.29.065-.57.18-1.18.26-1.34 1.14-2.4 2.35-3.34.39-.3 1.01-.69 1.01-1.33 0-.74-.56-1.37-1.28-1.51-.48-.096-1.03-.131-1.57-.131C3.75 7.5 3 6.72 3 5.75c0-.04.02-.07.06-.11C2.41 5.28 2 4.55 2 3.75c0-.69.56-1.25 1.25-1.25.44 0 .85.12 1.21.34.75.47 1.38 1.28 1.38 2.16 0 .39-.01.78-.03 1.17.11.09.22.14.34.22.34-.43.72-.81 1.12-1.12.39-.3.83-.47 1.29-.47.99 0 1.89.43 2.5 1.12.45-.15.93-.23 1.42-.23.62 0 1.21.11 1.75.32z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="17.5" r="2" fill="currentColor"/>
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t("dashboard.assistant.title") || l.title}</p>
          <p className="text-xs text-muted-foreground">{t("dashboard.assistant.subtitle") || l.subtitle}</p>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto"
        ref={scrollRef}
        style={{ maxHeight: "220px", minHeight: "64px" }}
      >
        <div className="space-y-3 pr-2">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[82%] rounded-lg px-3 py-2 text-sm ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-muted px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_INTENT_KEYS.map((key) => (
            <Badge
              key={key}
              variant="outline"
              className="cursor-pointer text-[11px] capitalize"
              onClick={() => handleQuick(key)}
            >
              {l[key]}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("dashboard.assistant.placeholder") || l.placeholder}
            disabled={sending}
            className="flex-1"
          />
          <Button size="sm" onClick={() => handleSend()} disabled={sending || !input.trim()} className="gap-1">
            <Send className="h-3.5 w-3.5" />
            {t("dashboard.assistant.send") || l.send}
          </Button>
        </div>
      </div>
    </div>
  )
}
