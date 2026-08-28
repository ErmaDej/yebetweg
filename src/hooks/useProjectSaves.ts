import { useCallback, useEffect, useState } from "react"

export type SavedItem = {
  id: string
  type: "blog" | "tip" | "listing" | "price"
  title: string
  subtitle?: string
  image?: string
  savedAt: string
}

const STORAGE_KEY = "yebetweg-saved-items"

function load(): SavedItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SavedItem[]) : []
  } catch {
    return []
  }
}

function save(items: SavedItem[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // ignore
  }
}

export function useProjectSaves() {
  const [items, setItems] = useState<SavedItem[]>(() => load())

  const refresh = useCallback(() => setItems(load()), [])

  useEffect(() => {
    const handler = () => refresh()
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [refresh])

  const isSaved = useCallback((id: string, type: SavedItem["type"]) => items.some((i) => i.id === id && i.type === type), [items])

  const toggle = useCallback(
    (item: Omit<SavedItem, "savedAt">) => {
      setItems((prev) => {
        const exists = prev.some((i) => i.id === item.id && i.type === item.type)
        const next = exists
          ? prev.filter((i) => !(i.id === item.id && i.type === item.type))
          : [...prev, { ...item, savedAt: new Date().toISOString() }]
        save(next)
        return next
      })
    },
    []
  )

  const remove = useCallback((id: string, type: SavedItem["type"]) => {
    setItems((prev) => {
      const next = prev.filter((i) => !(i.id === id && i.type === type))
      save(next)
      return next
    })
  }, [])

  const clear = useCallback(() => {
    setItems([])
    save([])
  }, [])

  return { items, isSaved, toggle, remove, clear, count: items.length }
}
