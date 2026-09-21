import { profileStrength } from "@/lib/entitlements"
import type { UserProfile } from "@/hooks/useUserProfile"
import type { PremiumTier } from "@/types/payment"
import type { Language } from "@/lib/i18n"
import type { RfqContext } from "@/components/sections/RfqModal"

export type AssistantContext = {
  openRfqs: number
  unreadInquiries: number
  profile: UserProfile | null
  plan: PremiumTier
  savedEstimates?: number
  actualsLogged?: number
  unreadNotifications?: number
}

export interface AssistantMessage {
  role: "assistant" | "user"
  content: string
  key?: string
  suggestions?: string[]
  /** Set on the "rfq_new" intent answer — the card renders a chip that launches the draft flow. */
  startRfqDraft?: boolean
}

export function buildContext(partial: {
  openRfqs?: number
  unreadInquiries?: number
  profile?: UserProfile | null
  plan?: PremiumTier
  savedEstimates?: number
  actualsLogged?: number
  unreadNotifications?: number
}): AssistantContext {
  return {
    openRfqs: partial.openRfqs ?? 0,
    unreadInquiries: partial.unreadInquiries ?? 0,
    profile: partial.profile ?? null,
    plan: partial.plan ?? "free",
    savedEstimates: partial.savedEstimates ?? 0,
    actualsLogged: partial.actualsLogged ?? 0,
    unreadNotifications: partial.unreadNotifications ?? 0,
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
  const boqPart =
    (ctx.savedEstimates ?? 0) > 0
      ? language === "am"
        ? ` ${ctx.savedEstimates} የተቀመጡ BOQ ግምቶች አሉዎት።`
        : ` You also have ${ctx.savedEstimates} saved BOQ estimate${ctx.savedEstimates === 1 ? "" : "s"}${(ctx.actualsLogged ?? 0) > 0 ? ` with ${ctx.actualsLogged} logged actual${ctx.actualsLogged === 1 ? "" : "s"}` : ""}.`
      : ""

  const suggestions =
    language === "am"
      ? ["የዋጋ ጥያቄዎቼ", "የገበያ ዋጋ", "BOQ ግምት"]
      : ["My RFQs", "Market prices", "BOQ estimate"]

  if (language === "am") {
    return {
      role: "assistant",
      key: "greeting",
      suggestions,
      content: `ሰላም${namePart}! ከሆነ የዋጋ ጥያቄዎች ${ctx.openRfqs}፣ ያልተነበቡ አስታይ አመት ${ctx.unreadInquiries} እና የግምገማ ጥንኩር ${strength.score}% አሉ።${boqPart} ለዋጋ ጥያቄዎች፣ የገበያ ዋጋ፣ BOQ ወይም ባለሙያ መረጃ ጥያቄ ያሉዎት?`,
    }
  }

  return {
    role: "assistant",
    key: "greeting",
    suggestions,
    content: `Hi${namePart}! You have ${plural(ctx.openRfqs, "open RFQ", "open RFQs")} and ${plural(ctx.unreadInquiries, "unread inquiry", "unread inquiries")}. Your profile strength is ${strength.score}%.${boqPart} Ask me about RFQs, market prices, BOQ, actuals tracking, or finding a pro.`,
  }
}

// ============================================================================
// Matching: tokenized keyword scoring with single-edit typo tolerance.
// Score = 2 per exact/phrase hit, 1 per near hit (levenshtein ≤ 1 on words ≥ 5
// chars). Highest score wins; ties keep intent order. This fixes the old
// first-match-wins problem where "how are my RFQs and prices" locked onto RFQ.
// ============================================================================

function tokenize(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
}

/** Optimal-string-alignment distance: insert/delete/substitute + adjacent transposition (the classic typo). */
function editDistance(a: string, b: string): number {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > 2) return 3
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)])
  for (let j = 0; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const sub = d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      let v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, sub)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, d[i - 2][j - 2] + 1)
      }
      d[i][j] = v
    }
  }
  return d[a.length][b.length]
}

