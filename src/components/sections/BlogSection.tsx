import { useEffect, useMemo, useState } from "react"
import { Clock, ArrowRight, BookOpen } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { useBlogs } from "@/hooks/useBlogs"
import { useInView } from "@/hooks/useInView"

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

function BlogCard({ blog, featured, index }: { blog: any; featured?: boolean; index: number }) {
  const { language, t } = useLanguage()
  const title = language === "am" ? blog.title_am : blog.title_en
  const readTime = Math.ceil(blog.content.split(" ").length / 200)

  return (
    <Card
      className="group flex h-full flex-col overflow-hidden border-border/50 hover:border-accent/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="relative h-48 overflow-hidden">
        {blog.image_url ? (
          <img
            src={blog.image_url}
            alt={title}
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
            Featured
          </Badge>
        )}
      </div>
      <CardContent className="flex-1 p-4">
        <h3 className="font-semibold text-base text-foreground group-hover:text-accent transition-colors line-clamp-2">
          {title}
        </h3>
        <p className="mt-2 text-xs leading-5 text-muted-foreground line-clamp-3">
          {blog.content.slice(0, 150)}...
        </p>
      </CardContent>
      <CardFooter className="px-4 pb-4 pt-0 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span className="shrink-0">{readTime} {t("blog.minRead")}</span>
          <span className="text-border">|</span>
          <span className="truncate">{blog.author}</span>
        </div>
        <Button variant="ghost" size="sm" className="shrink-0 gap-1 text-xs group-hover:text-accent">
          {t("blog.readMore")}
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
        </Button>
      </CardFooter>
    </Card>
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
  const { t } = useLanguage()
  const [category, setCategory] = useState("all")
  const [page, setPage] = useState(1)
  const { blogs, loading, total } = useBlogs(category, page, BLOGS_PER_PAGE)
  const { ref, isInView } = useInView()
  const pageCount = Math.max(1, Math.ceil(total / BLOGS_PER_PAGE))
  const visiblePages = useMemo(() => getVisiblePages(page, pageCount), [page, pageCount])

  useEffect(() => {
    setPage(1)
  }, [category])

  const goToPage = (nextPage: number) => {
    setPage(Math.min(Math.max(nextPage, 1), pageCount))
    document.getElementById("knowledge")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <section id="knowledge" ref={ref} className="py-16 sm:py-24 bg-background">
      <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">{t("blog.title")}</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">{t("blog.subtitle")}</p>
        </div>

        <Tabs value={category} onValueChange={setCategory} className="mb-8">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            {categories.map((cat) => (
              <TabsTrigger key={cat.value} value={cat.value} className="text-xs sm:text-sm">
                {t(cat.key)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: BLOGS_PER_PAGE }).map((_, i) => <BlogSkeleton key={i} />)}
          </div>
        ) : (
          <>
            <div key={`${category}-${page}`} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
              {blogs.map((blog, i) => (
                <BlogCard key={blog.id} blog={blog} featured={blog.is_featured && page === 1} index={i} />
              ))}
            </div>

            {pageCount > 1 && (
              <Pagination className="mt-8">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#knowledge"
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
                        href="#knowledge"
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
                      href="#knowledge"
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
