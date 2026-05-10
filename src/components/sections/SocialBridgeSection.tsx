import { MessageCircle, ExternalLink, Play } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { useLanguage } from "@/lib/i18n"
import { useInView } from "@/hooks/useInView"

const tiktokPosts = [
  { title: "Rebar Quality Check", views: "12K" },
  { title: "Cement Mixing Tips", views: "8.5K" },
  { title: "Foundation Depth Guide", views: "15K" },
]

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

export function SocialBridgeSection() {
  const { t, language } = useLanguage()
  const { ref, isInView } = useInView()

  return (
    <section id="social" ref={ref} className="py-16 sm:py-24 bg-background">
      <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">{t("social.title")}</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">{t("social.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="overflow-hidden border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                  <YouTubeIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{t("social.youtube")}</h3>
                  <p className="text-xs text-muted-foreground">YeBetWeg Construction</p>
                </div>
              </div>
              <AspectRatio ratio={16 / 9} className="rounded-lg overflow-hidden bg-muted">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/80 text-white cursor-pointer hover:bg-red-500 transition-colors">
                    <Play className="h-8 w-8 ml-1" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                  <p className="text-white text-sm font-medium">
                    {language === "en" ? "Latest: Rebar Grade Selection Guide" : "የቅርብ: የራብር ደረጃ ምርጫ መምሪያ"}
                  </p>
                </div>
              </AspectRatio>
              <Button variant="outline" className="w-full mt-4 gap-2" asChild>
                <a href="https://youtube.com/@yebetweg" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t("social.youtube")}
                </a>
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="overflow-hidden border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-500/10 text-pink-500">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.73a8.19 8.19 0 004.76 1.52V6.79a4.84 4.84 0 01-1-.1z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold">{t("social.tiktok")}</h3>
                    <p className="text-xs text-muted-foreground">@yebetweg</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {tiktokPosts.map((post) => (
                    <div key={post.title} className="relative group cursor-pointer">
                      <AspectRatio ratio={9 / 16} className="rounded-md overflow-hidden bg-gradient-to-br from-pink-500/10 to-primary/10">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play className="h-6 w-6 text-white/60" />
                        </div>
                      </AspectRatio>
                      <p className="text-[10px] text-muted-foreground mt-1 truncate">{post.title}</p>
                      <p className="text-[10px] text-muted-foreground">{post.views} views</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card className="overflow-hidden border-border/50">
                <CardContent className="p-5 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 mx-auto mb-3">
                    <MessageCircle className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{t("social.telegram")}</h3>
                  <Badge variant="secondary" className="mb-3">10K+ {language === "en" ? "members" : "አባላት"}</Badge>
                  <Button size="sm" className="w-full gap-2 bg-blue-500 text-white hover:bg-blue-600" asChild>
                    <a href="https://t.me/yebetweg" target="_blank" rel="noopener noreferrer">
                      {t("social.joinTelegram")}
                    </a>
                  </Button>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-border/50">
                <CardContent className="p-5 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600/10 text-blue-600 mx-auto mb-3">
                    <FacebookIcon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{t("social.facebook")}</h3>
                  <Badge variant="secondary" className="mb-3">5K+ {language === "en" ? "likes" : "መውደድ"}</Badge>
                  <Button size="sm" variant="outline" className="w-full gap-2" asChild>
                    <a href="https://facebook.com/yebetweg" target="_blank" rel="noopener noreferrer">
                      {t("social.facebook")}
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
