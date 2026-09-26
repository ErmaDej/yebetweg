import { useRef, useEffect, useState } from "react"
import { useInView } from "@/hooks/useInView"
import { useLanguage } from "@/lib/i18n"
import { Badge } from "@/components/ui/badge"
import { Play } from "lucide-react"

const VIDEO_PLAYBACK_RATE = 0.65

// Hero clips ship from Supabase Storage's public CDN (bucket: `videos`)
// instead of the app bundle — they're ~17 MB and added ~85% of every deploy's
// upload time. Uploaded via scripts/upload-videos-to-storage.py; the repo
// copies stay in public/videos as the canonical source of truth.
//
// Mobile-data policy: clips NEVER autoplay. Desktop plays only while the
// section is in view AND hovered; touch devices play only on tap; devices
// with Save-Data on or a 2G-class connection preload nothing at all until
// the user explicitly plays. Playback always pauses when scrolled away.
const CDN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/videos`
const CDN_VIDEO_PATHS = {
  hero: `${CDN_BASE}/HeroClip1x.mp4`,
  impact: `${CDN_BASE}/kling_Clip_2.mp4`,
} as const

interface VideoCardProps {
  src: string
  label: string
  caption: string
  large?: boolean
  delay?: number
  isVisible: boolean
  poster: string
}

function VideoCard({ src, label, caption, large = false, delay = 0, isVisible, poster }: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hovered, setHovered] = useState(false)
  const [playing, setPlaying] = useState(false)

  // Device capability probes (stable for the session, so lazy initializers):
  // hover-capable fine pointer => desktop-style hover play; otherwise tap.
  const [hoverCapable] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches
  )
  const [dataSaver] = useState(() => {
    const conn = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string }
      }
    ).connection
    return Boolean(conn && (conn.saveData || /^(slow-)?2g$/.test(conn.effectiveType ?? "")))
  })

  // Playback rule — user-initiated only (see header comment):
  //   desktop: in view + hovered  |  touch: tap  |  out of view: always paused
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (isVisible && hoverCapable && hovered) {
      video.playbackRate = VIDEO_PLAYBACK_RATE
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [isVisible, hovered, hoverCapable])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.playbackRate = VIDEO_PLAYBACK_RATE
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl shadow-xl group transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Gradient overlay top */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent z-10 pointer-events-none" />

      {/* Gradient overlay bottom */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent z-10 pointer-events-none" />

      {/* Play indicator badge */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
          <Play className="h-3 w-3 fill-white text-white ml-0.5" />
        </div>
        <Badge
          variant="secondary"
          className="text-[10px] bg-white/20 text-white border-0 backdrop-blur-sm px-2 py-0.5"
        >
          {label}
        </Badge>
      </div>

      {/* Video — preload="none" on touch/Save-Data so nothing downloads until
          the user plays; "metadata" on desktop keeps hover-start instant. */}
      <div className={`aspect-video ${large ? "sm:aspect-[16/9]" : "aspect-video"} bg-muted`}>
        <video
          ref={videoRef}
          src={src}
          muted
          loop
          playsInline
          preload={hoverCapable && !dataSaver ? "metadata" : "none"}
          poster={poster}
          aria-label={`${label} preview video`}
          onClick={togglePlay}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02] cursor-pointer"
        />
      </div>

      {/* Play affordance while paused — replaces the autoplay cue on touch */}
      {!playing && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label={`Play ${label} video`}
          className="absolute inset-0 z-20 flex items-center justify-center transition-colors group-hover:bg-black/10"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/25 ring-1 ring-white/40 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
            <Play className="ml-1 h-6 w-6 fill-white text-white" />
          </span>
        </button>
      )}

      {/* Caption */}
      <div className="absolute bottom-0 inset-x-0 z-20 p-4">
        <p className="text-white text-sm font-medium leading-snug drop-shadow-md">{caption}</p>
      </div>
    </div>
  )
}

export function VideoShowcaseSection() {
  const { ref, isInView } = useInView({ threshold: 0.08 })
  const { language } = useLanguage()

  const isEn = language === "en"

  return (
    <section
      id="showcase"
      ref={ref}
      className="relative py-16 sm:py-24 bg-background overflow-hidden"
    >
      {/* Decorative blur orbs */}
      <div className="absolute top-12 left-0 w-72 h-72 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div
          className={`text-center mb-10 sm:mb-14 transition-all duration-700 ${
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <Badge variant="secondary" className="mb-4 text-xs font-medium">
            {isEn ? "Platform in Action" : "ስርዓቱ በተግባር"}
          </Badge>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary/80">
              {isEn ? "See It In Action" : "ተግባር ላይ ይመልከቱ"}
            </span>
          </h2>

          <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg">
            {isEn
              ? "Watch how YeBetWeg empowers Ethiopia's construction community — from market data to trusted professionals."
              : "የቤት-ወግ እንዴት የኢትዮጵያ የግንባታ ማህበረሰብን እንደሚደግፍ ይመልከቱ — ከገበያ ዋጋ ሁኔታ እስከ አስተማማኝ ባለሙያዎች።"}
          </p>
        </div>

        {/* Video grid: 60/40 split on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
          {/* Primary video — HeroClip1x.mp4 (larger) */}
          <div className="lg:col-span-3">
            <VideoCard
              src={CDN_VIDEO_PATHS.hero}
              poster="/images/poster-hero-clip.webp"
              label={isEn ? "Real Projects" : "እውነተኛ ፕሮጀክቶች"}
              caption={
                isEn
                  ? "Real Professionals. Real Homes. Building Ethiopia's Future."
                  : "እውነተኛ ባለሙያዎች። እውነተኛ ቤቶች። የኢትዮጵያን ወደፊት መገንባት።"
              }
              large
              isVisible={isInView}
              delay={100}
            />
          </div>

          {/* Secondary video — kling_Clip_2.mp4 */}
          <div className="lg:col-span-2">
            <VideoCard
              src={CDN_VIDEO_PATHS.impact}
              poster="/images/poster-kling-clip.webp"
              label={isEn ? "Real Impact" : "ውጤታማ ውጤት"}
              caption={
                isEn
                  ? "From foundation to finish — quality construction knowledge at your fingertips."
                  : "ከመሠረት እስከ ፍጻሜ — ጥራት ያለው የግንባታ እውቀት እጅዎ ላይ።"
              }
              isVisible={isInView}
              delay={250}
            />
          </div>
        </div>

        {/* Bottom tagline */}
        <div
          className={`mt-10 text-center transition-all duration-700 ${
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: "400ms" }}
        >
          <p className="text-sm text-muted-foreground">
            {isEn
              ? "Join our growing community — building smarter, together."
              : "ወደ እያደገው ማህበረሰባችን ይቀላቀሉ — አብረን በብልህነት እንገንባ።"}
          </p>
        </div>
      </div>
    </section>
  )
}
