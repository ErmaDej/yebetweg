import { profileStrength } from "@/lib/entitlements"
import type { UserProfile } from "@/hooks/useUserProfile"
import type { PremiumTier } from "@/types/payment"

export type Language = "en" | "am"

export type AssistantContext = {
  openRfqs: number
  unreadInquiries: number
  profile: UserProfile | null
  plan: PremiumTier
}

export interface AssistantMessage {
  role: "assistant" | "user"
  content: string
  key?: string
}

export function buildContext(partial: {
  openRfqs?: number
  unreadInquiries?: number
  profile?: UserProfile | null
  plan?: PremiumTier
}): AssistantContext {
  return {
    openRfqs: partial.openRfqs ?? 0,
    unreadInquiries: partial.unreadInquiries ?? 0,
    profile: partial.profile ?? null,
    plan: partial.plan ?? "free",
  }
}

function nameOf(profile: UserProfile | null): string {
  return profile?.full_name || profile?.username || ""
}

function plural(n: number, one: string, other: string) {
  return `${n} ${n === 1 ? one : other}`
}

export function assistantGreeting(ctx: AssistantContext, language: Language = "en"): AssistantMessage {
  const strength = profileStrength(ctx.profile)
  const name = nameOf(ctx.profile)
  const namePart = name ? `, ${name}` : ""

  if (language === "am") {
    return {
      role: "assistant",
      key: "greeting",
      content: `ሰላም${namePart}! ከሆነ የዋጋ ጥያቄዎች ${ctx.openRfqs}፣ ያልተነበቡ አስታይ አመት ${ctx.unreadInquiries} እና የግምገማ ጥንኩር ${strength.score}% አሉ። ለዋጋ ጥያቄዎች፣ የገበያ ዋጋ፣ BOQ ወይም ባለሙያ መረጃ ጥያቄ ያሉዎት?`,
    }
  }

  return {
    role: "assistant",
    key: "greeting",
    content: `Hi${namePart}! You have ${plural(ctx.openRfqs, "open RFQ", "open RFQs")} and ${plural(ctx.unreadInquiries, "unread inquiry", "unread inquiries")}. Your profile strength is ${strength.score}%. Ask me about RFQs, market prices, BOQ, or finding a pro.`,
  }
}

type FaqIntent = {
  key: string
  en: string[]
  am: string[]
  answer: (ctx: AssistantContext, language: Language) => string
}

function containsKeyword(text: string, keywords: string[]) {
  const lowered = text.toLowerCase()
  return keywords.some((kw) => kw.includes(" ") ? lowered.includes(kw) : new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(lowered))
}

const PLAN_LABEL: Record<PremiumTier, { en: string; am: string }> = {
  free: { en: "Free", am: "ነፃ" },
  premium: { en: "Premium", am: "ፕሪሚየም" },
  pro: { en: "Pro", am: "ፕሮ" },
}

