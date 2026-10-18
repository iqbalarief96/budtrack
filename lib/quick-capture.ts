import prisma from '@/lib/prisma'
import { createAutoSavingsTransfer } from '@/lib/savings/auto-route'
import { autoTrackTransactionToGoals } from '@/app/api/transactions/auto-track-goals'
import { detectSavingsType } from '@/lib/savingsTracker'
import { autoLinkSavingsToGoal } from '@/lib/savingsGoalAutoLink'
import { parseNaturalCapture } from '@/lib/nl-capture'

export type QuickCaptureParsed = {
  description: string
  rawCategory: string
  rawWallet: string
  amount: number
  date: Date
  isCustomDate: boolean
  /** NL path only: candidate category names from the keyword rules. */
  categoryCandidates?: string[]
  /** NL path only: no keyword rule matched. */
  isCategoryFallback?: boolean
}

export type QuickCaptureResult = {
  message: string
  data: {
    id: string
    amount: number
    type: 'INCOME' | 'EXPENSE'
    description: string
    wallet: string
    category: string
    date: string
  }
}

export const QUICK_CAPTURE_FORMAT_ERROR =
  'Format salah! Wajib: DESKRIPSI-KATEGORI-DOMPET-JUMLAH (contoh: Kopi Kenangan-Makanan-Dompet Utama-28000). Tanggal opsional di depan/belakang (contoh: 5 senin 9 - Kopi... atau ...-28000-5/9).'

const MONTH_NAMES: Record<string, number> = {
  jan: 1, januari: 1, january: 1,
  feb: 2, februari: 2, february: 2,
  mar: 3, maret: 3, march: 3,
  apr: 4, april: 4,
  mei: 5, may: 5,
  jun: 6, juni: 6, june: 6,
  jul: 7, juli: 7, july: 7,
  agu: 8, ags: 8, agt: 8, agustus: 8, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  okt: 10, oktober: 10, oct: 10, october: 10,
  nov: 11, november: 11,
  des: 12, desember: 12, dec: 12, december: 12,
}

const DAY_NAMES = [
  'senin', 'selasa', 'rabu', 'kamis', 'jumat', "jum'at", 'jumaat', 'sabtu', 'minggu', 'ahad'
]

/**
 * Attempt to parse a date string into a Date object (set to 12:00:00 local time).
 * Supports:
 * - Relative: "hari ini", "kemarin", "kemarin lusa"
 * - Slash: "5/9", "05/09", "5/9/2026", "5/10"
 * - Words + numbers: "5 senin", "senin 5", "tgl 5", "5 senin 9", "5 senin 09",
 *   "5 senin sep", "5 sep", "5 9", "5 09", "5 sep 2026"
 * Returns null if string is not recognized as a date.
 */