function scoreKeywords(rawLowered: string, tokens: string[], keywords: string[]): number {
  let score = 0
  for (const kw of keywords) {
    const k = kw.toLowerCase()
    if (k.includes(" ")) {
      if (rawLowered.includes(k)) score += 2
      continue
    }
    if (tokens.some((tok) => tok === k)) {
      score += 2
    } else if (k.length >= 5 && tokens.some((tok) => tok.length >= 5 && editDistance(tok, k) <= 1)) {
      score += 1
    }
  }
  return score
}

type FaqIntent = {
  key: string
  en: string[]
  am: string[]
  answer: (ctx: AssistantContext, language: Language) => string | AssistantMessage
  suggestions?: (ctx: AssistantContext, language: Language) => string[]
}

const PLAN_LABEL: Record<PremiumTier, { en: string; am: string }> = {
  free: { en: "Free", am: "ነፃ" },
  premium: { en: "Premium", am: "ፕሪሚየም" },
  pro: { en: "Pro", am: "ፕሮ" },
}

const FAQS: FaqIntent[] = [
  {
    key: "rfq_draft",
    // Single tokens "draft"/"create" + the phrase "new rfq" so "draft a new RFQ"
    // (4 pts) beats generic rfqs (2), while "show me new prices" (draft 0) stays prices.
    // "አዲስ" is deliberately excluded — it's a substring of አዲስ አበባ (Addis Ababa).
    en: ["draft", "create", "new rfq", "draft rfq"],
    am: ["አዘጋጅ"],
    answer: (_ctx, language) => ({
      role: "assistant" as const,
      key: "rfq_draft",
      startRfqDraft: true,
      content:
        language === "am"
          ? "እርምጃ እንጀምር — ከታች 'የዋጋ ጥያቄ አዘጋጅ' ይጫኑ፣ እኔ 3 ፈጣን ጥያቄዎችን እጠይቃለሁ እና ቅጹን አሞልቻለሁ።"
          : "Happy to draft it with you — tap the 'Draft my RFQ' chip below and I'll ask 3 quick questions, then open the form pre-filled.",
    }),
    suggestions: (_ctx, language) =>
      language === "am" ? ["የዋጋ ጥያቄዎቼ"] : ["My RFQs"],
  },
  {
    key: "rfqs",
    en: ["rfq", "rfqs", "quote request", "my rfq", "request for quotation", "supplier quote"],
    am: ["የዋጋ ጥያቄ", "የዋጋ ጥያቄዎች", "የዋጋ ጥያቄዎቼ"],
    answer: (ctx, language) =>
      language === "am"
        ? `አሁን በሂዎ የዋጋ ጥያቄዎች ${ctx.openRfqs} አሉ። የዋጋ ጥያቄዎች በ1 የሥራ ቀን ውስጥ ይተግበርታል፣ እና ሊሰጥዎ የተሰጠ ማረጫ ከሆነ በቀይር ይሰጣል።`
        : ctx.openRfqs === 0
          ? "You have no open RFQs yet. Go to the RFQ Tracking card and click 'Submit RFQ' to send your first request for quotation."
          : `You have ${ctx.openRfqs} open RFQ${ctx.openRfqs === 1 ? "" : "s"}. They're reviewed within 1 business day, and you'll get a notification when suppliers respond. You can track status on the RFQ Tracking card.`,
    suggestions: (_ctx, language) =>
      language === "am" ? ["አዲስ የዋጋ ጥያቄ እንዴት አበጅሃለሁ?", "የገበያ ዋጋ"] : ["How do I submit an RFQ?", "Market prices"],
  },
  {
    key: "profile",
    en: ["profile", "profile strength", "complete my profile", "missing fields", "missing"],
    am: ["የግምገማ ጥንኩር", "ግምገማ", "አልተሙለም", "ያልተመረጠ"],
    answer: (ctx, language) => {
      const strength = profileStrength(ctx.profile)
      const name = nameOf(ctx.profile) || (language === "en" ? "your profile" : "ግምገማዎ")
      if (language === "am") {
        const missing = strength.missing.length ? ` የሚዘረገው: ${strength.missing.join(", ")}.` : ""
        return `የ${name} ግምገማ ጥንኩር ${strength.score}% ነው${missing} መረጃውን ጨምሮ ያስገድው ነው: የተጨማሪ መረጃ ያሳይዎት።`
      }
      const missing = strength.missing.length ? ` Missing: ${strength.missing.join(", ")}.` : ""
      return `Your profile is ${strength.score}% complete.${missing} Fill in the remaining fields in the Profile tab to unlock a stronger experience.`
    },
  },
  {
    key: "prices",
    en: ["market price", "market prices", "price", "prices", "market data", "etb", "cost of cement", "rebar price"],
    am: ["ዋጋ", "የገበያ ዋጋ", "ወቅት"],
    answer: (ctx, language) =>
      language === "am"
        ? `አንተ በ${PLAN_LABEL[ctx.plan].am} አቅድ ነህ። ፕሪሚየም እና ፕሮ አቅዶች በሙሉ የገበያ ዋጋ ታሪክ፣ በቨላናዊ ቢሼ እና የወደፍራ መረጃ ይዞታዊ ይደረጋሉ። ለቀናለም ዋጋዎች ወደ 'የገበያ ዋጋ' ትምህርት ሄዳሉ።`
        : `You're on the ${PLAN_LABEL[ctx.plan].en} plan. Premium and Pro users get full market-price history, trend lines, and 7-day freshness tracking. Tap "Market Prices" in the nav to browse current rates.`,
    suggestions: (_ctx, language) =>
      language === "am" ? ["ዋጋዎች መቼ ይታደሳሉ?", "BOQ ግምት"] : ["How fresh are the prices?", "BOQ estimate"],
  },
  {
    key: "boq",
    en: ["boq", "boq lite", "estimate", "estimation", "calculator", "bill of quantities"],
    am: ["boq", "ወልታዊ", "የመረጃ ወልቃዊ", "ግምት"],
    answer: (ctx, language) => {
      const saved = ctx.savedEstimates ?? 0
      if (language === "am") {
        return saved > 0
          ? `${saved} የተቀመጡ BOQ ግምቶች አሉዎት — በዳሽቦርድዎ 'የተቀመጡ BOQ ግምቶች' ውስጥ ያገኛሉ። እውነተኛ ወጪዎን መመዝገብ ይችላሉ።`
          : `በ${PLAN_LABEL[ctx.plan].am} አቅድ ላይ፣ BOQ Lite የሚያስችልዎት ነው የግንባታ ሰብስ ወልታዊ። ከመምሕርሌች ውስጥ 'BOQ' ወይም ወደ 'የዋጋ ጥያቄ' ይሄድዎት።`
      }
      return saved > 0
        ? `You have ${saved} saved estimate${saved === 1 ? "" : "s"} — find them under "Saved BOQ Estimates" on your dashboard. You can log real spending against each one and print a report.`
        : `As a ${PLAN_LABEL[ctx.plan].en} user, BOQ Lite lets you estimate material quantities for your build. Open "BOQ" from the main navigation or submit an RFQ and I can help you scope the materials afterward.`
    },
    suggestions: (_ctx, language) =>
      language === "am" ? ["እውነተኛ ወጪ እንዴት አመዝግባለሁ?", "ሪፖርት ማውጣት"] : ["How do I track actual spending?", "Export a report"],
  },
  {
    key: "pro",
    en: ["professional", "pro", "contractor", "mason", "engineer", "architect", "plumber", "find a pro"],
    am: ["ባለሙያ", "ባለሙያዎች"],
    answer: (ctx, language) =>
      language === "am"
        ? `የተረጋገጡ የግንባታ ባለሙያዎች በ'ባለሙያዎች' ይጠብቁ። ${ctx.plan === "free" ? "ፕሪሚየም አይዘህ መታመን ይሻሃኝታል።" : "የተጨማሪ መረጃ ይቀበልዎታል።"}`
        : `Verified pros are in the "Professionals" directory — use the filters to narrow by trade or location. ${ctx.plan === "free" ? "Upgrade to Premium to reveal their contact details." : "Your current plan lets you view full contact info."}`,
  },
  {
    key: "subscription",
    en: ["subscription", "plan", "tier", "renew", "billing", "payment", "pay", "cancel", "refund", "upgrade"],
    am: ["ምዝገና", "እቅድ", "ቲሃ", "ክፍያ"],
    answer: (ctx, language) =>
      language === "am"
        ? `የአሁኑ እቅድ ${PLAN_LABEL[ctx.plan].am} ነው። ለማደስ፣ ለማሻሻል ወይም ዋጋዎችን ለማየት ወደ '/#premium' ይሂዱ።`
        : `Your current plan is ${PLAN_LABEL[ctx.plan].en}. To renew, upgrade, or see pricing, go to "/#premium".`,
  },

  // --- new Phase 5 intents -------------------------------------------------

  {
    key: "actuals",
    en: ["actual", "actuals", "spent", "spending", "track spending", "variance", "over budget", "log spending"],
    am: ["እውነተኛ ወጪ", "ወጪ", "አመዝግብ"],
    answer: (ctx, language) => {
      const logged = ctx.actualsLogged ?? 0
      if (language === "am") {
        return logged > 0
          ? `እስካሁን ${logged} የእውነተኛ ወጪ መዝገቦች አሉ። በዳሽቦርድዎ 'እውነተኛ ወጪ ይከታተሉ' ውስጥ ያረጋግጡ — ከግምቱ ጋር ተወዳድሮ ይሳያል።`
          : "ከተቀመጠ BOQ ግምት በኋላ፣ በዳሽቦርድዎ 'እውነተኛ ወጪ ይከታተሉ' ውስጥ እውነተኛ ወጪዎን ይመዝግቡ — YeBetWeg ከግምቱ ጋር አንጻርቶ ቅንጅቱን ያሳያል።"
      }
      return logged > 0
        ? `You've logged ${logged} actual spend${logged === 1 ? "" : "s"} so far. Open "Track actual spending" under your saved estimates to see the variance against each estimate.`
        : "After saving a BOQ estimate, log what you actually spend per category (structure, materials, labor, overhead) under \"Track actual spending\" on your dashboard. YeBetWeg then shows the variance — over or under — so your next estimate is sharper."
    },
    suggestions: (_ctx, language) =>
      language === "am" ? ["BOQ ግምት", "ሪፖርት ማውጣት"] : ["BOQ estimate", "Export a report"],
  },
  {
    key: "export",
    en: ["export", "pdf", "print", "csv", "report", "download"],
    am: ["ሪፖርት", "አትም", "ላክ", "pdf"],
    answer: (ctx, language) =>
      language === "am"
        ? `ከተቀመጡ ግምቶችዎ CSV ወይም የተተከለ ሪፖርት ማውጣት ይችላሉ። ${ctx.plan === "free" ? "ይህ የፕሪሚየም ጥቅም ነው — '/#premium' ይሂዱ።" : "በዳሽቦርድዎ የተቀመጡ ግምቶች ላይ የአተረጋገጫ እና CSV አዝራሮችን ይጠቀሙ።"}`
        : `Every saved estimate has two export buttons on your dashboard${ctx.plan === "free" ? " — but exporting is a Premium feature. Visit \"/#premium\" to unlock it." : ": the printer icon opens a print-ready report you can save as PDF and share with a contractor; the download icon gives you the CSV."}`,
    suggestions: (_ctx, language) =>
      language === "am" ? ["እውነተኛ ወጪ", "እቅዴ ምንድን ነው?"] : ["Track actual spending", "What's my plan?"],
  },
  {
    key: "notifications",
    en: ["notification", "notifications", "bell", "unread", "alert", "alerts"],
    am: ["ማሳወቂያ", "ማሳወቂያዎች", "ደወል"],
    answer: (ctx, language) => {
      const unread = ctx.unreadNotifications ?? 0
      const countPart =
        unread > 0
          ? language === "am"
            ? ` አሁን ${unread} ያልተነበቡ አሉ።`
            : ` You have ${unread} unread right now.`
          : ""
      return language === "am"
        ? `ማሳወቂያዎች በአሳሹ ደወል ላይ ይታያሉ፣ ሙሉ ዝርዝር ደግሞ በ /notifications ገጽ።${countPart}`
        : `Notifications appear on the bell in the navbar; the full history with filters lives on the /notifications page.${countPart} Price submissions and stale-price alerts land there automatically.`
    },
    suggestions: (_ctx, language) =>
      language === "am" ? ["የገበያ ዋጋ", "እርዳታ"] : ["Market prices", "Help"],
  },
  {
    key: "telegram",
    en: ["telegram", "bot", "submitprice", "supplier price", "community price"],
    am: ["ቴሌግራም", "ቦት", "አቅራቢ"],
    answer: (_ctx, language) =>
      language === "am"
        ? "አቅራቢዎች ዋጋ ለመላክ የቴሌግራም ቦታችንን ይጠቀማሉ፡ /submitprice <ከተማ> <ቁሳቁስ> <ዋጋ> — ለምሳሌ /submitprice Addis Cement 1150. የተላኩ ዋጋዎች አስተዋይ ማረጋገጫ በኋላ ይታያሉ።"
        : "Suppliers share prices through our Telegram bot with /submitprice <city> <material> <price> — e.g. /submitprice Addis Cement 1150. Submissions land in the admin verification queue before they're published, keeping the market feed trustworthy.",
    suggestions: (_ctx, language) =>
      language === "am" ? ["የገበያ ዋጋ", "እርዳታ"] : ["Market prices", "Help"],
  },
  {
    key: "freshness",
    en: ["fresh", "freshness", "stale", "expired", "trust", "confidence", "verified price"],
    am: ["ትኩስ", "ያረጀ", "እምነት"],
    answer: (_ctx, language) =>
      language === "am"
        ? "እያንዳንዱ ዋጋ የትኩሳት ምልክት እና የእምነት ክፍል አለው። ዋጋዎች ከ7 ቀናት በላይ ከሆኑ 'ያረጀ' ይለያሉ — በክፍለ ጊዜ ሥርዓት በአንድ ቀን ይመረመራሉ።"
        : "Every price row carries a freshness flag and a confidence score. Anything older than 7 days is marked 'Expired' — a daily cron job re-checks every row, and prices sourced from the Telegram community start lower-confidence until an admin verifies them.",
    suggestions: (_ctx, language) =>
      language === "am" ? ["የገበያ ዋጋ", "ቴሌግራም"] : ["Market prices", "Telegram prices"],
  },
  {
    key: "help",
    en: ["help", "what can you do", "options", "menu", "capabilities"],
    am: ["እርዳታ", "ምን ትችላለህ", "አማራጮች"],
    answer: (_ctx, language) =>
      language === "am"
        ? "እረዳለሁ በ፡ የዋጋ ጥያቄዎችዎ፣ የግምገማ ጥንኩር፣ የገበያ ዋጋ፣ BOQ ግምቶች፣ እውነተኛ ወጪ መከታተል፣ ሪፖርት ማውጣት፣ ማሳወቂያዎች፣ ቴሌግራም ዋጋዎች እና ባለሙያዎች።"
        : "I can help with: your RFQs, profile strength, market prices, BOQ estimates, tracking actual spending, exporting reports, notifications, Telegram price submissions, and finding professionals. Just ask in English or አማርኛ.",
    suggestions: (ctx, language) =>
      language === "am"
        ? ["የዋጋ ጥያቄዎቼ", "የገበያ ዋጋ", "BOQ ግምት"]
        : ["My RFQs", "Market prices", ctx.plan === "free" ? "What's my plan?" : "Export a report"],
  },
]

