import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useLanguage } from "@/lib/i18n"
import { useTierPricing } from "@/hooks/usePayment"
import { withCheckoutFee } from "@/lib/fees"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Check, AlertCircle } from "lucide-react"

/**
 * Admin editor for the Premium/Pro membership prices (app_settings
 * 'tier_pricing' via set_tier_pricing — admin-only, validated server-side,
 * audited to moderation_log). Shows the buyer-paid gross preview that the
 * checkout will actually charge, so the admin sees the whole picture.
 */
export function TierPricingManager() {
  const { language } = useLanguage()
  const am = language === "am"
  const { pricing, loaded } = useTierPricing()
  const [premium, setPremium] = useState<string>("")
  const [pro, setPro] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [state, setState] = useState<"idle" | "saved" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (loaded) {
      setPremium(String(pricing.premium))
      setPro(String(pricing.pro))
    }
  }, [loaded, pricing])

  const previewPremium = withCheckoutFee(Number(premium) || 0)
  const previewPro = withCheckoutFee(Number(pro) || 0)

  async function handleSave() {
    setSaving(true)
    setState("idle")
    setErrorMsg(null)
    const { data, error } = await supabase.rpc("set_tier_pricing", {
      p_pricing: {
        premium: Number(premium),
        pro: Number(pro),
        currency: pricing.currency,
      },
    })
    setSaving(false)
    const res = data as { ok?: boolean; error?: string } | null
    if (error || !res?.ok) {
      setState("error")
      setErrorMsg(res?.error ?? error?.message ?? "Failed to save")
      return
    }
    setState("saved")
    setTimeout(() => setState("idle"), 2500)
  }

  const invalid =
    !Number.isFinite(Number(premium)) ||
    !Number.isFinite(Number(pro)) ||
    Number(premium) <= 0 ||
    Number(pro) <= 0 ||
    !Number.isInteger(Number(premium)) ||
    !Number.isInteger(Number(pro))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {am ? "የአባልነት ዋጋ አስተዳደር" : "Membership Pricing"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="tier-premium-price">
              Premium ({am ? "ወርሃዊ" : "30 days"})
            </label>
            <Input
              id="tier-premium-price"
              type="number"
              min={1}
              max={100000}
              step={1}
              value={premium}
              onChange={(e) => setPremium(e.target.value)}
              placeholder="500"
            />
            <p className="text-xs text-muted-foreground">
              {am ? "ተጠቃሚ የሚከፍለው፦" : "Buyer pays:"} {previewPremium.gross.toFixed(2)} ETB{" "}
              <span className="whitespace-nowrap">
                ({am ? "ዋጋ" : "price"} {previewPremium.base.toFixed(2)} + {am ? "ክፍያ" : "fee"}{" "}
                {previewPremium.fee.toFixed(2)})
              </span>
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="tier-pro-price">
              Pro ({am ? "ወርሃዊ" : "30 days"})
            </label>
            <Input
              id="tier-pro-price"
              type="number"
              min={1}
              max={100000}
              step={1}
              value={pro}
              onChange={(e) => setPro(e.target.value)}
              placeholder="1000"
            />
            <p className="text-xs text-muted-foreground">
              {am ? "ተጠቃሚ የሚከፍለው፦" : "Buyer pays:"} {previewPro.gross.toFixed(2)} ETB{" "}
              <span className="whitespace-nowrap">
                ({am ? "ዋጋ" : "price"} {previewPro.base.toFixed(2)} + {am ? "ክፍያ" : "fee"} {previewPro.fee.toFixed(2)})
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving || invalid || premium === "" || pro === ""}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {am ? "አስቀምጥ" : "Save prices"}
          </Button>
          {state === "saved" && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Check className="h-4 w-4" /> {am ? "ተቀምጧል" : "Saved — live immediately"}
            </span>
          )}
          {state === "error" && (
            <span className="flex items-center gap-1 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" /> {errorMsg}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {am
            ? "ለውጦች ወ᲋ጊው በሚቀጥለው ክፍያ ተግባራዊ ይሆናሉ። ሁሉም ለውጦች በሞደራሲዮን መዝገብ ይመዘገባሉ።"
            : "Changes apply to the next payment immediately — no redeploy needed. Every change is recorded in the Moderation Audit Log."}
        </p>
      </CardContent>
    </Card>
  )
}
