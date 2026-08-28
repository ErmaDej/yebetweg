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

// Truncates on a word boundary (and never mid-code-unit) for excerpts.
export function truncateWords(text: string, maxChars: number): string {
  const clean = text.trim()
  if (clean.length <= maxChars) return clean
  const cut = clean.slice(0, maxChars)
  const lastSpace = cut.lastIndexOf(" ")
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}
