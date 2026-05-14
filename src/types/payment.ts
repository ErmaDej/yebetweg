export type PremiumTier = "free" | "premium" | "pro"

export type PaymentMethod = "chapa" | "telebirr"

export type SubscriptionStatus = "active" | "pending" | "canceled" | "expired"

export interface Subscription {
  id: string
  userId: string
  tier: PremiumTier
  paymentMethod: PaymentMethod
  chapaReference?: string
  telebirrReference?: string
  startsAt: string
  expiresAt: string
  isActive: boolean
  status: SubscriptionStatus
  createdAt: string
  updatedAt: string
}

export interface Payment {
  id: string
  userId: string
  subscriptionId: string
  amount: number
  currency: string
  method: PaymentMethod
  reference: string
  status: "pending" | "completed" | "failed"
  metadata: Record<string, unknown>
  createdAt: string
}

export interface CreateSubscriptionParams {
  userId: string
  tier: PremiumTier
  paymentMethod: PaymentMethod
  reference: string
  amount: number
}

export interface PaymentHookResult {
  loading: boolean
  error: string | null
  initiatePayment: (
    tier: PremiumTier,
    method: PaymentMethod,
    phoneNumber?: string,
  ) => Promise<void>
}