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

export function scrollToAnchor(hashOrId: string, maxAttempts = 40, intervalMs = 100): void {
  const clean = hashOrId.replace(/^#/, "").trim()
  if (!clean) {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch {}
    return
  }

  const candidateIds = ANCHOR_ALIASES[clean] || [clean]
  let cancelled = false

  // Late-loading content above the target (images, lazy sections, data tables)
  // shifts the layout AFTER the first scrollIntoView, landing the user short of
  // the anchor (e.g. SiteLog instead of Premium). Keep re-correcting until the
  // element's position is STABLE for a few consecutive checks — not just for a
  // fixed window — or until the user scrolls manually.
  const findEl = () => {
    for (const id of candidateIds) {
      const el = document.getElementById(id)
      if (el) return el
    }
    return null
  }

  const stopOnUserScroll = () => {
    cancelled = true // user took over — stop correcting
  }
  window.addEventListener("wheel", stopOnUserScroll, { passive: true, once: true })
  window.addEventListener("touchstart", stopOnUserScroll, { passive: true, once: true })

  let attempts = 0
  let stableChecks = 0
  let lastTop = Number.NaN
  let firstScrollDone = false

  const tick = () => {
    if (cancelled) return
    attempts++
    const el = findEl()
    if (el) {
      const top = el.getBoundingClientRect().top
      const moved = Number.isNaN(lastTop) || Math.abs(top - lastTop) > 1
      if (!moved && Math.abs(top) <= 400) {
        // Position unchanged since last check and plausibly at the anchor
        // (respects scroll-margin-top for the fixed header). Settle after a
        // few stable reads so late shifts can't strand us mid-page.
        stableChecks++
        if (stableChecks >= 3) return
      } else {
        stableChecks = 0
        el.scrollIntoView({
          behavior: firstScrollDone ? "auto" : "smooth",
          block: "start",
        })
        firstScrollDone = true
      }
      lastTop = top
    }
    if (attempts < maxAttempts) {
      setTimeout(tick, intervalMs)
    }
  }

  // Kick off via timeout (NOT requestAnimationFrame — rAF is paused in
  // background tabs, which would silently disable anchor scrolling there).
  setTimeout(tick, 60)
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

