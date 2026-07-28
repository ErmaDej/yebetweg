import { useState, useEffect, useCallback } from "react"
import { Plus, Pencil, Trash2, Upload, RefreshCw, Loader2, SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useLanguage } from "@/lib/i18n"
import { callAdminAction } from "@/lib/api"

type MarketPrice = {
  id: string
  material_am: string
  material_en: string
  unit: string
  price: number
  change_percent: number
  category: string
  city: string
  specification: string
  source_type: string
  source_name: string
  vat_included: boolean
  confidence_score: number
  trend_direction: string
  freshness_status: string
  access_level: string
  updated_at: string
}

const emptyPrice: Omit<MarketPrice, "id" | "updated_at"> = {
  material_am: "",
  material_en: "",
  unit: "Qtl",
  price: 0,
  change_percent: 0,
  category: "cement",
  city: "Addis Ababa",
  specification: "",
  source_type: "admin_verified",
  source_name: "YeBetWeg Market Desk",
  vat_included: false,
  confidence_score: 90,
  trend_direction: "stable",
  freshness_status: "verified",
  access_level: "free",
}

const categories = ["cement", "steel", "aggregate", "wood", "finishing", "electrical"]
const sourceTypes = ["admin_verified", "supplier_quoted", "community_reported", "telegram_observed"]
const trendOptions = ["up", "down", "stable"]
const freshnessOptions = ["verified", "supplier_quoted", "community_reported", "expired", "needs_confirmation"]

