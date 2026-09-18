import { describe, it, expect } from "vitest"
// Import the .tsx module directly: Vitest transforms JSX and the file only
// creates the React context (it does not consume it at module scope), so
// importing outside a component is safe.
import { translations } from "@/lib/i18n"

const LOCALES = ["en", "am"] as const

describe("i18n translation tables", () => {
  it("exposes both locales", () => {
    for (const l of LOCALES) {
      expect(translations[l]).toBeTruthy()
    }
  })

  it("has perfect EN/AM key parity (no missing or extra keys)", () => {
    const en = Object.keys(translations.en).sort()
    const am = Object.keys(translations.am).sort()
    expect(am).toEqual(en)
  })

  it("has no empty or whitespace-only strings in either locale", () => {
    for (const l of LOCALES) {
      for (const [key, value] of Object.entries(translations[l])) {
        expect(value, `${l}:${key} is empty`).toBeTruthy()
        expect(String(value).trim().length, `${l}:${key} is blank`).toBeGreaterThan(0)
      }
    }
  })

  it("key count is in the documented range (200+ keys)", () => {
    expect(Object.keys(translations.en).length).toBeGreaterThanOrEqual(200)
  })
})
