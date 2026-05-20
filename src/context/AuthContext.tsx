import { createContext, useContext, useState, useEffect } from "react"
import type { User, Session } from "@supabase/supabase-js"
import type { ReactNode } from "react"
import { supabase } from "@/lib/supabase"

interface AuthContextProps {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
  signInWithPassword: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, fullName?: string, role?: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error?: string }>
  updatePassword: (newPassword: string) => Promise<{ error?: string }>
  clearError: () => void
}

const CUSTOM_AUTH_USER_KEY = "yebetweg-custom-auth-user"

function loadCustomAuthUser(): User | null {
  if (typeof window === "undefined") return null

  try {
    const stored = window.localStorage.getItem(CUSTOM_AUTH_USER_KEY)
    if (!stored) return null
    return JSON.parse(stored) as User
  } catch {
    return null
  }
}

function saveCustomAuthUser(user: User) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(CUSTOM_AUTH_USER_KEY, JSON.stringify(user))
  } catch {
    // Ignore storage failures
  }
}

function clearCustomAuthUser() {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(CUSTOM_AUTH_USER_KEY)
  } catch {
    // Ignore storage failures
  }
}

export const AuthContext = createContext<AuthContextProps>({
  user: null,
  session: null,
  loading: true,
  error: null,
  signInWithPassword: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => {},
  resetPassword: async () => ({}),
  updatePassword: async () => ({}),
  clearError: () => {},
})

export function useAuthContext() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function initAuth() {
      try {
        // First check for custom auth (seeded users)
        const storedCustomUser = loadCustomAuthUser()
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession()
        if (!isMounted) return

        if (currentSession) {
          setSession(currentSession)
          setUser(currentSession.user)
          clearCustomAuthUser()
        } else if (storedCustomUser) {
          setSession(null)
          setUser(storedCustomUser)
        } else {
          setSession(null)
          setUser(null)
        }

        // No return here, allow the onAuthStateChange listener to handle subsequent state updates.
        // If there\"s an active session, the listener will be triggered right after this.
        // If there\"s no session, user and session will be null, and loading will be false.
      } catch (e: any) {
        if (isMounted) setError(e.message)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initAuth()

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!isMounted) return
      setSession(currentSession)
      setUser(currentSession?.user ?? null)
      setLoading(false)
    })

    return () => {
      isMounted = false
      authSubscription.unsubscribe()
    }
  }, [])


  async function signInWithPassword(email: string, password: string) {
    setLoading(true)
    setError(null)
    try {
      // Try Supabase auth first
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (!error) {
        setSession(data.session)
        setUser(data.session?.user ?? null)
        return {}
      }

      // If Supabase auth fails, try custom user authentication via RPC
      const { data: authResult, error: rpcError } = await supabase.rpc("login", {
        p_email: email,
        p_password: password,
      })

      if (rpcError || !authResult?.success) {
        setError(error.message || rpcError?.message || "Invalid email or password")
        return { error: error.message || rpcError?.message || "Invalid email or password" }
      }

      // Create a mock session/user object from RPC result for custom auth
      const customUser = {
        id: authResult.user_id,
        email: email,
        user_metadata: {
          username: authResult.username,
          role: authResult.role,
          full_name: authResult.username,
        },
        aud: "authenticated",
        role: "authenticated",
      }
      setUser(customUser as any)
      setSession(null)
      saveCustomAuthUser(customUser as any)
      return {}
    } catch (e: any) {
      setError(e.message)
      return { error: e.message }
    } finally {
      setLoading(false)
    }
  }

  async function signUp(email: string, password: string, fullName?: string, role: string = "user") {
    setLoading(true)
    setError(null)
    try {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role, // Assign role during signup
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) {
        setError(error.message)
        return { error: error.message }
      }
      setSession(data.session)
      setUser(data.session?.user ?? null)
      return {}
    } catch (e: any) {
      setError(e.message)
      return { error: e.message }
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      clearCustomAuthUser()
      setSession(null)
      setUser(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function resetPassword(email: string) {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      })
      if (error) {
        setError(error.message)
        return { error: error.message }
      }
      return {}
    } catch (e: any) {
      setError(e.message)
      return { error: e.message }
    } finally {
      setLoading(false)
    }
  }

  async function updatePassword(newPassword: string) {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })
      if (error) {
        setError(error.message)
        return { error: error.message }
      }
      return {}
    } catch (e: any) {
      setError(e.message)
      return { error: e.message }
    } finally {
      setLoading(false)
    }
  }

  function clearError() {
    setError(null)
  }

  const value = {
    user,
    session,
    loading,
    error,
    signInWithPassword,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

