import { describe, it, expect } from "vitest"
import {
  validateEmail,
  validatePhone,
  sanitizeText,
  validateName,
  validateLocation,
  validatePrice,
  validateTitle,
  validateDescription,
  validateSpecialty,
  validateMessage,
  validateContactForm,
  validateListingForm,
  validateProfessionalForm,
  validateEmailSubscription,
  ALLOWED_SPECIALTIES,
} from "@/lib/validation"

describe("validateEmail", () => {
  it("accepts normal emails", () => {
    expect(validateEmail("user@yebetweg.com")).toBe(true)
    expect(validateEmail("a.b+c@sub.domain.et")).toBe(true)
  })

  it("rejects malformed emails", () => {
    expect(validateEmail("no-at-sign")).toBe(false)
    expect(validateEmail("a@b")).toBe(false)
    expect(validateEmail("")).toBe(false)
    expect(validateEmail("spaces in@x.com")).toBe(false)
  })

  it("rejects over-length emails (254 max)", () => {
    expect(validateEmail("x".repeat(250) + "@x.com")).toBe(false)
  })
})

describe("validatePhone", () => {
  it("accepts Ethiopian and international formats", () => {
    expect(validatePhone("+251911234567")).toBe(true)
    expect(validatePhone("0911234567")).toBe(true)
    expect(validatePhone("(251) 911-234-567")).toBe(true)
  })

  it("rejects short, long, and non-numeric values", () => {
    expect(validatePhone("123")).toBe(false)
    expect(validatePhone("+25191123456712345678")).toBe(false)
    expect(validatePhone("abc")).toBe(false)
    expect(validatePhone("")).toBe(false)
  })
})

describe("sanitizeText", () => {
  it("trims and enforces max length", () => {
    expect(sanitizeText("  hello  ")).toBe("hello")
    expect(sanitizeText("a".repeat(6000))).toHaveLength(5000)
    expect(sanitizeText(null)).toBe("")
    expect(sanitizeText(undefined)).toBe("")
  })
})

describe("field validators", () => {
  it("name/location need 2-100 chars", () => {
    expect(validateName("Ab")).toBe(true)
    expect(validateName("A")).toBe(false)
    expect(validateLocation("Bole, Addis Ababa")).toBe(true)
  })

  it("title allows 1-200, description needs >=10", () => {
    expect(validateTitle("T")).toBe(true)
    expect(validateTitle(" ".repeat(201))).toBe(false)
    expect(validateDescription("short")).toBe(false)
    expect(validateDescription("this is long enough")).toBe(true)
  })

  it("message needs 10-5000 chars", () => {
    expect(validateMessage("hi")).toBe(false)
    expect(validateMessage("I need a quote for cement")).toBe(true)
  })

  it("price accepts numeric strings and rejects negatives/junk", () => {
    expect(validatePrice(1000)).toBe(true)
    expect(validatePrice("2500.50")).toBe(true)
    expect(validatePrice(-5)).toBe(false)
    expect(validatePrice("abc")).toBe(false)
    expect(validatePrice(NaN)).toBe(false)
  })

  it("specialty is restricted to the allowlist", () => {
    expect(ALLOWED_SPECIALTIES.length).toBeGreaterThan(0)
    expect(validateSpecialty("mason")).toBe(true)
    expect(validateSpecialty("MASON")).toBe(true)
    expect(validateSpecialty("wizard")).toBe(false)
  })
})

describe("form validators", () => {
  const goodContact = { name: "Abebe Kebede", email: "a@b.com", message: "I need cement pricing info" }

  it("contact form passes when valid", () => {
    expect(validateContactForm(goodContact)).toEqual([])
  })

  it("contact form reports every bad field", () => {
    const errors = validateContactForm({ name: "A", email: "bad", message: "hi" })
    expect(errors.map((e) => e.field)).toEqual(["name", "email", "message"])
  })

  it("listing form validates optional price/phone/email only when present", () => {
    expect(validateListingForm({ title: "Villa", description: "A nice villa", location: "Bole" })).toEqual([])
    expect(validateListingForm({ title: "Villa", description: "A nice villa", location: "Bole", price: -1 }).map((e) => e.field)).toEqual(["price"])
  })

  it("professional form enforces the specialty allowlist", () => {
    const errors = validateProfessionalForm({ name: "Abe Kebe", specialty: "wizard", location: "Bole" })
    expect(errors.map((e) => e.field)).toEqual(["specialty"])
  })

  it("email subscription returns error only on bad email", () => {
    expect(validateEmailSubscription("a@b.com")).toEqual([])
    expect(validateEmailSubscription("bad").map((e) => e.field)).toEqual(["email"])
  })
})
