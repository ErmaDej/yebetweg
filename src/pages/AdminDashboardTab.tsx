import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/lib/i18n"
import { Edit, Eye, Ban, TrendingUp, DollarSign, Users, ShieldCheck, Loader2, Newspaper, Megaphone, PackageCheck, UserCheck, RefreshCw, AlertTriangle, ClipboardList, ChevronDown, ChevronRight, type LucideIcon } from "lucide-react"
import { callAdminAction } from "@/lib/api"
import { supabase } from "@/lib/supabase"
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
  const [loading, setLoading] = useState(false)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<AdminMetrics>(emptyMetrics)
  const [actionInFlight, setActionInFlight] = useState<string | null>(null)
  const [actionResult, setActionResult] = useState<AdminActionResult | null>(null)

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
    if (metrics.pendingListings > 5 || metrics.inquiries > 10 || metrics.rfqs > 10) return "attention"
    if (metrics.subscriptions > 0 && metrics.users > 0) return "healthy"
    return "warming"
  }, [metrics])

  const handleAction = async (action: string) => {
    setLoading(true)
    setActionInFlight(action)
    setError(null)
    setSuccessMessage(null)
    setActionResult(null)
    try {
      const result = await callAdminAction(action)
      const message =
        language === "en"
          ? `Successfully performed ${action.replaceAll("_", " ")}`
          : `ተገቢው እርምጃ ${action} ተፈጸመ`
      setSuccessMessage(message)
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
            <CardTitle className="text-lg">
              {language === "en" ? "Action Result" : "የእርምጃ ውጤት"}
            </CardTitle>
            <CardDescription>
              {actionResult.message ||
                (language === "en"
                  ? `${actionResult.action.replaceAll("_", " ")} returned ${actionResult.data?.length ?? 0} records.`
                  : `${actionResult.action} ${actionResult.data?.length ?? 0} መዝገቦችን አመጣ።`)}
            </CardDescription>
          </CardHeader>
          {actionResult.data && actionResult.data.length > 0 && (
            <CardContent>
              <div className="max-h-72 overflow-auto rounded-lg border border-border/60">
                <div className="min-w-[520px] divide-y divide-border/60">
                  {actionResult.data.slice(0, 10).map((record, index) => {
                    const item = record as Record<string, any>
                    return (
                      <div key={item.id || index} className="grid grid-cols-[1fr_auto] gap-3 p-3 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {item.title_en || item.name || item.requester_name || item.email || item.username || item.advertiser || item.reference || item.id}
                          </p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {item.requester_phone || item.category || item.specialty || item.status || item.position || item.method || item.created_at}
                          </p>
                        </div>
                        {item.status && <Badge variant="outline">{item.status}</Badge>}
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

      <ExpandableSection title={language === "en" ? "Market Price Management" : "የገበያ ዋጋ አስተዳደር"} defaultOpen={false}>
        <MarketPriceManager />
      </ExpandableSection>

      <ExpandableSection title={language === "en" ? "RFQ Management" : "የዋጋ ጥያቄ አስተዳደር"} defaultOpen={false}>
        <RfqManager />
      </ExpandableSection>
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
