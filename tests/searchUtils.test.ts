import { describe, it, expect } from "vitest"
import { sanitizeSearchTerm, orIlike, truncateWords, PER_TABLE_SEARCH_LIMIT } from "@/lib/searchUtils"

describe("sanitizeSearchTerm", () => {
  it("strips PostgREST or-filter metacharacters (period is safe and kept)", () => {
    expect(sanitizeSearchTerm('cement) ,price."inj')).toBe("cement price. inj")
  })

  it("strips wildcards used by ilike", () => {
    expect(sanitizeSearchTerm("c%m*nt")).toBe("c m nt")
  })

  it("collapses whitespace and trims", () => {
    expect(sanitizeSearchTerm("  cement \t sand \n")).toBe("cement sand")
  })

  it("passes plain Amharic/ASCII terms through unchanged", () => {
    expect(sanitizeSearchTerm("ሲሜንቶ")).toBe("ሲሜንቶ")
    expect(sanitizeSearchTerm("cement")).toBe("cement")
  })

  it("cannot break out of the quoted ilike pattern (regression: filter injection)", () => {
    const safe = sanitizeSearchTerm('a") OR (true')
    const filter = orIlike(["title_en"], safe)
    // double quotes must be gone so the quoted pattern cannot be terminated
    expect(filter).not.toContain('" OR')
    expect(filter.startsWith("title_en.ilike.\"%")).toBe(true)
  })
})

describe("orIlike", () => {
  it("builds an OR filter across columns", () => {
    expect(orIlike(["title_en", "excerpt_en"], "cement")).toBe(
      'title_en.ilike."%cement%",excerpt_en.ilike."%cement%"'
    )
  })

  it("returns empty string for no columns", () => {
    expect(orIlike([], "cement")).toBe("")
  })
})

describe("truncateWords", () => {
  it("returns short text untouched", () => {
    expect(truncateWords("short", 10)).toBe("short")
  })

  it("cuts on a word boundary, not mid-word", () => {
    const out = truncateWords("cement price rises sharply", 16)
    expect(out.endsWith("…")).toBe(true)
    expect(out.startsWith("cement price")).toBe(true)
    expect(out).not.toContain("sharp")
  })

  it("never splits a surrogate pair (emoji/Amharic-safe)", () => {
    const out = truncateWords("🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠🏠", 5)
    // each remaining char must be a complete code point
    expect(Array.from(out.replace("…", "")).every((c) => c === "🏠")).toBe(true)
  })

  it("hard-cuts when there is no space in the window", () => {
    expect(truncateWords("abcdefghijklm", 5)).toBe("abcde…")
  })
})

describe("PER_TABLE_SEARCH_LIMIT", () => {
  it("is a sane positive cap", () => {
    expect(PER_TABLE_SEARCH_LIMIT).toBeGreaterThan(0)
    expect(PER_TABLE_SEARCH_LIMIT).toBeLessThanOrEqual(100)
  })
})