export function MarketPriceManager() {
  const { language } = useLanguage()
  const [prices, setPrices] = useState<MarketPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [search, setSearch] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyPrice)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [csvDialogOpen, setCsvDialogOpen] = useState(false)
  const [csvText, setCsvText] = useState("")

  const fetchPrices = useCallback(async () => {
    setLoading(true)
    try {
      const result = await callAdminAction("manage_market_prices")
      if (result?.data) setPrices(result.data as MarketPrice[])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch")
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchPrices() }, [fetchPrices])

  const handleSave = async () => {
    if (!form.material_en.trim() || !form.material_am.trim()) {
      setError(language === "en" ? "Material name is required in both languages" : "የቁሳቁስ ስም በሁለቱም ቋንቋዎች ያስፈልጋል")
      return
    }
    setSaving(true)
    setError("")
    try {
      if (editingId) {
        await callAdminAction("manage_market_prices", { priceId: editingId, ...form })
      } else {
        await callAdminAction("manage_market_prices", { create: true, ...form })
      }
      setSuccess(language === "en" ? "Saved successfully" : "በተሳካ ሁኔታ ተቀምጧል")
      setDialogOpen(false)
      setEditingId(null)
      setForm(emptyPrice)
      await fetchPrices()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed")
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm(language === "en" ? "Delete this market price?" : "ይህን የገበያ ዋጋ ይሰርዙ?")) return
    try {
      await callAdminAction("manage_market_prices", { priceId: id, delete: true })
      setPrices((prev) => prev.filter((p) => p.id !== id))
      setSuccess(language === "en" ? "Deleted" : "ተሰርዟል")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed")
    }
  }

  const handleEdit = (price: MarketPrice) => {
    setForm({
      material_am: price.material_am,
      material_en: price.material_en,
      unit: price.unit,
      price: price.price,
      change_percent: price.change_percent,
      category: price.category,
      city: price.city,
      specification: price.specification,
      source_type: price.source_type,
      source_name: price.source_name,
      vat_included: price.vat_included,
      confidence_score: price.confidence_score,
      trend_direction: price.trend_direction,
      freshness_status: price.freshness_status,
      access_level: price.access_level,
    })
    setEditingId(price.id)
    setDialogOpen(true)
  }

  const handleCsvImport = async () => {
    if (!csvText.trim()) return
    setSaving(true)
    setError("")
    try {
      const rows = csvText
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
          const cols = line.split(",").map((c) => c.trim())
          return {
            material_en: cols[0] || "",
            material_am: cols[1] || "",
            unit: cols[2] || "Qtl",
            price: parseFloat(cols[3]) || 0,
            change_percent: parseFloat(cols[4]) || 0,
            category: cols[5] || "cement",
            city: cols[6] || "Addis Ababa",
            source_type: cols[7] || "admin_verified",
            freshness_status: cols[8] || "verified",
          }
        })

      if (rows.length === 0) {
        setError(language === "en" ? "No valid rows found" : "ምንም የሚሰራ ረድፍ አልተገኘም")
        return
      }

      const result = await callAdminAction("manage_market_prices", { bulk: true, rows })
      setSuccess(result?.message || `${rows.length} prices imported`)
      setCsvDialogOpen(false)
      setCsvText("")
      await fetchPrices()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Import failed")
    }
    setSaving(false)
  }

  const filtered = prices.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.material_en.toLowerCase().includes(q) ||
      p.material_am.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q)
    )
  })

  const freshnessColor = (s: string) => {
    if (s === "expired" || s === "needs_confirmation") return "destructive"
    if (s === "verified") return "default"
    return "outline"
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-green-400 bg-green-100 text-green-700">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Input
            placeholder={language === "en" ? "Search prices..." : "ዋጋዎችን ይፈልጉ..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setCsvDialogOpen(true); setCsvText("") }} className="gap-2">
            <Upload className="h-4 w-4" />
            {language === "en" ? "CSV Import" : "CSV አስመጣ"}
          </Button>
          <Button size="sm" onClick={() => { setEditingId(null); setForm(emptyPrice); setDialogOpen(true) }} className="gap-2">
            <Plus className="h-4 w-4" />
            {language === "en" ? "Add Price" : "ዋጋ ጨምር"}
          </Button>
          <Button variant="ghost" size="sm" onClick={fetchPrices} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center">
          <SearchX className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">
            {language === "en" ? "No market prices found" : "ምንም የገበያ ዋጋ አልተገኘም"}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-2 text-left font-medium">Material (EN)</th>
                <th className="p-2 text-left font-medium">Material (AM)</th>
                <th className="p-2 text-left font-medium">Category</th>
                <th className="p-2 text-right font-medium">Price</th>
                <th className="p-2 text-left font-medium">Unit</th>
                <th className="p-2 text-left font-medium">City</th>
                <th className="p-2 text-left font-medium">Freshness</th>
                <th className="p-2 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((price) => (
                <tr key={price.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-2 font-medium">{price.material_en}</td>
                  <td className="p-2">{price.material_am}</td>
                  <td className="p-2"><Badge variant="outline" className="text-[10px]">{price.category}</Badge></td>
                  <td className="p-2 text-right font-mono">{price.price.toLocaleString()}</td>
                  <td className="p-2">{price.unit}</td>
                  <td className="p-2">{price.city}</td>
                  <td className="p-2">
                    <Badge variant={freshnessColor(price.freshness_status) as "default" | "destructive" | "outline"} className="text-[10px]">
                      {price.freshness_status}
                    </Badge>
                  </td>
                  <td className="p-2">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(price)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(price.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-2 text-xs text-muted-foreground border-t">
            {language === "en" ? `Showing ${filtered.length} of ${prices.length} prices` : `${filtered.length} ከ ${prices.length} ዋጋዎች ይታያሉ`}
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? (language === "en" ? "Edit Market Price" : "የገበያ ዋጋ አስተካክል")
                : (language === "en" ? "Add Market Price" : "አዲስ የገበያ ዋጋ")}
            </DialogTitle>
            <DialogDescription>
              {language === "en" ? "Fill in all required fields" : "ሁሉንም አስፈላጊ መስኮች ይሙሉ"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{language === "en" ? "Name (English)" : "ስም (እንግሊዝኛ)"}</Label>
                <Input value={form.material_en} onChange={(e) => setForm({ ...form, material_en: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{language === "en" ? "Name (Amharic)" : "ስም (አማርኛ)"}</Label>
                <Input value={form.material_am} onChange={(e) => setForm({ ...form, material_am: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>{language === "en" ? "Category" : "ምድብ"}</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{language === "en" ? "Unit" : "ክፍል"}</Label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{language === "en" ? "Price (ETB)" : "ዋጋ (ETB)"}</Label>
                <Input type="number" min={0} value={form.price || ""} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{language === "en" ? "City" : "ከተማ"}</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{language === "en" ? "Change %" : "ለውጥ %"}</Label>
                <Input type="number" step="0.1" value={form.change_percent || ""} onChange={(e) => setForm({ ...form, change_percent: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{language === "en" ? "Specification" : "ዝርዝር"}</Label>
              <Input value={form.specification} onChange={(e) => setForm({ ...form, specification: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{language === "en" ? "Source Type" : "የምንጭ አይነት"}</Label>
                <Select value={form.source_type} onValueChange={(v) => setForm({ ...form, source_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sourceTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{language === "en" ? "Source Name" : "የምንጭ ስም"}</Label>
                <Input value={form.source_name} onChange={(e) => setForm({ ...form, source_name: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{language === "en" ? "Trend" : "አቅጣጫ"}</Label>
                <Select value={form.trend_direction} onValueChange={(v) => setForm({ ...form, trend_direction: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {trendOptions.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{language === "en" ? "Freshness" : "አዲስነት"}</Label>
                <Select value={form.freshness_status} onValueChange={(v) => setForm({ ...form, freshness_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {freshnessOptions.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{language === "en" ? "Confidence (0-100)" : "እምነት (0-100)"}</Label>
                <Input type="number" min={0} max={100} value={form.confidence_score || ""} onChange={(e) => setForm({ ...form, confidence_score: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label>{language === "en" ? "Access Level" : "የመዳረሻ ደረጃ"}</Label>
                <Select value={form.access_level} onValueChange={(v) => setForm({ ...form, access_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="vat_included"
                checked={form.vat_included}
                onChange={(e) => setForm({ ...form, vat_included: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="vat_included">{language === "en" ? "VAT Included" : "VAT የተካተተ"}</Label>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving
                ? (language === "en" ? "Saving..." : "በማስቀመጥ ላይ...")
                : (language === "en" ? "Save" : "አስቀምጥ")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{language === "en" ? "CSV Bulk Import" : "CSV በቡድን አስመጣ"}</DialogTitle>
            <DialogDescription>
              {language === "en"
                ? "Paste CSV data with columns: material_en, material_am, unit, price, change%, category, city, source_type, freshness_status"
                : "የ CSV ውሂብ ይለጥፉ፦ የቁሳቁስ ስም (እንግሊዝኛ)፣ የቁሳቁስ ስም (አማርኛ)፣ ክፍል፣ ዋጋ፣ ለውጥ%፣ ምድብ፣ ከተማ፣ የምንጭ አይነት፣ የአዲስነት ሁኔታ"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{language === "en" ? "CSV Data" : "CSV ውሂብ"}</Label>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                rows={8}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                placeholder="Cement 42.5R, ሲሚንቶ 42.5R, Qtl, 8200, 3.5, cement, Addis Ababa, admin_verified, verified"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {language === "en"
                ? "Format: material_en, material_am, unit, price, change%, category, city, source_type, freshness_status. One row per line."
                : "ቅርጸት: የቁሳቁስ ስም (እንግሊዝኛ)፣ የቁሳቁስ ስም (አማርኛ)፣ ክፍል፣ ዋጋ፣ ለውጥ%፣ ምድብ፣ ከተማ፣ የምንጭ አይነት፣ የአዲስነት ሁኔታ"}
            </p>
            <Button onClick={handleCsvImport} disabled={saving || !csvText.trim()} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              {language === "en" ? "Import" : "አስመጣ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
