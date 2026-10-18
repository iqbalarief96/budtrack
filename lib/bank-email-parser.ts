import prisma from '@/lib/prisma'
import { createQuickCaptureTransaction } from '@/lib/quick-capture'

/**
 * Bank notification email parser (Gmail Apps Script → webhook).
 *
 * Ported from HFOS v2 `server.js` route 4. Deliberately conservative:
 * - If no plausible IDR amount is found, skip (200) instead of guessing.
 * - Classification only narrows the CATEGORY HINT; the actual write still
 *   goes through createQuickCaptureTransaction so wallet hooks, goal
 *   auto-link, and balance updates stay in one place.
 * - Merchant/reference numbers are commonly larger than the transaction
 *   amount, so the FIRST "Rp"/"IDR" occurrence wins — same rule as HFOS.
 */

export interface BankEmailPayload {
  sender?: string
  subject?: string
  body?: string
}

export interface ParseOutcome {
  skip?: string
  amount?: number
  hint?: CaptureHint
  note?: string
}

export interface CaptureHint {
  /** Category name to prefer when it exists for this user. */
  categoryName?: string
  /** Mark as a debt payment so the debt hook fires. */
  isDebtPayment?: boolean
  /** Mark as savings/goal top-up. */
  isSavings?: boolean
  /** Human-readable descriptor used as the transaction description. */
  description: string
}

/** Rp 1.234.567 / Rp 1,234,567 / IDR1234567 — first match wins. */
const AMOUNT_RE = /(?:Rp\.?|IDR)\s*([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]+)/i

/** Sanity window: reject parsed values outside this band. */
const MIN_AMOUNT = 1_000
const MAX_AMOUNT = 5_000_000_000

/**
 * Parse a bank notification email into a capture hint.
 * Never throws; unparseable input returns `{ skip }`.
 */
export function parseBankEmail(payload: BankEmailPayload): ParseOutcome {
  const sender = payload.sender ?? ''
  const subject = payload.subject ?? ''
  const body = payload.body ?? ''
  const raw = `${subject}\n${body}`

  // Subject-only is often truncated; require some body text.
  if (!subject && !body) return { skip: 'email kosong' }

  // --- promo gate runs FIRST: marketing blasts carry Rupiah amounts
  // (\"potongan Rp10000\") that would otherwise be booked as a real expense.
  // Sender + subject are the reliable discriminator; a genuine transaction
  // mail never uses a bulk-marketing sender or a promo subject. -----------
  const senderLower = sender.toLowerCase()
  const subjectLower = subject.toLowerCase()
  const isMarketingSender =
    /(^|[<.\s])(promo|marketing|newsletter|info|no-?reply-?promo|campaign)@/i.test(senderLower)
  const isPromoSubject =
    /\b(promo|diskon|voucher|cashback|penawaran|spesial|gratis|beli\s*1\s*gratis|flash\s*sale|kupon|reward\s*poin|undian)\b/i.test(
      subjectLower
    )
  const isTxSubject =
    /\b(transaksi|pembayaran|pembelian|transfer|pemindahan|debit|kredit\s*masuk|tarik\s*tunai|top\s*up|topup|tagihan|purchase|payment|notifikasi\s*transaksi)\b/i.test(
      subjectLower
    )

  if ((isMarketingSender || isPromoSubject) && !isTxSubject) {
    return { skip: 'bukan email transaksi (promo/marketing)' }
  }

  const m = raw.match(AMOUNT_RE)
  if (!m) return { skip: 'nominal Rupiah tidak ditemukan' }

  const amount = parseInt(m[1].replace(/[.,]/g, ''), 10)
  if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    return { skip: `nominal di luar rentang wajar (${m[1]})` }
  }

  const text = `${sender} ${raw}`

  // --- income first: an inbound transfer must never be reclassified as debt
  // just because the bank's footer mentions "cicilan". --------------------
  const isDebtMail =
    /kartu\s*kredit|tagihan\s*kartu|cicilan\s*(ke|bulan|kendaraan|rumah)|kredit\s*kendaraan|\bfif\b|adira|bca\s*finance|paylater|akulaku|kredivo/i.test(
      text
    )
  const isIncomeMail =
    /dana\s*masuk|transfer\s*masuk|kredit\s*masuk|gaji|payroll|penerimaan|uang\s*masuk|incoming\s*transfer|salary/i.test(
      text
    )

  // --- classification ladder: specific → general, first hit wins ---------
  let categoryName = 'Uncategorized'
  let isDebtPayment = false
  let isSavings = false

  if (isIncomeMail && !isDebtMail) {
    categoryName = 'Salary'
  } else if (/bibit|bareksa|reksa\s*dana|\bsbn\b|emas\s*digital|pluang|ajaib|crypto|bitcoin|\bbtc\b/i.test(text)) {
    categoryName = 'Tabungan'
    isSavings = true
  } else if (isDebtMail) {
    categoryName = 'Tagihan'
    isDebtPayment = true
  } else if (/\bpln\b|listrik|indihome|biznet|telkomsel|\bxl\b|\btri\b|\bbyu\b|bpjs|pdam|wifi/i.test(text)) {
    categoryName = 'Utilities'
  } else if (/kopi|fore|starbucks|bioskop|\bxxi\b|netflix|spotify|disney|game|steam/i.test(text)) {
    categoryName = 'jajan'
  } else if (/superindo|indomaret|alfamart|alfamidi|hypermart|transmart|sayur|groceries|belanja\s*harian/i.test(text)) {
    categoryName = 'Belanja'
  } else if (/pertamina|\bspbu\b|bensin|pertamax|gojek|grab|ojek|tol\b|parkir|krl|mrt|transjakarta/i.test(text)) {
    categoryName = 'Transport'
  }

  // Promo / marketing mail is not a transaction. Only enforce this when the
  // mail stayed Uncategorized — a bank template that matched a real category
  // (or an income marker) has already proven it carries transaction data.
  if (categoryName === 'Uncategorized') {
    const hasTxMarker =
      /transaksi|pembayaran|pembelian|transfer|pemindahan|debit|tarik\s*tunai|top\s*up|topup|tagihan|purchase|payment/i.test(
        `${subject}\n${body}`
      )
    if (!hasTxMarker) return { skip: 'bukan email transaksi (promo/notifikasi umum)' }
  }

  const merchant = extractMerchant(raw)
  const description = merchant
    ? `[Auto] ${merchant}`
    : `[Auto] ${(subject || 'Transaksi bank').slice(0, 80)}`

  return { amount, hint: { categoryName, isDebtPayment, isSavings, description }, note: description }
}

