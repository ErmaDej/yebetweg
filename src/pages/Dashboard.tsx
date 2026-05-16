import { useState } from "react"
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
import { Calendar, CreditCard, Crown, Heart, LogOut, Settings, User, ShieldCheck } from "lucide-react"
import { useAuthContext } from "@/context/AuthContext"
import { Loader2 } from "lucide-react"
import { navigateTo } from "@/lib/navigation"
import { AdminDashboardTab } from "./AdminDashboardTab"

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

  const handleEditClick = () => {
    setEditForm({
      full_name: profile.full_name || "",
      phone: profile.phone || "",
      language_preference: profile.language_preference || "en",
    })
    setIsEditing(true)
  }

  const handleSaveProfile = async () => {
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

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(language === "en" ? "en-US" : "am-ET", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })

  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{language === "en" ? "Dashboard" : "ዳሽቦርድ"}</h1>
          <p className="text-muted-foreground">
            {language === "en" ? "Manage your account and profile" : "አካውንት እና ገለጻዎን አስተዳድር"}
          </p>
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
                          <p className="text-base font-semibold capitalize">{profile.status}</p>
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
            <Card>
              <CardHeader>
                <CardTitle>{language === "en" ? "Activity" : "እንቅስቃሴ"}</CardTitle>
                <CardDescription>
                  {language === "en"
                    ? "Your recent activity and subscriptions"
                    : "ከወቅታዊ ተግባር እና ምዝገባ"}
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
                  <div className="rounded-lg border border-border/60 bg-muted p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                            <Crown className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {language === "en" ? "Current Plan" : "የአሁኑ እቅድ"}
                            </p>
                            <p className="text-xl font-semibold capitalize">{subscription.tier}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {language === "en" ? "Renews/ends " : "ያበቃል "}
                              {formatDate(subscription.expiresAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 capitalize">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <span>{subscription.paymentMethod}</span>
                          </div>
                        </div>
                      </div>

                      <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                        {subscription.status}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      {language === "en"
                        ? "No active subscription yet. Choose a Premium or Pro plan to unlock more tools."
                        : "ንቁ ምዝገባ ገና የለም። ተጨማሪ መሳሪያዎችን ለመክፈት Premium ወይም Pro እቅድ ይምረጡ።"}
                    </p>
                    <Button className="mt-4" onClick={() => navigateTo("/#premium")}>
                      {language === "en" ? "View Plans" : "እቅዶችን ይመልከቱ"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
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
