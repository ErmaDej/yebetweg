import type { PremiumTier, Subscription } from "@/types/payment"

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