export function tryParseDateToken(token: string, now: Date = new Date()): Date | null {
  if (!token || typeof token !== 'string') return null
  const raw = token.trim().toLowerCase()
  if (!raw) return null

  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-12
  const currentDate = now.getDate()

  // 1. Relative dates
  if (raw === 'hari ini' || raw === 'today') {
    return new Date(currentYear, currentMonth - 1, currentDate, 12, 0, 0)
  }
  if (raw === 'kemarin' || raw === 'yesterday') {
    return new Date(currentYear, currentMonth - 1, currentDate - 1, 12, 0, 0)
  }
  if (raw === 'kemarin lusa' || raw === 'lusa lalu' || raw === '2 hari lalu') {
    return new Date(currentYear, currentMonth - 1, currentDate - 2, 12, 0, 0)
  }

  // 2. Format with slash: D/M or D/M/YYYY or D/M/YY
  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/)
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10)
    const month = parseInt(slashMatch[2], 10)
    let year = slashMatch[3] ? parseInt(slashMatch[3], 10) : currentYear
    if (year < 100) year += 2000
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const d = new Date(year, month - 1, day, 12, 0, 0)
      if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
        return d
      }
    }
    return null
  }

  // Check if string contains day-of-week or "tgl"/"tanggal"
  let hasDayName = false
  let hasTglPrefix = false

  for (const dayName of DAY_NAMES) {
    if (new RegExp(`\\b${dayName}\\b`, 'i').test(raw)) {
      hasDayName = true
      break
    }
  }
  if (/\b(tgl|tanggal)\b/i.test(raw)) {
    hasTglPrefix = true
  }

  let cleaned = raw
  for (const dayName of DAY_NAMES) {
    cleaned = cleaned.replace(new RegExp(`\\b${dayName}\\b`, 'g'), ' ')
  }
  cleaned = cleaned.replace(/\b(tgl|tanggal)\b/g, ' ')
  cleaned = cleaned.replace(/[\/,]/g, ' ')
  cleaned = cleaned.trim().replace(/\s+/g, ' ')

  if (!cleaned) return null

  const tokens = cleaned.split(' ')

  let day: number | null = null
  let month: number | null = null
  let year = currentYear

  // Pattern A: Single token e.g. "5" -> ONLY valid if it had dayName or tglPrefix
  // e.g. "5 senin", "senin 5", "tgl 5"
  if (tokens.length === 1 && /^\d{1,2}$/.test(tokens[0])) {
    if (hasDayName || hasTglPrefix) {
      day = parseInt(tokens[0], 10)
      month = currentMonth
    } else {
      return null // Bare number is not a date
    }
  }
  // Pattern B: Two tokens: e.g. "5 sep", "5 9" (1-digit month!), "5 09", "sep 5"
  else if (tokens.length === 2) {
    if (/^\d{1,2}$/.test(tokens[0]) && MONTH_NAMES[tokens[1]]) {
      day = parseInt(tokens[0], 10)
      month = MONTH_NAMES[tokens[1]]
    } else if (MONTH_NAMES[tokens[0]] && /^\d{1,2}$/.test(tokens[1])) {
      month = MONTH_NAMES[tokens[0]]
      day = parseInt(tokens[1], 10)
    } else if (/^\d{1,2}$/.test(tokens[0]) && /^\d{1,2}$/.test(tokens[1])) {
      const num1 = parseInt(tokens[0], 10)
      const num2 = parseInt(tokens[1], 10)
      if (num1 <= 31 && num2 <= 12) {
        day = num1
        month = num2 // e.g. "5 9" => Day 5, Month 9
      }
    }
  }
  // Pattern C: Three tokens: e.g. "5 sep 2026", "5 9 2026", "5 09 2026"
  else if (tokens.length === 3) {
    if (/^\d{1,2}$/.test(tokens[0]) && MONTH_NAMES[tokens[1]] && /^\d{2,4}$/.test(tokens[2])) {
      day = parseInt(tokens[0], 10)
      month = MONTH_NAMES[tokens[1]]
      year = parseInt(tokens[2], 10)
      if (year < 100) year += 2000
    } else if (/^\d{1,2}$/.test(tokens[0]) && /^\d{1,2}$/.test(tokens[1]) && /^\d{2,4}$/.test(tokens[2])) {
      day = parseInt(tokens[0], 10)
      month = parseInt(tokens[1], 10)
      year = parseInt(tokens[2], 10)
      if (year < 100) year += 2000
    }
  }

  if (day !== null && month !== null) {
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const d = new Date(year, month - 1, day, 12, 0, 0)
      if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
        return d
      }
    }
  }

  return null
}

/**
 * Parse one-line quick capture text into transaction fields.
 * Supports date placed either at the FRONT or BACK:
 * - "5 senin 9 - Kopi Kenangan-Makanan-Dompet Utama-28000"
 * - "Kopi Kenangan-Makanan-Dompet Utama-28000 - 5 senin 9"
 * - "Kopi Kenangan-Makanan-Dompet Utama-28000-5/9"
 * - "kemarin - Kopi Kenangan-Makanan-Dompet Utama-28000"
 * - "Kopi Kenangan-Makanan-Dompet Utama-28000" (default: now)
 */
