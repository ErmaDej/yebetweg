import { useCallback } from "react"
import { useLanguage } from "@/lib/i18n"

interface AnalyticsEvent {
  name: string
  properties?: Record<string, string | number | boolean>
}

interface FunnelEvent {
  step: string
  properties?: Record<string, string | number | boolean>
}

// Simple in-memory queue for offline support
const eventQueue: AnalyticsEvent[] = []
const funnelQueue: FunnelEvent[] = []
let isOnline = navigator.onLine

window.addEventListener("online", () => {
  isOnline = true
  flushQueues()
})
window.addEventListener("offline", () => {
  isOnline = false
})

async function flushQueues() {
  if (!isOnline) return

  // Flush analytics events
  while (eventQueue.length > 0) {
    const event = eventQueue.shift()
    if (event) {
      try {
        await sendEvent(event)
      } catch {
        eventQueue.unshift(event)
        break
      }
    }
  }

  // Flush funnel events
  while (funnelQueue.length > 0) {
    const event = funnelQueue.shift()
    if (event) {
      try {
        await sendFunnelEvent(event)
      } catch {
        funnelQueue.unshift(event)
        break
      }
    }
  }
}

async function sendEvent(event: AnalyticsEvent): Promise<void> {
  const response = await fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...event,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      language: document.documentElement.lang,
    }),
  })
  if (!response.ok) throw new Error("Failed to send event")
}

async function sendFunnelEvent(event: FunnelEvent): Promise<void> {
  const response = await fetch("/api/analytics/funnel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...event,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      sessionId: getSessionId(),
    }),
  })
  if (!response.ok) throw new Error("Failed to send funnel event")
}

function getSessionId(): string {
  let sessionId = sessionStorage.getItem("yb_session_id")
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    sessionStorage.setItem("yb_session_id", sessionId)
  }
  return sessionId
}

export function useAnalytics() {
  const { language } = useLanguage()

  const trackEvent = useCallback(
    (name: string, properties?: Record<string, string | number | boolean>) => {
      const event: AnalyticsEvent = {
        name,
        properties: {
          ...properties,
          language,
        },
      }

      if (navigator.onLine) {
        sendEvent({ ...event, properties: event.properties }).catch(() => {
          eventQueue.push(event)
        })
      } else {
        eventQueue.push(event)
      }
    },
    [language]
  )

  const trackFunnel = useCallback(
    (step: string, properties?: Record<string, string | number | boolean>) => {
      const event: FunnelEvent = {
        step,
        properties,
      }

      if (navigator.onLine) {
        sendFunnelEvent(event).catch(() => {
          funnelQueue.push(event)
        })
      } else {
        funnelQueue.push(event)
      }
    },
    []
  )

  return { trackEvent, trackFunnel }
}

// Predefined funnel steps for YeBetWeg
export const FUNNEL_STEPS = {
  LANDING: "landing_view",
  BOQ_START: "boq_start",
  BOQ_COMPLETE: "boq_complete",
  BOQ_SAVE: "boq_save",
  BOQ_EXPORT: "boq_export",
  RFQ_SUBMIT: "rfq_submit",
  RFQ_COMPLETE: "rfq_complete",
  PAYMENT_START: "payment_start",
  PAYMENT_COMPLETE: "payment_complete",
  SIGNUP_START: "signup_start",
  SIGNUP_COMPLETE: "signup_complete",
  LOGIN: "login",
  SEARCH: "search",
  MARKET_VIEW: "market_view",
  LISTING_VIEW: "listing_view",
  PROFESSIONAL_HIRE: "professional_hire",
} as const