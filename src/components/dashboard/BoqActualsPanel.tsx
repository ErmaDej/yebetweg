import { useState } from "react"
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useBoqActualsByEstimate, useCreateBoqActual, useDeleteBoqActual, buildVarianceRows, type BoqActualCategory } from "@/hooks/useBoqActuals"
import type { BoqEstimate } from "@/hooks/useBoqEstimates"

// ============================================================================
// BOQ → actuals panel: log real spend against saved estimates, see variance.
// Pure ledger UI — the math lives in useBoqActuals (summarizeActuals/buildVarianceRows).
// ============================================================================

const CATS: BoqActualCategory[] = ["structure", "material", "labor", "overhead", "other"]

const catLabel = (c: BoqActualCategory, language: "en" | "am") =>
  ({
    structure: language === "en" ? "Structure" : "መዋቅር",
    material: language === "en" ? "Materials" : "ቁሳቁሶች",
    labor: language === "en" ? "Labor" : "የሠራተኛ",
    overhead: language === "en" ? "Overhead" : "የተገቢ",
    other: language === "en" ? "Other" : "ሌላ",
  })[c]

export function BoqActualsPanel({ language, estimates }: { language: "en" | "am"; estimates: BoqEstimate[] }) {
  const { data: actualsByEstimate = {}, isLoading } = useBoqActualsByEstimate()
  const createActual = useCreateBoqActual()
  const deleteActual = useDeleteBoqActual()
  const [openId, setOpenId] = useState<string | null>(null)

  const rows = buildVarianceRows(estimates, actualsByEstimate)
  const rowsWithActuals = rows.filter((r) => r.actuals.count > 0).length

  if (estimates.length === 0) return null

  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Wallet className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium">
          {language === "en" ? "Track actual spending" : "እውነተኛ ወጪ ይከታተሉ"}
        </p>
        {rowsWithActuals > 0 && (
          <Badge variant="secondary" className="ml-auto">
            {rowsWithActuals}/{estimates.length}
          </Badge>
        )}
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        {language === "en"
          ? "Log what you actually spent per category — YeBetWeg compares it with the estimate so your next one is sharper."
          : "በምድብ የሚውለውን እውነተኛ ወጪ ይመዝግቡ — ከግምቱ ጋር ተወዳድሮ ቀጣዩ ግምት ይሻሻላል።"}
      </p>

      {isLoading ? (
        <div className="flex justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(({ estimate, actuals, variance, variancePct }) => {
            const open = openId === estimate.id
            return (
              <div key={estimate.id} className="rounded-md border border-border/50">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : estimate.id)}
                  className="flex w-full items-center justify-between gap-2 p-2.5 text-left"
                  aria-expanded={open}
                >
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">
                    {estimate.inputs.cityLabel || estimate.inputs.city} · {estimate.inputs.area} m²
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {Math.round(Number(estimate.outputs?.total) || 0).toLocaleString()} ETB
                  </span>
                  {actuals.count > 0 && variancePct !== null ? (
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-[10px] tabular-nums ${variance > 0 ? "border-amber-500/50 text-amber-600" : "border-emerald-500/50 text-emerald-600"}`}
                    >
                      {variance > 0 ? "+" : ""}
                      {variancePct.toFixed(1)}%
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {language === "en" ? "no actuals" : "አልተመዘገበም"}
                    </Badge>
                  )}
                  {open ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
                </button>

                {open && (
                  <div className="space-y-2 border-t border-border/50 p-2.5">
                    {actuals.count > 0 && (
                      <div className="space-y-1">
                        {actuals.entries.map((e) => (
                          <div key={e.id} className="flex items-center gap-2 text-xs">
                            <Badge variant="secondary" className="shrink-0 text-[10px]">
                              {catLabel(e.category, language)}
                            </Badge>
                            <span className="min-w-0 flex-1 truncate text-muted-foreground">
                              {e.description || e.spent_at}
                            </span>
                            <span className="shrink-0 tabular-nums">{Math.round(Number(e.amount)).toLocaleString()}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                              onClick={() => deleteActual.mutate(e.id)}
                              disabled={deleteActual.isPending}
                              aria-label={language === "en" ? "Delete entry" : "መዝገብ ሰርዝ"}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        <div className="flex justify-between border-t border-dashed border-border/60 pt-1 text-xs font-medium">
                          <span>{language === "en" ? "Actual total" : "አጠቃላይ እውነተኛ"}</span>
                          <span className="tabular-nums">{Math.round(actuals.total).toLocaleString()} ETB</span>
                        </div>
                      </div>
                    )}

                    <ActualEntryForm
                      language={language}
                      pending={createActual.isPending}
                      onSubmit={(payload) =>
                        createActual.mutate({ boq_estimate_id: estimate.id, ...payload })
                      }
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ActualEntryForm({
  language,
  pending,
  onSubmit,
}: {
  language: "en" | "am"
  pending: boolean
  onSubmit: (payload: { category: BoqActualCategory; amount: number; description?: string; spent_at?: string }) => void
}) {
  const [category, setCategory] = useState<BoqActualCategory>("material")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [spentAt, setSpentAt] = useState(new Date().toISOString().slice(0, 10))

  const amountNum = Number(amount)
  const valid = Number.isFinite(amountNum) && amountNum > 0

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid || pending) return
        onSubmit({ category, amount: amountNum, description: description.trim() || undefined, spent_at: spentAt || undefined })
        setAmount("")
        setDescription("")
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as BoqActualCategory)}
          aria-label={language === "en" ? "Category" : "ምድብ"}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs"
        >
          {CATS.map((c) => (
            <option key={c} value={c}>
              {catLabel(c, language)}
            </option>
          ))}
        </select>
        <Input
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={language === "en" ? "Amount (ETB)" : "መጠን (ETB)"}
          aria-label={language === "en" ? "Amount in ETB" : "መጠን በ ETB"}
          className="h-8 text-xs"
          required
        />
      </div>
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={language === "en" ? "Note (optional)" : "ማስታወሻ (አማራጭ)"}
          aria-label={language === "en" ? "Note" : "ማስታወሻ"}
          className="h-8 text-xs"
          maxLength={120}
        />
        <Input
          type="date"
          value={spentAt}
          onChange={(e) => setSpentAt(e.target.value)}
          aria-label={language === "en" ? "Date" : "ቀን"}
          className="h-8 w-[130px] text-xs"
        />
        <Button type="submit" size="sm" className="h-8 gap-1 px-2 text-xs" disabled={!valid || pending}>
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          {language === "en" ? "Log" : "መዝግብ"}
        </Button>
      </div>
    </form>
  )
}