export function parseQuickCapture(input: string, now: Date = new Date()): QuickCaptureParsed {
  if (!input || typeof input !== 'string') {
    throw new Error('Input teks kosong.')
  }

  let parts = input.split('-').map(s => s.trim()).filter(Boolean)
  if (parts.length < 4) {
    throw new Error(QUICK_CAPTURE_FORMAT_ERROR)
  }

  let parsedDate: Date | null = null

  // 1. Check front date (2 parts: e.g. "5-9" or "5-sep") if parts >= 6
  if (parts.length >= 6) {
    const frontTwo = `${parts[0]} ${parts[1]}`
    const d = tryParseDateToken(frontTwo, now)
    if (d) {
      parsedDate = d
      parts = parts.slice(2)
    }
  }

  // 2. Check front date (1 part: e.g. "5 senin", "5/9", "5 sep", "5 senin 9", "kemarin") if parts >= 5
  if (!parsedDate && parts.length >= 5) {
    const d = tryParseDateToken(parts[0], now)
    if (d) {
      parsedDate = d
      parts = parts.slice(1)
    }
  }

  // 3. Check back date (2 parts: e.g. "...-28000-5-9" or "...-28000-5-sep") if parts >= 6
  if (!parsedDate && parts.length >= 6) {
    const lastTwo = `${parts[parts.length - 2]} ${parts[parts.length - 1]}`
    const d = tryParseDateToken(lastTwo, now)
    if (d) {
      parsedDate = d
      parts = parts.slice(0, parts.length - 2)
    }
  }

  // 4. Check back date (1 part: e.g. "...-28000-5 senin", "...-28000-5/9", "...-28000-5 senin 9", "...-28000-kemarin") if parts >= 5
  if (!parsedDate && parts.length >= 5) {
    const lastPart = parts[parts.length - 1]
    const d = tryParseDateToken(lastPart, now)
    if (d) {
      parsedDate = d
      parts = parts.slice(0, parts.length - 1)
    }
  }

  if (parts.length < 4) {
    throw new Error(QUICK_CAPTURE_FORMAT_ERROR)
  }

  const rawAmount = parts[parts.length - 1]
  const rawWallet = parts[parts.length - 2]
  const rawCategory = parts[parts.length - 3]
  const description = parts.slice(0, parts.length - 3).join(' - ')

  let cleaned = rawAmount.toLowerCase().replace(/rp/g, '').replace(/\s/g, '').replace(/,/g, '.')
  let multiplier = 1

  if (cleaned.endsWith('jt') || cleaned.endsWith('m')) {
    multiplier = 1000000
    cleaned = cleaned.replace(/(jt|m)$/, '')
  } else if (cleaned.endsWith('k') || cleaned.endsWith('rb')) {
    multiplier = 1000
    cleaned = cleaned.replace(/(k|rb)$/, '')
  } else {
    cleaned = cleaned.replace(/\./g, '')
  }

  const amount = parseFloat(cleaned) * multiplier
  if (isNaN(amount) || amount <= 0) {
    throw new Error(`Nominal tidak valid: "${rawAmount}"`)
  }

  const txDate = parsedDate || now

  return {
    description,
    rawCategory,
    rawWallet,
    amount,
    date: txDate,
    isCustomDate: Boolean(parsedDate),
  }
}

const INCOME_KEYWORDS = [
  'gaji', 'bonus', 'pendapatan', 'income', 'hadiah', 'transfer masuk', 'profit', 'dividen',
]

/**
 * Route capture text through the strict 4-part format first, then fall back to
 * the natural-language parser (ported from HFOS v2) so users can type
 * "makan siang 35rb" without the DESKRIPSI-KATEGORI-DOMPET-JUMLAH shape.
 *
 * On NL fallback the wallet is left empty so createQuickCaptureTransaction
 * resolves it to the user's MAIN wallet.
 */
