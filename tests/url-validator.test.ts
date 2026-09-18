import { describe, it, expect } from "vitest"
import {
  sanitizeUrl,
  isExternalUrlAllowed,
  isImageUrlValid,
  getFallbackUrl,
  getFallbackImageUrl,
  safeImageUrl,
} from "@/lib/url-validator"

describe("sanitizeUrl", () => {
  it("keeps http(s) URLs", () => {
    expect(sanitizeUrl("https://yebetweg.com")).toBe("https://yebetweg.com")
    expect(sanitizeUrl("http://example.com")).toBe("http://example.com")
  })

  it("rejects javascript:, data:, and junk (XSS guard)", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBeNull()
    expect(sanitizeUrl("data:text/html;base64,AAAA")).toBeNull()
    expect(sanitizeUrl("not a url")).toBeNull()
    expect(sanitizeUrl("")).toBeNull()
    expect(sanitizeUrl(null)).toBeNull()
  })
})

describe("isExternalUrlAllowed", () => {
  it("allows https links to allowlisted domains incl. subdomains", () => {
    expect(isExternalUrlAllowed("https://yebetweg.com/x")).toBe(true)
    expect(isExternalUrlAllowed("https://t.me/yebetweg")).toBe(true)
    expect(isExternalUrlAllowed("https://images.unsplash.com/photo-1")).toBe(true)
    expect(isExternalUrlAllowed("https://www.youtube.com/watch?v=1")).toBe(true)
  })

  it("rejects non-allowlisted and http links", () => {
    expect(isExternalUrlAllowed("https://evil.example.com")).toBe(false)
    expect(isExternalUrlAllowed("http://yebetweg.com")).toBe(false)
    expect(isExternalUrlAllowed("javascript:alert(1)")).toBe(false)
  })

  it("is suffix-exact: evil-yebetweg.com is not yebetweg.com", () => {
    expect(isExternalUrlAllowed("https://evil-yebetweg.com")).toBe(false)
  })
})

describe("image URL guards", () => {
  it("isImageUrlValid requires https and rejects script/data payloads", () => {
    expect(isImageUrlValid("https://images.unsplash.com/a.jpg")).toBe(true)
    expect(isImageUrlValid("http://images.unsplash.com/a.jpg")).toBe(false)
    expect(isImageUrlValid("https://host/javascript:alert(1)")).toBe(false)
    expect(isImageUrlValid("https://host/data:text/html")).toBe(false)
  })

  it("safeImageUrl returns trimmed url or null", () => {
    expect(safeImageUrl("  https://images.unsplash.com/a.jpg  ")).toBe("https://images.unsplash.com/a.jpg")
    expect(safeImageUrl("javascript:alert(1)")).toBeNull()
    expect(safeImageUrl(undefined)).toBeNull()
  })

  it("fallback helpers substitute the fallback", () => {
    expect(getFallbackUrl("https://t.me/yebetweg", "/x")).toBe("https://t.me/yebetweg")
    expect(getFallbackUrl("https://evil.com", "/x")).toBe("/x")
    expect(getFallbackImageUrl("javascript:alert(1)", "/images/placeholder.svg")).toBe("/images/placeholder.svg")
    expect(getFallbackImageUrl("https://images.unsplash.com/a.jpg")).toBe("https://images.unsplash.com/a.jpg")
  })
})
