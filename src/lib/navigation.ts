export function navigateTo(path: string) {
  const changeRoute = () => {
    try {
      // Use history API safely with proper context binding
      if (window && window.history && typeof window.history.pushState === "function") {
        window.history.pushState({}, "", path)
        window.dispatchEvent(new PopStateEvent("popstate", { bubbles: true }))
      }
    } catch (error) {
      // Fallback if history API fails (e.g., in cross-origin iframes)
      console.warn("History API unavailable, using location.href fallback:", error)
      window.location.href = path
    }
  }

  try {
    const startViewTransition = (document as Document & {
      startViewTransition?: (callback: () => void) => void
    }).startViewTransition

    if (startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      startViewTransition(changeRoute)
    } else {
      changeRoute()
    }
  } catch (error) {
    console.warn("View transition failed, using regular navigation:", error)
    changeRoute()
  }

  const hash = path.includes("#") ? path.slice(path.indexOf("#") + 1) : ""
  if (!hash) {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (error) {
      console.warn("Scroll failed:", error)
    }
    return
  }

  window.setTimeout(() => {
    try {
      const element = document.getElementById(hash)
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    } catch (error) {
      console.warn("ScrollIntoView failed:", error)
    }
  }, 0)
}
