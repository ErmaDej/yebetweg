import { useState, useCallback, useEffect, useRef } from "react"
import { requestSmsOtp, verifySmsOtp } from "@/lib/api"

/**
 * Hook to manage SMS OTP verification flow.
 */
export function useVerification(phone: string) {
  const [code, setCode] = useState("")
  const [expiresIn, setExpiresIn] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verified, setVerified] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const phoneRef = useRef(phone)
  phoneRef.current = phone

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startTimer = useCallback(
    (seconds: number) => {
      clearTimer()
      setExpiresIn(seconds)
      intervalRef.current = setInterval(() => {
        setExpiresIn((prev) => {
          if (prev === null) return null
          if (prev <= 1) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }
            return null
          }
          return prev - 1
        })
      }, 1000)
    },
    [clearTimer]
  )

  useEffect(() => {
    return () => clearTimer()
  }, [clearTimer])

  const requestOtp = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await requestSmsOtp(phoneRef.current)
      startTimer(300)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to request OTP")
    } finally {
      setLoading(false)
    }
  }, [startTimer])

  const verifyOtp = useCallback(async () => {
    if (!code) {
      setError("Enter the OTP code")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const ok = await verifySmsOtp(phoneRef.current, code)
      if (ok) {
        setVerified(true)
        clearTimer()
        setExpiresIn(null)
      } else {
        setError("Invalid code")
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Verification failed")
    } finally {
      setLoading(false)
    }
  }, [code, clearTimer])

  return {
    code,
    setCode,
    expiresIn,
    loading,
    error,
    verified,
    requestOtp,
    verifyOtp,
  }
}