import { useState, useMemo } from "react"
import { useRequireAuth } from "@/components/ProtectedRoute"
import { useSubscription, useUserProfile } from "@/hooks/useUserProfile"
import { useLanguage, type TranslationKey } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Crown, Heart, LogOut, Settings, User, ShieldCheck, TrendingUp, Zap, CheckCircle2, AlertTriangle, ArrowRight, Bell, FileText, PackageCheck, ReceiptText, Sparkles, ClipboardList, ArrowDownAZ, Users, Store, Newspaper, Bot, type LucideIcon } from "lucide-react"
import { useAuthContext } from "@/context/AuthContext"
import { Loader2 } from "lucide-react"
import { navigateTo } from "@/lib/navigation"
import { AdminDashboardTab } from "./AdminDashboardTab"
import { Progress } from "@/components/ui/progress"
import { useDashboardData, buildActivityFeed, type ActivityKind } from "@/hooks/useDashboardData"
import { profileStrength, roleKeyFor, planBenefits } from "@/lib/entitlements"
import { RfqModal } from "@/components/sections/RfqModal"

export function Dashboard() {
  const { language, t } = useLanguage()
  const { isAuthenticated, loading: authLoading } = useRequireAuth()
  const { profile, loading: profileLoading, error, updateProfile } = useUserProfile()
  const { subscription, loading: subscriptionLoading, error: subscriptionError } = useSubscription(profile)
  const { signOut } = useAuthContext()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    language_preference: "en",
  })
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState("profile")
  const [activityFilter, setActivityFilter] = useState<"all" | ActivityKind>("all")
  const [activitySort, setActivitySort] = useState<"newest" | "oldest">("newest")
  const [rfqModalOpen, setRfqModalOpen] = useState(false)
  const {
    data: dashboardData,
    loading: statsLoading,
    loadingMore: activityLoadingMore,
    error: statsError,
    hasMore: activityHasMore,
    loadMore: loadMoreActivity,
  } = useDashboardData(profile?.id ?? null)

  const handleEditClick = () => {
    if (!profile) return
    setEditForm({
      full_name: profile.full_name || "",
      phone: profile.phone || "",
      language_preference: profile.language_preference || "en",
    })
    setIsEditing(true)
  }

  const handleSaveProfile = async () => {
    if (!profile) return
    setSaveMessage(null)
    setIsSaving(true)

    const result = await updateProfile({
      full_name: editForm.full_name,
      phone: editForm.phone,
      language_preference: editForm.language_preference,
    })

    if (result.error) {
      setSaveMessage({ type: "error", text: result.error })
    } else {
      setSaveMessage({
        type: "success",
        text: language === "en" ? "Profile updated successfully!" : "መልካም ሁኔታ ተዘምን!",
      })
      setIsEditing(false)
    }
    setIsSaving(false)
  }

  const handleSignOut = async () => {
    await signOut()
    navigateTo("/")
  }

  const roleKey = useMemo(() => roleKeyFor(profile, subscription), [profile, subscription?.tier])

  const planLabel = useMemo(() => {
    switch (roleKey) {
      case "admin":
        return t("dashboard.plan.admin")
      case "pro":
        return t("dashboard.plan.pro")
      case "premium":
        return t("dashboard.plan.premium")
      default:
        return t("dashboard.plan.free")
    }
  }, [roleKey, t])

  const planBenefitsList = useMemo(() => planBenefits(roleKey), [roleKey])

  const roleStyle = ROLE_STYLES[roleKey] || ROLE_STYLES.user

  const accessCta = useMemo(() => {
    switch (roleKey) {
      case "admin":
        return { label: t("dashboard.cta.reviewOps"), target: "/dashboard" }
      case "pro":
        return { label: t("dashboard.cta.explorePro"), target: "/dashboard" }
      case "premium":
        return { label: t("dashboard.cta.upgradeToPro"), target: "/#plans" }
      default:
        return { label: t("dashboard.cta.upgrade"), target: "/#plans" }
    }
  }, [roleKey, t])

  const planProgress = useMemo(() => {
    if (!subscription) return profile?.role === "admin" ? 100 : 20
    if (subscription.tier === "pro") return 100
    if (subscription.tier === "premium") return 68
    return 20
  }, [profile?.role, subscription])

  const purchasesCount = useMemo(() => {
    if (!dashboardData) return 0
    return dashboardData.stats.payments > 0 ? dashboardData.stats.payments : subscription ? 1 : 0
  }, [dashboardData, subscription])

  const profileGaps = useMemo(() => {
    if (!profile) return []
    return profileStrength(profile).missing
  }, [profile])

  const accessStrength = useMemo(() => {
    if (!profile) return 0
    return Math.round(planProgress * 0.6 + profileStrength(profile).score * 0.4)
  }, [planProgress, profile])

  const benefits = useMemo(() => {
    return planBenefits(roleKey).map((key) => t(key as TranslationKey))
  }, [roleKey, t])

  const activityFeed = useMemo(() => {
    if (!dashboardData) return []
    const feed = buildActivityFeed(dashboardData)
    const filtered = activityFilter === "all" ? feed : feed.filter((item) => item.kind === activityFilter)
    return [...filtered].sort((a, b) =>
      activitySort === "newest"
        ? b.createdAt.localeCompare(a.createdAt)
        : a.createdAt.localeCompare(b.createdAt)
    )
  }, [dashboardData, activityFilter, activitySort])

  const actionHandlers: Record<QuickActionKey, () => void> = {
    submitRfq: () => setRfqModalOpen(true),
    market: () => navigateTo("/#market"),
    marketplace: () => navigateTo("/#marketplace"),
    professionals: () => navigateTo("/#professionals"),
    upgrade: () => navigateTo("/#plans"),
    adminConsole: () => setActiveTab("admin"),
    reviewContent: () => setActiveTab("admin"),
  }

  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">{language === "en" ? "Please sign in" : "እባክዎ ይግቡ"}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 rounded-lg border border-border/60 bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge className={`gap-1 capitalize ${roleStyle.badge}`}>
                  <roleStyle.icon className="h-3 w-3" />
                  {roleStyle.label}
                </Badge>
                {(dashboardData?.stats.unread ?? 0) > 0 && (
                  <Badge className="gap-1 bg-amber-600 text-white">
                    <Bell className="h-3 w-3" />
                    {dashboardData?.stats.unread} {language === "en" ? "new" : "አዲስ"}
                  </Badge>
                )}
              </div>
               <h1 className="text-3xl font-bold">{t("dashboard.title")}</h1>
              <p className="mt-1 max-w-2xl text-muted-foreground">
                {profile.role === "admin"
                  ? language === "en"
                    ? "Command center for content, marketplace moderation, users, and payments."
                    : "ይዘት፣ ገበያ፣ ተጠቃሚዎች እና ክፍያዎችን የሚያስተዳድር ማዕከል።"
                  : subscription?.tier === "pro"
                    ? language === "en"
                      ? "Your pro workspace for marketplace leads, premium insights, and billing."
                      : "ለገበያ ጥያቄዎች፣ ፕሪሚየም ግንዛቤዎች እና ክፍያ የፕሮ መስሪያ ቦታዎ።"
                    : subscription?.tier === "premium"
                      ? language === "en"
                        ? "Track your premium access, listings, inquiries, and account activity."
                        : "የፕሪሚየም መዳረሻዎን፣ ዝርዝሮችን፣ ጥያቄዎችን እና እንቅስቃሴን ይከታተሉ።"
                      : language === "en"
                        ? "Manage your profile, listings, inquiries, and upgrade path."
                        : "መገለጫዎን፣ ዝርዝሮችን፣ ጥያቄዎችን እና የማሻሻያ መንገድን ያስተዳድሩ።"}
              </p>
            </div>
            <div className="min-w-64 rounded-lg bg-muted/70 p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
               <span className="font-medium">{t("dashboard.accessStrength")}</span>
               <span className="text-muted-foreground">{accessStrength}%</span>
              </div>
              <Progress value={accessStrength} />
              {profileGaps.length > 0 && (
                <button
                  onClick={() => setActiveTab("profile")}
                  className="mt-3 block w-full rounded-md border border-dashed border-border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
                >
                  {language === "en"
                    ? `Complete your profile: ${profileGaps.map((k) => PROFILE_FIELD_LABELS[k]?.en || k).join(", ")}`
                    : `መገለጫዎን ያጠናቅቁ: ${profileGaps.map((k) => PROFILE_FIELD_LABELS[k]?.am || k).join(", ")}`}
                </button>
              )}
               <Button className="mt-4 w-full gap-2" onClick={() => navigateTo(accessCta.target)}>
                 <Sparkles className="h-4 w-4" />
                 {accessCta.label}
               </Button>
            </div>
          </div>
        </div>

        {/* Plan Benefits */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              {t("dashboard.benefits.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {statsError && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{statsError}</AlertDescription>
          </Alert>
        )}

        {saveMessage && (
          <Alert variant={saveMessage.type === "success" ? "default" : "destructive"} className="mb-6">
            <AlertDescription>{saveMessage.text}</AlertDescription>
          </Alert>
        )}

        {/* Quick Stats */}
         <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${roleStyle.iconBg}`}>
                  <roleStyle.icon className={`h-6 w-6 ${roleStyle.iconColor}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("dashboard.stat.plan")}</p>
                  <p className="text-2xl font-bold capitalize">{roleStyle.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("dashboard.stat.listings")}</p>
                  <p className="text-2xl font-bold">{dashboardData?.stats.listings ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <Heart className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("dashboard.stat.inquiries")}</p>
                  <p className="text-2xl font-bold">{dashboardData?.stats.inquiries ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-cyan-500/10">
                  <ClipboardList className="h-6 w-6 text-cyan-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("dashboard.stat.rfqs")}</p>
                  <p className="text-2xl font-bold">{dashboardData?.stats.rfqs ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-orange-500/10">
                  <Zap className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("dashboard.stat.payments")}</p>
                  <p className="text-2xl font-bold">{statsLoading ? "..." : purchasesCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full ${profile.role === "admin" ? "grid-cols-4" : "grid-cols-3"}`}>
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{t("dashboard.tab.profile")}</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">{t("dashboard.tab.settings")}</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                <span className="hidden sm:inline">{t("dashboard.tab.activity")}</span>
              </TabsTrigger>
              {profile.role === "admin" && (
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("dashboard.tab.admin")}</span>
                </TabsTrigger>
              )}
          </TabsList>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{language === "en" ? "Workspace Snapshot" : "የስራ ቦታ ማጠቃለያ"}</CardTitle>
                <CardDescription>{language === "en" ? "Recent activity across your account" : "በአካውንትዎ የቅርብ ጊዜ እንቅስቃሴ"}</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-border/60 p-4">
                  <FileText className="mb-3 h-5 w-5 text-blue-500" />
                  <p className="text-sm text-muted-foreground">{language === "en" ? "Recent inquiries" : "የቅርብ ጥያቄዎች"}</p>
                  <p className="mt-1 text-2xl font-bold">{dashboardData?.recentInquiries.length ?? 0}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-4">
                  <PackageCheck className="mb-3 h-5 w-5 text-emerald-500" />
                  <p className="text-sm text-muted-foreground">{language === "en" ? "Listings in motion" : "በሂደት ላይ ያሉ ዝርዝሮች"}</p>
                  <p className="mt-1 text-2xl font-bold">{dashboardData?.recentListings.length ?? 0}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-4">
                  <ClipboardList className="mb-3 h-5 w-5 text-cyan-500" />
                  <p className="text-sm text-muted-foreground">{language === "en" ? "RFQ requests" : "የዋጋ ጥያቄዎች"}</p>
                  <p className="mt-1 text-2xl font-bold">{dashboardData?.recentRfqs.length ?? 0}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-4">
                  <ReceiptText className="mb-3 h-5 w-5 text-violet-500" />
                  <p className="text-sm text-muted-foreground">{language === "en" ? "Billing records" : "የክፍያ መዝገቦች"}</p>
                  <p className="mt-1 text-2xl font-bold">{dashboardData?.recentPayments.length ?? 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("dashboard.quickActions.title")}</CardTitle>
                <CardDescription>
                  {profile.role === "admin"
                    ? t("dashboard.quickActions.desc.admin")
                    : subscription?.tier === "premium" || subscription?.tier === "pro"
                      ? t("dashboard.quickActions.desc.paid")
                      : t("dashboard.quickActions.desc.free")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {(QUICK_ACTIONS[roleKey] || QUICK_ACTIONS.user).map((action) => (
                    <QuickActionButton key={action.key} config={action} handlers={actionHandlers} language={language} />
                  ))}
                </div>
                <div className="rounded-lg border border-dashed border-border/70 p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-accent/15">
                      <Bot className="h-4 w-4 animate-pulse text-primary" />
                      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-ping rounded-full bg-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{t("dashboard.assistant.title")}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("dashboard.assistant.subtitle")}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>{language === "en" ? "Profile Information" : "ገለጻ መረጃ"}</CardTitle>
                <CardDescription>
                  {language === "en"
                    ? "View and update your personal information"
                    : "የግል መረጃዎን ይመልከቱ እና ያሰናብቱ"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!isEditing ? (
                  <>
                    {/* Display Mode */}
                    <div className="rounded-lg border border-border/60 bg-muted p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            {language === "en" ? "Email" : "ኢሜይል"}
                          </p>
                          <p className="text-base font-semibold">{profile.email}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            {language === "en" ? "Username" : "ተጠቃሚ ስም"}
                          </p>
                          <p className="text-base font-semibold">{profile.username}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            {language === "en" ? "Full Name" : "ሙሉ ስም"}
                          </p>
                          <p className="text-base font-semibold">{profile.full_name || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            {language === "en" ? "Phone" : "ስልክ"}
                          </p>
                          <p className="text-base font-semibold">{profile.phone || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            {language === "en" ? "Role" : "ሚና"}
                          </p>
                          <p className="text-base font-semibold">{profile.role}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            {language === "en" ? "Status" : "ሁኔታ"}
                          </p>
                          <p className="text-base font-semibold">{profile.status}</p>
                        </div>
                      </div>
                    </div>
                    <Button onClick={handleEditClick} className="w-full sm:w-auto">
                      {language === "en" ? "Edit Profile" : "ገለጻ ኢአ"}
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Edit Mode */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="full-name">{language === "en" ? "Full Name" : "ሙሉ ስም"}</Label>
                        <Input
                          id="full-name"
                          value={editForm.full_name}
                          onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                          placeholder={language === "en" ? "John Doe" : "ጆን ዶ"}
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">{language === "en" ? "Phone" : "ስልክ"}</Label>
                        <Input
                          id="phone"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          placeholder={language === "en" ? "+251..." : "+251..."}
                        />
                      </div>
                      <div>
                        <Label htmlFor="language">{language === "en" ? "Language Preference" : "ቋንቋ ምርጫ"}</Label>
                        <select
                          id="language"
                          value={editForm.language_preference}
                          onChange={(e) =>
                            setEditForm({ ...editForm, language_preference: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                        >
                          <option value="en">{language === "en" ? "English" : "እንግሊዝኛ"}</option>
                          <option value="am">{language === "en" ? "Amharic" : "አማርኛ"}</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="flex-1"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {language === "en" ? "Saving..." : "በመቆጠር ላይ..."}
                          </>
                        ) : (
                          language === "en" ? "Save Changes" : "ለውጦች ያስቀምጡ"
                        )}
                      </Button>
                      <Button
                        onClick={() => setIsEditing(false)}
                        variant="outline"
                        className="flex-1"
                      >
                        {language === "en" ? "Cancel" : "ሰርዝ"}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>


          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>{language === "en" ? "Account Settings" : "አካውንት ቅናሾች"}</CardTitle>
                <CardDescription>
                  {language === "en"
                    ? "Manage your account preferences"
                    : "የአካውንት ምርጫዎን አስተዳድር"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border border-border/60 bg-muted p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {language === "en" ? "Member Since" : "ከዚህ ጀምሮ አባል"}
                      </p>
                      <p className="text-base font-semibold">
                        {new Date(profile.created_at).toLocaleDateString(language === "en" ? "en-US" : "am-ET")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {language === "en" ? "Last Updated" : "ቅርብ ጊዜ ተዘምን"}
                      </p>
                      <p className="text-base font-semibold">
                        {new Date(profile.updated_at).toLocaleDateString(language === "en" ? "en-US" : "am-ET")}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    {language === "en" ? "Danger Zone" : "አደገኛ ቦታ"}
                  </h3>
                  <Button
                    onClick={handleSignOut}
                    variant="destructive"
                    className="w-full sm:w-auto"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {language === "en" ? "Sign Out" : "ውጣ"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <div className="space-y-6">
              {/* Subscription Card */}
              <Card>
                <CardHeader>
                  <CardTitle>{language === "en" ? "Subscription Status" : "ምዝገባ ሁኔታ"}</CardTitle>
                  <CardDescription>
                    {language === "en"
                      ? "Manage your premium membership and billing"
                      : "የፕሪሚየም አባልነት እና ክፍያን አስተዳድር"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {subscriptionError && (
                    <Alert variant="destructive">
                      <AlertDescription>{subscriptionError}</AlertDescription>
                    </Alert>
                  )}

                  {subscriptionLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : subscription ? (
                    <>
                      <div className="rounded-lg border border-border/60 bg-gradient-to-br from-primary/5 to-transparent p-6">
                        <div className="flex flex-col gap-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-3 flex-1">
                              <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                  <Crown className="h-6 w-6" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                     {t("dashboard.currentPlan")}
                                  </p>
                                  <p className="text-3xl font-bold capitalize">{planLabel}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="rounded-lg bg-muted/60 p-3">
                                  <p className="text-xs text-muted-foreground mb-1">
                                    {language === "en" ? "Expires" : "ወጣ"}
                                  </p>
                                  <p className="text-sm font-semibold">
                                    {new Date(subscription.expiresAt).toLocaleDateString(
                                      language === "en" ? "en-US" : "am-ET",
                                      { month: "short", day: "numeric", year: "numeric" }
                                    )}
                                  </p>
                                </div>
                                <div className="rounded-lg bg-muted/60 p-3">
                                  <p className="text-xs text-muted-foreground mb-1">
                                    {language === "en" ? "Payment Method" : "ክፍያ ዘዴ"}
                                  </p>
                                  <p className="text-sm font-semibold capitalize">{subscription.paymentMethod}</p>
                                </div>
                              </div>
                            </div>
                            <Badge
                              variant={subscription.status === "active" ? "default" : "secondary"}
                              className="text-xs py-1"
                            >
                              {subscription.status === "active"
                                ? language === "en"
                                  ? "Active"
                                  : "ንቁ"
                                : language === "en"
                                ? "Pending"
                                : "በመጠባበቅ"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-1 gap-3 pt-2">
                        {roleKey === "user" && (
                          <Button
                            onClick={() => navigateTo("/#plans")}
                            className="gap-2"
                            variant="default"
                          >
                            <TrendingUp className="h-4 w-4" />
                            {t("dashboard.cta.upgradeToPremium")}
                          </Button>
                        )}
                        {roleKey === "premium" && (
                          <Button
                            onClick={() => navigateTo("/#plans")}
                            className="gap-2"
                            variant="default"
                          >
                            <TrendingUp className="h-4 w-4" />
                            {t("dashboard.cta.upgradeToPro")}
                          </Button>
                        )}
                        {roleKey !== "user" && (
                          <Button onClick={() => navigateTo("/#plans")} variant="outline" className="gap-2">
                            <ArrowRight className="h-4 w-4" />
                            {t("dashboard.subscription.manage")}
                          </Button>
                        )}
                        <div className="rounded-lg border border-border/60 p-3">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {t("dashboard.benefits.title")}
                          </p>
                          <ul className="mt-2 space-y-1.5 text-sm">
                            {planBenefitsList.map((benefitKey) => (
                              <li key={benefitKey} className="flex items-center gap-2 text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span>{t(benefitKey as TranslationKey)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-lg font-semibold mb-2">
                        {language === "en" ? "No Active Subscription" : "ንቁ ምዝገባ የለም"}
                      </p>
                      <p className="text-sm text-muted-foreground mb-6">
                        {language === "en"
                          ? "Upgrade to unlock premium features and exclusive content."
                          : "ፕሪሚየም ባህሪዎችን እና ብቸኛ ይዘትን ለመክፈት ዝቅ አድርግ።"}
                      </p>
                      <Button onClick={() => navigateTo("/#plans")} className="gap-2">
                        <Crown className="h-4 w-4" />
                        {language === "en" ? "Choose a Plan" : "እቅድ ይምረጡ"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>{language === "en" ? "Recent Activity" : "የቅርብ ጊዜ እንቅስቃሴ"}</CardTitle>
                  <CardDescription>
                    {language === "en"
                      ? "Filter and sort your latest account activity"
                      : "የቅርብ ጊዜ የአካውንት እንቅስቃሴዎን ያጣሩ እና ይደርድሩ"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <FilterChip
                      active={activityFilter === "all"}
                      onClick={() => setActivityFilter("all")}
                      label={language === "en" ? "All" : "ሁሉም"}
                    />
                    <FilterChip
                      active={activityFilter === "inquiry"}
                      onClick={() => setActivityFilter("inquiry")}
                      label={language === "en" ? "Inquiries" : "ጥያቄዎች"}
                    />
                    <FilterChip
                      active={activityFilter === "listing"}
                      onClick={() => setActivityFilter("listing")}
                      label={language === "en" ? "Listings" : "ዝርዝሮች"}
                    />
                    <FilterChip
                      active={activityFilter === "rfq"}
                      onClick={() => setActivityFilter("rfq")}
                      label={language === "en" ? "RFQs" : "የዋጋ ጥያቄዎች"}
                    />
                    <FilterChip
                      active={activityFilter === "payment"}
                      onClick={() => setActivityFilter("payment")}
                      label={language === "en" ? "Payments" : "ክፍያዎች"}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {activityFeed.length} {language === "en" ? "item(s)" : "ዕቃ(ዎች)"}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5"
                      onClick={() => setActivitySort(activitySort === "newest" ? "oldest" : "newest")}
                    >
                      <ArrowDownAZ className="h-4 w-4" />
                      {activitySort === "newest"
                        ? language === "en" ? "Newest first" : "አዲስ መጀመሪያ"
                        : language === "en" ? "Oldest first" : "አሮጌ መጀመሪያ"}
                    </Button>
                  </div>

                  {activityFeed.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border py-10 text-center">
                      <p className="text-sm text-muted-foreground">
                        {t("dashboard.noActivity")}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activityFeed.map((item) => (
                        <div
                          key={`${item.kind}-${item.id}`}
                          className="flex items-start gap-3 rounded-lg border border-border/60 p-3"
                        >
                          <div className="mt-0.5 rounded-md bg-muted p-2">
                            <ActivityKindIcon kind={item.kind} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{item.title}</p>
                            {item.subtitle && (
                              <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            {item.status && (
                              <Badge variant="outline" className="text-[10px] capitalize">
                                {item.status}
                              </Badge>
                            )}
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatActivityDate(item.createdAt, language)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                   )}
                   {activityHasMore && (
                     <div className="flex justify-center pt-2">
                       <Button
                         variant="outline"
                         size="sm"
                         disabled={activityLoadingMore}
                         onClick={loadMoreActivity}
                         className="gap-1.5"
                       >
                          {activityLoadingMore ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowRight className="h-4 w-4" />
                          )}
                          {t("dashboard.loadMore")}
                        </Button>
                      </div>
                    )}
                 </CardContent>
               </Card>

               {/* RFQ Tracking */}
              <Card>
                <CardHeader>
                  <CardTitle>{language === "en" ? "RFQ Tracking" : "የዋጋ ጥያቄ ክትትል"}</CardTitle>
                  <CardDescription>
                    {language === "en"
                      ? "Follow the status of your quotation requests"
                      : "የዋጋ ጥያቄዎችዎን ሁኔታ ይከታተሉ"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   {dashboardData && dashboardData.stats.rfqs > 0 ? (
                     <div className="space-y-3">
                       {dashboardData.recentRfqs.map((rfq) => (
                        <div
                          key={rfq.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {rfq.project_type || (language === "en" ? "Request for Quotation" : "የዋጋ ጥያቄ")}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {rfq.city} • {formatActivityDate(rfq.created_at, language)}
                            </p>
                          </div>
                          {rfq.status && (
                            <Badge variant={RFQ_STATUS_COLORS[rfq.status] || "outline"} className="capitalize">
                              {rfq.status}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border py-10 text-center">
                      <ClipboardList className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                       <p className="text-sm text-muted-foreground">
                        {t("dashboard.noRfqs")}
                      </p>
                     </div>
                   )}
                   {activityHasMore &&
                     dashboardData &&
                     dashboardData.stats.rfqs > (dashboardData.recentRfqs.length ?? 0) && (
                       <Button
                         className="w-full gap-2"
                         variant="outline"
                         onClick={loadMoreActivity}
                         disabled={activityLoadingMore}
                       >
                         {activityLoadingMore ? (
                           <Loader2 className="h-4 w-4 animate-spin" />
                         ) : (
                           <ArrowRight className="h-4 w-4" />
                         )}
                          {t("dashboard.loadMoreRfqs")}
                        </Button>
                      )}
                    <Button className="w-full gap-2" onClick={() => setRfqModalOpen(true)}>
                      <ClipboardList className="h-4 w-4" />
                      {t("dashboard.submitRfq")}
                    </Button>
                </CardContent>
              </Card>

              <RfqModal open={rfqModalOpen} onOpenChange={setRfqModalOpen} rfqContext={null} />
            </div>
          </TabsContent>

          {profile.role === "admin" && (
            <TabsContent value="admin">
              <AdminDashboardTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}

const PROFILE_FIELD_LABELS: Record<string, { en: string; am: string }> = {
  username: { en: "username", am: "የተጠቃሚ ስም" },
  full_name: { en: "full name", am: "ሙሉ ስም" },
  phone: { en: "phone number", am: "ስልክ ቁጥር" },
  profile_image: { en: "profile photo", am: "የመገለጫ ፎቶ" },
  language_preference: { en: "language", am: "ቋንቋ" },
}

const RFQ_STATUS_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  new: "default",
  reviewing: "secondary",
  sent_to_supplier: "outline",
  quoted: "default",
  closed: "outline",
  spam: "destructive",
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <Button size="sm" variant={active ? "default" : "outline"} onClick={onClick}>
      {label}
    </Button>
  )
}

function ActivityKindIcon({ kind }: { kind: ActivityKind }) {
  switch (kind) {
    case "inquiry":
      return <FileText className="h-4 w-4 text-blue-500" />
    case "listing":
      return <PackageCheck className="h-4 w-4 text-emerald-500" />
    case "rfq":
      return <ClipboardList className="h-4 w-4 text-cyan-500" />
    case "payment":
      return <ReceiptText className="h-4 w-4 text-violet-500" />
  }
}

function formatActivityDate(iso: string, language: "am" | "en") {
  return new Date(iso).toLocaleDateString(
    language === "am" ? "am-ET" : "en-US",
    { month: "short", day: "numeric", year: "numeric" }
  )
}

const ROLE_STYLES: Record<string, { label: string; icon: LucideIcon; badge: string; iconBg: string; iconColor: string }> = {
  user: {
    label: "Free",
    icon: User,
    badge: "bg-muted text-muted-foreground",
    iconBg: "bg-slate-500/10",
    iconColor: "text-slate-500",
  },
  premium: {
    label: "Premium",
    icon: Crown,
    badge: "bg-amber-500/15 text-amber-600",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
  },
  pro: {
    label: "Pro",
    icon: Zap,
    badge: "bg-violet-500/15 text-violet-600",
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-500",
  },
  admin: {
    label: "Admin",
    icon: ShieldCheck,
    badge: "bg-rose-500/15 text-rose-600",
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-500",
  },
}

type QuickActionKey = "submitRfq" | "market" | "marketplace" | "professionals" | "upgrade" | "adminConsole" | "reviewContent"

type QuickActionConfig = {
  key: QuickActionKey
  icon: LucideIcon
  color: string
  label: { en: string; am: string }
}

const QUICK_ACTIONS: Record<string, QuickActionConfig[]> = {
  user: [
    { key: "upgrade", icon: Sparkles, color: "text-amber-500", label: { en: "Upgrade plan", am: "እቅድ ያሻሽሉ" } },
    { key: "market", icon: TrendingUp, color: "text-emerald-500", label: { en: "Market prices", am: "የገበያ ዋጋዎች" } },
    { key: "submitRfq", icon: ClipboardList, color: "text-cyan-500", label: { en: "Submit RFQ", am: "ጥያቄ ላክ" } },
    { key: "professionals", icon: Users, color: "text-blue-500", label: { en: "Professionals", am: "ባለሙያዎች" } },
  ],
  premium: [
    { key: "upgrade", icon: Sparkles, color: "text-amber-500", label: { en: "Upgrade to Pro", am: "ወደ ፕሮ ያሻሽሉ" } },
    { key: "submitRfq", icon: ClipboardList, color: "text-cyan-500", label: { en: "Submit RFQ", am: "ጥያቄ ላክ" } },
    { key: "market", icon: TrendingUp, color: "text-emerald-500", label: { en: "Market prices", am: "የገበያ ዋጋዎች" } },
    { key: "professionals", icon: Users, color: "text-blue-500", label: { en: "Professionals", am: "ባለሙያዎች" } },
  ],
  pro: [
    { key: "submitRfq", icon: ClipboardList, color: "text-cyan-500", label: { en: "Submit RFQ", am: "ጥያቄ ላክ" } },
    { key: "market", icon: TrendingUp, color: "text-emerald-500", label: { en: "Market prices", am: "የገበያ ዋጋዎች" } },
    { key: "marketplace", icon: Store, color: "text-amber-600", label: { en: "Marketplace", am: "ገበያ" } },
    { key: "professionals", icon: Users, color: "text-blue-500", label: { en: "Professionals", am: "ባለሙያዎች" } },
  ],
  admin: [
    { key: "adminConsole", icon: ShieldCheck, color: "text-rose-500", label: { en: "Admin console", am: "አስተዳዳሪ ኮንሶል" } },
    { key: "reviewContent", icon: Newspaper, color: "text-violet-500", label: { en: "Review content", am: "ይዘት ይገምግሙ" } },
    { key: "market", icon: TrendingUp, color: "text-emerald-500", label: { en: "Market prices", am: "የገበያ ዋጋዎች" } },
    { key: "marketplace", icon: Store, color: "text-amber-600", label: { en: "Marketplace", am: "ገበያ" } },
  ],
}

function QuickActionButton({
  config,
  handlers,
  language,
}: {
  config: QuickActionConfig
  handlers: Record<QuickActionKey, () => void>
  language: "am" | "en"
}) {
  return (
    <Button
      variant="outline"
      className="h-auto flex-col items-center gap-1.5 py-3 text-xs font-medium"
      onClick={handlers[config.key]}
    >
      <config.icon className={`h-5 w-5 ${config.color}`} />
      {language === "en" ? config.label.en : config.label.am}
    </Button>
  )
}
