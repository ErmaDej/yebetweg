import { useEffect, useMemo, useState } from "react"
import { Star, MapPin, Phone, Plus, ShieldCheck, BriefcaseBusiness, Clock3, Images, Send, SearchX } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
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
import { useProfessionals, type Professional } from "@/hooks/useProfessionals"
import { useSmartSearch } from "@/hooks/useSmartSearch"
import { SmartSearchBar } from "@/components/search/SmartSearchBar"
import { useInView } from "@/hooks/useInView"
import { supabase } from "@/lib/supabase"
import { validateProfessionalForm, sanitizeText } from "@/lib/validation"
import { RfqModal, type RfqContext } from "./RfqModal"

const specialties = [
  { value: "all", key: "blog.filter.all" as const },
  { value: "architect", key: "professionals.architect" as const },
  { value: "engineer", key: "professionals.engineer" as const },
  { value: "contractor", key: "professionals.contractor" as const },
  { value: "electrician", key: "professionals.electrician" as const },
  { value: "plumber", key: "professionals.plumber" as const },
  { value: "surveyor", key: "professionals.surveyor" as const },
]

const PROFESSIONALS_PER_PAGE = 6

function getVisiblePages(currentPage: number, pageCount: number) {
  const start = Math.max(1, Math.min(currentPage - 1, pageCount - 2))
  return Array.from({ length: Math.min(3, pageCount) }, (_, index) => start + index)
}

