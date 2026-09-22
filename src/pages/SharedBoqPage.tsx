import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Link2, Printer } from "lucide-react"
import { useLanguage } from "@/lib/i18n"

// ============================================================================
// Public read-only BOQ view — served by share token (/boq/:token).
// Exposes ONLY the plan (inputs/outputs) via get_shared_boq; no owner data,
// no actuals. Invalid/expired/rotated links show a friendly not-found state.
// ============================================================================

type SharedBoq = {
  inputs: { projectType?: string; city?: string; cityLabel?: string; area?: number; floors?: number; finishLevel?: string; contingency?: number }
  outputs: { total?: number; perM2?: number; structure?: number; material?: number; labor?: number; overhead?: number }
  created_at: string
}

export function SharedBoqPage() {
  const { token } = useParams<{ token: string }>()
  const { language } = useLanguage()
  const [data, setData] = useState<SharedBoq | null>(null)
  const [state, setState] = useState<"loading" | "ready" | "notfound">("loading")

  useEffect(() => {
    let cancelled = false
    if (!token) {
      setState("notfound")
      return
    }
    supabase
      .rpc("get_shared_boq", { p_token: token })
      .then(({ data: result, error }) => {
        if (cancelled) return
        const shared = result as SharedBoq | null
        if (error || !shared || !shared.inputs) setState("notfound")
        else {
          setData(shared)
          setState("ready")
        }
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const etb = (n?: number) => `${Math.round(n ?? 0).toLocaleString()} ETB`

  return (
    <main id="main-content" className="mx-auto max-w-2xl px-4 pt-24 pb-12 md:pt-28">
        {state === "loading" && (
          <div className="space-y-3" aria-busy="true">
            <div className="h-8 w-2/3 animate-pulse rounded-md bg-muted" />
            <div className="h-40 animate-pulse rounded-lg bg-muted" />
          </div>
        )}

        {state === "notfound" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-muted-foreground" />
                {language === "en" ? "This link is no longer valid" : "ይህ ሊንክ በሚስተካከል ጊዜ ሊሆን አይችልም"}
              </CardTitle>
              <CardDescription>
                {language === "en"
                  ? "The estimate may have been deleted, or its share link was rotated by the owner."
                  : "ግምቱ ሊሰረዝ ይችላል ወይም ያስተካክል ሊንኩ ተቀይሯል።"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link to="/">{language === "en" ? "Go to YeBetWeg" : "ወደ YeBetWeg ይመለሱ"}</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {state === "ready" && data && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>
                  {language === "en" ? "Shared BOQ Estimate" : "የተጋራ BOQ ግምት"}
                </CardTitle>
                <Badge variant="secondary">{language === "en" ? "Read-only" : "ማንበብ ብቻ"}</Badge>
              </div>
              <CardDescription>
                {data.inputs.projectType} · {data.inputs.cityLabel || data.inputs.city} · {data.inputs.area} m² ·{" "}
                {new Date(data.created_at).toLocaleDateString(language === "am" ? "am-ET" : "en-US")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-xs text-muted-foreground">{language === "en" ? "Estimated budget" : "የተገመተ ወጪ"}</p>
                <p className="text-2xl font-bold tabular-nums">{etb(data.outputs.total)}</p>
                <p className="text-xs text-muted-foreground">
                  {etb(data.outputs.perM2)} / m² · {data.inputs.finishLevel} · {language === "en" ? "contingency" : "ወጪ መጠን"} {data.inputs.contingency}%
                </p>
              </div>

              <table className="w-full text-sm">
                <tbody>
                  {[
                    [language === "en" ? "Structure" : "መዋቅር", data.outputs.structure],
                    [language === "en" ? "Materials" : "ቁሳቁሶች", data.outputs.material],
                    [language === "en" ? "Labor" : "የሠራተኛ", data.outputs.labor],
                    [language === "en" ? "Overhead" : "የተገቢ", data.outputs.overhead],
                  ].map(([label, amount]) => (
                    <tr key={String(label)} className="border-b border-border/50">
                      <td className="py-2">{label}</td>
                      <td className="py-2 text-right tabular-nums">{etb(Number(amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex gap-2">
                <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" />
                  {language === "en" ? "Print" : "አትም"}
                </Button>
                <Button asChild className="gap-2">
                  <Link to="/#boq">{language === "en" ? "Build your own estimate" : "የዎትን ግምት ይገንቡ"}</Link>
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground">
                {language === "en"
                  ? "Planning estimate only — not a contract BOQ. Shared via YeBetWeg."
                  : "ይህ የእቅድ ግምት ብቻ ነው — የስራ ማስኬጃ አይደለም። በYeBetWeg ተጋርቷል።"}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
  )
}
