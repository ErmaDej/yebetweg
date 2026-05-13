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
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  clearError: () => void
}

export const AuthContext = createContext<AuthContextProps>({
  user: null,
  session: null,
  loading: true,
  error: null,
  signInWithPassword: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => {},
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
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession()
        if (!isMounted) return
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
      } catch (e: any) {
        if (isMounted) setError(e.message)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!isMounted) return
      setSession(currentSession)
      setUser(currentSession?.user ?? null)
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function signInWithPassword(email: string, password: string) {
    setLoading(true)
    setError(null)
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
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

  async function signUp(email: string, password: string, fullName?: string) {
    setLoading(true)
    setError(null)
    try {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
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
      setSession(null)
      setUser(null)
    } catch (e: any) {
      setError(e.message)
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
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}