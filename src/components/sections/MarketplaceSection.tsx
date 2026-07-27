import { useEffect, useMemo, useState } from "react"
import { Lock, MapPin, Phone, Plus, Info, Send, SearchX } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useLanguage } from "@/lib/i18n"
import { useListings, type Listing } from "@/hooks/useListings"
import { useSmartSearch } from "@/hooks/useSmartSearch"
import { SmartSearchBar } from "@/components/search/SmartSearchBar"
import { useInView } from "@/hooks/useInView"
import { supabase } from "@/lib/supabase"
import { sanitizeText } from "@/lib/validation"
import { navigateTo } from "@/lib/navigation"
import { CreateListingForm } from "./CreateListingForm"
import { RfqModal, type RfqContext } from "./RfqModal"
import type { PremiumTier } from "@/types/payment"

const listingTabs = [
  { value: "all", key: "blog.filter.all" as const },
  { value: "property_sale", key: "marketplace.sale" as const },
  { value: "property_rent", key: "marketplace.rent" as const },
  { value: "land_sale", key: "marketplace.land" as const },
  { value: "material_sale", key: "marketplace.materials" as const },
  { value: "professional_service", key: "marketplace.services" as const },
]

const LISTINGS_PER_PAGE = 6

function getVisiblePages(currentPage: number, pageCount: number) {
  const start = Math.max(1, Math.min(currentPage - 1, pageCount - 2))
  return Array.from({ length: Math.min(3, pageCount) }, (_, index) => start + index)
}