function ProfessionalCard({ professional, index, onRequestQuote }: {
  professional: any
  index: number
  onRequestQuote: (ctx: RfqContext) => void
}) {
  const { t, language } = useLanguage()
  const [hireOpen, setHireOpen] = useState(false)
  const [inquirySent, setInquirySent] = useState(false)
  const [hireError, setHireError] = useState("")
  const [hireData, setHireData] = useState({ name: "", phone: "" })

  const initials = professional.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
  const portfolioCount = professional.portfolio_images?.filter(Boolean).length || 0
  const trustScore = Math.min(
    100,
    Math.round(
      (professional.is_verified ? 45 : 15) +
        Math.min(Number(professional.rating || 0), 5) * 7 +
        Math.min(Number(professional.experience_years || 0), 15) * 1.5 +
        Math.min(portfolioCount, 10) * 1.5,
    ),
  )
  const trustLevel = trustScore >= 80 ? "high" : trustScore >= 50 ? "medium" : "low"
  const trustColor = trustLevel === "high" ? "bg-emerald-500" : trustLevel === "medium" ? "bg-amber-500" : "bg-muted-foreground"
  const responseLabel = language === "en" ? "Usually responds in 24h" : "ብዙውን ጊዜ በ24 ሰዓት ይመልሳል"

  const handleInquiry = async () => {
    if (!hireData.name || !hireData.phone) {
      setHireError(language === "en" ? "Please fill in all fields" : "እባክዎ ሁሉንም መስኮቶችን ይሙሉ")
      return
    }

    const { error } = await supabase.from("inquiries").insert({
      name: sanitizeText(hireData.name, 100),
      email: "hire@yebetweg.com",
      phone: hireData.phone,
      subject: `Hiring inquiry for ${professional.name}`,
      message: `Hiring request from ${hireData.name} - Phone: ${hireData.phone} - Professional ID: ${professional.id}`,
    })

    if (error) {
      setHireError(language === "en" ? "Failed to send request" : "ጥያቄን ለማስገባ አልተሳካም ነው")
      return
    }

    setInquirySent(true)
    setTimeout(() => {
      setHireOpen(false)
      setInquirySent(false)
      setHireData({ name: "", phone: "" })
    }, 2000)
  }

  return (
    <Card
      className={`group h-full overflow-hidden border-border/50 hover:border-accent/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${professional.is_verified ? "ring-1 ring-accent/30" : ""}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {professional.is_verified && (
        <div className="absolute top-0 right-0">
          <div className="bg-accent text-accent-foreground text-[8px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            {language === "en" ? "VERIFIED" : "የተረጋገጠ"}
          </div>
        </div>
      )}
      <CardContent className="flex h-full flex-col p-5">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            {professional.portfolio_images && professional.portfolio_images.length > 0 ? (
              <img
                src={professional.portfolio_images[0]}
                alt={professional.name}
                className="h-14 w-14 rounded-full object-cover border-2 border-primary/20 shrink-0 animate-scale-in"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <Avatar className="h-14 w-14 border-2 border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
            )}
            {professional.is_verified && (
              <div className="absolute -bottom-1 -right-1 bg-accent rounded-full p-0.5 ring-2 ring-background">
                <ShieldCheck className="h-3.5 w-3.5 text-accent-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors truncate">
                {professional.name}
              </h3>
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="text-[10px]">
                {t(specialties.find(s => s.value === professional.specialty)?.key || "professionals.contractor")}
              </Badge>
              <Badge
                variant={professional.is_verified ? "default" : "outline"}
                className={`gap-1 text-[10px] ${professional.is_verified ? "bg-accent text-accent-foreground" : ""}`}
              >
                <ShieldCheck className="h-3 w-3" />
                {professional.is_verified
                  ? t("common.verified")
                  : language === "en" ? "Pending" : "ግምገማ ላይ"}
              </Badge>
              {portfolioCount > 0 && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Images className="h-3 w-3" />
                  {portfolioCount} {language === "en" ? "proofs" : "ማረጋገጫዎች"}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 text-accent fill-accent" />
                {Number(professional.rating).toFixed(1)}
              </span>
              <span className="flex items-center gap-1">
                <BriefcaseBusiness className="h-3 w-3" />
                {professional.experience_years} {language === "en" ? "yrs" : "ዓመታት"}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span className="line-clamp-1">{professional.location}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">{language === "en" ? "Trust Score" : "የእምነት ደረጃ"}</span>
            <span className="text-xs font-semibold">{trustScore}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${trustColor}`}
              style={{ width: `${trustScore}%` }}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-1">{responseLabel}</span>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2"
            onClick={() =>
              onRequestQuote({
                sourceType: "professional",
                sourceId: professional.id,
                itemName: professional.name,
                specification: professional.specialty,
                city: professional.location,
              })
            }
          >
            <Send className="h-3.5 w-3.5" />
            {language === "en" ? "Request Quote" : "ዋጋ ጠይቅ"}
          </Button>
          <Dialog open={hireOpen} onOpenChange={setHireOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full gap-2">
              <Phone className="h-3.5 w-3.5" />
              {t("professionals.hire")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {language === "en" ? `Hire ${professional.name}` : `${professional.name} ያስተኳክው`}
              </DialogTitle>
              <DialogDescription>
                {language === "en" ? `Submit a hiring request for ${professional.name}` : `${professional.name} ለማስተኳከው ጥያቄ ያስገቡ`}
              </DialogDescription>
            </DialogHeader>
            {inquirySent ? (
              <div className="py-8 text-center">
                <p className="text-accent font-semibold">
                  {language === "en" ? "Request sent!" : "ጥያቄ ተልኳል!"}
                </p>
              </div>
) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {language === "en"
                    ? `Submit a hiring request for ${professional.name}. They will contact you within 24 hours.`
                    : `${professional.name} ለማስተኳከው ጥያቄ ያስገቡ። በ24 ሰዓት ውስጥ ያገኙዎታል።`}
                </p>
                {hireError && (
                  <p className="text-xs text-destructive">{hireError}</p>
                )}
                <div className="space-y-1.5">
                  <Label>{t("contact.name")}</Label>
                  <Input
                    placeholder={language === "en" ? "Your name" : "ስምዎ"}
                    value={hireData.name}
                    onChange={(e) => setHireData({ ...hireData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("contact.phone")}</Label>
                  <Input
                    placeholder="+251..."
                    value={hireData.phone}
                    onChange={(e) => setHireData({ ...hireData, phone: e.target.value })}
                  />
                </div>
                <Button onClick={handleInquiry} className="w-full">{t("contact.send")}</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}

export function ProfessionalsSection() {
  const { t, language } = useLanguage()
  const [specialty, setSpecialty] = useState("all")
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const [serverQuery, setServerQuery] = useState("")
  const { ref, isInView } = useInView()
  const [joinOpen, setJoinOpen] = useState(false)
  const [joinError, setJoinError] = useState("")
  const [rfqContext, setRfqContext] = useState<RfqContext | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Debounce the raw input before triggering server-side search
  useEffect(() => {
    const timer = setTimeout(() => setServerQuery(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { professionals, loading, total } = useProfessionals(
    specialty,
    page,
    PROFESSIONALS_PER_PAGE,
    serverQuery
  )

  // Client-side smart search for professionals
  const smartSearch = useSmartSearch<Professional>({
    data: professionals,
    initialPageSize: PROFESSIONALS_PER_PAGE,
    defaultSortField: "rating",
    searchableFields: ["name", "specialty", "location"],
  })

  const searchableProfessionals = smartSearch.items
  const isSearching = Boolean(serverQuery.trim())
  // While searching, the hook returns the full match set and smartSearch owns
  // pagination; otherwise server pages drive it via the exact table total.
  const totalFiltered = isSearching ? smartSearch.totalCount : total
  const pageCount = Math.max(1, Math.ceil(totalFiltered / PROFESSIONALS_PER_PAGE))
  const currentPage = isSearching ? smartSearch.state.page : page
  const visiblePages = useMemo(() => getVisiblePages(currentPage, pageCount), [currentPage, pageCount])

  useEffect(() => {
    setPage(1)
  }, [specialty])

  useEffect(() => {
    if (isSearching) smartSearch.setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverQuery])

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount)
    }
  }, [page, pageCount])

  const goToPage = (nextPage: number) => {
    const clamped = Math.min(Math.max(nextPage, 1), pageCount)
    if (isSearching) smartSearch.setPage(clamped)
    else setPage(clamped)
    document.getElementById("professionals")?.scrollIntoView({ behavior: "smooth", block: "start" })
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
    if (vals.min_rating) {
      chips.push({
        key: "min_rating",
        label: language === "en" ? "Min Rating" : "ዝቅተኛ ደረጃ",
        value: `⭐ ${vals.min_rating}+`,
        onRemove: () => smartSearch.setFilter("min_rating", undefined),
      })
    }

    return chips
  }, [smartSearch.state.filters, smartSearch.setFilter, language])

  return (
    <section id="professionals" ref={ref} className="py-16 sm:py-24 bg-background">
      <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">{t("professionals.title")}</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl">{t("professionals.subtitle")}</p>
          </div>
          <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                {t("professionals.join")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("professionals.join")}</DialogTitle>
                <DialogDescription>
                  {language === "en" ? "Fill out the form below to join our professional network." : "ለሙያ ቅደም ተከተል ውስጥ ለመግባት ከዚህ በታች ያለውን ቅጽ ይሙሉ።"}
                </DialogDescription>
              </DialogHeader>
              {joinError && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {joinError}
                </div>
              )}
              <form
                className="space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault()
                  setJoinError("")

                  const fd = new FormData(e.currentTarget)
                  const formData = {
                    name: fd.get("name"),
                    specialty: fd.get("specialty"),
                    location: fd.get("location"),
                    phone: fd.get("phone"),
                    email: fd.get("email"),
                  }

                  const validationErrors = validateProfessionalForm(formData)
                  if (validationErrors.length > 0) {
                    setJoinError(validationErrors[0].message)
                    return
                  }

                  const { error: insertError } = await supabase.from("professionals").insert({
                    name: sanitizeText(formData.name as string, 100),
                    specialty: sanitizeText(formData.specialty as string, 50),
                    location: sanitizeText(formData.location as string, 100),
                    phone: sanitizeText(formData.phone as string, 20),
                    email: (formData.email as string).toLowerCase().trim(),
                    is_verified: false,
                  })

                  if (insertError) {
                    setJoinError("Failed to submit application. Please try again.")
                    return
                  }

                  setJoinOpen(false)
                }}
              >
                <div className="space-y-1.5">
                  <Label>{language === "en" ? "Full Name" : "ሙሉ ስም"}</Label>
                  <Input name="name" required />
                </div>
                <div className="space-y-1.5">
                  <Label>{language === "en" ? "Specialty" : "ስፔሻሊቲ"}</Label>
                  <Input name="specialty" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t("marketplace.location")}</Label>
                    <Input name="location" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("contact.phone")}</Label>
                    <Input name="phone" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("contact.email")}</Label>
                  <Input name="email" type="email" />
                </div>
                <Button type="submit" className="w-full">
                  {language === "en" ? "Submit Application" : "ማመልከቻ ያስገቡ"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <ToggleGroup
          type="single"
          value={specialty}
          onValueChange={(v) => v && setSpecialty(v)}
          className="flex flex-wrap justify-start gap-2 mb-6"
        >
          {specialties.map((s) => (
            <ToggleGroupItem
              key={s.value}
              value={s.value}
              className="text-xs sm:text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {t(s.key)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {/* Smart Search Bar */}
        <div className="mb-6">
          <SmartSearchBar
            query={searchInput}
            onQueryChange={setSearchInput}
            chips={activeFilterChips}
            onToggleFilters={() => setFiltersOpen(!filtersOpen)}
            filtersOpen={filtersOpen}
            totalCount={totalFiltered}
            placeholder={language === "en" ? "Search professionals..." : "ሙያተኞች ይፈልጉ..."}
            compact
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: PROFESSIONALS_PER_PAGE }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : searchableProfessionals.length === 0 ? (
          <div className="p-12 text-center">
            <SearchX className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">
              {language === "en" ? "No matching professionals" : "ምንም የሚዛመድ ሙያተኛ የለም"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {language === "en"
                ? "Try adjusting your search or filters"
                : "እባክዎ ፍለጋዎን ወይም ማጣሪያዎን ያስተካክሉ"}
            </p>
          </div>
        ) : (
          <>
            <div key={`${specialty}-${serverQuery}-${currentPage}`} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up">
              {searchableProfessionals.map((pro, i) => (
                <ProfessionalCard key={pro.id} professional={pro} index={i} onRequestQuote={(ctx) => setRfqContext(ctx)} />
              ))}
            </div>

            {pageCount > 1 && (
              <Pagination className="mt-8">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#professionals"
                      aria-disabled={currentPage === 1}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                      onClick={(event) => {
                        event.preventDefault()
                        goToPage(currentPage - 1)
                      }}
                    />
                  </PaginationItem>
                  {visiblePages.map((pageNumber) => (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        href="#professionals"
                        isActive={pageNumber === currentPage}
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
                      href="#professionals"
                      aria-disabled={currentPage === pageCount}
                      className={currentPage === pageCount ? "pointer-events-none opacity-50" : ""}
                      onClick={(event) => {
                        event.preventDefault()
                        goToPage(currentPage + 1)
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
