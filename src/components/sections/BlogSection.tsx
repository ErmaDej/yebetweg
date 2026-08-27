import { useEffect, useMemo, useState } from "react"
import { Clock, ArrowRight, BookOpen, SearchX, X } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useLanguage } from "@/lib/i18n"
import { useBlogs, type Blog } from "@/hooks/useBlogs"
import { useSmartSearch } from "@/hooks/useSmartSearch"
import { SmartSearchBar } from "@/components/search/SmartSearchBar"
import { useInView } from "@/hooks/useInView"
import { truncateWords } from "@/lib/searchUtils"

const categories = [
  { value: "all", key: "blog.filter.all" as const },
  { value: "construction_techniques", key: "blog.filter.construction" as const },
  { value: "philosophy", key: "blog.filter.philosophy" as const },
  { value: "market_insights", key: "blog.filter.market" as const },
  { value: "regulations", key: "blog.filter.regulations" as const },
  { value: "materials", key: "blog.filter.materials" as const },
]

const categoryColors: Record<string, string> = {
  construction_techniques: "bg-primary/10 text-primary",
  philosophy: "bg-accent/10 text-accent-foreground",
  market_insights: "bg-chart-2/10 text-chart-2",
  regulations: "bg-destructive/10 text-destructive",
  materials: "bg-chart-3/10 text-chart-3",
}

const BLOGS_PER_PAGE = 6

function getVisiblePages(currentPage: number, pageCount: number) {
  const start = Math.max(1, Math.min(currentPage - 1, pageCount - 2))
  return Array.from({ length: Math.min(3, pageCount) }, (_, index) => start + index)
}

