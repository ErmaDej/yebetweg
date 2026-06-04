import { useState, useEffect, useMemo } from "react"
import { useRequireAuth } from "@/components/ProtectedRoute"
import { useSubscription, useUserProfile } from "@/hooks/useUserProfile"
import { useLanguage } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Crown, Heart, LogOut, Settings, User, ShieldCheck, TrendingUp, Zap, CheckCircle2, AlertTriangle, ArrowRight, Bell, FileText, PackageCheck, ReceiptText, Sparkles } from "lucide-react"
import { useAuthContext } from "@/context/AuthContext"
import { Loader2 } from "lucide-react"
import { navigateTo } from "@/lib/navigation"
import { AdminDashboardTab } from "./AdminDashboardTab"
import { supabase } from "@/lib/supabase"
import { Progress } from "@/components/ui/progress"

type DashboardInquiry = {
  id: string
  subject: string | null
  is_read: boolean | null
  created_at: string
}

type DashboardListing = {
  id: string
  title_en: string | null
  status: string | null
  created_at: string
}

type DashboardPayment = {
  id: string
  amount: number | null
  currency: string | null
  method: string | null
  reference: string | null
  status: string | null
  created_at: string
}

export function Dashboard() {
  const { language } = useLanguage()
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
  const [userStats, setUserStats] = useState({ inquiries: 0, listings: 0, purchases: 0, unread: 0 })
  const [recentInquiries, setRecentInquiries] = useState<DashboardInquiry[]>([])
  const [recentListings, setRecentListings] = useState<DashboardListing[]>([])
  const [recentPayments, setRecentPayments] = useState<DashboardPayment[]>([])
  const [statsLoading, setStatsLoading] = useState(false)

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

  useEffect(() => {
    if (!profile?.id) {
      setUserStats({ inquiries: 0, listings: 0, purchases: 0, unread: 0 })
      setRecentInquiries([])
      setRecentListings([])
      setRecentPayments([])
      return
    }

    let cancelled = false

    const loadUserStats = async () => {
      setStatsLoading(true)
      try {
        const [inquiries, unreadInquiries, listings, payments] = await Promise.all([
          supabase
            .from("inquiries")
            .select("id, subject, is_read, created_at", { count: "exact" })
            .eq("user_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(3),
          supabase
            .from("inquiries")
            .select("id", { count: "exact", head: true })
            .eq("user_id", profile.id)
            .eq("is_read", false),
          supabase
            .from("listings")
            .select("id, title_en, status, created_at", { count: "exact" })
            .eq("user_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(3),
          supabase
            .from("subscription_payments")
            .select("id, amount, currency, method, reference, status, created_at", { count: "exact" })
            .eq("user_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(5),
        ])

        if (cancelled) return

        setUserStats({
          inquiries: inquiries.count || 0,
          listings: listings.count || 0,
          purchases: payments.count || (subscription ? 1 : 0),
          unread: unreadInquiries.count || 0,
        })
        setRecentInquiries((inquiries.data || []) as DashboardInquiry[])
        setRecentListings((listings.data || []) as DashboardListing[])
        setRecentPayments((payments.data || []) as DashboardPayment[])
      } catch (err) {
        console.error("Failed to load user stats:", err)
      } finally {
        if (!cancelled) setStatsLoading(false)
      }
    }

    loadUserStats()

    return () => {
      cancelled = true
    }
  }, [profile?.id, subscription?.id])

  const roleLabel = useMemo(() => {
    if (!profile) return "Free"
    if (profile.role === "admin") return "Admin"
    return subscription?.tier || profile.role || "free"
  }, [profile, subscription?.tier])

  const planProgress = useMemo(() => {
    if (!subscription) return profile?.role === "admin" ? 100 : 20
    if (subscription.tier === "pro") return 100
    if (subscription.tier === "premium") return 68
    return 20
  }, [profile?.role, subscription])

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
                <Badge variant="outline" className="capitalize">{roleLabel}</Badge>
                {userStats.unread > 0 && (
                  <Badge className="gap-1 bg-amber-600 text-white">
                    <Bell className="h-3 w-3" />
                    {userStats.unread} {language === "en" ? "new" : "አዲስ"}
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold">{language === "en" ? "Dashboard" : "ዳሽቦርድ"}</h1>
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
                <span className="font-medium">{language === "en" ? "Access strength" : "የመዳረሻ ጥንካሬ"}</span>
                <span className="text-muted-foreground">{planProgress}%</span>
              </div>
              <Progress value={planProgress} />
              <Button className="mt-4 w-full gap-2" onClick={() => navigateTo(profile.role === "admin" ? "/dashboard" : "/#premium")}>
                <Sparkles className="h-4 w-4" />
                {profile.role === "admin"
                  ? language === "en" ? "Review operations" : "ኦፕሬሽን ይመልከቱ"
                  : subscription?.tier === "pro"
                    ? language === "en" ? "Explore pro tools" : "የፕሮ መሳሪያዎች"
                    : language === "en" ? "Upgrade access" : "መዳረሻ ያሻሽሉ"}
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {saveMessage && (
          <Alert variant={saveMessage.type === "success" ? "default" : "destructive"} className="mb-6">
            <AlertDescription>{saveMessage.text}</AlertDescription>
          </Alert>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Crown className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === "en" ? "Plan" : "እቅድ"}</p>
                  <p className="text-2xl font-bold capitalize">{roleLabel}</p>
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
                  <p className="text-sm text-muted-foreground">{language === "en" ? "Listings" : "ዝርዝሮች"}</p>
                  <p className="text-2xl font-bold">{userStats.listings}</p>
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
                  <p className="text-sm text-muted-foreground">{language === "en" ? "Inquiries" : "ጥያቄዎች"}</p>
                  <p className="text-2xl font-bold">{userStats.inquiries}</p>
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
                  <p className="text-sm text-muted-foreground">{language === "en" ? "Payments" : "ክፍያዎች"}</p>
                  <p className="text-2xl font-bold">{statsLoading ? "..." : userStats.purchases}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className={`grid w-full ${profile.role === "admin" ? "grid-cols-4" : "grid-cols-3"}`}>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{language === "en" ? "Profile" : "ገለጻ"}</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">{language === "en" ? "Settings" : "ቅናሾች"}</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">{language === "en" ? "Activity" : "እንቅስቃሴ"}</span>
            </TabsTrigger>
            {profile.role === "admin" && (
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden sm:inline">{language === "en" ? "Admin" : "አስተዳዳሪ"}</span>
              </TabsTrigger>
            )}
          </TabsList>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{language === "en" ? "Workspace Snapshot" : "የስራ ቦታ ማጠቃለያ"}</CardTitle>
                <CardDescription>{language === "en" ? "Recent activity across your account" : "በአካውንትዎ የቅርብ ጊዜ እንቅስቃሴ"}</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-border/60 p-4">
                  <FileText className="mb-3 h-5 w-5 text-blue-500" />
                  <p className="text-sm text-muted-foreground">{language === "en" ? "Recent inquiries" : "የቅርብ ጥያቄዎች"}</p>
                  <p className="mt-1 text-2xl font-bold">{recentInquiries.length}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-4">
                  <PackageCheck className="mb-3 h-5 w-5 text-emerald-500" />
                  <p className="text-sm text-muted-foreground">{language === "en" ? "Listings in motion" : "በሂደት ላይ ያሉ ዝርዝሮች"}</p>
                  <p className="mt-1 text-2xl font-bold">{recentListings.length}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-4">
                  <ReceiptText className="mb-3 h-5 w-5 text-violet-500" />
                  <p className="text-sm text-muted-foreground">{language === "en" ? "Billing records" : "የክፍያ መዝገቦች"}</p>
                  <p className="mt-1 text-2xl font-bold">{recentPayments.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{language === "en" ? "Next Best Action" : "ቀጣይ ተግባር"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {profile.role === "admin"
                    ? language === "en" ? "Review pending operations and keep the marketplace healthy." : "በመጠባበቅ ላይ ያሉ ኦፕሬሽኖችን ይመልከቱ።"
                    : subscription
                      ? language === "en" ? "Keep your profile and listings fresh to convert more leads." : "ተጨማሪ ጥያቄዎችን ለማግኘት መገለጫዎን እና ዝርዝሮችን ያዘምኑ።"
                      : language === "en" ? "Upgrade to unlock full prices, tips, reports, and priority visibility." : "ሙሉ ዋጋዎችን፣ ምክሮችን እና ቅድሚያ ለመክፈት ያሻሽሉ።"}
                </p>
                <Button className="w-full gap-2" onClick={() => navigateTo(profile.role === "admin" ? "/dashboard" : "/#premium")}>
                  <ArrowRight className="h-4 w-4" />
                  {profile.role === "admin" ? language === "en" ? "Open admin tab" : "የአስተዳዳሪ ትር" : language === "en" ? "View plans" : "እቅዶችን ይመልከቱ"}
                </Button>
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
                                    {language === "en" ? "Current Plan" : "የአሁኑ እቅድ"}
                                  </p>
                                  <p className="text-3xl font-bold capitalize">{subscription.tier}</p>
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
                        {subscription.tier !== "pro" && (
                          <Button
                            onClick={() => navigateTo("/#premium")}
                            className="gap-2"
                            variant={subscription.tier === "premium" ? "default" : "default"}
                          >
                            <TrendingUp className="h-4 w-4" />
                            {subscription.tier === "free"
                              ? language === "en"
                                ? "Upgrade to Premium"
                                : "ወደ ፕሪሚየም ዝቅ"
                              : language === "en"
                              ? "Upgrade to Pro"
                              : "ወደ ፕሮ ዝቅ"}
                          </Button>
                        )}
                        {subscription.tier !== "free" && (
                          <Button onClick={() => navigateTo("/#premium")} variant="outline" className="gap-2">
                            <ArrowRight className="h-4 w-4" />
                            {language === "en" ? "Manage Subscription" : "ምዝገባ አስተዳድር"}
                          </Button>
                        )}
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
                      <Button onClick={() => navigateTo("/#premium")} className="gap-2">
                        <Crown className="h-4 w-4" />
                        {language === "en" ? "Choose a Plan" : "እቅድ ይምረጡ"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Billing History */}
              <Card>
                <CardHeader>
                  <CardTitle>{language === "en" ? "Quick Stats" : "ፈጣን ስታቲስቲክስ"}</CardTitle>
                  <CardDescription>
                    {language === "en" ? "Your engagement overview" : "የእርስዎ ማሳተፍ አጠቃላይ ግምት"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-blue-500">{userStats.listings}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {language === "en" ? "Listings" : "ዝርዝሮች"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-purple-500">{userStats.inquiries}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {language === "en" ? "Inquiries" : "ጥያቄዎች"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-500">{userStats.purchases}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {language === "en" ? "Subscriptions" : "ምዝገባ"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