/**
 * Pull a human-friendly merchant/note out of the email.
 * Bank emails typically expose it as "di <MERCHANT>" or "ke <MERCHANT>".
 */
function extractMerchant(raw: string): string | null {
  const patterns = [
    /\bdi\s+([A-Z][A-Za-z0-9 .&'\-]{2,40})/,
    /\bke\s+([A-Z][A-Za-z0-9 .&'\-]{2,40})/,
    /\bmerchant\s*[:\-]\s*([A-Za-z0-9 .&'\-]{2,40})/i,
    /\bat\s+([A-Z][A-Za-z0-9 .&'\-]{2,40})/,
  ]

  for (const re of patterns) {
    const m = raw.match(re)
    if (m?.[1]) {
      return m[1].replace(/\s+/g, ' ').trim()
    }
  }
  return null
}

/**
 * Resolve a hint category name to a real Category row for this user.
 * Falls back to the closest generic match, then to Uncategorized.
 */
export async function resolveCategoryId(userId: string, hintName?: string): Promise<string | null> {
  if (!hintName) return null

  const exact = await prisma.category.findFirst({
    where: { userId, name: hintName },
    select: { id: true },
  })
  if (exact) return exact.id

  const like = await prisma.category.findFirst({
    where: { userId, name: { contains: hintName } },
    select: { id: true },
  })
  if (like) return like.id

  const fallback = await prisma.category.findFirst({
    where: { userId, name: 'Uncategorized' },
    select: { id: true },
  })
  return fallback?.id ?? null
}

/**
 * Full pipeline: parse → resolve category → write through the shared
 * quick-capture path. Returns a structured result for the route to log.
 *
 * Writes go through createQuickCaptureTransaction so savings transfers,
 * goal auto-linking, and debt hooks all fire the same as a manual capture.
 */
export class UnknownWalletError extends Error {}

/**
 * @param walletName Optional explicit wallet (one Apps Script per Gmail
 *   account, each pinned to its owner's wallet). Must match an existing
 *   wallet name exactly (case-insensitive) — no fuzzy match and no silent
 *   fallback, so a typo can never book the wife's spending into the
 *   husband's wallet.
 */
export async function ingestBankEmail(
  userId: string,
  payload: BankEmailPayload,
  walletName?: string
) {
  let resolvedWallet: string | undefined
  if (walletName) {
    const wallets = await prisma.wallet.findMany({
      where: { userId },
      select: { name: true },
    })
    const hit = wallets.find(w => w.name.toLowerCase() === walletName.trim().toLowerCase())
    if (!hit) throw new UnknownWalletError(`wallet "${walletName}" tidak ditemukan`)
    resolvedWallet = hit.name
  }

  const parsed = parseBankEmail(payload)
  if (parsed.skip) return { skipped: true, reason: parsed.skip }

  const amount = parsed.amount!
  const hint = parsed.hint!

  const tx = await createQuickCaptureTransaction(userId, parsed.note ?? hint.description, {
    categoryName: hint.categoryName,
    walletName: resolvedWallet,
    amount,
    description: hint.description,
    date: new Date(),
    forceType: hint.categoryName === 'Salary' ? 'INCOME' : 'EXPENSE',
  })

  return {
    skipped: false,
    transactionId: tx.data.id,
    amount,
    category: tx.data.category ?? hint.categoryName,
    wallet: tx.data.wallet ?? null,
    description: tx.data.description ?? hint.description,
  }
}
