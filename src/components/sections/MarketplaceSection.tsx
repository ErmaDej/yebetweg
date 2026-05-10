import { useState } from "react"
import { MapPin, Phone, Plus, Info } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/lib/i18n"
import { useListings } from "@/hooks/useListings"
import { useInView } from "@/hooks/useInView"
import { supabase } from "@/lib/supabase"
import { validateListingForm, sanitizeText } from "@/lib/validation"

const listingTabs = [
  { value: "all", key: "blog.filter.all" as const },
  { value: "property_sale", key: "marketplace.sale" as const },
  { value: "property_rent", key: "marketplace.rent" as const },
  { value: "land_sale", key: "marketplace.land" as const },
  { value: "material_sale", key: "marketplace.materials" as const },
  { value: "professional_service", key: "marketplace.services" as const },
]

function ListingCard({ listing, index }: { listing: any; index: number }) {
  const { language, t } = useLanguage()
  const title = language === "am" ? listing.title_am : listing.title_en
  const [contactOpen, setContactOpen] = useState(false)
  const [inquirySent, setInquirySent] = useState(false)

  const handleInquiry = async () => {
    setInquirySent(true)
    setTimeout(() => {
      setContactOpen(false)
      setInquirySent(false)
    }, 2000)
  }

  return (
    <Card
      className="group overflow-hidden border-border/50 hover:border-accent/50 transition-all duration-300 hover:shadow-lg"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="relative h-44 overflow-hidden">
        {listing.images && listing.images.length > 0 && listing.images[0] ? (
          <img
            src={listing.images[0]}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 animate-image-fade"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center">
            <MapPin className="h-10 w-10 text-muted-foreground/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute top-3 left-3 flex gap-1.5">
          {listing.is_verified && (
            <Badge className="bg-primary text-primary-foreground text-[10px]">
              {t("common.verified")}
            </Badge>
          )}
          {listing.is_urgent && (
            <Badge variant="destructive" className="text-[10px]">
              {t("common.urgent")}
            </Badge>
          )}
        </div>
        <Badge variant="secondary" className="absolute top-3 right-3 text-[10px]">
          {listing.listing_type === "property_sale" ? t("marketplace.sale") :
           listing.listing_type === "property_rent" ? t("marketplace.rent") :
           listing.listing_type === "land_sale" ? t("marketplace.land") :
           listing.listing_type === "material_sale" ? t("marketplace.materials") :
           t("marketplace.services")}
        </Badge>
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors line-clamp-1">
          {title}
        </h3>
        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{listing.location}</span>
        </div>
        <p className="mt-2 text-lg font-bold text-foreground">
          {listing.price > 0 ? `${Number(listing.price).toLocaleString()} ${t("common.etb")}` : t("contact.general")}
        </p>
        {listing.listing_type === "property_rent" && listing.price > 0 && (
          <span className="text-xs text-muted-foreground">/{language === "en" ? "month" : "ወር"}</span>
        )}
      </CardContent>
      <CardFooter className="px-4 pb-4 pt-0">
        <Dialog open={contactOpen} onOpenChange={setContactOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full gap-2">
              <Phone className="h-3.5 w-3.5" />
              {t("marketplace.contact")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            {inquirySent ? (
              <div className="py-8 text-center">
                <p className="text-accent font-semibold">
                  {language === "en" ? "Inquiry sent successfully!" : "ጥያቄ በተሳካ ሁኔታ ተልኳል!"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {language === "en"
                    ? "Submit an inquiry to connect with the listing owner."
                    : "ከዝርዝር ባለቤት ጋር ለመገናኘት ጥያቄ ያስገቡ።"}
                </p>
                <div className="space-y-2">
                  <Label>{t("contact.name")}</Label>
                  <Input placeholder={language === "en" ? "Your name" : "ስምዎ"} />
                </div>
                <div className="space-y-2">
                  <Label>{t("contact.phone")}</Label>
                  <Input placeholder="+251..." />
                </div>
                <Button onClick={handleInquiry} className="w-full">
                  {t("contact.send")}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  )
}

function ListingSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-44" />
      <CardContent className="p-4 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-6 w-1/3" />
      </CardContent>
    </Card>
  )
}

export function MarketplaceSection() {
  const { t, language } = useLanguage()
  const [tab, setTab] = useState("all")
  const { listings, loading } = useListings(tab)
  const { ref, isInView } = useInView()
  const [listDialogOpen, setListDialogOpen] = useState(false)
  const [listingError, setListingError] = useState("")

  return (
    <section id="marketplace" ref={ref} className="py-16 sm:py-24 bg-muted/30">
      <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">{t("marketplace.title")}</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl">{t("marketplace.subtitle")}</p>
          </div>
          <Dialog open={listDialogOpen} onOpenChange={setListDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-4 w-4" />
                {t("marketplace.listYours")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("marketplace.listYours")}</DialogTitle>
              </DialogHeader>
              {listingError && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {listingError}
                </div>
              )}
              <form
                className="space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault()
                  setListingError("")

                  const fd = new FormData(e.currentTarget)
                  const formData = {
                    title: fd.get("title"),
                    description: fd.get("description"),
                    price: fd.get("price"),
                    location: fd.get("location"),
                    phone: fd.get("phone"),
                    email: fd.get("email"),
                  }

                  // Validate form data
                  const validationErrors = validateListingForm(formData)
                  if (validationErrors.length > 0) {
                    setListingError(validationErrors[0].message)
                    return
                  }

                  const { error: insertError } = await supabase.from("listings").insert({
                    listing_type: "property_sale",
                    title_en: sanitizeText(formData.title as string, 200),
                    title_am: sanitizeText(formData.title as string, 200),
                    description: sanitizeText(formData.description as string, 5000),
                    price: Number(formData.price) || 0,
                    location: sanitizeText(formData.location as string, 100),
                    contact_phone: sanitizeText(formData.phone as string, 20),
                    contact_email: (formData.email as string).toLowerCase().trim(),
                    category: "property",
                  })

                  if (insertError) {
                    setListingError("Failed to create listing. Please try again.")
                    return
                  }

                  setListDialogOpen(false)
                }}
              >
                <div className="space-y-1.5">
                  <Label>{language === "en" ? "Title" : "ርዕስ"}</Label>
                  <Input name="title" required />
                </div>
                <div className="space-y-1.5">
                  <Label>{language === "en" ? "Description" : "መግለጫ"}</Label>
                  <Textarea name="description" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{language === "en" ? "Price (ETB)" : "ዋጋ (ብር)"}</Label>
                    <Input name="price" type="number" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("marketplace.location")}</Label>
                    <Input name="location" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t("contact.phone")}</Label>
                    <Input name="phone" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("contact.email")}</Label>
                    <Input name="email" type="email" />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  {language === "en" ? "Submit Listing" : "ዝርዝር ያስገቡ"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-accent/5 border border-accent/20">
          <Info className="h-4 w-4 text-accent shrink-0" />
          <p className="text-xs text-muted-foreground">{t("marketplace.commission")}</p>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="mb-8">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            {listingTabs.map((lt) => (
              <TabsTrigger key={lt.value} value={lt.value} className="text-xs sm:text-sm">
                {t(lt.key)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <ListingSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing, i) => (
              <ListingCard key={listing.id} listing={listing} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
