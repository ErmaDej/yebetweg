import { useEffect, useRef, useState, useCallback } from "react"
import { Search, X, Command, SlidersHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/i18n"

interface FilterChip {
  key: string
  label: string
  value: string
  onRemove: () => void
}

interface SmartSearchBarProps {
  /** Current search query */
  query: string
  /** Called when query changes */
  onQueryChange: (query: string) => void
  /** Placeholder text */
  placeholder?: string
  /** Active filter chips to display */
  chips?: FilterChip[]
  /** Called when filter toggle button is clicked */
  onToggleFilters?: () => void
  /** Whether the filter panel is currently open */
  filtersOpen?: boolean
  /** Show total results count */
  totalCount?: number
  /** Debounce delay in ms (default 300) */
  debounceMs?: number
  /** Additional class names */
  className?: string
  /** Compact mode for inline use in sections */
  compact?: boolean
  /** Auto-focus input */
  autoFocus?: boolean
}

export function SmartSearchBar({
  query,
  onQueryChange,
  placeholder,
  chips = [],
  onToggleFilters,
  filtersOpen,
  totalCount,
  debounceMs = 300,
  className,
  compact = false,
  autoFocus = false,
}: SmartSearchBarProps) {
  const { language } = useLanguage()
  const inputRef = useRef<HTMLInputElement>(null)
  const [localValue, setLocalValue] = useState(query)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync local value with external query
  useEffect(() => {
    setLocalValue(query)
  }, [query])

  // Debounced callback
  const handleChange = useCallback(
    (value: string) => {
      setLocalValue(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        onQueryChange(value)
      }, debounceMs)
    },
    [onQueryChange, debounceMs],
  )

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // Keyboard shortcut: Cmd+K / Ctrl+K to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const placeholderText =
    placeholder ||
    (language === "en" ? "Search... (⌘K)" : "ይፈልጉ... (⌘K)")

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground",
              compact ? "h-3.5 w-3.5" : "h-4 w-4",
            )}
          />
          <Input
            ref={inputRef}
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholderText}
            autoFocus={autoFocus}
            className={cn(
              "pl-9 pr-8",
              compact ? "h-8 text-sm" : "h-10",
            )}
          />
          {localValue && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute right-1 top-1/2 -translate-y-1/2 hover:bg-transparent",
                compact ? "h-6 w-6" : "h-8 w-8",
              )}
              onClick={() => {
                setLocalValue("")
                onQueryChange("")
                inputRef.current?.focus()
              }}
            >
              <X className={cn("text-muted-foreground", compact ? "h-3 w-3" : "h-4 w-4")} />
            </Button>
          )}
          {!localValue && (
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          )}
        </div>

        {onToggleFilters && (
          <Button
            variant={filtersOpen ? "default" : "outline"}
            size="sm"
            onClick={onToggleFilters}
            className={cn("gap-2 shrink-0", compact ? "h-8" : "h-10")}
            title={language === "en" ? "Toggle filters" : "ማጣሪያዎች"}
          >
            <SlidersHorizontal className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            <span className={cn("hidden sm:inline", compact && "text-xs")}>
              {language === "en" ? "Filters" : "ማጣሪያ"}
            </span>
          </Button>
        )}
      </div>

      {/* Chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <Badge key={chip.key} variant="secondary" className="gap-1 text-xs">
              <span className="text-muted-foreground">{chip.label}:</span>
              <span className="font-medium">{chip.value}</span>
              <button
                type="button"
                onClick={chip.onRemove}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
          {totalCount !== undefined && (
            <span className="text-xs text-muted-foreground ml-1">
              {totalCount} {language === "en" ? "result(s)" : "ውጤት(ዎች)"}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

