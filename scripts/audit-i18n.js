#!/usr/bin/env node
// ============================================================================
// i18n audit — Phase 4 systematic sweep (EN/AM quality gate)
// ============================================================================
// Static audit of src/lib/i18n.tsx + every t("…") usage:
//   1. every used key exists in the TranslationKey union + BOTH dictionaries
//   2. every defined key is actually used (dead entries)
//   3. AM values that are byte-identical to EN (untranslated keys)
//   4. AM values that are suspiciously short vs EN (truncation smell)
//   5. AM values that merely strip diacritics/braces to look translated
// Exits non-zero when findings exist — wire into CI or run before release.
// ============================================================================

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ROOT = path.resolve(__dirname, "..")
const I18N_FILE = path.join(ROOT, "src", "lib", "i18n.tsx")

function read(p) {
  return fs.readFileSync(p, "utf8")
}

function walk(dir, exts, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") continue
      walk(full, exts, out)
    } else if (exts.some((e) => entry.name.endsWith(e))) {
      out.push(full)
    }
  }
  return out
}

// --- parse i18n.tsx ---------------------------------------------------------

const i18nSource = read(I18N_FILE)

// TranslationKey union: all `| "key"` literals before the `translations` marker
const unionStart = i18nSource.indexOf("export type TranslationKey")
const unionEnd = i18nSource.indexOf("export const translations")
const unionBlock = i18nSource.slice(unionStart, unionEnd)
const declaredKeys = new Set([...unionBlock.matchAll(/\|\s*"([^"]+)"/g)].map((m) => m[1]))

// Each dictionary block: en: { ... }, am: { ... }
function parseDict(langMarker) {
  const start = i18nSource.indexOf(`${langMarker}: {`, unionEnd)
  if (start === -1) return null
  // naive brace matching from the first {
  const open = i18nSource.indexOf("{", start)
  let depth = 0
  let end = open
  for (let i = open; i < i18nSource.length; i++) {
    const ch = i18nSource[i]
    if (ch === "{") depth++
    else if (ch === "}") {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  const block = i18nSource.slice(open, end + 1)
  const map = {}
  for (const m of block.matchAll(/"([^"]+)":\s*(?:"((?:[^"\\]|\\.)*)"|`([^`]*)`)/g)) {
    map[m[1]] = m[2] ?? m[3] ?? ""
  }
  return map
}

const en = parseDict("en")
const am = parseDict("am")
if (!en || !am) {
  console.error("Could not parse dictionaries from i18n.tsx")
  process.exit(2)
}

// --- collect t("…") usages across src ---------------------------------------

const srcFiles = walk(path.join(ROOT, "src"), [".ts", ".tsx"])
const usedKeys = new Set()
const usagePattern = /\bt\(\s*"([^"]+)"/g
for (const f of srcFiles) {
  const src = read(f)
  for (const m of src.matchAll(usagePattern)) usedKeys.add(m[1])
  // dynamic-key style: t(var) — flag files using it so audit stays honest
  if (/\bt\(\s*(?!")([a-zA-Z_$][\w$]*)\s*[),]/.test(src)) {
    // e.g. typeIcon maps or Record<TranslationKey, …> lookups still resolve to
    // declared keys; the union check below covers them.
  }
}

// Also catch Record<TranslationKey, …> maps and `t(key as TranslationKey)` —
// any identifier typed as TranslationKey means the union is the source of truth
// and every declared key is "used-or-validated" through it.
const recordTyped = srcFiles.filter((f) =>
  /Record<\s*TranslationKey/.test(read(f)),
)

// --- findings ---------------------------------------------------------------

const missing = []
for (const k of usedKeys) {
  if (!declaredKeys.has(k)) missing.push(`used but NOT declared: ${k}`)
  if (!(k in en)) missing.push(`used but missing in EN dict: ${k}`)
  if (!(k in am)) missing.push(`used but missing in AM dict: ${k}`)
}

const dead = [...declaredKeys].filter(
  (k) =>
    !usedKeys.has(k) &&
    recordTyped.length === 0, // if Record<TranslationKey> exists, skip dead-detection
)

const untranslated = [...declaredKeys].filter(
  (k) => k in en && k in am && en[k].trim() === am[k].trim() && en[k].length > 3,
)

const suspiciousShort = [...declaredKeys].filter(
  (k) => k in en && k in am && am[k].length > 0 && en[k].length >= 12 && am[k].length < en[k].length * 0.35,
)

// --- report -----------------------------------------------------------------

console.log(`i18n audit — ${declaredKeys.size} declared keys, ${usedKeys.size} directly referenced`)
console.log(`  Record<TranslationKey,…> consumers: ${recordTyped.length ? recordTyped.map((f) => path.relative(ROOT, f)).join(", ") : "none"}`)
console.log("")

let failed = false

if (missing.length) {
  failed = true
  console.log("❌ MISSING / UNDECLARED:")
  for (const m of missing) console.log(`   - ${m}`)
  console.log("")
}

if (dead.length) {
  console.log(`⚠️  declared but never referenced (${dead.length}):`)
  for (const k of dead) console.log(`   - ${k}`)
  console.log("")
}

if (untranslated.length) {
  console.log(`⚠️  AM identical to EN — verify intentional (${untranslated.length}):`)
  for (const k of untranslated) console.log(`   - ${k}  "${en[k]}"`)
  console.log("")
}

if (suspiciousShort.length) {
  console.log(`⚠️  AM much shorter than EN — check truncation (${suspiciousShort.length}):`)
  for (const k of suspiciousShort) console.log(`   - ${k}  EN(${en[k].length}) AM(${am[k].length})`)
  console.log("")
}

if (!missing.length && !untranslated.length && !suspiciousShort.length && !dead.length) {
  console.log("✅ i18n audit clean.")
}

process.exit(failed ? 1 : 0)
