import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n"
import { Edit, Eye, Ban, TrendingUp, DollarSign, Users, ShieldCheck } from "lucide-react"
import { callAdminAction } from "@/lib/api"

export function AdminDashboardTab() {
  const { language } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

const handleAction = async (action: string) => {
  setLoading(true);
  setError(null);
  setSuccessMessage(null);
  try {
    const result = await callAdminAction(action);
    const message = language === "en" ? `Successfully performed ${action.replace("_", " ")}` : `ተገቢው እርምጃ ${action} ተፈጸመ`;
    setSuccessMessage(message);
  } catch (err: any) {
    setError(err.message ?? "An unexpected error occurred.");
  } finally {
    setLoading(false);
  }
}; // Closing brace and semicolon for handleAction

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {successMessage && (
        <Alert className="bg-green-100 border-green-400 text-green-700">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{language === "en" ? "Content Management" : "ይዘት አስተዳደር"}</CardTitle>
          <CardDescription>
            {language === "en" ? "Manage articles, tips, and advertisements" : "ጽሑፎችን፣ ምክሮችን እና ማስታወቂያዎችን አስተዳድር"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Button onClick={() => handleAction("manage_blogs")} disabled={loading}>
            <Edit className="mr-2 h-4 w-4" />
            {language === "en" ? "Manage Blogs" : "ብሎጎችን አስተዳድር"}
          </Button>
          <Button onClick={() => handleAction("manage_tips")} disabled={loading}>
            <Edit className="mr-2 h-4 w-4" />
            {language === "en" ? "Manage Tips" : "ምክሮችን አስተዳድር"}
          </Button>
          <Button onClick={() => handleAction("manage_ads")} disabled={loading}>
            <Edit className="mr-2 h-4 w-4" />
            {language === "en" ? "Manage Ads" : "ማስታወቂያዎችን አስተዳድር"}
          </Button>
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
          <Button onClick={() => handleAction("moderate_listings")} disabled={loading}>
            <Eye className="mr-2 h-4 w-4" />
            {language === "en" ? "Moderate Listings" : "ዝርዝሮችን አጣራ"}
          </Button>
          <Button onClick={() => handleAction("verify_professionals")} disabled={loading}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            {language === "en" ? "Verify Professionals" : "ባለሙያዎችን አረጋግጥ"}
          </Button>
          <Button onClick={() => handleAction("ban_users")} disabled={loading}>
            <Ban className="mr-2 h-4 w-4" />
            {language === "en" ? "Ban/Suspend Users" : "ተጠቃሚዎችን አግድ/አስቁም"}
          </Button>
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
          <Button onClick={() => handleAction("manage_users")} disabled={loading}>
            <Users className="mr-2 h-4 w-4" />
            {language === "en" ? "Manage Users" : "ተጠቃሚዎችን አስተዳድር"}
          </Button>
          <Button onClick={() => handleAction("view_analytics")} disabled={loading}>
            <TrendingUp className="mr-2 h-4 w-4" />
            {language === "en" ? "View Analytics" : "ትንታኔዎችን እይ"}
          </Button>
          <Button onClick={() => handleAction("manage_payments")} disabled={loading}>
            <DollarSign className="mr-2 h-4 w-4" />
            {language === "en" ? "Manage Payments" : "ክፍያዎችን አስተዳድር"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