function InquiryModal({
  open,
  onOpenChange,
  listingId,
  listingTitle
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  listingTitle: string;
}) {
  const { language, t } = useLanguage()
  const [inquirySent, setInquirySent] = useState(false)
  const [inquiryError, setInquiryError] = useState("")
  const [inquiryData, setInquiryData] = useState({ name: "", phone: "" })
  const handleInquiry = async () => {
    if (!inquiryData.name || !inquiryData.phone) {
      setInquiryError(language === "en" ? "Please fill in all fields" : "እባክዎ ሁሉንም መስኮቶችን ይሙሉ")
      return
    }

    const { error } = await supabase.from("inquiries").insert({
      name: sanitizeText(inquiryData.name, 100),
      email: "marketplace@yebetweg.com",
      phone: inquiryData.phone,
      subject: `Inquiry for ${listingTitle}`,
      message: `Inquiry from ${inquiryData.name} - Phone: ${inquiryData.phone}`,
      listing_id: listingId,
    })

    if (error) {
      setInquiryError(language === "en" ? "Failed to send inquiry" : "ጥያቄን ለማስገባ አልተሳካም ነው")
      return
    }

    setInquirySent(true)
    setTimeout(() => {
      onOpenChange(false)
      setInquirySent(false)
      setInquiryData({ name: "", phone: "" })
    }, 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full gap-2">
              <Phone className="h-3.5 w-3.5" />
              {t("marketplace.contact")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{listingTitle}</DialogTitle>
              <DialogDescription>
                {language === "en" ? "Submit an inquiry to connect with the listing owner." : "ከዝርዝር ባለቤት ጋር ለመገናኘት ጥያቄ ያስገቡ።"}
              </DialogDescription>
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
                {inquiryError && (
                  <p className="text-xs text-destructive">{inquiryError}</p>
                )}
                <div className="space-y-2">
                  <Label>{t("contact.name")}</Label>
                  <Input
                    placeholder={language === "en" ? "Your name" : "ስምዎ"}
                    value={inquiryData.name}
                    onChange={(e) => setInquiryData({ ...inquiryData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("contact.phone")}</Label>
                  <Input
                    placeholder="+251..."
                    value={inquiryData.phone}
                    onChange={(e) => setInquiryData({ ...inquiryData, phone: e.target.value })}
                  />
                </div>
                <Button onClick={handleInquiry} className="w-full">
                  {t("contact.send")}
                </Button>
              </div>
            )}
          </DialogContent>
          </Dialog>
  )
}

function ListingCard({ listing, index, canContact, onRequestQuote }: {
  listing: any
  index: number
  canContact: boolean
  onRequestQuote: (ctx: RfqContext) => void
}) {
  const { language, t } = useLanguage()
  const title = language === "am" ? listing.title_am : listing.title_en
  const [contactOpen, setContactOpen] = useState(false)
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
          {listing.status === "pending" && (
            <Badge variant="secondary" className="text-[10px]">
              {language === "en" ? "Pending" : "በጥበቃ ላይ"}
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
      <CardFooter className="flex-col gap-2 px-4 pb-4 pt-0">
        <div className="grid w-full grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() =>
              onRequestQuote({
                sourceType: "listing",
                sourceId: listing.id,
                itemName: title,
                city: listing.location,
                targetPrice: listing.price || null,
              })
            }
          >
            <Send className="h-3.5 w-3.5" />
            {language === "en" ? "Request Quote" : "ዋጋ ጠይቅ"}
          </Button>
          {!canContact ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => navigateTo("/#premium")}
            >
              <Lock className="h-3.5 w-3.5" />
              {language === "en" ? "Unlock contact" : "ግንኙነት ይክፈቱ"}
            </Button>
          ) : (
            <InquiryModal
              open={contactOpen}
              onOpenChange={setContactOpen}
              listingId={listing.id}
              listingTitle={title}
            />
          )}
        </div>
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

export function MarketplaceSection({ activePlan = "free" }: { activePlan?: PremiumTier }) {
  const { t, language } = useLanguage()
  const [tab, setTab] = useState("all")
  const [page, setPage] = useState(1)
  const { listings, loading,  } = useListings(tab, page, LISTINGS_PER_PAGE)
  const { ref, isInView } = useInView()
  const [listDialogOpen, setListDialogOpen] = useState(false)
  const [rfqContext, setRfqContext] = useState<RfqContext | null>(null)

  // Client-side smart search for listings
  const smartSearch = useSmartSearch<Listing>({
    data: listings,
    initialPageSize: LISTINGS_PER_PAGE,
    defaultSortField: "created_at",
    searchableFields: ["title_en", "title_am", "description", "location", "category"],
  })

  const searchableListings = smartSearch.items
  const totalFiltered = smartSearch.totalCount
  const pageCount = Math.max(1, Math.ceil(totalFiltered / LISTINGS_PER_PAGE))
  const visiblePages = useMemo(() => getVisiblePages(page, pageCount), [page, pageCount])
  const canContact = activePlan === "premium" || activePlan === "pro"
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    setPage(1)
  }, [tab])

  const goToPage = (nextPage: number) => {
    setPage(Math.min(Math.max(nextPage, 1), pageCount))
    document.getElementById("marketplace")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  // Build filter chips from active filters
  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; value: string; onRemove: () => void }[] = []
    const vals = smartSearch.state.filters

    if (vals.location) {
      chips.push({
        key: "location",
        label: language === "en" ? "Location" : "ቦታ",
        value: vals.location,
        onRemove: () => smartSearch.setFilter("location", undefined),
      })
    }
    if (vals.price_range) {
      const r = vals.price_range as { min?: number; max?: number }
      chips.push({
        key: "price_range",
        label: language === "en" ? "Price" : "ዋጋ",
        value: `${r.min?.toLocaleString() || "0"} - ${r.max?.toLocaleString() || "∞"} ETB`,
        onRemove: () => smartSearch.setFilter("price_range", undefined),
      })
    }

    return chips
  }, [smartSearch.state.filters, smartSearch.setFilter, language])

  return (
    <section id="marketplace" ref={ref} className="py-16 sm:py-24 bg-muted/30">
      <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">{t("marketplace.title")}</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl">{t("marketplace.subtitle")}</p>
          </div>
          <div className="flex gap-2">
          <CreateListingForm open={listDialogOpen} onOpenChange={setListDialogOpen} />
            <Button
              className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => setListDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              {t("marketplace.listYours")}
            </Button>
        </div>
          </div>

        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-accent/5 border border-accent/20">
          <Info className="h-4 w-4 text-accent shrink-0" />
          <p className="text-xs text-muted-foreground">{t("marketplace.commission")}</p>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="mb-4">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            {listingTabs.map((lt) => (
              <TabsTrigger key={lt.value} value={lt.value} className="text-xs sm:text-sm">
                {t(lt.key)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Smart Search Bar */}
        <div className="mb-6">
          <SmartSearchBar
            query={smartSearch.state.query}
            onQueryChange={smartSearch.setQuery}
            chips={activeFilterChips}
            onToggleFilters={() => setFiltersOpen(!filtersOpen)}
            filtersOpen={filtersOpen}
            totalCount={totalFiltered}
            placeholder={language === "en" ? "Search listings..." : "ዝርዝሮች ይፈልጉ..."}
            compact
          />
        </div>

        {loading || smartSearch.loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <ListingSkeleton key={i} />)}
          </div>
        ) : searchableListings.length === 0 ? (
          <div className="p-12 text-center">
            <SearchX className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">
              {language === "en" ? "No matching listings" : "ምንም የሚዛመድ ዝርዝር የለም"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {language === "en"
                ? "Try adjusting your search or filters"
                : "እባክዎ ፍለጋዎን ወይም ማጣሪያዎን ያስተካክሉ"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchableListings.map((listing, i) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  index={i}
                  canContact={canContact}
                  onRequestQuote={(ctx) => setRfqContext(ctx)}
                />
              ))}
            </div>

            {pageCount > 1 && (
              <Pagination className="mt-8">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#marketplace"
                      aria-disabled={page === 1}
                      className={page === 1 ? "pointer-events-none opacity-50" : ""}
                      onClick={(event) => {
                        event.preventDefault()
                        goToPage(page - 1)
                      }}
                    />
                  </PaginationItem>
                  {visiblePages.map((pageNumber) => (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        href="#marketplace"
                        isActive={pageNumber === page}
                        onClick={(event) => {
                          event.preventDefault()
                          goToPage(pageNumber)
                        }}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#marketplace"
                      aria-disabled={page === pageCount}
                      className={page === pageCount ? "pointer-events-none opacity-50" : ""}
                      onClick={(event) => {
                        event.preventDefault()
                        goToPage(page + 1)
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
      </div>
      <RfqModal
        open={Boolean(rfqContext)}
        onOpenChange={(open) => {
          if (!open) setRfqContext(null)
        }}
        rfqContext={rfqContext}
      />
    </section>
  )
}

