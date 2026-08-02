import type { PremiumTier, Subscription } from "@/types/payment"

export type RoleKey = "user" | "premium" | "pro" | "admin"

export const PLAN_BENEFITS: Record<RoleKey, string[]> = {
  user: [
    "dashboard.benefit.free.estimate",
    "dashboard.benefit.free.prices",
    "dashboard.benefit.free.professionals",
    "dashboard.benefit.free.rfq",
  ],
  premium: [
    "dashboard.benefit.premium.insights",
    "dashboard.benefit.premium.priorityRfq",
    "dashboard.benefit.premium.badge",
    "dashboard.benefit.premium.exportPdf",
  ],
  pro: [
    "dashboard.benefit.pro.boqExport",
    "dashboard.benefit.pro.analytics",
    "dashboard.benefit.pro.unlimitedRfq",
    "dashboard.benefit.pro.support",
  ],
  admin: [
    "dashboard.benefit.admin.moderation",
    "dashboard.benefit.admin.users",
    "dashboard.benefit.admin.analytics",
    "dashboard.benefit.admin.pricing",
  ],
}

type RoleBackedProfile = {
  role?: string | null
} | null

const paidRoles = new Set(["premium", "pro", "admin"])

export function planFromRole(role?: string | null): PremiumTier {
  if (role === "admin" || role === "pro") return "pro"
  if (role === "premium") return "premium"
  return "free"
}

export function isPaidRole(role?: string | null) {
  return paidRoles.has(role ?? "")
}

export function getActivePlan(profile: RoleBackedProfile, subscription?: Subscription | null): PremiumTier {
  const rolePlan = planFromRole(profile?.role)

  if (rolePlan !== "free") {
    return rolePlan
  }

  if (subscription?.status === "active" && subscription.isActive) {
    return subscription.tier
  }

  return "free"
}

type ProfileShape = {
  username?: string | null
  full_name?: string | null
  phone?: string | null
  profile_image?: string | null
  language_preference?: string | null
}

type ProfileLike = ProfileShape | null | undefined

export interface ProfileStrength {
  score: number
  missing: string[]
  complete: boolean
}

const PROFILE_FIELDS: { key: keyof ProfileShape; weight: number }[] = [
  { key: "username", weight: 15 },
  { key: "full_name", weight: 25 },
  { key: "phone", weight: 30 },
  { key: "profile_image", weight: 20 },
  { key: "language_preference", weight: 10 },
]

export function profileStrength(profile: ProfileLike): ProfileStrength {
  let score = 0
  const missing: string[] = []

  for (const { key, weight } of PROFILE_FIELDS) {
    const value = profile?.[key]
    if (typeof value === "string" && value.trim().length > 0) {
      score += weight
    } else {
      missing.push(key)
    }
  }

  return { score, missing, complete: missing.length === 0 }
}

export function roleKeyFor(profile: RoleBackedProfile | null, subscription?: Subscription | null): RoleKey {
  if (profile?.role === "admin") return "admin"
  const tier = subscription?.tier || profile?.role || "free"
  return tier === "free" ? "user" : (tier as RoleKey)
}

export function planBenefits(roleKey: RoleKey): string[] {
  return PLAN_BENEFITS[roleKey] ?? PLAN_BENEFITS.user
}

