const ANCHOR_ALIASES: Record<string, string[]> = {
  premium: ["premium", "plans"],
  plans: ["premium", "plans"],
  market: ["market", "prices"],
  prices: ["market", "prices"],
  marketplace: ["marketplace", "listings"],
  listings: ["marketplace", "listings"],
  sitelog: ["site-log", "sitelog"],
  "site-log": ["site-log", "sitelog"],
  knowledge: ["knowledge", "blogs", "blog"],
  blogs: ["knowledge", "blogs", "blog"],
  tips: ["tips"],
  boq: ["boq"],
  professionals: ["professionals"],
  social: ["social"],
  contact: ["contact"],
}

export function scrollToAnchor(hashOrId: string, maxAttempts = 25, intervalMs = 50): void {
  const clean = hashOrId.replace(/^#/, "").trim()
  if (!clean) {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch {}
    return
  }

  const candidateIds = ANCHOR_ALIASES[clean] || [clean]
  let attempts = 0

  const tryScroll = () => {
    attempts++
    for (const id of candidateIds) {
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" })
        return
      }
    }

    if (attempts < maxAttempts) {
      setTimeout(tryScroll, intervalMs)
    }
  }

  // Initial attempt on next animation frame
  requestAnimationFrame(tryScroll)
}

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
    try {
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch {}
    return
  }

  scrollToAnchor(hash)
}

