import { useState, useEffect } from "react"
import { useAuthContext } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
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

        if (!session) {
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

        const { data, error: fetchError } = await supabase.rpc("ensure_auth_user_profile")

        if (fetchError) {
          throw fetchError
        }

        if (!data) {
          if (!session) {
            throw new Error("Custom authenticated user profile was not found.")
          }

          const username = user.email?.split("@")[0] || `user_${user.id.slice(0, 8)}`
          const newProfile: Partial<UserProfile> = {
            auth_uid: user.id,
            username: username,
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
        } else {
          setProfile(data)
        }
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

        const { data, error: fetchError } = await supabase
          .from("premium_subscriptions")
          .select("*")
          .eq("user_id", profile.id)
          .eq("is_active", true)
          .gte("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (fetchError) {
          throw fetchError
        }

        setSubscription(data ? mapSubscription(data as SubscriptionRow) : null)
      } catch (err: unknown) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }

    fetchSubscription()
  }, [profile])

  return { subscription, loading, error }
}
