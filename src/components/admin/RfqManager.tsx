import { useState, useEffect, useCallback } from "react"
import { RefreshCw, Loader2, SearchX, Eye, MessageSquare } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useLanguage } from "@/lib/i18n"
import { callAdminAction } from "@/lib/api"
import { useIsMobile } from "@/hooks/use-mobile"

type RfqItem = {
  material_name: string
  specification: string
  unit: string
  quantity: number
  target_price: number
}

type RfqRequest = {
  id: string
  requester_name: string
  requester_email: string
  requester_phone: string
  city: string
  source_type: string
  status: string
  admin_notes: string
  created_at: string
  rfq_items: RfqItem[]
}

const statuses = ["new", "reviewing", "sent_to_supplier", "quoted", "closed", "spam"]
const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  new: "default",
  reviewing: "secondary",
  sent_to_supplier: "outline",
  quoted: "default",
  closed: "outline",
  spam: "destructive",
}

const statusLabels: Record<string, { en: string; am: string }> = {
  new: { en: "New", am: "አዲስ" },
  reviewing: { en: "Reviewing", am: "ያጠᙙመው" },
  sent_to_supplier: { en: "Sent to supplier", am: "አላቸገ ለደረሰኛ" },
  quoted: { en: "Quoted", am: "የቋሚ መረጡ" },
  closed: { en: "Closed", am: "ዝግጁ" },
  spam: { en: "Spam", am: "ስፖም" },
}

function statusLabel(status: string, language: string): string {
  const entry = statusLabels[status] || { en: status, am: status }
  return language === "en" ? entry.en : entry.am
}

