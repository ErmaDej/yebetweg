export function navigateTo(path: string) {
  try {
    window.history.pushState({}, "", path)
    window.dispatchEvent(new PopStateEvent("popstate"))
  } catch {
    window.location.href = path
    return
  }

  const hash = path.includes("#") ? path.slice(path.indexOf("#") + 1) : ""
  if (!hash) {
    try { window.scrollTo({ top: 0, behavior: "smooth" }) } catch {}
    return
  }

  setTimeout(() => {
    try {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" })
    } catch {}
  }, 0)
}