function BlogCard({
  blog,
  featured,
  index,
  onRead,
}: {
  blog: Blog
  featured?: boolean
  index: number
  onRead: (blog: Blog) => void
}) {
  const { language, t } = useLanguage()
  const title = language === "am" ? blog.title_am : blog.title_en
  const readTime = Math.ceil((blog.content?.split(" ").length || 0) / 200)

  return (
    <button
      type="button"
      onClick={() => onRead(blog)}
      className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-xl"
      aria-label={title}
    >
      <Card
        className="group flex h-full flex-col overflow-hidden border-border/50 hover:border-accent/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer"
        style={{ animationDelay: `${index * 100}ms` }}
      >
        <div className="relative h-48 overflow-hidden">
          {blog.image_url ? (
            <img
              src={blog.image_url}
              alt=""
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 animate-image-fade"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center">
              <BookOpen className={`h-12 w-12 text-muted-foreground/30 ${featured ? "h-20 w-20" : ""}`} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <Badge className={`absolute top-3 left-3 ${categoryColors[blog.category] || "bg-muted text-muted-foreground"}`}>
            {t(categories.find(c => c.value === blog.category)?.key || "blog.filter.all")}
          </Badge>
          {featured && (
            <Badge variant="default" className="absolute top-3 right-3 bg-accent text-accent-foreground">
              {language === "en" ? "Featured" : "ተመራጭ"}
            </Badge>
          )}
        </div>
        <CardContent className="flex-1 p-4">
          <h3 className="font-semibold text-base text-foreground group-hover:text-accent transition-colors line-clamp-2">
            {title}
          </h3>
          <p className="mt-2 text-xs leading-5 text-muted-foreground line-clamp-3">
            {truncateWords(blog.content ?? "", 150)}
          </p>
        </CardContent>
        <CardFooter className="px-4 pb-4 pt-0 flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span className="shrink-0">{readTime} {t("blog.minRead")}</span>
            <span className="text-border">|</span>
            <span className="truncate">{blog.author}</span>
          </div>
          <span className="inline-flex items-center gap-1 shrink-0 text-xs font-medium group-hover:text-accent transition-colors">
            {t("blog.readMore")}
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
          </span>
        </CardFooter>
      </Card>
    </button>
  )
}

function BlogArticleDialog({ blog, onClose }: { blog: Blog | null; onClose: () => void }) {
  const { language, t } = useLanguage()
  const title = blog ? (language === "am" ? blog.title_am : blog.title_en) : ""
  const readTime = blog ? Math.ceil((blog.content?.split(" ").length || 0) / 200) : 0
  const paragraphs = useMemo(
    () =>
      (blog?.content ?? "")
        .split(/\n{1,}/)
        .map((p) => p.trim())
        .filter(Boolean),
    [blog]
  )

  return (
    <Dialog open={Boolean(blog)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {blog && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge className={categoryColors[blog.category] || "bg-muted text-muted-foreground"}>
                  {t(categories.find(c => c.value === blog.category)?.key || "blog.filter.all")}
                </Badge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {readTime} {t("blog.minRead")}
                </span>
              </div>
              <DialogTitle className="text-left text-xl leading-snug">{title}</DialogTitle>
              <DialogDescription className="text-left">
                {blog.author} · {language === "en" ? "YeBetWeg Knowledge Hub" : "የYeBetWeg እውቀት ማዕከል"}
              </DialogDescription>
            </DialogHeader>

            {blog.image_url && (
              <img
                src={blog.image_url}
                alt=""
                className="w-full h-56 sm:h-64 object-cover rounded-lg"
              />
            )}

            <article className="space-y-4 text-sm leading-7 text-foreground/90">
              {paragraphs.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </article>

            <Button variant="outline" onClick={onClose} className="w-full gap-2">
              <X className="h-4 w-4" />
              {language === "en" ? "Close" : "ዝጋ"}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function BlogSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-48" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </Card>
  )
}

export function BlogSection() {
  const { t, language } = useLanguage()
  const [category, setCategory] = useState("all")
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const [serverQuery, setServerQuery] = useState("")
  const [activeBlog, setActiveBlog] = useState<Blog | null>(null)
  const { ref, isInView } = useInView()

  // Debounce the raw input before triggering server-side search
  useEffect(() => {
    const timer = setTimeout(() => setServerQuery(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data: blogsData, isLoading: loading } = useBlogs({
    category,
    page,
    pageSize: BLOGS_PER_PAGE,
    searchQuery: serverQuery,
  })

  const blogs = blogsData?.data ?? []
  const total = blogsData?.total ?? 0

  // Client-side smart search for blogs
  const blogSearchFields = useMemo(() => ["title_en", "title_am", "content", "category", "author"] as (keyof Blog)[], [])
  const smartSearch = useSmartSearch<Blog>({
    data: blogs,
    initialPageSize: BLOGS_PER_PAGE,
    defaultSortField: "created_at",
    searchableFields: blogSearchFields,
  })

  const searchableBlogs = smartSearch.items
  const isSearching = Boolean(serverQuery.trim())
  // While searching, the hook returns the full match set and smartSearch owns
  // pagination; otherwise server pages drive it via the exact table total.
  const totalFiltered = isSearching ? smartSearch.totalCount : total
  const pageCount = Math.max(1, Math.ceil(totalFiltered / BLOGS_PER_PAGE))
  const currentPage = isSearching ? smartSearch.state.page : page
  const visiblePages = useMemo(() => getVisiblePages(currentPage, pageCount), [currentPage, pageCount])

  useEffect(() => {
    setPage(1)
  }, [category])

  useEffect(() => {
    if (isSearching) smartSearch.setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverQuery])

  const goToPage = (nextPage: number) => {
    const clamped = Math.min(Math.max(nextPage, 1), pageCount)
    if (isSearching) smartSearch.setPage(clamped)
    else setPage(clamped)
    document.getElementById("knowledge")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <section id="knowledge" ref={ref} className="py-16 sm:py-24 bg-background">
      <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">{t("blog.title")}</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">{t("blog.subtitle")}</p>
        </div>

        <Tabs value={category} onValueChange={setCategory} className="mb-6">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            {categories.map((cat) => (
              <TabsTrigger key={cat.value} value={cat.value} className="text-xs sm:text-sm">
                {t(cat.key)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Smart Search Bar */}
        <div className="mb-6 max-w-md mx-auto">
          <SmartSearchBar
            query={searchInput}
            onQueryChange={setSearchInput}
            totalCount={totalFiltered}
            placeholder={language === "en" ? "Search articles..." : "ጽሁፎች ይፈልጉ..."}
            compact
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: BLOGS_PER_PAGE }).map((_, i) => <BlogSkeleton key={i} />)}
          </div>
        ) : searchableBlogs.length === 0 ? (
          <div className="p-12 text-center">
            <SearchX className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">
              {language === "en" ? "No matching articles" : "ምንም የሚዛመድ ጽሁፍ የለም"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {language === "en"
                ? "Try adjusting your search or category"
                : "እባክዎ ፍለጋዎን ወይም ምድብዎን ያስተካክሉ"}
            </p>
          </div>
        ) : (
          <>
            <div key={`${category}-${serverQuery}-${currentPage}`} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
              {searchableBlogs.map((blog, i) => (
                <BlogCard
                  key={blog.id}
                  blog={blog}
                  featured={blog.is_featured && currentPage === 1}
                  index={i}
                  onRead={setActiveBlog}
                />
              ))}
            </div>

            {pageCount > 1 && (
              <Pagination className="mt-8">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#knowledge"
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
                        href="#knowledge"
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
                      href="#knowledge"
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

      <BlogArticleDialog blog={activeBlog} onClose={() => setActiveBlog(null)} />
    </section>
  )
}
