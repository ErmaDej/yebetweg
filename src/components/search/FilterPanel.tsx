import { useState, useMemo } from "react"
import { X, ChevronDown, ChevronUp, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/i18n"

// ── Filter Types ───────────────────────────────────────────────────

export interface FilterDef {
  key: string
  label: string
  type: "text" | "select" | "multi-select" | "range" | "toggle"
  placeholder?: string
  options?: { value: string; label: string }[]
  rangeMin?: number
  rangeMax?: number
  rangeStep?: number
  /** Hide this filter from the panel (set via code) */
  hidden?: boolean
}

export type FilterValues = Record<string, any>

// ── Props ──────────────────────────────────────────────────────────

export interface FilterPanelProps {
  /** Filter definitions */
  filters: FilterDef[]
  /** Current filter values */
  values: FilterValues
  /** Called when a single filter changes */
  onFilterChange: (key: string, value: any) => void
  /** Called to clear all filters */
  onClear: () => void
  /** Whether the panel is visible */
  open: boolean
  /** External toggle handler */
  onToggle?: () => void
  /** Count of active filters (for badge) */
  activeCount?: number
  /** Additional classes */
  className?: string
  /** Render as a drawer on mobile, sidebar on desktop */
  variant?: "sidebar" | "drawer" | "inline"
  /** Title for the panel */
  title?: string
}

// ── Component ──────────────────────────────────────────────────────

function RangeFilter({
  def,
  value,
  onChange,
}: {
  def: FilterDef
  value: { min?: number; max?: number } | undefined
  onChange: (v: { min?: number; max?: number }) => void
}) {
  const min = def.rangeMin ?? 0
  const max = def.rangeMax ?? 100000
  const step = def.rangeStep ?? 100
  const current = value ?? { min, max }

  return (
    <div className="space-y-3">
      <Slider
        value={[current.min ?? min, current.max ?? max]}
        min={min}
        max={max}
        step={step}
        onValueChange={([a, b]) => onChange({ min: a, max: b })}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>ETB {Number(current.min ?? min).toLocaleString()}</span>
        <span>ETB {Number(current.max ?? max).toLocaleString()}</span>
      </div>
    </div>
  )
}

export function FilterPanel({
  filters: filterDefs,
  values,
  onFilterChange,
  onClear,
  open,
  onToggle,
  activeCount,
  className,
  variant = "sidebar",
  title,
}: FilterPanelProps) {
  const { language } = useLanguage()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const visibleFilters = useMemo(
    () => filterDefs.filter((f) => !f.hidden),
    [filterDefs],
  )

  const titleText = title || (language === "en" ? "Filters" : "ማጣሪያዎች")

  if (!open && variant !== "inline") return null

  const panelContent = (
    <div
      className={cn(
        "space-y-5",
        variant === "sidebar" && "p-4",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{titleText}</h3>
          {activeCount !== undefined && activeCount > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5">
              {activeCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {activeCount !== undefined && activeCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onClear} className="h-7 text-xs gap-1">
              <RotateCcw className="h-3 w-3" />
              {language === "en" ? "Reset" : "አስጀምር"}
            </Button>
          )}
          {onToggle && variant !== "inline" && (
            <Button variant="ghost" size="icon" onClick={onToggle} className="h-7 w-7">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Filter Groups */}
      {visibleFilters.map((def) => {
        const isCollapsed = collapsed[def.key] ?? false
        const val = values[def.key]

        return (
          <div key={def.key} className="space-y-2">
            <button
              type="button"
              onClick={() =>
                setCollapsed((prev) => ({ ...prev, [def.key]: !prev[def.key] }))
              }
              className="flex w-full items-center justify-between text-sm font-medium"
            >
              <span>{def.label}</span>
              {isCollapsed ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>

            {!isCollapsed && (
              <div className="pt-1">
                {def.type === "text" && (
                  <Input
                    placeholder={def.placeholder || (language === "en" ? "Search..." : "ይፈልጉ...")}
                    value={val || ""}
                    onChange={(e) => onFilterChange(def.key, e.target.value)}
                    className="h-9 text-sm"
                  />
                )}

                {def.type === "select" && (
                  <Select
                    value={val || "all"}
                    onValueChange={(v) => onFilterChange(def.key, v === "all" ? undefined : v)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue
                        placeholder={def.placeholder || (language === "en" ? "All" : "ሁሉም")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {language === "en" ? "All" : "ሁሉም"}
                      </SelectItem>
                      {def.options?.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {def.type === "multi-select" && (
                  <div className="flex flex-wrap gap-1.5">
                    {def.options?.map((opt) => {
                      const selected = Array.isArray(val) && val.includes(opt.value)
                      return (
                        <Badge
                          key={opt.value}
                          variant={selected ? "default" : "outline"}
                          className="cursor-pointer text-xs"
                          onClick={() => {
                            const current = Array.isArray(val) ? [...val] : []
                            const idx = current.indexOf(opt.value)
                            if (idx >= 0) current.splice(idx, 1)
                            else current.push(opt.value)
                            onFilterChange(def.key, current.length > 0 ? current : undefined)
                          }}
                        >
                          {opt.label}
                        </Badge>
                      )
                    })}
                  </div>
                )}

                {def.type === "range" && (
                  <RangeFilter
                    def={def}
                    value={val}
                    onChange={(v) => onFilterChange(def.key, v)}
                  />
                )}

                {def.type === "toggle" && (
                  <Button
                    variant={val ? "default" : "outline"}
                    size="sm"
                    onClick={() => onFilterChange(def.key, !val)}
                    className="w-full text-xs"
                  >
                    {val
                      ? language === "en"
                        ? "On"
                        : "በርቷል"
                      : language === "en"
                        ? "Off"
                        : "ጠፍቷል"}
                  </Button>
                )}
              </div>
            )}
          </div>
        )
      })}

      {visibleFilters.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          {language === "en" ? "No filters available" : "ምንም ማጣሪያ አይገኝም"}
        </p>
      )}
    </div>
  )

  if (variant === "inline") {
    return <div className={cn("border rounded-lg", className)}>{panelContent}</div>
  }

  return (
    <div
      className={cn(
        "border rounded-lg bg-card",
        variant === "sidebar" && "sticky top-20",
        className,
      )}
    >
      {panelContent}
    </div>
  )
}

// ── Helper hook for computing active filter count ─────────────────

export function useActiveFilterCount(
  values: FilterValues,
  excludeKeys?: string[],
): number {
  return useMemo(() => {
    let count = 0
    for (const [key, val] of Object.entries(values)) {
      if (excludeKeys?.includes(key)) continue
      if (val === undefined || val === null || val === "" || val === "all") continue
      if (Array.isArray(val) && val.length === 0) continue
      count++
    }
    return count
  }, [values, excludeKeys])
}

