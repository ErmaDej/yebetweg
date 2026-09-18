import { describe, it, expect } from "vitest"
import { buildContext, assistantGreeting, answerQuestion } from "@/lib/assistant"

const ctx = (over: Partial<Parameters<typeof buildContext>[0]> = {}) =>
  buildContext({ openRfqs: 2, unreadInquiries: 1, profile: null, plan: "free", ...over })

describe("buildContext", () => {
  it("applies defaults for missing fields", () => {
    const c = buildContext({})
    expect(c).toEqual({ openRfqs: 0, unreadInquiries: 0, profile: null, plan: "free" })
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
})
