import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLanguage } from "@/lib/i18n"

/**
 * Reusable, accessible client-side pagination for dashboard lists.
 * (The shadcn `Pagination` composite in pagination.tsx remains for the
 * marketing sections; this one is the opinionated, self-contained variant.)
 *
 * - Compact on mobile (icon-only buttons), full labels on desktop
 * - Page-size selector (10/25/50) persisted per-component-key in localStorage
 * - Ellipsized page numbers (1 … 4 5 [6] 7 8 … 12)
 * - Controlled or uncontrolled: pass `page`/`onPageChange` to control it, or
 *   nothing to let the component own the state
 */

export type DataPaginationProps = {
  total: number
  page?: number
  onPageChange?: (page: number) => void
  pageSize?: number
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
  /** localStorage key remembering the chosen page size across sessions. */
  persistKey?: string
  className?: string
}

const DEFAULT_OPTIONS = [10, 25, 50]

function pageList(current: number, pageCount: number): (number | "…")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)
  const pages: (number | "…")[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(pageCount - 1, current + 1)
  if (start > 2) pages.push("…")
  for (let p = start; p <= end; p++) pages.push(p)
  if (end < pageCount - 1) pages.push("…")
  pages.push(pageCount)
  return pages
}

export function DataPagination({
  total,
  page: controlledPage,
  onPageChange,
  pageSize: controlledSize,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_OPTIONS,
  persistKey,
  className = "",
}: DataPaginationProps) {
  const { language } = useLanguage()
  const am = language === "am"

  const storedSize = (() => {
    if (!persistKey) return undefined
    const raw = Number(localStorage.getItem(`pg-size:${persistKey}`))
    return pageSizeOptions.includes(raw) ? raw : undefined
  })()

  const [internalPage, setInternalPage] = useState(1)
  const [internalSize, setInternalSize] = useState<number>(storedSize ?? pageSizeOptions[0])

  const pageSize = controlledSize ?? internalSize
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(1, controlledPage ?? internalPage), pageCount)

  // Keep the internal page in range when the data shrinks.
  useEffect(() => {
    if (!controlledPage && internalPage > pageCount) setInternalPage(1)
  }, [pageCount, internalPage, controlledPage])

  const setPage = (p: number) => {
    const next = Math.min(Math.max(1, p), pageCount)
    if (!controlledPage) setInternalPage(next)
    onPageChange?.(next)
  }

  const changeSize = (size: number) => {
    if (!controlledSize) setInternalSize(size)
    if (persistKey) localStorage.setItem(`pg-size:${persistKey}`, String(size))
    onPageSizeChange?.(size)
    setPage(1)
  }

  if (total === 0) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)

  const navBtn = "h-7 w-7 p-0 sm:h-8 sm:w-8" // compact on mobile

  return (
    <nav
      aria-label={am ? "የገጽ አሰሳ" : "Pagination"}
      className={`flex flex-wrap items-center justify-between gap-2 py-2 ${className}`}
    >
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {am ? `${from}–${to} ከ ${total}` : `${from}–${to} of ${total}`}
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className={navBtn}
          disabled={page <= 1}
          onClick={() => setPage(1)}
          aria-label={am ? "የመጀመሪያ ገጽ" : "First page"}
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={navBtn}
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          aria-label={am ? "ቀዳሚ" : "Previous"}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        {pageList(page, pageCount).map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="px-1 text-xs text-muted-foreground" aria-hidden>
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="sm"
              className={`${navBtn} hidden sm:inline-flex`}
              onClick={() => setPage(p)}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </Button>
          ),
        )}

        <Button
          variant="outline"
          size="sm"
          className={navBtn}
          disabled={page >= pageCount}
          onClick={() => setPage(page + 1)}
          aria-label={am ? "ቀጣይ" : "Next"}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={navBtn}
          disabled={page >= pageCount}
          onClick={() => setPage(pageCount)}
          aria-label={am ? "የመጨረሻ ገጽ" : "Last page"}
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>

        <Select value={String(pageSize)} onValueChange={(v) => changeSize(Number(v))}>
          <SelectTrigger
            className="ml-1 h-7 w-[74px] text-xs sm:h-8"
            aria-label={am ? "የገጽ መጠን" : "Rows per page"}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} / {am ? "ገጽ" : "page"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </nav>
  )
}

/**
 * Hook pairing: returns the paged slice + ready-made props. Keeps call sites
 * to two lines.
 */
export function useDataPagination<T>(
  items: T[],
  persistKey?: string,
  defaultSize = 10,
): { pageItems: T[]; paginationProps: Omit<DataPaginationProps, "total"> & { total: number } } {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultSize)

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const pageItems = items.slice((safePage - 1) * pageSize, safePage * pageSize)

  return {
    pageItems,
    paginationProps: {
      total: items.length,
      page: safePage,
      onPageChange: setPage,
      pageSize,
      onPageSizeChange: setPageSize,
      persistKey,
    },
  }
}