export function parseAnyCapture(input: string, now: Date = new Date()): QuickCaptureParsed {
  if (hasStrictDelimiter(input)) {
    return parseQuickCapture(input, now)
  }

  // Pull a date phrase ("kemarin", "5 sep", "tgl 3", "5/9", "3 hari lalu")
  // out first so it neither lands in the description nor gets mistaken for
  // the amount.
  const dated = extractNaturalDate(input, now)
  const nl = parseNaturalCapture(dated ? dated.rest : input)
  if (!nl) {
    throw new Error(QUICK_CAPTURE_FORMAT_ERROR)
  }

  return {
    description: nl.note,
    rawCategory: nl.intent.categoryHint,
    rawWallet: '',
    amount: nl.amount,
    date: dated ? dated.date : now,
    isCustomDate: Boolean(dated),
    categoryCandidates: nl.intent.categoryCandidates,
    isCategoryFallback: nl.intent.isFallback,
  }
}

const GENERIC_CATEGORIES = new Set(['others', 'lain-lain', 'uncategorized', 'test', 'expense', 'income', 'type'])
const STOPWORDS = new Set(['beli', 'bayar', 'buat', 'untuk', 'sama', 'dan', 'di', 'ke', 'dari', 'yang', 'auto', 'saved'])

function normDesc(v: string): string {
  return v.toLowerCase().replace(/\(auto-saved\)/g, '').replace(/^\[auto\]\s*/, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Pick the user's category for a free-text note.
 * 1. History: what the user filed the same description (or a shared keyword)
 *    under before, needs >= 2 past hits so one-off mistakes don't stick.
 * 2. Keyword rule candidates, preferring the one the user uses most.
 * 3. Rule's first candidate (created on demand).
 */
export async function resolveNaturalCategory(
  userId: string,
  note: string,
  candidates: string[],
  isFallback: boolean,
  categories: Array<{ id: string; name: string }>
): Promise<string> {
  const target = normDesc(note)
  const history = await prisma.transaction.findMany({
    where: { userId, categoryId: { not: null }, description: { not: null } },
    select: { description: true, categoryId: true },
    orderBy: { date: 'desc' },
    take: 1500,
  })
  const nameById = new Map(categories.map(c => [c.id, c.name]))
  const usable = history
    .map(h => ({ d: normDesc(h.description || ''), c: nameById.get(h.categoryId as string) }))
    .filter((h): h is { d: string; c: string } => !!h.c && !GENERIC_CATEGORIES.has(h.c.toLowerCase()))

  const mode = (rows: Array<{ c: string }>): { name: string; n: number } | null => {
    const counts = new Map<string, number>()
    for (const r of rows) counts.set(r.c, (counts.get(r.c) ?? 0) + 1)
    let best: { name: string; n: number } | null = null
    for (const [name, n] of counts) if (!best || n > best.n) best = { name, n }
    return best
  }

  if (target) {
    const exact = mode(usable.filter(h => h.d === target))
    if (exact && exact.n >= 2) return exact.name

    // Shared keyword: longest meaningful token of the note, matched as a word.
    const tokens = target.split(' ').filter(t => t.length >= 3 && !STOPWORDS.has(t) && !/^\d+$/.test(t))
      .sort((a, b) => b.length - a.length)
    for (const tok of tokens) {
      const re = new RegExp(`(?:^| )${tok}(?: |$)`)
      const hit = mode(usable.filter(h => re.test(h.d)))
      if (hit && hit.n >= 2) return hit.name
    }
  }

  // Rule candidates the user already has, most used first.
  const usage = new Map<string, number>()
  for (const h of usable) usage.set(h.c.toLowerCase(), (usage.get(h.c.toLowerCase()) ?? 0) + 1)
  const owned = candidates
    .map(c => categories.find(x => x.name.toLowerCase() === c.toLowerCase()))
    .filter((c): c is { id: string; name: string } => !!c)
  if (owned.length) {
    owned.sort((a, b) => (usage.get(b.name.toLowerCase()) ?? 0) - (usage.get(a.name.toLowerCase()) ?? 0))
    return owned[0].name
  }
  if (isFallback) {
    const generic = categories.find(c => c.name.toLowerCase() === 'others')
      || categories.find(c => c.name.toLowerCase() === 'lain-lain')
    if (generic) return generic.name
  }
  return candidates[0] || 'Lain-lain'
}

const WALLET_MARKERS = ['dompet', 'wallet', 'dari', 'pakai', 'pake', 'via', 'ke']

function escapeRe(v: string): string {
  return v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Find an explicit wallet mention inside free text.
 *
 * A single-word wallet ("Selly") only counts after a marker word
 * ("dompet selly", "pake selly"), so "kado buat selly 50rb" stays a plain
 * description. Multi-word names ("Dompet Utama", "Tabungan BCA") match on
 * their own; "Dompet X" wallets also match as "pake x" / "utama" after a marker.
 * Longest names are tried first so "Tabungan Smoll" beats "Tabungan Smol".
 */
export function extractWalletMention(
  text: string,
  wallets: Array<{ name: string }>
): { walletName: string; rest: string } | null {
  if (!text) return null
  const markers = WALLET_MARKERS.join('|')
  const sorted = [...wallets].sort((a, b) => b.name.length - a.name.length)

  // Initials alias ("du" = Dompet Utama). Only for multi-word names and only
  // when no other wallet of this user shares the same initials.
  const initialsOf = (n: string) =>
    n.trim().toLowerCase().split(/\s+/).map((x) => x[0]).join('')
  const initialCount = new Map<string, number>()
  for (const w of wallets) {
    if (w.name.trim().split(/\s+/).length < 2) continue
    const ini = initialsOf(w.name)
    initialCount.set(ini, (initialCount.get(ini) ?? 0) + 1)
  }

  for (const w of sorted) {
    const name = w.name.trim().toLowerCase().replace(/\s+/g, ' ')
    if (!name) continue
    const core = name.startsWith('dompet ') ? name.slice(7) : name
    const words = name.split(' ').length
    const patterns: RegExp[] = []
    // marker + (optional "dompet") + core: "pake selly", "dari dompet utama"
    patterns.push(new RegExp(`(?:^|\\s)(?:${markers})\\s+(?:dompet\\s+)?${escapeRe(core).replace(/ /g, '\\s+')}(?=\\s|$)`, 'i'))
    // bare multi-word full name: "dompet utama", "tabungan bca"
    if (words >= 2) {
      patterns.push(new RegExp(`(?:^|\\s)${escapeRe(name).replace(/ /g, '\\s+')}(?=\\s|$)`, 'i'))
      const ini = initialsOf(name)
      if (ini.length >= 2 && initialCount.get(ini) === 1) {
        // "Dompet X" initials ("du") may stand alone; other initials ("tc")
        // need a marker word, since short bare tokens collide with real words
        // (e.g. Sundanese "ti").
        patterns.push(new RegExp(`(?:^|\\s)(?:${markers})\\s+${ini}(?=\\s|$)`, 'i'))
        if (name.startsWith('dompet ')) {
          patterns.push(new RegExp(`(?:^|\\s)${ini}(?=\\s|$)`, 'i'))
        }
      }
    }
    for (const re of patterns) {
      const m = text.match(re)
      if (m && m.index !== undefined) {
        const rest = (text.slice(0, m.index) + ' ' + text.slice(m.index + m[0].length))
          .replace(/\s{2,}/g, ' ')
          .trim()
        return { walletName: w.name, rest }
      }
    }
  }
  return null
}

const MONTH_ALT = Object.keys(MONTH_NAMES)
  .sort((a, b) => b.length - a.length)
  .join('|')
const DAY_ALT = DAY_NAMES.map((d) => d.replace("'", "'?")).join('|')

/**
 * Find a date phrase inside free text. Returns the parsed date (12:00 local,
 * same convention as tryParseDateToken) and the text with the phrase removed.
 * Bare number pairs like "5 9" are deliberately NOT treated as dates here,
 * because in free text they are far more likely to be quantities/amounts.
 */
export function extractNaturalDate(
  text: string,
  now: Date = new Date()
): { date: Date; rest: string } | null {
  if (!text) return null

  const clean = (rest: string) => rest.replace(/\s{2,}/g, ' ').replace(/^[\s,.-]+|[\s,.-]+$/g, '').trim()
  const tryPhrase = (re: RegExp, toToken: (m: RegExpMatchArray) => string): { date: Date; rest: string } | null => {
    const m = text.match(re)
    if (!m || m.index === undefined) return null
    const d = tryParseDateToken(toToken(m), now)
    if (!d) return null
    return { date: d, rest: clean(text.slice(0, m.index) + ' ' + text.slice(m.index + m[0].length)) }
  }

  // "3 hari lalu" / "3 hari yang lalu"
  const nAgo = text.match(/(?:^|\s)(\d{1,2})\s+hari\s+(?:yang\s+)?lalu(?=\s|$)/i)
  if (nAgo && nAgo.index !== undefined) {
    const n = parseInt(nAgo[1], 10)
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - n, 12, 0, 0)
    return { date: d, rest: clean(text.slice(0, nAgo.index) + ' ' + text.slice(nAgo.index + nAgo[0].length)) }
  }

  return (
    // relative words
    tryPhrase(/(?:^|\s)(kemarin\s+lusa|lusa\s+lalu|kemarin|kmrn|kmarin|yesterday|hari\s+ini|today)(?=\s|$)/i, (m) => {
      const w = m[1].toLowerCase().replace(/\s+/g, ' ')
      return w === 'kmrn' || w === 'kmarin' ? 'kemarin' : w
    }) ??
    // 5/9, 05/09/2026
    tryPhrase(/(?:^|\s)(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)(?=\s|$)/, (m) => m[1]) ??
    // tgl 5, tanggal 5 sep, tgl 5 9
    tryPhrase(
      new RegExp(`(?:^|\\s)(?:tgl|tanggal)\\.?\\s*(\\d{1,2})(?:\\s+(${MONTH_ALT}|\\d{1,2}))?(?:\\s+(\\d{4}))?(?=\\s|$)`, 'i'),
      (m) => (m[2] ? [m[1], m[2], m[3]].filter(Boolean).join(' ') : `tgl ${m[1]}`)
    ) ??
    // senin 5, 5 senin, senin 5 sep
    tryPhrase(
      new RegExp(`(?:^|\\s)((?:(?:${DAY_ALT})\\s+\\d{1,2}|\\d{1,2}\\s+(?:${DAY_ALT}))(?:\\s+(?:${MONTH_ALT}|\\d{1,2}))?)(?=\\s|$)`, 'i'),
      (m) => m[1]
    ) ??
    // 5 sep, 5 september 2026
    tryPhrase(
      new RegExp(`(?:^|\\s)(\\d{1,2}\\s+(?:${MONTH_ALT})(?:\\s+\\d{4})?)(?=\\s|$)`, 'i'),
      (m) => m[1]
    )
  )
}

/**
 * Detect the strict 4-part form: at least 3 hyphens separating 4 segments,
 * with the last segment looking like an amount token.
 */
function hasStrictDelimiter(input: string): boolean {
  const text = (input || '').trim()
  if (!text) return false
  const parts = text.split('-').map(p => p.trim()).filter(Boolean)
  if (parts.length < 4) return false
  const isAmount = (seg: string) =>
    /^(rp\.?)?\d+([.,]\d+)?(rb|ribu|k|jt|juta|m)?$/.test(seg.toLowerCase().replace(/\s/g, ''))
  const last = parts[parts.length - 1]
  if (isAmount(last)) return true
  // Back-dated strict form: "...-28000-kemarin" / "...-28000-5/9"
  if (parts.length >= 5 && isAmount(parts[parts.length - 2]) && tryParseDateToken(last) !== null) {
    return true
  }
  return false
}

/**
 * Create a transaction from quick capture text for a given user.
 */
export interface CaptureHint {
  /** Preferred category name. Falls back to NL parse when unmatched. */
  categoryName?: string
  /** Preferred wallet name. Overrides anything in the text. */
  walletName?: string
  /**
   * Fallback wallet used only when the text itself names no wallet
   * (e.g. a Telegram actor's own wallet). Explicit mentions still win.
   */
  defaultWalletName?: string
  /** Explicit amount, bypassing the text parser (bank/email ingestion). */
  amount?: number
  /** Explicit transaction description. */
  description?: string
  /** Explicit date. Defaults to now. */
  date?: Date
  /** Force type instead of inferring from category/keywords. */
  forceType?: 'INCOME' | 'EXPENSE'
}

export async function createQuickCaptureTransaction(
  userId: string,
  rawText: string,
  hint?: CaptureHint
): Promise<QuickCaptureResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallets: true, categories: true },
  })

  if (!user) {
    throw new Error('User tidak ditemukan.')
  }

  // A fully-specified hint (bank/email ingestion) bypasses text parsing
  // entirely: the raw text is a mail body, not a `DESKRIPSI-KATEGORI-DOMPET-
  // JUMLAH` line, so running the strict parser on it would only throw.
  const hintIsComplete = hint?.amount !== undefined && !!hint?.categoryName

  // Free text may name a wallet ("makan 25rb dompet utama", "pake selly").
  // Pull it out before parsing so it lands neither in the description nor
  // in the amount scan. Strict format already carries its own wallet slot.
  // Only spending wallets (MAIN) can be picked from text. SAVINGS wallets are
  // automation targets: "Tabungan Emas 2jt" is a transfer *to* savings, paid
  // from a MAIN wallet, so the name must stay in the description where
  // createAutoSavingsTransfer can route it.
  const selectableWallets = user.wallets.some(w => w.type === 'MAIN')
    ? user.wallets.filter(w => w.type === 'MAIN')
    : user.wallets

  const mentioned = !hintIsComplete && !hasStrictDelimiter(rawText)
    ? extractWalletMention(rawText, selectableWallets)
    : null

  const parsed = hintIsComplete
    ? { description: '', rawCategory: '', rawWallet: '', amount: 0, date: new Date(), isCustomDate: false }
    : parseAnyCapture(mentioned ? mentioned.rest : rawText)
  if (mentioned) parsed.rawWallet = mentioned.walletName

  // NL path: replace the generic rule hint with the user's own category.
  if (!hintIsComplete && !hint?.categoryName && parsed.categoryCandidates) {
    parsed.rawCategory = await resolveNaturalCategory(
      user.id,
      parsed.description,
      parsed.categoryCandidates,
      Boolean(parsed.isCategoryFallback),
      user.categories
    )
  }

  const { description, rawCategory, rawWallet, amount, date, isCustomDate } = hint
    ? {
        description: hint.description ?? parsed.description,
        rawCategory: hint.categoryName ?? parsed.rawCategory,
        rawWallet: hint.walletName ?? (parsed.rawWallet || hint.defaultWalletName || ''),
        amount: hint.amount ?? parsed.amount,
        date: hint.date ?? parsed.date,
        isCustomDate: hint.date ? true : parsed.isCustomDate,
      }
    : parsed

  // Match wallet: exact name, then partial, then fall back to MAIN wallet.
  const walletQuery = rawWallet.toLowerCase().trim()
  let matchedWallet = walletQuery
    ? selectableWallets.find(w => w.name.toLowerCase() === walletQuery)
    : undefined
  if (!matchedWallet && /^[a-z]{2,4}$/.test(walletQuery)) {
    // Initials alias in the strict wallet slot ("Kopi-Makanan-du-20000").
    // Checked BEFORE substring matching: "du" is a substring of "Bandung".
    // Only when exactly one multi-word wallet has those initials.
    const byInitials = selectableWallets.filter(w => {
      const parts = w.name.trim().toLowerCase().split(/\s+/)
      return parts.length >= 2 && parts.map(x => x[0]).join('') === walletQuery
    })
    if (byInitials.length === 1) matchedWallet = byInitials[0]
  }
  if (!matchedWallet && walletQuery.length >= 3) {
    // Partial match needs >= 3 chars so short tokens don't hit random names.
    matchedWallet = selectableWallets.find(w =>
      w.name.toLowerCase().includes(walletQuery) || walletQuery.includes(w.name.toLowerCase())
    )
  }
  if (!matchedWallet) {
    matchedWallet = user.wallets.find(w => w.type === 'MAIN') || user.wallets[0]
  }
  if (!matchedWallet) {
    throw new Error('User tidak memiliki dompet aktif.')
  }

  const categoryQuery = rawCategory.toLowerCase()
  let matchedCategory = user.categories.find(c => c.name.toLowerCase() === categoryQuery)
  if (!matchedCategory) {
    matchedCategory = user.categories.find(c =>
      c.name.toLowerCase().includes(categoryQuery) || categoryQuery.includes(c.name.toLowerCase())
    )
  }

  const isIncomeIntent = INCOME_KEYWORDS.some(
    k => categoryQuery.includes(k) || description.toLowerCase().includes(k)
  )
  const transactionType: 'INCOME' | 'EXPENSE' =
    hint?.forceType ??
    (matchedCategory?.type === 'INCOME' || isIncomeIntent ? 'INCOME' : 'EXPENSE')

  if (!matchedCategory) {
    matchedCategory = await prisma.category.create({
      data: { name: rawCategory, type: transactionType, userId: user.id },
    })
  }

  const shouldIncrement = transactionType === 'INCOME'

  const transaction = await prisma.$transaction(async (tx) => {
    const createdTx = await tx.transaction.create({
      data: {
        amount,
        type: transactionType,
        date: date,
        description,
        userId: user.id,
        walletId: matchedWallet!.id,
        categoryId: matchedCategory!.id,
      },
      include: { category: true, wallet: true },
    })

    await tx.wallet.update({
      where: { id: matchedWallet!.id },
      data: {
        balance: { [shouldIncrement ? 'increment' : 'decrement']: amount },
      },
    })

    return createdTx
  })

  // Post-transaction hooks are best-effort: a failure here must not void an
  // already-committed transaction.
  try {
    if (transactionType === 'EXPENSE') {
      await createAutoSavingsTransfer({
        userId: user.id,
        sourceTransactionId: transaction.id,
        sourceWalletId: matchedWallet.id,
        categoryId: matchedCategory.id,
        amount,
        date: date,
        description,
        categoryName: matchedCategory.name,
      })
    }

    await autoTrackTransactionToGoals(
      transaction.id,
      matchedCategory.id,
      user.id,
      amount,
      transactionType,
      description,
      date
    )

    if (transactionType === 'EXPENSE') {
      const savingsType = detectSavingsType(
        description ?? '',
        matchedCategory.name,
        matchedWallet.name
      )
      if (savingsType) {
        await autoLinkSavingsToGoal(transaction.id, user.id, savingsType)
      }
    }
  } catch (hookErr) {
    console.warn('Post-transaction hook warning:', hookErr)
  }

  const formattedAmount = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)

  const signSymbol = transactionType === 'INCOME' ? '+' : '-'

  const dateBadge = isCustomDate
    ? ` (${new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(date)})`
    : ''

  return {
    message: `✅ Tercatat${dateBadge}: ${signSymbol}${formattedAmount} [${matchedWallet.name}] (${matchedCategory.name}) - ${description}`,
    data: {
      id: transaction.id,
      amount,
      type: transactionType,
      description,
      wallet: matchedWallet.name,
      category: matchedCategory.name,
      date: date.toISOString(),
    },
  }
}
