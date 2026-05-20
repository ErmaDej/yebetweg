import { useState, useCallback } from "react";
import { requestSmsOtp, verifySmsOtp } from "@/lib/api";

/**
 * Hook to manage SMS OTP verification flow.
 * Returns state and actions for UI components.
 */
export function useVerification(phone: string) {
  const [code, setCode] = useState("");
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  const startTimer = useCallback((seconds: number) => {
    setExpiresIn(seconds);
    const interval = setInterval(() => {
      setExpiresIn((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const requestOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      await requestSmsOtp(phone);
      // Twilio Verify default timeout is 5 minutes
      startTimer(300);
    } catch (e: any) {
      setError(e.message ?? "Failed to request OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!code) {
      setError("Enter the OTP code");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const ok = await verifySmsOtp(phone, code);
      if (ok) {
        setVerified(true);
        setExpiresIn(null);
      } else {
        setError("Invalid code");
      }
    } catch (e: any) {
      setError(e.message ?? "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return {
    code,
    setCode,
    expiresIn,
    loading,
    error,
    verified,
    requestOtp,
    verifyOtp,
  };
}
