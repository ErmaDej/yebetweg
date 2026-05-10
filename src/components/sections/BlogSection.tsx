import { useState } from "react"
import { Clock, ArrowRight, BookOpen } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
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

function BlogCard({ blog, featured, index }: { blog: any; featured?: boolean; index: number }) {
  const { language, t } = useLanguage()
  const title = language === "am" ? blog.title_am : blog.title_en
  const readTime = Math.ceil(blog.content.split(" ").length / 200)

  return (
    <Card
      className={`group overflow-hidden border-border/50 hover:border-accent/50 transition-all duration-300 hover:shadow-lg ${featured ? "sm:col-span-2 sm:row-span-2" : ""}`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className={`relative ${featured ? "h-64 sm:h-80" : "h-40"} overflow-hidden`}>
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
        {blog.is_featured && (
          <Badge variant="default" className="absolute top-3 right-3 bg-accent text-accent-foreground">
            Featured
          </Badge>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className={`font-semibold text-foreground group-hover:text-accent transition-colors line-clamp-2 ${featured ? "text-xl" : "text-base"}`}>
          {title}
        </h3>
        <p className={`mt-2 text-muted-foreground line-clamp-2 ${featured ? "text-sm" : "text-xs"}`}>
          {blog.content.slice(0, featured ? 200 : 100)}...
        </p>
      </CardContent>
      <CardFooter className="px-4 pb-4 pt-0 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{readTime} {t("blog.minRead")}</span>
          <span className="text-border">|</span>
          <span>{blog.author}</span>
        </div>
        <Button variant="ghost" size="sm" className="gap-1 text-xs group-hover:text-accent">
          {t("blog.readMore")}
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
        </Button>
      </CardFooter>
    </Card>
  )
}

function BlogSkeleton({ featured }: { featured?: boolean }) {
  return (
    <Card className={`overflow-hidden ${featured ? "sm:col-span-2 sm:row-span-2" : ""}`}>
      <Skeleton className={featured ? "h-64 sm:h-80" : "h-40"} />
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
  const { blogs, loading } = useBlogs(category)
  const { ref, isInView } = useInView()

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
            <BlogSkeleton featured />
            <BlogSkeleton />
            <BlogSkeleton />
            <BlogSkeleton />
            <BlogSkeleton />
            <BlogSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((blog, i) => (
              <BlogCard key={blog.id} blog={blog} featured={blog.is_featured} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
