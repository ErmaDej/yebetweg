import { useEffect } from "react"
import { useLanguage } from "@/lib/i18n"

interface ErrorReport {
  message: string
  stack?: string
  componentStack?: string
  url: string
  userAgent: string
  timestamp: string
  userId?: string
  metadata?: Record<string, unknown>
}

const errorQueue: ErrorReport[] = []
let isOnline = navigator.onLine

window.addEventListener("online", () => {
  isOnline = true
  flushErrorQueue()
})
window.addEventListener("offline", () => {
  isOnline = false
})

async function flushErrorQueue() {
  if (!isOnline) return

  while (errorQueue.length > 0) {
    const error = errorQueue.shift()
    if (error) {
      try {
        await sendErrorReport(error)
      } catch {
        errorQueue.unshift(error)
        break
      }
    }
  }
}

async function sendErrorReport(error: ErrorReport): Promise<void> {
  const response = await fetch("/api/errors/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(error),
  })
  if (!response.ok) throw new Error("Failed to send error report")
}

export function useErrorReporting() {
  const { language } = useLanguage()

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const error: ErrorReport = {
        message: event.message,
        stack: event.error?.stack,
        componentStack: undefined,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        metadata: {
          language,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      }

      if (navigator.onLine) {
        sendErrorReport(error).catch(() => {
          // Queue for later
        })
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error: ErrorReport = {
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        componentStack: undefined,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        metadata: { language, type: "unhandled_rejection" },
      }

      if (navigator.onLine) {
        sendErrorReport(error).catch(() => {})
      }
    }

    window.addEventListener("error", handleError)
    window.addEventListener("unhandledrejection", handleUnhandledRejection)

    return () => {
      window.removeEventListener("error", handleError)
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
    }
  }, [language])

  const captureError = (error: Error, metadata?: Record<string, unknown>) => {
    const errorReport: ErrorReport = {
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      metadata: { language, ...metadata },
    }

    if (navigator.onLine) {
      sendErrorReport(errorReport).catch(() => {})
    }
  }

  return { captureError }
}

export function useErrorBoundary() {
  const captureError = useErrorReporting().captureError

  return { captureError }
}