export function answerQuestion(
  question: string,
  ctx: AssistantContext,
  language: Language = "en"
): AssistantMessage {
  const raw = (question || "").trim()
  const lowered = raw.toLowerCase()
  if (!lowered) {
    return {
      role: "assistant",
      key: "empty",
      content:
        language === "am"
          ? "እባክዎት ጥያቄ አስገድው።"
          : "I didn't catch that — tell me how I can help.",
    }
  }

  const tokens = tokenize(raw)
  let best: FaqIntent | null = null
  let bestScore = 0
  for (const intent of FAQS) {
    const keywords = language === "am" ? intent.am : intent.en
    const score = scoreKeywords(lowered, tokens, keywords)
    if (score > bestScore) {
      best = intent
      bestScore = score
    }
  }

  if (best) {
    const answer = best.answer(ctx, language)
    if (typeof answer === "object") {
      return { ...answer, suggestions: answer.suggestions ?? best.suggestions?.(ctx, language) }
    }
    return {
      role: "assistant",
      key: best.key,
      content: answer,
      suggestions: best.suggestions?.(ctx, language),
    }
  }

  const helpIntent = FAQS.find((f) => f.key === "help")!
  return {
    role: "assistant",
    key: "fallback",
    content:
      language === "am"
        ? "እኔ ለዋጋ ጥያቄዎች፣ የግምገማ ጥንኩር፣ የገበያ ዋጋ፣ BOQ እና ባለሙያዎች ጥያቄ ልክ ነው የማይደርሱት። እንዴት ጥያቄ አሉዎት?"
        : "I can help with your RFQs, profile strength, market prices, BOQ estimates, and finding professionals. What would you like to know?",
    suggestions: helpIntent.suggestions?.(ctx, language),
  }
}

