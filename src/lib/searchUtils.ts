export const PER_TABLE_SEARCH_LIMIT = 25

// Strips characters reserved by PostgREST or-filter syntax so user input can
// neither corrupt nor inject into the filter expression. Combined with
// double-quoted ilike patterns this makes interpolated values safe.
export function sanitizeSearchTerm(raw: string): string {
  return raw
    .replace(/[,()"\\%*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

// Builds a quoted, injection-safe ilike OR-filter over the given columns.
export function orIlike(columns: string[], term: string): string {
  return columns.map((c) => `${c}.ilike."%${term}%"`).join(",")
}

// Truncates on a word boundary (and never mid-code-unit or mid-surrogate-pair,
// which would corrupt emoji/Amharic glyphs) for excerpts.
export function truncateWords(text: string, maxChars: number): string {
  const clean = text.trim()
  if (clean.length <= maxChars) return clean
  const cut = Array.from(clean.slice(0, maxChars + 1))
  // Drop a trailing partial code point caused by the +1 window.
  const safe = cut.slice(0, Array.from(clean.slice(0, maxChars)).length).join("")
  const lastSpace = safe.lastIndexOf(" ")
  return `${(lastSpace > 0 ? safe.slice(0, lastSpace) : safe).trimEnd()}…`
}
