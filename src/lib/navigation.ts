export function navigateTo(path: string) {
  const changeRoute = () => {
    window.history.pushState({}, "", path)
    window.dispatchEvent(new PopStateEvent("popstate"))
  }

  const startViewTransition = (document as Document & {
    startViewTransition?: (callback: () => void) => void
  }).startViewTransition

  if (startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    startViewTransition(changeRoute)
  } else {
    changeRoute()
  }

  const hash = path.includes("#") ? path.slice(path.indexOf("#") + 1) : ""
  if (!hash) {
    window.scrollTo({ top: 0, behavior: "smooth" })
    return
  }

  window.setTimeout(() => {
    document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, 0)
}
