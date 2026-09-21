import { describe, it, expect } from "vitest"
import { buildContext, assistantGreeting, answerQuestion } from "@/lib/assistant"

const ctx = (over: Partial<Parameters<typeof buildContext>[0]> = {}) =>
  buildContext({ openRfqs: 2, unreadInquiries: 1, profile: null, plan: "free", ...over })

describe("buildContext", () => {
  it("applies defaults for missing fields", () => {
    const c = buildContext({})
    expect(c).toEqual({
      openRfqs: 0,
      unreadInquiries: 0,
      profile: null,
      plan: "free",
      savedEstimates: 0,
      actualsLogged: 0,
      unreadNotifications: 0,
    })
  })
})

describe("assistantGreeting", () => {
  it("greets in English with counts and profile strength", () => {
    const msg = assistantGreeting(ctx(), "en")
    expect(msg.role).toBe("assistant")
    expect(msg.content).toContain("2 open RFQs")
    expect(msg.content).toContain("1 unread inquiry")
    expect(msg.content).toContain("profile strength is 0%")
  })

  it("greets in Amharic", () => {
    const msg = assistantGreeting(ctx(), "am")
    expect(msg.content).toContain("ሰላም")
  })

  it("handles singular correctly", () => {
    const msg = assistantGreeting(ctx({ openRfqs: 1, unreadInquiries: 0 }), "en")
    expect(msg.content).toContain("1 open RFQ ")
    expect(msg.content).not.toContain("1 open RFQs")
  })
})

describe("answerQuestion", () => {
  it("answers RFQ intent in English and Amharic", () => {
    expect(answerQuestion("How are my RFQs?", ctx(), "en").key).toBe("rfqs")
    expect(answerQuestion("የዋጋ ጥያቄ", ctx(), "am").key).toBe("rfqs")
  })

  it("answers profile-strength intent", () => {
    const msg = answerQuestion("complete my profile", ctx(), "en")
    expect(msg.key).toBe("profile")
    expect(msg.content).toContain("profile is 0% complete")
  })

  it("returns fallback for unknown questions", () => {
    expect(answerQuestion("who won the world cup", ctx(), "en").key).toBe("fallback")
  })

  it("handles empty input", () => {
    expect(answerQuestion("", ctx(), "en").key).toBe("empty")
  })

  it("mentions the plan label in subscription answers", () => {
    const msg = answerQuestion("cancel my subscription", ctx({ plan: "pro" }), "en")
    expect(msg.key).toBe("subscription")
    expect(msg.content).toContain("Pro")
  })

  it("scores multi-intent questions instead of first-match-wins", () => {
    // "prices" appears as exact token AND in the "market prices" phrase → prices (4) beats rfqs (2)
    expect(answerQuestion("how are my rfqs and market prices", ctx(), "en").key).toBe("prices")
  })

  it("tolerates single-key typos", () => {
    expect(answerQuestion("current market prcies", ctx(), "en").key).toBe("prices")
  })

  it("answers new actuals/export/notifications/telegram/freshness/help intents", () => {
    expect(answerQuestion("how do I track my spending", ctx(), "en").key).toBe("actuals")
    expect(answerQuestion("can I get a pdf", ctx(), "en").key).toBe("export")
    expect(answerQuestion("where are my notifications", ctx(), "en").key).toBe("notifications")
    expect(answerQuestion("submitprice telegram bot", ctx(), "en").key).toBe("telegram")
    expect(answerQuestion("why does it say expired", ctx(), "en").key).toBe("freshness")
    expect(answerQuestion("help", ctx(), "en").key).toBe("help")
  })

  it("attaches follow-up suggestions to answers and greeting", () => {
    const msg = answerQuestion("boq", ctx({ plan: "pro" }), "en")
    expect(msg.suggestions?.length).toBeGreaterThan(0)
    const greeting = assistantGreeting(ctx(), "en")
    expect(greeting.suggestions?.length).toBeGreaterThan(0)
  })

  it("uses saved-estimate context in the boq answer", () => {
    const c = buildContext({ openRfqs: 0, savedEstimates: 3 })
    const msg = answerQuestion("boq", c, "en")
    expect(msg.content).toContain("3 saved estimates")
  })

  it("answers in Amharic for new intents", () => {
    expect(answerQuestion("እውነተኛ ወጪ", ctx(), "am").key).toBe("actuals")
    expect(answerQuestion("ቴሌግራም", ctx(), "am").key).toBe("telegram")
  })
})
