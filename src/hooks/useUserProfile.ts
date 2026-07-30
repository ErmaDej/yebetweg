import { useState, useEffect } from "react"
import { useAuthContext } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import { planFromRole } from "@/lib/entitlements"
import type { Subscription } from "@/types/payment"

export interface UserProfile {
  id: string
  auth_uid: string | null
  username: string
  email: string
  full_name: string | null
  phone: string
  role: string
  provider: string
  language_preference: string
  status: string
  profile_image: string
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export function useUserProfile() {
  const { user, session } = useAuthContext()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    const fetchProfile = async () => {
      try {
        setLoading(true)
        setError(null)

        const {
          data: { session: activeSession },
        } = await supabase.auth.getSession()

        const currentSession = activeSession ?? session

        if (!currentSession) {
          setProfile({
            id: user.id,
            auth_uid: null,
            username: user.user_metadata?.username || user.email?.split("@")[0] || "user",
            email: user.email || "",
            full_name: user.user_metadata?.full_name || user.user_metadata?.username || null,
            phone: "",
            role: user.user_metadata?.role || "user",
            provider: "local",
            language_preference: "en",
            status: "active",
            profile_image: "",
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          return
        }

        const normalizedProfile = async (): Promise<UserProfile | null> => {
          const { data: linkedProfile, error: linkedProfileError } = await supabase
            .from("users")
            .select("*")
            .eq("auth_uid", user.id)
            .maybeSingle()

          if (!linkedProfileError && linkedProfile) {
            return linkedProfile as UserProfile
          }

          try {
            const { data, error: fetchError } = await supabase.rpc("ensure_auth_user_profile")
            if (fetchError) {
              throw fetchError
            }

            const profileRow = Array.isArray(data) ? data[0] : data
            return profileRow ?? null
          } catch (rpcError) {
            console.warn("[useUserProfile] RPC fallback triggered:", rpcError)

            const { data: manualProfile, error: selectError } = await supabase
              .from("users")
              .select("*")
              .eq("email", user.email || "")
              .maybeSingle()

            if (!selectError && manualProfile) {
              return manualProfile as UserProfile
            }

            return null
          }
        }

        const profileData = await normalizedProfile()

        if (profileData) {
          setProfile(profileData)
          return
        }

        const username = user.email?.split("@")[0] || `user_${user.id.slice(0, 8)}`
        const newProfile: Partial<UserProfile> = {
          auth_uid: user.id,
          username,
          email: user.email || "",
          full_name: user.user_metadata?.full_name || null,
          phone: "",
          role: "user",
          provider: "supabase",
          language_preference: "en",
          status: "active",
          profile_image: user.user_metadata?.avatar_url || "",
          metadata: {},
        }

        const { data: insertedData, error: insertError } = await supabase
          .from("users")
          .insert([newProfile])
          .select()
          .single()

        if (insertError) throw insertError
        setProfile(insertedData)
      } catch (err: unknown) {
        setProfile(null)
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [session, user])

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!profile) return { error: "No profile loaded" }

    try {
      setLoading(true)
      setError(null)

      const { data, error: updateError } = await supabase
        .from("users")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id)
        .select()
        .single()

      if (updateError) throw updateError
      setProfile(data)
      return { data }
    } catch (err: unknown) {
      const message = getErrorMessage(err)
      setError(message)
      return { error: message }
    } finally {
      setLoading(false)
    }
  }

  return { profile, loading, error, updateProfile }
}

function getErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message
  }
  return "Unknown error"
}

type SubscriptionRow = {
  id: string
  user_id: string
  tier: Subscription["tier"]
  payment_method: Subscription["paymentMethod"]
  chapa_reference?: string | null
  telebirr_reference?: string | null
  starts_at: string
  expires_at: string
  is_active: boolean
  status: Subscription["status"]
  created_at: string
  updated_at: string
}

function mapSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    userId: row.user_id,
    tier: row.tier,
    paymentMethod: row.payment_method,
    chapaReference: row.chapa_reference ?? undefined,
    telebirrReference: row.telebirr_reference ?? undefined,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    isActive: row.is_active,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function subscriptionFromRole(profile: UserProfile): Subscription | null {
  const tier = planFromRole(profile.role)

  if (tier === "free") {
    return null
  }

  const timestamp = new Date().toISOString()
  const expiresAt = new Date()
  expiresAt.setFullYear(expiresAt.getFullYear() + 1)

  return {
    id: `role-entitlement-${profile.id}`,
    userId: profile.id,
    tier,
    paymentMethod: "chapa",
    startsAt: timestamp,
    expiresAt: expiresAt.toISOString(),
    isActive: true,
    status: "active",
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  }
}

export function useSubscription(profile: UserProfile | null) {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) {
      setSubscription(null)
      setLoading(false)
      return
    }

    const fetchSubscription = async () => {
      try {
        setLoading(true)
        setError(null)

        let data: any = null
        let fetchError: any = null

        const result = await supabase
          .from("premium_subscriptions")
          .select("*")
          .eq("user_id", profile.id)
          .eq("is_active", true)
          .gte("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        data = result.data
        fetchError = result.error

        if (fetchError || !data) {
          const rpcResult = await supabase.rpc("get_active_subscription", {
            p_user_id: profile.id,
          })
          if (rpcResult.error) throw rpcResult.error
          data = rpcResult.data
        }

        if (data) {
          const row = Array.isArray(data) ? data[0] : data
          if (row?.id) {
            setSubscription(mapSubscription(row as SubscriptionRow))
          } else {
            setSubscription(subscriptionFromRole(profile))
          }
        } else {
          setSubscription(subscriptionFromRole(profile))
        }
      } catch (err: unknown) {
        setError(getErrorMessage(err))
        setSubscription(subscriptionFromRole(profile))
      } finally {
        setLoading(false)
      }
    }

    fetchSubscription()
  }, [profile])

  return { subscription, loading, error }
}
