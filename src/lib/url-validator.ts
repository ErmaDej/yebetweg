/**
 * URL Validation & Sanitization Module
 * Prevents open redirect and XSS attacks via URL fields
 */

const ALLOWED_DOMAINS = [
  'yebetweg.com',
  'youtube.com',
  'youtu.be',
  't.me',
  'telegram.me',
  'facebook.com',
  'tiktok.com',
  'images.unsplash.com',
  'unsplash.com',
  'cdn.unsplash.com',
  'pexels.com',
  'images.pexels.com',
  'pixabay.com',
  'i.pinimg.com',
  'cloudinary.com',
  'res.cloudinary.com',
  'imgix.net',
  'images.unsplash.com',
];

/**
 * Validates and sanitizes a URL string
 * Only allows http:// and https:// protocols
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    // Only allow https and http protocols
    if (!['https:', 'http:'].includes(parsed.protocol)) return null;
    return trimmed;
  } catch {
    return null;
  }
}

/**
 * Checks if an external URL is allowed based on domain allowlist
 * Used for links that users click (stricter validation)
 */
export function isExternalUrlAllowed(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;

  try {
    const parsed = new URL(url);
    // Only allow HTTPS for external links
    if (parsed.protocol !== 'https:') return false;

    // Check against allowlist
    return ALLOWED_DOMAINS.some((domain) => {
      if (parsed.hostname === domain) return true;
      if (parsed.hostname.endsWith('.' + domain)) return true;
      return false;
    });
  } catch {
    return false;
  }
}

/**
 * Validates image URLs (more permissive than external links)
 * Images can be loaded from any HTTPS source but should be validated separately
 */
export function isImageUrlValid(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;

  const trimmed = url.trim();
  if (!trimmed) return false;

  try {
    const parsed = new URL(trimmed);
    // Only allow HTTPS for images
    if (parsed.protocol !== 'https:') return false;
    // Image URLs should not contain scripts or suspicious patterns
    if (trimmed.includes('javascript:') || trimmed.includes('data:')) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets a safe fallback URL if validation fails
 */
export function getFallbackUrl(
  url: string | null | undefined,
  fallback: string = '#',
): string {
  return isExternalUrlAllowed(url) ? url! : fallback;
}

/**
 * Gets a safe image URL with fallback
 */
export function getFallbackImageUrl(
  url: string | null | undefined,
  fallback: string = '/images/placeholder.svg',
): string {
  return isImageUrlValid(url) ? url! : fallback;
}

/**
 * Wraps an image URL so it can be safely loaded.
 * Returns the original URL if valid, otherwise null so the caller can
 * render a graceful placeholder instead of a broken image.
 */
export function safeImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  return isImageUrlValid(url) ? url.trim() : null;
}
