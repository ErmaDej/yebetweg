import { useState, useEffect } from "react"
import { useAuthContext } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"

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
  metadata: Record<string, any> | null
  created_at: string
  updated_at: string
}

export function useUserProfile() {
  const { user } = useAuthContext()
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

        // Fetch user profile by auth_uid
        const { data, error: fetchError } = await supabase
          .from("users")
          .select("*")
          .eq("auth_uid", user.id)
          .single()

        if (fetchError && fetchError.code !== "PGRST116") {
          throw fetchError
        }

        if (!data) {
          // Create profile if it doesn't exist
          const username = user.email?.split("@")[0] || `user_${user.id.slice(0, 8)}`
          const newProfile: Partial<UserProfile> = {
            auth_uid: user.id,
            username: username,
            email: user.email || "",
            full_name: user.user_metadata?.full_name || null,
            phone: "",
            role: "user",
            provider: "supabase_auth",
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
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [user])

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
    } catch (err: any) {
      setError(err.message)
      return { error: err.message }
    } finally {
      setLoading(false)
    }
  }

  return { profile, loading, error, updateProfile }
}
