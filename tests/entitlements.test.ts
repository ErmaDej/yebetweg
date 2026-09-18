import { describe, it, expect } from "vitest"
import {
  planFromRole,
  isPaidRole,
  getActivePlan,
  profileStrength,
  roleKeyFor,
  planBenefits,
  PLAN_BENEFITS,
} from "@/lib/entitlements"
import type { Subscription } from "@/types/payment"

const activeSub = (tier: Subscription["tier"]): Subscription =>
  ({ tier, status: "active", isActive: true }) as unknown as Subscription

describe("planFromRole", () => {
  it("maps admin and pro roles to pro plan", () => {
    expect(planFromRole("admin")).toBe("pro")
    expect(planFromRole("pro")).toBe("pro")
  })

  it("maps premium role to premium plan", () => {
    expect(planFromRole("premium")).toBe("premium")
  })

  it("maps user/null/unknown roles to free", () => {
    expect(planFromRole("user")).toBe("free")
    expect(planFromRole(null)).toBe("free")
    expect(planFromRole(undefined)).toBe("free")
    expect(planFromRole("hacker")).toBe("free")
  })
})

describe("isPaidRole", () => {
  it("accepts premium, pro, admin", () => {
    expect(isPaidRole("premium")).toBe(true)
    expect(isPaidRole("pro")).toBe(true)
    expect(isPaidRole("admin")).toBe(true)
  })

  it("rejects free roles and garbage", () => {
    expect(isPaidRole("user")).toBe(false)
    expect(isPaidRole("")).toBe(false)
    expect(isPaidRole(null)).toBe(false)
  })
})

describe("getActivePlan", () => {
  it("role wins over subscription", () => {
    expect(getActivePlan({ role: "pro" }, activeSub("premium"))).toBe("pro")
  })

  it("falls back to an active subscription when role is free", () => {
    expect(getActivePlan({ role: "user" }, activeSub("premium"))).toBe("premium")
  })

  it("ignores inactive or non-active subscriptions (regression: lapsed sub keeps perks)", () => {
    expect(getActivePlan({ role: "user" }, { tier: "premium", status: "expired", isActive: false } as unknown as Subscription)).toBe("free")
    expect(getActivePlan({ role: "user" }, { tier: "pro", status: "active", isActive: false } as unknown as Subscription)).toBe("free")
  })

  it("is free with neither role nor subscription", () => {
    expect(getActivePlan({}, null)).toBe("free")
  })
})

describe("profileStrength", () => {
  it("scores 0 with all fields missing", () => {
    const s = profileStrength(null)
    expect(s.score).toBe(0)
    expect(s.complete).toBe(false)
    expect(s.missing).toHaveLength(5)
  })

  it("sums weights of present fields", () => {
    const s = profileStrength({ username: "abebe", phone: "+251911000001", full_name: "Abebe Kebede" })
    expect(s.score).toBe(15 + 30 + 25)
    expect(s.missing).toEqual(["profile_image", "language_preference"])
  })

  it("ignores whitespace-only values", () => {
    expect(profileStrength({ full_name: "   " } as never).score).toBe(0)
  })

  it("is complete at full profile", () => {
    const s = profileStrength({
      username: "u", full_name: "f", phone: "p", profile_image: "i", language_preference: "en",
    })
    expect(s.complete).toBe(true)
    expect(s.score).toBe(100)
  })
})

describe("roleKeyFor", () => {
  it("admin is always admin", () => {
    expect(roleKeyFor({ role: "admin" }, activeSub("premium"))).toBe("admin")
  })

  it("uses subscription tier, then profile role, then user", () => {
    expect(roleKeyFor({ role: "user" }, activeSub("pro"))).toBe("pro")
    expect(roleKeyFor({ role: "premium" }, null)).toBe("premium")
    expect(roleKeyFor({}, null)).toBe("user")
  })
})

describe("planBenefits", () => {
  it("returns a non-empty benefit list per role key", () => {
    for (const key of ["user", "premium", "pro", "admin"] as const) {
      expect(planBenefits(key).length).toBeGreaterThan(0)
    }
  })

  it("falls back to user benefits for unknown keys", () => {
    expect(planBenefits("nope" as never)).toEqual(PLAN_BENEFITS.user)
  })
})