// ============================================================================
// RFQ drafting — a small clarifying-question state machine that ends with a
// pre-filled RfqContext the card hands to the RFQ modal. Pure functions so the
// whole conversation is unit-testable.
// ============================================================================

export type RfqDraftStep = "material" | "city" | "budget" | "confirm"

export type RfqDraftSession = {
  active: boolean
  step: RfqDraftStep
  material?: string
  city?: string
  budget?: number | null
}

export function newRfqDraft(): RfqDraftSession {
  return { active: true, step: "material" }
}

export type RfqDraftResult = {
  message: AssistantMessage
  session: RfqDraftSession
  /** Set on the final confirm step — hand this to the RFQ modal. */
  completed?: RfqContext
}

const CANCEL_WORDS = ["cancel", "stop", "never mind", "nevermind", "exit", "quit", "ተወው", "አቁም"]
const CONFIRM_WORDS = ["send", "yes", "confirm", "ok", "okay", "go", "ላክ", "አዎ", "እሺ"]
const SKIP_WORDS = ["skip", "no", "none", "don't know", "dont know", "unknown", "አላውቅም", "አይ", "የለም"]

const hits = (text: string, words: string[]) => {
  const t = text.toLowerCase()
  return words.some((w) => t.includes(w))
}

const DRAFT_TEXT = {
  material: {
    en: "Let's draft your RFQ — 3 quick questions. What material or work is this for? (e.g. cement, Grade 60 rebar, plumbing)",
    am: "የዋጋ ጥያቄዎን እናዘጋጅ — 3 ፈጣን ጥያቄዎች። ምን ቁሳቁስ ወይም ሥራ ነው? (ለምሳሌ፡ ሲሚንቶ፣ ባር፣ የቧንቧ ሥራ)",
  },
  city: {
    en: "Which city should suppliers quote for?",
    am: "አቅራቢዎች ለየትኛው ከተማ ዋጋ ይጠይቁ?",
  },
  budget: {
    en: "What's your target price in ETB? (type 'skip' if not sure)",
    am: "የሚፈልጉት ዋጋ በ ETB ስንት ነው? (ካላወቁ 'አላውቅም' ይብሉ)",
  },
  cancel: {
    en: "No problem — draft discarded. Ask me anything else anytime.",
    am: "መልካም — እርምጃው ተሰርዟል። በማንኛውም ጊዜ ጠይቁኝ።",
  },
} as const

