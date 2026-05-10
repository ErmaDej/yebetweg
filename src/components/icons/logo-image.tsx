interface LogoImageProps {
  variant?: 'full' | 'mark'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  animated?: boolean
}

const sizeMap = {
  sm: { width: 32, height: 32 },
  md: { width: 48, height: 48 },
  lg: { width: 64, height: 64 },
  xl: { width: 96, height: 96 },
}

export function YeBetWegLogoImage({
  variant = 'mark',
  size = 'md',
  className = '',
  animated = false,
}: LogoImageProps) {
  const dimensions = sizeMap[size]

  if (variant === 'full') {
    return (
      <img
        src="/Logo2x.png"
        alt="YeBetWeg"
        width={dimensions.width}
        height={dimensions.height}
        className={`${animated ? 'animate-float' : ''} ${className}`}
        loading="lazy"
        decoding="async"
      />
    )
  }

  // Mark-only version (icon only, no text)
  return (
    <img
      src="/Logo3x.png"
      alt="YeBetWeg Logo"
      width={dimensions.width}
      height={dimensions.height}
      className={`${animated ? 'animate-float' : ''} ${className}`}
      loading="lazy"
      decoding="async"
    />
  )
}

export function YeBetWegLogoMarkOnly({
  size = 'md',
  className = '',
  animated = false,
}: Omit<LogoImageProps, 'variant'>) {
  const dimensions = sizeMap[size]

  return (
    <img
      src="/Logo3x.png"
      alt="YeBetWeg"
      width={dimensions.width}
      height={dimensions.height}
      className={`${animated ? 'animate-float' : ''} ${className}`}
      loading="lazy"
      decoding="async"
    />
  )
}
