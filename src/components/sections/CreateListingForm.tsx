import { useState } from "react"
import { useLanguage } from "@/lib/i18n"
import { useAuthContext } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Plus, Store } from "lucide-react"

interface CreateListingFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateListingForm({ open, onOpenChange }: CreateListingFormProps) {
  const { language } = useLanguage()
  const { user } = useAuthContext()

  const [listingType, setListingType] = useState("property_sale")
  const [titleEn, setTitleEn] = useState("")
  const [titleAm, setTitleAm] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [location, setLocation] = useState("")
  const [contactPhone, setContactPhone] = useState(user?.phone || "")
  const [contactEmail, setContactEmail] = useState(user?.email || "")
  const [category, setCategory] = useState("property")
  const [images, setImages] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const listingTypes = [
    { value: "property_sale", en: "Property for Sale", am: "ለሽያጭ ንብረት" },
    { value: "property_rent", en: "Property for Rent", am: "ለኪራይ ንብረት" },
    { value: "material_supply", en: "Material Supply", am: "የቁሳቁስ አቅርቦት" },
    { value: "service_offer", en: "Service Offer", am: "የአገልግሎት አቅርቦት" },
    { value: "job_posting", en: "Job Posting", am: "የስራ ማስታወቂያ" },
  ]

  const categories = [
    { value: "property", en: "Property", am: "ንብረት" },
    { value: "materials", en: "Materials", am: "ቁሳቁሶች" },
    { value: "services", en: "Services", am: "አገልግሎቶች" },
    { value: "equipment", en: "Equipment", am: "መሳሪያዎች" },
    { value: "labor", en: "Labor", am: "የሰው ሃይል" },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const imageArray = images
        ? images.split("\n").map((url) => url.trim()).filter((url) => url)
        : []

      const { data, error: submitError } = await supabase.rpc("create_listing", {
        p_listing_type: listingType,
        p_title_am: titleAm,
        p_title_en: titleEn,
        p_description: description,
        p_price: parseFloat(price),
        p_location: location,
        p_contact_phone: contactPhone,
        p_contact_email: contactEmail,
        p_category: category,
        p_images: imageArray,
      })

      if (submitError) throw submitError

      if (!data?.success) {
        throw new Error(data?.error || (language === "en" ? "Failed to create listing" : "ዝርዝር መፍጠር አልተሳካም"))
      }

      setSuccess(true)
      setTitleEn("")
      setTitleAm("")
      setDescription("")
      setPrice("")
      setLocation("")
      setImages("")

      setTimeout(() => {
        onOpenChange(false)
        setSuccess(false)
      }, 2500)
    } catch (err: any) {
      setError(err.message || (language === "en" ? "Failed to create listing. Please try again." : "ዝርዝር መፍጠር አልተሳካም። እባክዎ እንደገና ይሞክሩ።"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            {language === "en" ? "Create New Listing" : "አዲስ ዝርዝር ይፍጠሩ"}
          </DialogTitle>
          <DialogDescription>
            {language === "en"
              ? "Fill in the details about your property, materials, or service. Your listing will be reviewed by our team."
              : "ስለ ንብረትዎ፣ ቁሳቁሶች ወይም አገልግሎትዎ ዝርዝሮችን ይሙሉ። ዝርዝርዎ በቡድናችን ይገመገማል።"}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <Alert className="bg-green-100 border-green-400 text-green-700">
            <AlertDescription>
              {language === "en"
                ? "✅ Your listing has been submitted successfully! It will be reviewed and published shortly."
                : "✅ ዝርዝርዎ በተሳካ ሁኔታ ቀርቧል! በቅርቡ ተገምግሞ ይታተማል።"}
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "en" ? "Listing Type" : "የዝርዝር አይነት"} *</Label>
                <Select value={listingType} onValueChange={setListingType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {listingTypes.map((lt) => (
                      <SelectItem key={lt.value} value={lt.value}>
                        {language === "en" ? lt.en : lt.am}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{language === "en" ? "Category" : "ምድብ"} *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {language === "en" ? cat.en : cat.am}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="listing-title-en">{language === "en" ? "Title (English)" : "ርዕስ (እንግሊዝኛ)"} *</Label>
              <Input
                id="listing-title-en"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder={language === "en" ? "e.g., 3 Bedroom House for Sale in Bole" : "ለምሳሌ፡ በቦሌ 3 መኝታ ቤት ለሽያጭ"}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="listing-title-am">{language === "en" ? "Title (Amharic)" : "ርዕስ (አማርኛ)"} *</Label>
              <Input
                id="listing-title-am"
                value={titleAm}
                onChange={(e) => setTitleAm(e.target.value)}
                placeholder={language === "en" ? "e.g., በቦሌ የሚገኝ ባለ 3 መኝታ ቤት ለሽያጭ" : "ለምሳሌ፡ በቦሌ የሚገኝ ባለ 3 መኝታ ቤት ለሽያጭ"}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="listing-description">{language === "en" ? "Description" : "መግለጫ"} *</Label>
              <Textarea
                id="listing-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={language === "en"
                  ? "Provide detailed information about your listing..."
                  : "ስለ ዝርዝርዎ ዝርዝር መረጃ ይስጡ..."}
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="listing-price">{language === "en" ? "Price (ETB)" : "ዋጋ (ETB)"} *</Label>
                <Input
                  id="listing-price"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="500000"
                  required
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="listing-location">{language === "en" ? "Location" : "ቦታ"} *</Label>
                <Input
                  id="listing-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={language === "en" ? "Addis Ababa, Bole" : "አዲስ አበባ፣ ቦሌ"}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="listing-phone">{language === "en" ? "Contact Phone" : "የመገኛ ስልክ"}</Label>
                <Input
                  id="listing-phone"
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+2519XXXXXXXX"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="listing-email">{language === "en" ? "Contact Email" : "የመገኛ ኢሜይል"}</Label>
                <Input
                  id="listing-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="listing-images">{language === "en" ? "Image URLs (one per line)" : "የምስል አድራሻዎች (በስን አንድ)"}</Label>
              <Textarea
                id="listing-images"
                value={images}
                onChange={(e) => setImages(e.target.value)}
                placeholder="https://images.unsplash.com/photo-xxxxx"
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                {language === "en"
                  ? "Add one image URL per line. You can use Unsplash or your own hosted images."
                  : "በእያንዳንዱ መስመር አንድ የምስል አድራሻ ያክሉ።"}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {language === "en" ? "Cancel" : "ሰርዝ"}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {language === "en" ? "Submitting..." : "በማቅረብ ላይ..."}
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    {language === "en" ? "Create Listing" : "ዝርዝር ይፍጠሩ"}
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