const FAQS: FaqIntent[] = [
  {
    key: "rfqs",
    en: ["rfq", "rfqs", "quote request", "my rfq", "request for quotation"],
    am: ["የዋጋ ጥያቄ", "የዋጋ ጥያቄዎች"],
    answer: (ctx, language) =>
      language === "am"
        ? `አሁን በሂዎ የዋጋ ጥያቄዎች ${ctx.openRfqs} አሉ። የዋጋ ጥያቄዎች በ1 የሥራ ቀን ውስጥ ይተግበርታል፣ እና ሊሰጥዎ የተሰጠ ማረጫ ከሆነ በቀይር ይὈምልዎታል።`
        : ctx.openRfqs === 0
          ? "You have no open RFQs yet. Go to the RFQ Tracking card and click 'Submit RFQ' to send your first request for quotation."
          : `You have ${ctx.openRfqs} open RFQ${ctx.openRfqs === 1 ? "" : "s"}. They're reviewed within 1 business day, and you'll get a notification when suppliers respond. You can track status on the RFQ Tracking card.`,
  },
  {
    key: "profile",
    en: ["profile", "profile strength", "complete my profile", "missing fields", "missing"],
    am: ["የግምገማ ጥንኩር", "ግምገማ", "አልተሙለም", "ያልተመረጠ"],
    answer: (ctx, language) => {
      const strength = profileStrength(ctx.profile)
      const name = nameOf(ctx.profile) || (language === "en" ? "your profile" : "ግምገማዎ")
      if (language === "am") {
        const missing = strength.missing.length
          ? ` የሚዘረገው: ${strength.missing.join(", ")}.`
          : ""
        return `የ${name} ግምገማ ጥንኩር ${strength.score}% ነው${missing} መረጃውን ጨምሮ ያስገድው ነው: የተጨማሪ መረጃ ያሳይዎት።`
      }
      const missing = strength.missing.length
        ? ` Missing: ${strength.missing.join(", ")}.`
        : ""
      return `Your profile is ${strength.score}% complete.${missing} Fill in the remaining fields in the Profile tab to unlock a stronger experience.`
    },
  },
  {
    key: "prices",
    en: ["market price", "market prices", "price", "prices", "market data", "material cost", "etb"],
    am: ["ዋጋ", "የገበያ ዋጋ", "ወቅት"],
    answer: (ctx, language) =>
      language === "am"
        ? `አንተ በ${PLAN_LABEL[ctx.plan].am} አቅድ ነህ። ፕሪሚየም እና ፕሮ አቅዶች በሙሉ የገበያ ዋጋ ታሪክ፣ በቨላናዊ ቢሼ እና የወደፍራ መረጃ ይዞታዊ ይደረጋሉ። ለቀናለም ዋጋዎች ወደ 'የገበያ ዋጋ' ትምህርት ሄዳሉ።`
        : `You're on the ${PLAN_LABEL[ctx.plan].en} plan. Premium and Pro users get full market-price history, trend lines, and 7-day freshness tracking. Tap "Market Prices" in the nav to browse current rates.`,
  },
  {
    key: "boq",
    en: ["boq", "boq lite", "estimate", "estimation", "calculator", "material cost", "bill of quantities"],
    am: ["boq", "ወልታዊ", "የመረጃ ወልቃዊ"],
    answer: (ctx, language) =>
      language === "am"
        ? `በ${PLAN_LABEL[ctx.plan].am} አቅድ ላይ፣ BOQ Lite የሚያስችልዎት ነው የግንባታ ሰብስ ወልታዊ። ከመምሕርሌች ውስጥ 'BOQ' ወይም ወደ 'የዋጋ ጥያቄ' ይሄድዎት።`
        : `As a ${PLAN_LABEL[ctx.plan].en} user, BOQ Lite lets you estimate material quantities for your build. Open "BOQ" from the main navigation or submit an RFQ and I can help you scope the materials afterward.`,
  },
  {
    key: "pro",
    en: ["professional", "pro", "contractor", "mason", "engineer", "architect", "plumber", "find"],
    am: ["ባለሙያ", "ወቅት"],
    answer: (ctx, language) =>
      language === "am"
        ? `የተረጋገጡ የግንባታ ባለሙያዎች በ'ባለሙያዎች' ይጠብቁ። ${ctx.plan === "free" ? "ፕሪሚየም አይዘህ መታመን ይሻሃኝታል።" : "የተጨማሪ መረጃ ይቀበልዎታል።"}`
        : `Verified pros are in the "Professionals" directory — use the filters to narrow by trade or location. ${ctx.plan === "free" ? "Upgrade to Premium to reveal their contact details." : "Your current plan lets you view full contact info."}`,
  },
  {
    key: "subscription",
    en: ["subscription", "plan", "tier", "renew", "billing", "payment", "pay", "cancel", "refund"],
    am: ["ምዝገና", "እቅድ", "ቲሃ", "ክፍያ"],
    answer: (ctx, language) =>
      language === "am"
        ? `የአሁኑ እቅድ ${PLAN_LABEL[ctx.plan].am} ነው። ለማደስ፣ ለማሻሻል ወይም ዋጋዎችን ለማየት ወደ '/#premium' ይሂዱ።`
        : `Your current plan is ${PLAN_LABEL[ctx.plan].en}. To renew, upgrade, or see pricing, go to "/#premium".`,
  },
]

export function answerQuestion(
  question: string,
  ctx: AssistantContext,
  language: Language = "en"
): AssistantMessage {
  const q = (question || "").trim().toLowerCase()
  if (!q) {
    return {
      role: "assistant",
      key: "empty",
      content:
        language === "am"
          ? "እባክዎት ጥያቄ አስገድው።"
          : "I didn't catch that — tell me how I can help.",
    }
  }

  for (const intent of FAQS) {
    const keywords = language === "am" ? intent.am : intent.en
    if (containsKeyword(q, keywords)) {
      return { role: "assistant", key: intent.key, content: intent.answer(ctx, language) }
    }
  }

  return {
    role: "assistant",
    key: "fallback",
    content:
      language === "am"
        ? "እኔ ለዋጋ ጥያቄዎች፣ የግምገማ ጥንኩር፣ የገበያ ዋጋ፣ BOQ እና ባለሙያዎች ጥያቄ ልክ ነው ማይደሱት። እንዴት ጥያቄ አሉዎት?"
        : "I can help with your RFQs, profile strength, market prices, BOQ estimates, and finding professionals. What would you like to know?",
  }
}
