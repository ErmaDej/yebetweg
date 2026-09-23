import { useEffect, useMemo, useRef, useState } from "react"
import { Shield, FlaskConical, Clock, ArrowDownToLine, Paintbrush, Droplets, Zap, Wrench, Palette, HardHat, Lock, SearchX, MessageCircleQuestion, BadgeCheck, Send, Loader2, Trash2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { useTips, useTipCategories } from "@/hooks/useTips"
import { useTipQa, askTipQuestion, answerTipQuestion, deleteTipQuestion } from "@/hooks/useTipQa"
import { useAuthContext } from "@/context/AuthContext"
import { useMarketPrices } from "@/hooks/useMarketPrices"
import { SmartSearchBar } from "@/components/search/SmartSearchBar"
import { useInView } from "@/hooks/useInView"
import { useNavigate } from "react-router-dom"
import type { PremiumTier } from "@/types/payment"

const TIPS_PER_PAGE = 9

function getVisiblePages(currentPage: number, pageCount: number) {
  const start = Math.max(1, Math.min(currentPage - 1, pageCount - 2))
  return Array.from({ length: Math.min(3, pageCount) }, (_, index) => start + index)
}

const iconMap: Record<string, any> = {
  shield: Shield,
  "flask-conical": FlaskConical,
  clock: Clock,
  "arrow-down-to-line": ArrowDownToLine,
  paintbrush: Paintbrush,
  droplets: Droplets,
  zap: Zap,
  wrench: Wrench,
  palette: Palette,
  "hard-hat": HardHat,
}

/** Strip under a tip card: question count + CTA that opens the full Q&A thread dialog. */
function TipQaTeaser({
  am,
  count,
  isLoading,
  error,
  onOpen,
}: {
  am: boolean
  count: number
  isLoading: boolean
  error: string | null
  onOpen: () => void
}) {
  return (
    <div className="mt-4 border-t border-border/40 pt-3" aria-label={am ? "ጥያቄና መልስ" : "Questions & answers"}>
      {isLoading ? (
        <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {am ? "ጥያቄዎች በመጫን ላይ…" : "Loading Q&A…"}
        </div>
      ) : error ? (
        <p className="py-1 text-xs text-muted-foreground/80">
          {am ? "ጥያቄዎችን መጫን አልተቻለም።" : "Q&A is unavailable right now."}
        </p>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          aria-haspopup="dialog"
          className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-muted/40"
        >
          <span className="flex items-center gap-1.5">
            <MessageCircleQuestion className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground">
              {am ? `ጥያቄዎች (${count})` : `Questions (${count})`}
            </span>
          </span>
          <span className="text-[11px] font-medium text-primary hover:underline">
            {count > 0 ? (am ? "ክፈት እና ተሳተፉ" : "View & join") : (am ? "ጥያቄ ጠይቅ" : "Ask a question")}
          </span>
        </button>
      )}
    </div>
  )
}

/** Full Q&A thread for one tip, in a modal dialog: header with count, scrollable
 *  question list (all questions, no card-space limits), sticky ask form. Realtime
 *  updates flow through the shared useTipQa instance owned by TipCard. */
function TipQaDialog({
  tip,
  am,
  open,
  onOpenChange,
  qa,
}: {
  tip: any
  am: boolean
  open: boolean
  onOpenChange: (v: boolean) => void
  qa: ReturnType<typeof useTipQa>
}) {
  const { questions, answers, isLoading, error, myUserId, reload } = qa
  const [askText, setAskText] = useState("")
  const [askBusy, setAskBusy] = useState(false)
  const [askError, setAskError] = useState<string | null>(null)
  const [answerFor, setAnswerFor] = useState<string | null>(null)
  const [answerText, setAnswerText] = useState("")
  const [answerBusy, setAnswerBusy] = useState(false)
  const [answerError, setAnswerError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(0)

  // Keep the newest question in view: scroll to bottom when the list grows.
  useEffect(() => {
    if (questions.length > prevCountRef.current) {
      const el = scrollRef.current
      if (el) requestAnimationFrame(() => el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }))
    }
    prevCountRef.current = questions.length
  }, [questions.length])

  const submitAsk = async () => {
    setAskBusy(true)
    setAskError(null)
    const err = await askTipQuestion(tip.id, askText)
    setAskBusy(false)
    if (err) {
      setAskError(err)
      return
    }
    setAskText("")
    void reload()
  }

  const submitAnswer = async (questionId: string) => {
    setAnswerBusy(true)
    setAnswerError(null)
    const err = await answerTipQuestion(questionId, answerText)
    setAnswerBusy(false)
    if (err) {
      setAnswerError(err)
      return
    }
    setAnswerFor(null)
    setAnswerText("")
    void reload()
  }

  const removeQuestion = async (questionId: string) => {
    const err = await deleteTipQuestion(questionId)
    if (!err) void reload()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
        aria-describedby={undefined}
      >
        <DialogHeader className="border-b border-border/60 px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <MessageCircleQuestion className="h-4 w-4 text-primary" />
            <span className="line-clamp-1">{am ? tip.title_am : tip.title_en}</span>
            <Badge variant="secondary" className="ml-auto shrink-0 text-[10px]">
              {am ? `${questions.length} ጥያቄ` : `${questions.length} questions`}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable thread */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {am ? "ጥያቄዎች በመጫን ላይ…" : "Loading Q&A…"}
            </div>
          ) : error ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              {am ? "ጥያቄዎችን መጫን አልተቻለም።" : "Q&A is unavailable right now."}
            </p>
          ) : questions.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground">
              {am
                ? "እስካሁን ጥያቄ የለም — የመጀመሪያው ይሁኑ።"
                : "No questions yet — be the first to ask about this tip."}
            </p>
          ) : (
            <ul className="space-y-3">
              {questions.map((q) => (
                <li key={q.id} className="rounded-md bg-muted/40 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium leading-snug">{q.question}</p>
                    {myUserId && q.user_id === myUserId && (
                      <button
                        type="button"
                        aria-label={am ? "ጥያቄ ሰርዝ" : "Delete question"}
                        className="shrink-0 text-muted-foreground/50 hover:text-destructive"
                        onClick={() => void removeQuestion(q.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                    {q.asker_name || (am ? "አባል" : "Member")}
                  </p>
                  {(answers[q.id]?.length ?? 0) > 0 && (
                    <ul className="mt-2 space-y-1.5 border-l-2 border-primary/30 pl-2.5">
                      {answers[q.id].map((a) => (
                        <li key={a.id}>
                          <p className="text-xs text-muted-foreground leading-snug">
                            {a.answer}
                            {a.is_expert && (
                              <span className="ml-1.5 inline-flex items-center gap-0.5 align-middle text-[10px] font-semibold text-accent">
                                <BadgeCheck className="h-3 w-3" />
                                {am ? "የአማካሪ መልስ" : "Expert answer"}
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60">{a.answerer_name || (am ? "አባል" : "Member")}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                  {answerFor === q.id ? (
                    <div className="mt-2">
                      <textarea
                        autoFocus
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        maxLength={2000}
                        rows={2}
                        aria-label={am ? "መልስዎ" : "Your answer"}
                        placeholder={am ? "መልስዎን ይጻፉ…" : "Write your answer…"}
                        className="w-full rounded-md border border-border bg-background p-2 text-xs"
                      />
                      {answerError && <p className="mt-1 text-[10px] text-destructive">{answerError}</p>}
                      <div className="mt-1 flex items-center gap-1.5">
                        <Button size="sm" variant="secondary" className="h-7 px-2 text-[11px]" disabled={answerBusy} onClick={() => void submitAnswer(q.id)}>
                          {answerBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                          {am ? "ላክ" : "Post"}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" disabled={answerBusy} onClick={() => { setAnswerFor(null); setAnswerText(""); setAnswerError(null) }}>
                          {am ? "ተወው" : "Cancel"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="mt-1.5 text-[11px] font-medium text-primary hover:underline"
                      onClick={() => { setAnswerFor(q.id); setAnswerText(""); setAnswerError(null) }}
                    >
                      {am ? "መልስ ይጻፉ" : "Answer"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Sticky ask form */}
        <div className="border-t border-border/60 px-4 py-3">
          <textarea
            value={askText}
            onChange={(e) => setAskText(e.target.value)}
            maxLength={500}
            rows={2}
            aria-label={am ? "አዲስ ጥያቄ" : "New question"}
            placeholder={am ? "በዚህ ምክር ላይ ጥያቄ ይጠይቁ…" : "Ask the community about this tip…"}
            className="w-full rounded-md border border-border bg-background p-2 text-xs"
          />
          {askError && <p className="mt-1 text-[10px] text-destructive">{askError}</p>}
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <p className="text-[10px] text-muted-foreground/60">
              {am ? "አዲስ መልሶች በቀጥታ ይታያሉ።" : "New answers appear here live."}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-[11px]"
              disabled={askBusy || askText.trim().length < 8}
              onClick={() => void submitAsk()}
            >
              {askBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageCircleQuestion className="h-3 w-3" />}
              {am ? "ጥያቄ ጠይቅ" : "Ask question"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function TipCard({ tip, index, canReadPremium }: { tip: any; index: number; canReadPremium: boolean }) {
  const navigate = useNavigate()
  const { language, t } = useLanguage()
  const { session } = useAuthContext()
  const [expanded, setExpanded] = useState(false)
  const [qaOpen, setQaOpen] = useState(false)
  const qa = useTipQa(tip.id, session?.user?.id ?? null)
  const title = language === "am" ? tip.title_am : tip.title_en
  const IconComponent = iconMap[tip.icon] || Shield
  const isLocked = tip.is_premium && !canReadPremium

  return (
    <Card
      className={`group relative overflow-hidden border-border/50 hover:border-accent/50 transition-all duration-300 hover:shadow-lg`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {isLocked && (
        <div className="absolute inset-0 z-10 glassmorphism flex flex-col items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20">
            <Lock className="h-6 w-6 text-accent" />
          </div>
          <p className="text-sm font-semibold text-foreground">{t("tips.unlockPremium")}</p>
          <Button
            size="sm"
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => navigate("/#premium")}
          >
            {t("premium.choosePlan")}
          </Button>
        </div>
      )}
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <IconComponent className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm text-foreground line-clamp-1">{title}</h3>
              <Badge variant={tip.is_premium ? "default" : "secondary"} className="shrink-0 text-[10px]">
                {tip.is_premium ? t("tips.premium") : t("tips.free")}
              </Badge>
            </div>
            <p
              id={`tip-content-${tip.id}`}
              className={expanded ? "text-xs text-muted-foreground whitespace-pre-line" : "text-xs text-muted-foreground line-clamp-3"}
            >
              {tip.content}
            </p>
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={`tip-content-${tip.id}`}
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {expanded
                ? (language === "en" ? "Show less" : "ዝጋ")
                : (language === "en" ? "Read more" : "ያንብቡ")}
            </button>
          </div>
        </div>
        {session && (
          <TipQaTeaser
            am={language === "am"}
            count={qa.questions.length}
            isLoading={qa.isLoading}
            error={qa.error}
            onOpen={() => setQaOpen(true)}
          />
        )}
      </CardContent>
      {session && (
        <TipQaDialog
          tip={tip}
          am={language === "am"}
          open={qaOpen}
          onOpenChange={setQaOpen}
          qa={qa}
        />
      )}
    </Card>
  )
}

function TipSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function TipsSection({ activePlan = "free" }: { activePlan?: PremiumTier }) {
  const { t, language } = useLanguage()
  const { ref, isInView } = useInView()
  const canReadPremium = activePlan === "premium" || activePlan === "pro"

  // Server-driven filter state
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [premiumFilter, setPremiumFilter] = useState<boolean | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const [serverQuery, setServerQuery] = useState("")

  // Debounce the raw input before triggering server-side search
  useEffect(() => {
    const timer = setTimeout(() => setServerQuery(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const isSearching = Boolean(serverQuery.trim())
  const tipCategories = useTipCategories()

  // While searching the hook returns the full match set (page pinned to 1);
  // otherwise it server-paginates.
  const { data: tipsData, isLoading: loading, error: loadError } = useTips({
    category: selectedCategory,
    page: isSearching ? 1 : page,
    pageSize: TIPS_PER_PAGE,
    searchQuery: serverQuery,
    isPremium: premiumFilter,
  })

  const tips = tipsData?.data ?? []
  const total = tipsData?.total ?? 0

  const visibleTips = isSearching
    ? tips.slice((page - 1) * TIPS_PER_PAGE, page * TIPS_PER_PAGE)
    : tips
  const totalFiltered = isSearching ? tips.length : total
  const pageCount = Math.max(1, Math.ceil(totalFiltered / TIPS_PER_PAGE))
  const visiblePages = useMemo(() => getVisiblePages(page, pageCount), [page, pageCount])

  // Reset pagination whenever any filter changes
  useEffect(() => {
    setPage(1)
  }, [selectedCategory, premiumFilter, serverQuery])

  const goToPage = (nextPage: number) => {
    setPage(Math.min(Math.max(nextPage, 1), pageCount))
    document.getElementById("tips")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const toggleCategory = (cat: string) =>
    setSelectedCategory((prev) => (prev === cat ? "all" : cat))

  const togglePremium = (value: boolean) =>
    setPremiumFilter((prev) => (prev === value ? undefined : value))

  const { data: tickerPrices } = useMarketPrices()
  const tickerItems = useMemo(() => {
    if (tickerPrices && tickerPrices.length > 0) {
      return tickerPrices.slice(0, 5).map((p) => {
        const name = language === "am" ? p.material_am || p.material_en : p.material_en
        const change = p.change_percent ?? 0
        const sign = change > 0 ? "+" : ""
        return {
          text: `${name}: ${Number(p.price).toLocaleString()} ETB/${p.unit}`,
          change: `${sign}${change}%`,
        }
      })
    }
    // Fallback while live prices load — explicit placeholder, no fabricated prices
    const loadingText = language === "en" ? "Loading live market prices…" : "ቀጥታ የገበያ ዋጋዎች በመጫን ላይ…"
    const viewText = language === "en" ? "View Market Prices" : "የገበያ ዋጋ ይመልከቱ"
    return [{ text: loadingText, change: viewText }]
  }, [tickerPrices, language])

  return (
    <section id="tips" ref={ref} className="py-16 sm:py-24 bg-muted/30">
      <div className="w-full overflow-hidden bg-primary text-primary-foreground py-2 mb-10">
        <div className="animate-marquee whitespace-nowrap flex items-center gap-8" aria-hidden="true">
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-2 text-sm">
              <span>{item.text}</span>
              <span
                className={
                  /^[-+]/.test(item.change)
                    ? item.change.startsWith("+")
                      ? "text-red-300"
                      : "text-green-300"
                    : "text-primary-foreground/70"
                }
              >
                {item.change}
              </span>
            </span>
          ))}
        </div>
        <p className="sr-only">
          {tickerPrices && tickerPrices.length > 0
            ? language === "en"
              ? "Live market prices"
              : "ቀጥታ የገበያ ዋጋዎች"
            : language === "en"
              ? "Sample market prices — see Market Prices section for live data"
              : "የናሙና የገበያ ዋጋዎች — ቀጥታ መረጃ ለማየት የገበያ ዋጋ ክፍልን ይመልከቱ"}
        </p>
      </div>

      <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">{t("tips.title")}</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">{t("tips.subtitle")}</p>
        </div>

        {/* Smart Search Bar with removable filter chips */}
        <div className="mb-6 max-w-xl mx-auto">
          <SmartSearchBar
            query={searchInput}
            onQueryChange={setSearchInput}
            chips={[
              ...(selectedCategory !== "all"
                ? [{
                    key: "category",
                    label: language === "en" ? "Category" : "ምድብ",
                    value: selectedCategory,
                    onRemove: () => setSelectedCategory("all"),
                  }]
                : []),
              ...(premiumFilter !== undefined
                ? [{
                    key: "premium",
                    label: "",
                    value: premiumFilter
                      ? (language === "en" ? "Premium" : "ፕሪሚየም")
                      : (language === "en" ? "Free" : "ነፃ"),
                    onRemove: () => setPremiumFilter(undefined),
                  }]
                : []),
            ]}
            totalCount={totalFiltered}
            placeholder={language === "en" ? "Search tips..." : "ምክሮች ይፈልጉ..."}
            compact
          />
        </div>

        {/* Category & Premium filter chips — real buttons so keyboard users can
            focus/activate them (Badge asChild keeps the identical styling). */}
        <div className="flex flex-wrap justify-center gap-2 mb-6" role="group" aria-label={language === "en" ? "Filter tips" : "ምክሮች ማጣሪያ"}>
          {(tipCategories.data?.slice(0, 10) ?? []).map((cat: string) => (
            <Badge
              key={cat}
              asChild
              variant={selectedCategory === cat ? "default" : "outline"}
              className="cursor-pointer text-xs"
            >
              <button
                type="button"
                aria-pressed={selectedCategory === cat}
                onClick={() => toggleCategory(cat)}
              >
                {cat}
              </button>
            </Badge>
          ))}
          <Badge
            asChild
            variant={premiumFilter === true ? "default" : "outline"}
            className="cursor-pointer text-xs"
          >
            <button type="button" aria-pressed={premiumFilter === true} onClick={() => togglePremium(true)}>
              {language === "en" ? "Premium" : "ፕሪሚየም"} ✨
            </button>
          </Badge>
          <Badge
            asChild
            variant={premiumFilter === false ? "default" : "outline"}
            className="cursor-pointer text-xs"
          >
            <button type="button" aria-pressed={premiumFilter === false} onClick={() => togglePremium(false)}>
              {language === "en" ? "Free" : "ነፃ"}
            </button>
          </Badge>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: TIPS_PER_PAGE }).map((_, i) => <TipSkeleton key={i} />)}
          </div>
        ) : loadError ? (
          <div className="p-12 text-center">
            <HardHat className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">
              {language === "en" ? "Couldn't load tips" : "ምክሮችን መጫን አልተቻለም"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {language === "en"
                ? "Check your connection and try again."
                : "ግንኙነትዎን ያረጋግጡ እና እንደገና ይሞክሩ።"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 text-sm font-medium text-primary hover:underline"
            >
              {language === "en" ? "Retry" : "እንደገና ሞክር"}
            </button>
          </div>
        ) : visibleTips.length === 0 ? (
          <div className="p-12 text-center">
            <SearchX className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">
              {language === "en" ? "No matching tips" : "ምንም የሚዛመድ ምክር የለም"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {language === "en"
                ? "Try adjusting your search or filters"
                : "እባክዎ ፍለጋዎን ወይም ማጣሪያዎችዎን ያስተካክሉ"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleTips.map((tip, i) => (
                <TipCard key={tip.id} tip={tip} index={i} canReadPremium={canReadPremium} />
              ))}
            </div>

            {pageCount > 1 && (
              <Pagination className="mt-8">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#tips"
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
                        href="#tips"
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
                      href="#tips"
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
    </section>
  )
}
