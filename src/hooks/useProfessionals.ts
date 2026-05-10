import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export type Professional = {
  id: string
  name: string
  specialty: string
  rating: number
  experience_years: number
  location: string
  phone: string
  email: string
  is_verified: boolean
  portfolio_images: string[]
  created_at: string
}

export function useProfessionals(specialty?: string) {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProfessionals() {
      setLoading(true)
      let query = supabase.from("professionals").select("*").order("rating", { ascending: false })
      if (specialty && specialty !== "all") {
        query = query.eq("specialty", specialty)
      }
      const { data, error } = await query
      if (!error && data) {
        setProfessionals(data as Professional[])
      }
      setLoading(false)
    }
    fetchProfessionals()
  }, [specialty])

  return { professionals, loading }
}
