import * as React from "react"

import { cn } from "@/lib/utils"
import { getFallbackImageUrl } from "@/lib/url-validator"

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Optional fallback if src is invalid or fails to load */
  fallback?: string
  /** Enable lazy loading */
  lazy?: boolean
}

/**
 * Image component that gracefully handles broken image URLs
 * by falling back to a placeholder or alternative source.
 */
export function Image({
  className,
  src,
  alt,
  fallback = "/images/placeholder.svg",
  lazy = true,
  ...props
}: ImageProps) {
  const [hasError, setHasError] = React.useState(false)
  const [hasLoaded, setHasLoaded] = React.useState(false)

  const safeSrc = getFallbackImageUrl(src, fallback)

  React.useEffect(() => {
    if (!safeSrc || safeSrc === fallback) return

    const img = new window.Image()
    img.onload = () => setHasLoaded(true)
    img.onerror = () => setHasError(true)
    img.src = safeSrc
  }, [safeSrc, fallback])

  return (
    <img
      src={hasError || !hasLoaded ? fallback : safeSrc}
      alt={alt}
      className={cn(
        "block h-auto select-none",
        hasLoaded && !hasError && "opacity-100 transition-opacity duration-500",
        (!hasLoaded || hasError) && "animate-pulse",
        hasError && "opacity-50",
        className
      )}
      loading={lazy ? "lazy" : "eager"}
      onError={() => setHasError(true)}
      onLoad={() => setHasLoaded(true)}
      {...props}
    />
  )
}