function parseBudget(text: string): number | null {
  const digits = text.replace(/[^0-9]/g, "")
  if (!digits) return null
  const n = Number(digits)
  return Number.isFinite(n) && n > 0 ? n : null
}

function titleCase(s: string): string {
  return s
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ")
}

export function rfqDraftRespond(
  session: RfqDraftSession,
  input: string,
  language: Language = "en"
): RfqDraftResult {
  const text = (input || "").trim()

  if (hits(text, CANCEL_WORDS)) {
    return { message: { role: "assistant", key: "draft_cancel", content: DRAFT_TEXT.cancel[language] }, session: { active: false, step: "material" } }
  }

  if (session.step === "material") {
    const material = titleCase(text.slice(0, 80))
    if (!material) {
      return { message: { role: "assistant", key: "draft_material", content: DRAFT_TEXT.material[language] }, session }
    }
    return {
      session: { ...session, step: "city", material },
      message: { role: "assistant", key: "draft_city", content: DRAFT_TEXT.city[language] },
    }
  }

  if (session.step === "city") {
    const city = titleCase(text.slice(0, 60))
    if (!city) {
      return { message: { role: "assistant", key: "draft_city", content: DRAFT_TEXT.city[language] }, session }
    }
    return {
      session: { ...session, step: "budget", city },
      message: { role: "assistant", key: "draft_budget", content: DRAFT_TEXT.budget[language] },
    }
  }

  if (session.step === "budget") {
    const budget = hits(text, SKIP_WORDS) ? null : parseBudget(text)
    if (budget === null && !hits(text, SKIP_WORDS)) {
      return { message: { role: "assistant", key: "draft_budget", content: DRAFT_TEXT.budget[language] }, session }
    }
    const summary =
      language === "am"
        ? `ማጠቃለያ፡ ${session.material ?? ""} · ${session.city ?? ""} · ${budget ? `${budget.toLocaleString()} ETB` : "ዋጋ አልተጠቀሰም"}። ለመላክ 'ላክ' ይብሉ — ለመተው 'ተወው'።`
        : `Here's the summary: ${session.material ?? ""} · ${session.city ?? ""} · ${budget ? `${budget.toLocaleString()} ETB` : "no target price"}. Reply 'send' to open the RFQ form pre-filled — or 'cancel' to discard.`
    return {
      session: { ...session, step: "confirm", budget },
      message: { role: "assistant", key: "draft_confirm", content: summary },
    }
  }

  // step === "confirm"
  if (hits(text, CONFIRM_WORDS)) {
    const completed: RfqContext = {
      sourceType: "manual",
      itemName: session.material || "",
      specification: language === "en" ? "Drafted with YeBetWeg Assistant" : "ከYeBetWeg ረዳት ጋር ተዘጋጅቷል",
      targetPrice: session.budget ?? null,
      city: session.city || "Addis Ababa",
    }
    const msg: AssistantMessage = {
      role: "assistant",
      key: "draft_done",
      content:
        language === "am"
          ? "የዋጋ ጥያቄ ቅጹ ተከፍቷል — ዝርዝሮቹ ተሞልተዋል። ይመልከቱና ያስገቡ።"
          : "Opening the RFQ form with your details pre-filled — review and submit when ready.",
    }
    return { message: msg, session: { active: false, step: "material" }, completed }
  }

  // Anything else at confirm → re-show summary
  const again =
    language === "am"
      ? `ለመላክ 'ላክ' ወይም ለመተው 'ተወው' ይብሉ። ማጠቃለያ፡ ${session.material ?? ""} · ${session.city ?? ""}።`
      : `Reply 'send' to open the form or 'cancel' to discard. Summary: ${session.material ?? ""} · ${session.city ?? ""}.`
  return { message: { role: "assistant", key: "draft_confirm", content: again }, session }
}