export function RfqManager() {
  const { language } = useLanguage()
  const isMobile = useIsMobile()
  const [rfqs, setRfqs] = useState<RfqRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [search, setSearch] = useState("")
  const [selectedRfq, setSelectedRfq] = useState<RfqRequest | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [adminNotes, setAdminNotes] = useState("")
  const [selectedRfqs, setSelectedRfqs] = useState<string[]>([])

  const fetchRfqs = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const result = await callAdminAction("manage_rfqs")
      if (result?.data) setRfqs(result.data as RfqRequest[])
    } catch {
      // table or edge function may not be deployed yet - silent fail
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchRfqs() }, [fetchRfqs])

  const handleStatusChange = async (rfqId: string, status: string) => {
    setSaving(true)
    setError("")
    try {
      await callAdminAction("manage_rfqs", { rfqId, status })
      setRfqs((prev) => prev.map((r) => (r.id === rfqId ? { ...r, status } : r)))
      if (selectedRfq?.id === rfqId) setSelectedRfq((prev) => prev ? { ...prev, status } : null)
      setSuccess(language === "en" ? `Status updated to ${statusLabel(status, "en")}` : `ሁኔታ ወደ ${statusLabel(status, "am")} ተቀይሯል`)
    } catch {
      // silently fail - table may not be deployed yet
    }
    setSaving(false)
  }

  const handleSaveNotes = async () => {
    if (!selectedRfq) return
    setSaving(true)
    try {
      await callAdminAction("manage_rfqs", { rfqId: selectedRfq.id, status: selectedRfq.status, admin_notes: adminNotes })
      setRfqs((prev) => prev.map((r) => (r.id === selectedRfq.id ? { ...r, admin_notes: adminNotes } : r)))
      setSuccess(language === "en" ? "Notes saved" : "ማስታወሻ ተቀምጧል")
    } catch {
      // silent fail
    }
    setSaving(false)
  }

  const handleBulkRfqStatus = async (status: string) => {
    if (selectedRfqs.length === 0) return
    setSaving(true)
    setError("")
    setSuccess("")
    try {
      await callAdminAction("manage_rfqs", { rfqIds: selectedRfqs, status })
      setSuccess(language === "en" ? `${selectedRfqs.length} RFQs updated to ${statusLabel(status, "en")}` : `${selectedRfqs.length} የዋጋ ጥያቄዎች ወደ ${statusLabel(status, "am")} ተቀይሯል`)
      setSelectedRfqs([])
      await fetchRfqs()
    } catch {
      // table/edge function may not be deployed yet - silent fail
    }
    setSaving(false)
  }

  const filtered = rfqs.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.requester_name.toLowerCase().includes(q) ||
      r.requester_email.toLowerCase().includes(q) ||
      r.requester_phone.includes(q) ||
      r.city.toLowerCase().includes(q)
    )
  })

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === "am" ? "am-ET" : "en-US", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    })
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
            placeholder={language === "en" ? "Search RFQs..." : "የዋጋ ጥያቄዎችን ይፈልጉ..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === "en" ? "All" : "ሁሉም"}</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchRfqs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center">
          <SearchX className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">
            {language === "en" ? "No RFQs found" : "ምንም የዋጋ ጥያቄ አልተገኘም"}
          </p>
        </div>
      ) : (
        <>
          {selectedRfqs.length > 0 && (
           <div className={`flex gap-2 mb-2 p-2 bg-accent/5 border rounded ${isMobile ? "flex-col" : "items-center"}`}>
            <span className="text-sm">{selectedRfqs.length} {language === "en" ? "selected" : "ተመረጡ ሲሆን"}</span>
            <Select onValueChange={handleBulkRfqStatus} defaultValue="">
              <SelectTrigger className="h-7 w-36 text-xs">
                <SelectValue placeholder={language === "en" ? "Apply status…" : "ሁኔታ አትይ…"} />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">{statusLabel(s, language)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" onClick={() => setSelectedRfqs([])}>{language === "en" ? "Clear" : "አጽዝ"}</Button>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            {filtered.map((rfq) => (
              <Card
                key={rfq.id}
                className={`cursor-pointer transition-all hover:border-accent/50 ${selectedRfq?.id === rfq.id ? "border-accent ring-1 ring-accent" : ""}`}
                onClick={() => { setSelectedRfq(rfq); setAdminNotes(rfq.admin_notes || "") }}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 shrink-0">
                      <Checkbox
                        checked={selectedRfqs.includes(rfq.id)}
                        onCheckedChange={(checked) => {
                          setSelectedRfqs(checked ? [...selectedRfqs, rfq.id] : selectedRfqs.filter((i) => i !== rfq.id))
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{rfq.requester_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{rfq.requester_email} • {rfq.requester_phone}</p>
                      <p className="text-xs text-muted-foreground mt-1">{rfq.city} • {formatDate(rfq.created_at)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">{rfq.source_type}</Badge>
                        <Badge variant={statusColors[rfq.status] || "outline"} className="text-[10px]">{statusLabel(rfq.status, language)}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Select
                        value={rfq.status}
                        onValueChange={(v) => handleStatusChange(rfq.id, v)}
                        onOpenChange={(open) => { if (open) setSelectedRfq(rfq) }}
                      >
                        <SelectTrigger className="h-7 w-24 text-[10px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((s) => (
                            <SelectItem key={s} value={s} className="text-xs">{statusLabel(s, language)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {rfq.rfq_items && rfq.rfq_items.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground line-clamp-1">
                      {rfq.rfq_items.map((item) => item.material_name).join(", ")}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div>
            {selectedRfq ? (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{selectedRfq.requester_name}</h3>
                    <Badge variant={statusColors[selectedRfq.status] || "outline"}>{statusLabel(selectedRfq.status, language)}</Badge>
                  </div>

                  <div className={`grid gap-2 text-sm ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
                    <div>
                      <p className="text-xs text-muted-foreground">{language === "en" ? "Email" : "ኢሜይል"}</p>
                      <p className="font-medium truncate">{selectedRfq.requester_email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{language === "en" ? "Phone" : "ስልክ"}</p>
                      <p className="font-medium">{selectedRfq.requester_phone || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{language === "en" ? "City" : "ከተማ"}</p>
                      <p className="font-medium">{selectedRfq.city}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{language === "en" ? "Source" : "ምንጭ"}</p>
                      <p className="font-medium">{selectedRfq.source_type}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">{language === "en" ? "Date" : "ቀን"}</p>
                      <p className="font-medium">{formatDate(selectedRfq.created_at)}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{language === "en" ? "Status" : "ሁኔታ"}</p>
                    <Select
                      value={selectedRfq.status}
                      onValueChange={(v) => handleStatusChange(selectedRfq.id, v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((s) => (
  <SelectItem key={s} value={s}>{statusLabel(s, language)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedRfq.rfq_items && selectedRfq.rfq_items.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{language === "en" ? "Requested Items" : "የተጠየቁ ቁሳቁሶች"}</p>
                      <div className="rounded-lg border divide-y">
                        {selectedRfq.rfq_items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between p-2 text-sm">
                            <div>
                              <p className="font-medium">{item.material_name}</p>
                              {item.specification && <p className="text-xs text-muted-foreground">{item.specification}</p>}
                            </div>
                            <div className="text-right">
                              <p className="font-mono">{item.quantity} {item.unit}</p>
                              {item.target_price > 0 && <p className="text-xs text-muted-foreground">{item.target_price.toLocaleString()} ETB</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label>{language === "en" ? "Admin Notes" : "የአስተዳዳሪ ማስታወሻ"}</Label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                      className="mt-1"
                      placeholder={language === "en" ? "Internal notes about this RFQ..." : "ስለዚህ የዋጋ ጥያቄ የውስጥ ማስታወሻ..."}
                    />
                    <Button size="sm" variant="outline" onClick={handleSaveNotes} disabled={saving} className="mt-2">
                      <MessageSquare className="h-3.5 w-3.5 mr-1" />
                      {language === "en" ? "Save Notes" : "ማስታወሻ አስቀምጥ"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground">
                <div className="text-center">
                  <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{language === "en" ? "Select an RFQ to view details" : "ዝርዝሮችን ለማየት RFQ ይምረጡ"}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        </>
      )}
    </div>
  )
}
