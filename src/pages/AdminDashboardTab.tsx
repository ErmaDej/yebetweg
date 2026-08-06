import { useEffect, useMemo, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { useLanguage } from "@/lib/i18n"
import { Edit, Eye, Ban, TrendingUp, DollarSign, Users, ShieldCheck, Loader2, Newspaper, Megaphone, PackageCheck, UserCheck, RefreshCw, AlertTriangle, ClipboardList, ChevronDown, ChevronRight, Trash2, CheckCircle, XCircle, Plus, Save, Search, type LucideIcon } from "lucide-react"
import { callAdminAction } from "@/lib/api"
import { useIsMobile } from "@/hooks/use-mobile"
import { supabase } from "@/lib/supabase"
import { useAdminOperationalSummary } from "@/hooks/useAdminOperationalSummary"
import { MarketPriceManager } from "@/components/admin/MarketPriceManager"
import { RfqManager } from "@/components/admin/RfqManager"

type AdminMetricKey =
  | "users"
  | "subscriptions"
  | "payments"
  | "pendingListings"
  | "professionals"
  | "inquiries"
  | "rfqs"
  | "blogs"
  | "ads"

type AdminMetrics = Record<AdminMetricKey, number>

const emptyMetrics: AdminMetrics = {
  users: 0,
  subscriptions: 0,
  payments: 0,
  pendingListings: 0,
  professionals: 0,
  inquiries: 0,
  rfqs: 0,
  blogs: 0,
  ads: 0,
}

type AdminActionResult = {
  action: string
  data?: unknown[]
  message?: string
}

export function AdminDashboardTab() {
  const { language } = useLanguage()
  const { summary, loading: summaryLoading, error: summaryError, refetch: refetchSummary } = useAdminOperationalSummary()
  const [loading, setLoading] = useState(false)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<AdminMetrics>(emptyMetrics)
  const [actionInFlight, setActionInFlight] = useState<string | null>(null)
  const [actionResult, setActionResult] = useState<AdminActionResult | null>(null)
  const [editingRecord, setEditingRecord] = useState<Record<string, any> | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createAction, setCreateAction] = useState<string>("")
  const [selectedListings, setSelectedListings] = useState<string[]>([])
  const isMobile = useIsMobile()

  const safeCount = async (table: string, query?: (q: any) => any) => {
    try {
      let q = supabase.from(table).select("id", { count: "exact", head: true })
      if (query) q = query(q)
      const { count } = await q
      return count || 0
    } catch {
      return 0
    }
  }

  const loadMetrics = async () => {
    setMetricsLoading(true)
    setError(null)
    try {
      const [
        users, subscriptions, payments, pendingListings,
        professionals, inquiries, rfqs, blogs, ads,
      ] = await Promise.all([
        safeCount("users"),
        safeCount("premium_subscriptions", (q) => q.eq("is_active", true)),
        safeCount("subscription_payments"),
        safeCount("listings", (q) => q.eq("status", "pending")),
        safeCount("professionals"),
        safeCount("inquiries", (q) => q.eq("is_read", false)),
        safeCount("rfq_requests", (q) => q.eq("status", "new")),
        safeCount("blogs"),
        safeCount("ads"),
      ])

      setMetrics({
        users, subscriptions, payments, pendingListings,
        professionals, inquiries, rfqs, blogs, ads,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load admin metrics.")
    } finally {
      setMetricsLoading(false)
    }
  }

  useEffect(() => {
    loadMetrics()
  }, [])

  const operationalHealth = useMemo(() => {
    if (metrics.pendingListings > 5 || metrics.inquiries > 10 || metrics.rfqs > 10 || summary.churnRisk > 5) return "attention"
    if (metrics.subscriptions > 0 && metrics.users > 0) return "healthy"
    return "warming"
  }, [metrics, summary])

  const handleAction = async (action: string) => {
    setLoading(true)
    setActionInFlight(action)
    setError(null)
    setSuccessMessage(null)
    setActionResult(null)
    try {
      const result = await callAdminAction(action)
      setActionResult({
        action,
        data: Array.isArray(result?.data) ? result.data : undefined,
        message: result?.message,
      })
      await loadMetrics()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.")
    } finally {
      setLoading(false)
      setActionInFlight(null)
    }
  }

  const handleActionWithPayload = async (action: string, payload: Record<string, any>) => {
    setLoading(true)
    setError(null)
    setSuccessMessage(null)
    const isDelete = payload.delete
    const isSave = payload.id && !payload.delete
    const isCreate = !payload.id && !payload.delete
    try {
      await callAdminAction(action, payload)
      if (isCreate) {
        setSuccessMessage(
          language === "en"
            ? `${action.replaceAll("_", " ")} — created`
            : `${action} — ተፈጠረ`
        )
      } else if (isSave) {
        setSuccessMessage(
          language === "en"
            ? `${action.replaceAll("_", " ")} — saved`
            : `${action} — ተቀምጧል`
        )
      } else if (isDelete) {
        setSuccessMessage(
          language === "en"
            ? `${action.replaceAll("_", " ")} — deleted`
            : `${action} — ተሰርዟል`
        )
      }
      await loadMetrics()
      if (actionResult?.action === action && actionResult.data) {
        const result = await callAdminAction(action)
        setActionResult({
          action,
          data: Array.isArray(result?.data) ? result.data : undefined,
          message: result?.message,
        })
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  const handleBulkListing = async (status: string) => {
    if (selectedListings.length === 0) return
    setLoading(true)
    setError(null)
    setSuccessMessage(null)
    try {
      await callAdminAction("moderate_listings", { listingIds: selectedListings, status })
      setSuccessMessage(`${selectedListings.length} listings updated to ${status}`)
      setSelectedListings([])
      const result = await callAdminAction("moderate_listings")
      setActionResult({
        action: "moderate_listings",
        data: Array.isArray(result?.data) ? result.data : undefined,
        message: result?.message,
      })
      await loadMetrics()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update listings.")
    } finally {
      setLoading(false)
    }
  }

  const ActionButton = ({
    action,
    icon: Icon,
    label,
    variant = "outline",
  }: {
    action: string
    icon: LucideIcon
    label: string
    variant?: "default" | "outline" | "destructive"
  }) => (
    <Button onClick={() => handleAction(action)} disabled={loading} variant={variant} className="justify-start gap-2">
      {actionInFlight === action ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {label}
    </Button>
  )

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {successMessage && (
        <Alert className="border-green-400 bg-green-100 text-green-700">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { key: "users", icon: Users, label: language === "en" ? "Users" : "ተጠቃሚዎች", tone: "text-blue-500" },
          { key: "subscriptions", icon: ShieldCheck, label: language === "en" ? "Active plans" : "ንቁ እቅዶች", tone: "text-emerald-500" },
          { key: "pendingListings", icon: PackageCheck, label: language === "en" ? "Pending listings" : "በግምገማ ያሉ", tone: "text-amber-500" },
          { key: "inquiries", icon: AlertTriangle, label: language === "en" ? "Unread inquiries" : "ያልተነበቡ", tone: "text-rose-500" },
          { key: "rfqs", icon: ClipboardList, label: language === "en" ? "New RFQs" : "አዲስ የዋጋ ጥያቄዎች", tone: "text-cyan-500" },
        ].map((item) => (
          <Card key={item.key}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-muted p-3">
                  <item.icon className={`h-5 w-5 ${item.tone}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="text-2xl font-bold">
                    {metricsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : metrics[item.key as AdminMetricKey]}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{language === "en" ? "Operational Summary" : "የኦፕሬሽን ስምምል"}</CardTitle>
            <CardDescription>
              {language === "en"
                ? "Service-role counts for RFQs, verifications, and churn risk"
                : "የዋጋ ጥያቄዎች፣ ማረጋገጥ እና የተለየ ጊዜ ቁጥሮች"}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={refetchSummary} disabled={summaryLoading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${summaryLoading ? "animate-spin" : ""}`} />
            {language === "en" ? "Refresh" : "አድሲ"}
          </Button>
        </CardHeader>
        <CardContent>
          {summaryError && (
            <Alert variant="destructive">
              <AlertDescription>{summaryError}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <OperationalSummaryStat
              icon={ClipboardList}
              label={language === "en" ? "New RFQs" : "አዲስ የዋጋ ጥያቄዎች"}
              value={summary.newRfqs}
              today={summary.newRfqsToday}
              todayLabel={language === "en" ? "today" : "ዛሬ"}
              loading={summaryLoading}
            />
            <OperationalSummaryStat
              icon={UserCheck}
              label={language === "en" ? "Pending verifications" : "በመረጃ ያሉ"}
              value={summary.pendingVerifications}
              loading={summaryLoading}
            />
            <OperationalSummaryStat
              icon={TrendingUp}
              label={language === "en" ? "Churn risk" : "የተለየ ጊዜ"}
              value={summary.churnRisk}
              subLabel={language === "en" ? `${summary.expiringSoon} expiring soon` : `${summary.expiringSoon} በቅርብ ያል᎒ዘጠነ`}
              loading={summaryLoading}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{language === "en" ? "Operations Overview" : "የኦፕሬሽን ግምገማ"}</CardTitle>
            <CardDescription>
              {language === "en" ? "Live counts for content, payments, users, and moderation queues" : "የይዘት፣ ክፍያ፣ ተጠቃሚ እና ግምገማ ቀጥታ ቁጥሮች"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={operationalHealth === "attention" ? "destructive" : "outline"}>
              {operationalHealth === "attention"
                ? language === "en" ? "Needs review" : "ግምገማ ያስፈልጋል"
                : operationalHealth === "healthy"
                  ? language === "en" ? "Healthy" : "ጤናማ"
                  : language === "en" ? "Warming up" : "በመነሳት ላይ"}
            </Badge>
            <Button variant="outline" size="sm" onClick={loadMetrics} disabled={metricsLoading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${metricsLoading ? "animate-spin" : ""}`} />
              {language === "en" ? "Refresh" : "አድስ"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: language === "en" ? "Blogs" : "ብሎጎች", value: metrics.blogs, icon: Newspaper },
            { label: language === "en" ? "Ads" : "ማስታወቂያ", value: metrics.ads, icon: Megaphone },
            { label: language === "en" ? "Professionals" : "ባለሙያዎች", value: metrics.professionals, icon: UserCheck },
            { label: language === "en" ? "Payments" : "ክፍያዎች", value: metrics.payments, icon: DollarSign },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-lg border border-border/60 p-4">
              <Icon className="mb-3 h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {actionResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {language === "en" ? "Action Result" : "የእርምጃ ውጤት"}
                </CardTitle>
                <CardDescription>
                  {actionResult.message ||
                    (language === "en"
                      ? `${actionResult.action.replaceAll("_", " ")} returned ${actionResult.data?.length ?? 0} records.`
                      : `${actionResult.action} ${actionResult.data?.length ?? 0} መዝገቦችን አመጣ።`)}
                </CardDescription>
              </div>
              {(actionResult.action === "manage_blogs" || actionResult.action === "manage_tips" || actionResult.action === "manage_ads") && (
                <Button size="sm" className="gap-2" onClick={() => { setCreateAction(actionResult.action); setCreateDialogOpen(true) }}>
                  <Plus className="h-4 w-4" />
                  {language === "en" ? "Create New" : "አዲስ ፍጠር"}
                </Button>
              )}
            </div>
          </CardHeader>
          {actionResult.data && actionResult.data.length > 0 && (
            <CardContent>
              {actionResult.action === "moderate_listings" && (() => {
                const currentIds = (actionResult.data || []).map((d) => (d as Record<string, any>).id)
                return (
                  <div className="flex items-center justify-between py-2 border-b">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={currentIds.length > 0 && selectedListings.length === currentIds.length}
                        onCheckedChange={(checked) => setSelectedListings(checked ? currentIds : [])}
                      />
                      <span className="text-sm">{selectedListings.length} / {currentIds.length} selected</span>
                    </div>
                    {selectedListings.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <Button size="sm" variant="ghost" className="text-green-600" onClick={() => handleBulkListing("approved")} disabled={loading} aria-label="Approve selected">
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span className={isMobile ? "sr-only" : ""}>{language === "en" ? "Approve selected" : "መረጡትን አጽድቅ"}</span>
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleBulkListing("rejected")} disabled={loading} aria-label="Reject selected">
                          <XCircle className="h-3.5 w-3.5" />
                          <span className={isMobile ? "sr-only" : ""}>{language === "en" ? "Reject selected" : "መረጡትን አልተቀበለም"}</span>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedListings([])} disabled={loading} aria-label={language === "en" ? "Clear" : "አጽዝ"}>
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className={isMobile ? "sr-only" : ""}>{language === "en" ? "Clear" : "አጽዝ"}</span>
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })()}
              <div className="max-h-72 overflow-auto rounded-lg border border-border/60">
                <div className="min-w-[600px] divide-y divide-border/60">
                  {actionResult.data.slice(0, 10).map((record, index) => {
                    const item = record as Record<string, any>
                    const action = actionResult.action
                    return (
                      <div key={item.id || index} className={`flex gap-3 p-3 text-sm ${isMobile ? "flex-col" : "items-center justify-between"}`}>
                        {action === "moderate_listings" && (
                          <Checkbox
                            checked={selectedListings.includes(item.id)}
                            onCheckedChange={(checked) => {
                              const id = item.id as string
                              setSelectedListings(checked ? [...selectedListings, id] : selectedListings.filter((i) => i !== id))
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {item.title_en || item.name || item.requester_name || item.email || item.username || item.advertiser || item.reference || item.id}
                          </p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {item.requester_phone || item.category || item.specialty || item.status || item.position || item.method || item.created_at}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {item.status && <Badge variant="outline">{item.status}</Badge>}
                          {action === "moderate_listings" && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-green-500" title={language === "en" ? "Approve" : "አጽድቅ"} onClick={() => handleActionWithPayload("moderate_listings", { listingId: item.id, status: "approved" })}>
                                <CheckCircle className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title={language === "en" ? "Reject" : "አልተቀበለም"} onClick={() => handleActionWithPayload("moderate_listings", { listingId: item.id, status: "rejected" })}>
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          {action === "verify_professionals" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-500" title={language === "en" ? "Verify" : "አረጋግጥ"} onClick={() => handleActionWithPayload("verify_professionals", { professionalId: item.id, verified: !item.is_verified })}>
                              <ShieldCheck className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {action === "ban_users" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title={language === "en" ? "Ban/Suspend" : "አግድ/አስቁም"} onClick={() => handleActionWithPayload("ban_users", { userId: item.id, status: item.status === "active" ? "suspended" : "active" })}>
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {(action === "manage_blogs" || action === "manage_tips" || action === "manage_ads") && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500" title={language === "en" ? "Edit" : "አርትዕ"} onClick={() => { setEditingRecord(item); setEditDialogOpen(true) }}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title={language === "en" ? "Delete" : "ሰርዝ"} onClick={() => handleActionWithPayload(action, { id: item.id, delete: true })}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{language === "en" ? "Content Management" : "ይዘት አስተዳደር"}</CardTitle>
          <CardDescription>
            {language === "en" ? "Manage articles, tips, and advertisements" : "ጽሑፎችን፣ ምክሮችን እና ማስታወቂያዎችን አስተዳድር"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ActionButton action="manage_blogs" icon={Edit} label={language === "en" ? "Manage Blogs" : "ብሎጎችን አስተዳድር"} />
          <ActionButton action="manage_tips" icon={Edit} label={language === "en" ? "Manage Tips" : "ምክሮችን አስተዳድር"} />
          <ActionButton action="manage_ads" icon={Edit} label={language === "en" ? "Manage Ads" : "ማስታወቂያዎችን አስተዳድር"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{language === "en" ? "Marketplace & Professionals" : "ገበያ እና ባለሙያዎች"}</CardTitle>
          <CardDescription>
            {language === "en" ? "Moderate listings and professional profiles" : "ዝርዝሮችን እና የባለሙያ መገለጫዎችን አጣራ"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ActionButton action="moderate_listings" icon={Eye} label={language === "en" ? "Moderate Listings" : "ዝርዝሮችን አጣራ"} variant={metrics.pendingListings > 0 ? "default" : "outline"} />
          <ActionButton action="manage_rfqs" icon={ClipboardList} label={language === "en" ? "Manage RFQs" : "የዋጋ ጥያቄዎች"} variant={metrics.rfqs > 0 ? "default" : "outline"} />
          <ActionButton action="verify_professionals" icon={ShieldCheck} label={language === "en" ? "Verify Professionals" : "ባለሙያዎችን አረጋግጥ"} />
          <ActionButton action="ban_users" icon={Ban} label={language === "en" ? "Ban/Suspend Users" : "ተጠቃሚዎችን አግድ/አስቁም"} variant="destructive" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{language === "en" ? "User & System Management" : "ተጠቃሚ እና ስርዓት አስተዳደር"}</CardTitle>
          <CardDescription>
            {language === "en" ? "Manage user accounts, roles, and system settings" : "የተጠቃሚ መለያዎችን፣ ሚናዎችን እና የስርዓት ቅንብሮችን አስተዳድር"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ActionButton action="manage_users" icon={Users} label={language === "en" ? "Manage Users" : "ተጠቃሚዎችን አስተዳድር"} />
          <ActionButton action="view_analytics" icon={TrendingUp} label={language === "en" ? "View Analytics" : "ትንታኔዎችን እይ"} />
          <ActionButton action="manage_payments" icon={DollarSign} label={language === "en" ? "Manage Payments" : "ክፍያዎችን አስተዳድር"} />
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {language === "en" ? `Edit ${actionResult?.action?.replace("manage_", "") ?? ""}` : `${actionResult?.action?.replace("manage_", "") ?? ""} አርትዕ`}
            </DialogTitle>
            <DialogDescription>
              {language === "en" ? "Edit the fields below and save." : "ከታች ያሉትን መስኮች ያርትዑ እና ያስቀምጡ።"}
            </DialogDescription>
          </DialogHeader>
          {editingRecord && actionResult && (
            <ContentForm
              action={actionResult.action}
              record={editingRecord}
              language={language}
              onCancel={() => setEditDialogOpen(false)}
              onSave={async (payload) => {
                await handleActionWithPayload(actionResult.action, { ...payload, id: editingRecord.id })
                setEditDialogOpen(false)
                setEditingRecord(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {language === "en" ? `New ${createAction.replace("manage_", "") ?? ""}` : `አዲስ ${createAction.replace("manage_", "") ?? ""}`}
            </DialogTitle>
            <DialogDescription>
              {language === "en" ? "Fill in the fields below to create a new record." : "አዲስ መዝገብ ለመፍጠር ከታች ያሉትን መስኮች ይሙሉ።"}
            </DialogDescription>
          </DialogHeader>
          {createAction && (
            <ContentForm
              action={createAction}
              record={{}}
              language={language}
              onCancel={() => setCreateDialogOpen(false)}
              onSave={async (payload) => {
                await handleActionWithPayload(createAction, payload)
                setCreateDialogOpen(false)
                setCreateAction("")
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <ExpandableSection title={language === "en" ? "Market Price Management" : "የገበያ ዋጋ አስተዳደር"} defaultOpen={false}>
        <MarketPriceManager />
      </ExpandableSection>

      <ExpandableSection title={language === "en" ? "RFQ Management" : "የዋጋ ጥያቄ አስተዳደር"} defaultOpen={false}>
        <RfqManager />
      </ExpandableSection>

      <ExpandableSection title={language === "en" ? "User Management" : "ተጠቃሚ አስተዳደር"} defaultOpen={false}>
        <UserManagementSection language={language} />
      </ExpandableSection>
    </div>
  )
}

function ContentForm({
  action,
  record,
  language,
  onCancel,
  onSave,
}: {
  action: string
  record: Record<string, any>
  language: string
  onCancel: () => void
  onSave: (payload: Record<string, any>) => Promise<void>
}) {
  const [form, setForm] = useState<Record<string, any>>({ ...record })
  const [saving, setSaving] = useState(false)

  const set = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }))

  const isBlog = action === "manage_blogs"
  const isTip = action === "manage_tips"
  const isAd = action === "manage_ads"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: Record<string, any> = {}
      if (isBlog || isTip) {
        payload.title_en = form.title_en || ""
        payload.title_am = form.title_am || ""
        payload.content_en = form.content_en || ""
        payload.content_am = form.content_am || ""
        if (isBlog) {
          payload.excerpt_en = form.excerpt_en || ""
          payload.excerpt_am = form.excerpt_am || ""
          payload.author = form.author || ""
          payload.image_url = form.image_url || ""
        }
        payload.category = form.category || ""
        payload.tags = form.tags || ""
        payload.status = form.status || "published"
      }
      if (isAd) {
        payload.advertiser = form.advertiser || ""
        payload.image_url = form.image_url || ""
        payload.target_url = form.target_url || ""
        payload.position = form.position || "sidebar"
        payload.starts_at = form.starts_at || ""
        payload.ends_at = form.ends_at || ""
        payload.status = form.status || "active"
      }
      await onSave(payload)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(isBlog || isTip) && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === "en" ? "Title (EN)" : "ርዕስ (EN)"}</Label>
              <Input value={form.title_en || ""} onChange={(e) => set("title_en", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{language === "en" ? "Title (AM)" : "ርዕስ (AM)"}</Label>
              <Input value={form.title_am || ""} onChange={(e) => set("title_am", e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === "en" ? "Content (EN)" : "ይዘት (EN)"}</Label>
              <textarea
                className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.content_en || ""}
                onChange={(e) => set("content_en", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{language === "en" ? "Content (AM)" : "ይዘት (AM)"}</Label>
              <textarea
                className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.content_am || ""}
                onChange={(e) => set("content_am", e.target.value)}
                required
              />
            </div>
          </div>
          {isBlog && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === "en" ? "Excerpt (EN)" : "አጭር ገለጻ (EN)"}</Label>
                  <Input value={form.excerpt_en || ""} onChange={(e) => set("excerpt_en", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{language === "en" ? "Excerpt (AM)" : "አጭር ገለጻ (AM)"}</Label>
                  <Input value={form.excerpt_am || ""} onChange={(e) => set("excerpt_am", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === "en" ? "Author" : "ደራሲ"}</Label>
                  <Input value={form.author || ""} onChange={(e) => set("author", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{language === "en" ? "Image URL" : "የምስል መጠቆሚያ"}</Label>
                  <Input value={form.image_url || ""} onChange={(e) => set("image_url", e.target.value)} />
                </div>
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === "en" ? "Category" : "ምድብ"}</Label>
              <Input value={form.category || ""} onChange={(e) => set("category", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{language === "en" ? "Tags" : "መለያዎች"}</Label>
              <Input value={form.tags || ""} onChange={(e) => set("tags", e.target.value)} placeholder="comma,separated" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{language === "en" ? "Status" : "ሁኔታ"}</Label>
            <Select value={form.status || "published"} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="published">{language === "en" ? "Published" : "የታተመ"}</SelectItem>
                <SelectItem value="draft">{language === "en" ? "Draft" : "ረቂቅ"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
      {isAd && (
        <>
          <div className="space-y-2">
            <Label>{language === "en" ? "Advertiser" : "አስተዋዋቂ"}</Label>
            <Input value={form.advertiser || ""} onChange={(e) => set("advertiser", e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === "en" ? "Image URL" : "የምስል መጠቆሚያ"}</Label>
              <Input value={form.image_url || ""} onChange={(e) => set("image_url", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{language === "en" ? "Target URL" : "ዒላማ መጠቆሚያ"}</Label>
              <Input value={form.target_url || ""} onChange={(e) => set("target_url", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{language === "en" ? "Position" : "ቦታ"}</Label>
            <Select value={form.position || "sidebar"} onValueChange={(v) => set("position", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sidebar">{language === "en" ? "Sidebar" : "የጎን አሞሌ"}</SelectItem>
                <SelectItem value="banner">{language === "en" ? "Banner" : "ሰንደቅ"}</SelectItem>
                <SelectItem value="inline">{language === "en" ? "Inline" : "መካከል"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === "en" ? "Start Date" : "የመጀመሪያ ቀን"}</Label>
              <Input type="date" value={form.starts_at?.split("T")[0] || ""} onChange={(e) => set("starts_at", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{language === "en" ? "End Date" : "የመጨረሻ ቀን"}</Label>
              <Input type="date" value={form.ends_at?.split("T")[0] || ""} onChange={(e) => set("ends_at", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{language === "en" ? "Status" : "ሁኔታ"}</Label>
            <Select value={form.status || "active"} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{language === "en" ? "Active" : "ንቁ"}</SelectItem>
                <SelectItem value="inactive">{language === "en" ? "Inactive" : "ያልተንቀሳቃሽ"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {language === "en" ? "Cancel" : "ሰርዝ"}
        </Button>
        <Button type="submit" disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {language === "en" ? "Save" : "አስቀምጥ"}
        </Button>
      </div>
    </form>
  )
}

function UserManagementSection({ language }: { language: string }) {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [updating, setUpdating] = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const result = await callAdminAction("manage_users")
      if (Array.isArray(result?.data)) {
        setUsers(result.data.map((u: any) => ({
          id: u.id,
          username: u.username || "",
          email: u.email || "",
          role: u.role || "user",
          status: u.status || "active",
          created_at: u.created_at || "",
        })))
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdating(userId)
    try {
      await callAdminAction("ban_users", { userId, role: newRole })
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u))
    } catch {
      // silently fail
    } finally {
      setUpdating(null)
    }
  }

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    setStatusUpdating(userId)
    const newStatus = currentStatus === "active" ? "suspended" : "active"
    try {
      await callAdminAction("ban_users", { userId, status: newStatus })
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: newStatus } : u))
    } catch {
      // silently fail
    } finally {
      setStatusUpdating(null)
    }
  }

  const filtered = search
    ? users.filter((u) =>
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={language === "en" ? "Search users..." : "ተጠቃሚዎችን ፈልግ..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {language === "en" ? "Refresh" : "አድስ"}
        </Button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {language === "en" ? "No users found." : "ምንም ተጠቃሚ አልተገኘም።"}
        </p>
      ) : (
        <div className="max-h-80 overflow-auto rounded-lg border border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{language === "en" ? "Username" : "የተጠቃሚ ስም"}</TableHead>
                <TableHead>{language === "en" ? "Email" : "ኢሜይል"}</TableHead>
                <TableHead>{language === "en" ? "Role" : "ሚና"}</TableHead>
                <TableHead>{language === "en" ? "Status" : "ሁኔታ"}</TableHead>
                <TableHead>{language === "en" ? "Joined" : "የተቀላቀለበት"}</TableHead>
                <TableHead className="text-right">{language === "en" ? "Actions" : "እርምጃ"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Select
                      value={u.role}
                      onValueChange={(v) => handleRoleChange(u.id, v)}
                      disabled={updating === u.id}
                    >
                      <SelectTrigger className="h-8 w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">user</SelectItem>
                        <SelectItem value="premium">premium</SelectItem>
                        <SelectItem value="pro">pro</SelectItem>
                        <SelectItem value="admin">admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.status === "active" ? "outline" : "destructive"}>
                      {u.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-7 w-7 ${u.status === "active" ? "text-destructive" : "text-green-500"}`}
                      title={u.status === "active"
                        ? (language === "en" ? "Suspend" : "አስቁም")
                        : (language === "en" ? "Activate" : "አንቃ")}
                      onClick={() => handleToggleStatus(u.id, u.status)}
                      disabled={statusUpdating === u.id}
                    >
                      {statusUpdating === u.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Ban className="h-3.5 w-3.5" />
                      }
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function ExpandableSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card>
      <CardHeader className="cursor-pointer select-none" onClick={() => setOpen(!open)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          {open ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
        </div>
      </CardHeader>
      {open && (
        <CardContent>
          {children}
        </CardContent>
      )}
    </Card>
  )
}

function OperationalSummaryStat({
  icon: Icon,
  label,
  value,
  today,
  todayLabel,
  subLabel,
  loading,
}: {
  icon: LucideIcon
  label: string
  value: number
  today?: number
  todayLabel?: string
  subLabel?: string
  loading: boolean
}) {
  return (
    <div className="rounded-lg border border-border/60 p-4">
      <Icon className="mb-2 h-5 w-5 text-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-bold">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : value}</p>
        {today !== undefined && today > 0 && todayLabel && (
          <Badge variant="secondary" className="text-[10px]">
            {today} {todayLabel}
          </Badge>
        )}
      </div>
      {subLabel && <p className="mt-1 text-xs text-muted-foreground">{subLabel}</p>}
    </div>
  )
}
