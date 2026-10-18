/**
 * Credit Card e-Billing parser (Mandiri format by default, extensible for other banks).
 *
 * Parses text extracted from a credit card statement PDF (pdftotext -layout output) into
 * structured transactions.
 *
 * Detects:
 *  - Installments: description contains `NNN/MMM` (e.g. `003/012`) or "CICILAN"
 *  - Reversal/Refund: `CR` marker, `DIS REV-` prefix
 *  - Multi-currency: `(CNY 6.49 x 2,725.76)` pattern
 *  - Fees: `BUNGA`, `ADMIN FEE`, `TRX NOTIFICATION`, `E-BILLING STATEMENT CHRGE`
 *  - Payment: `PAYMENT THANK YOU`
 */

export interface ParsedBillingTransaction {
  date: string // yyyy-mm-dd
  merchant: string
  amount: number
  type: 'charge' | 'payment' | 'fee' | 'installment' | 'refund' | 'reversal'
  currency: string
  originalAmount?: number
  exchangeRate?: number
  installmentTenor?: number
  installmentTerm?: number
  category?: string
  description?: string
}

export interface ParsedBilling {
  cardType?: string
  cardNumber?: string
  productName?: string
  totalBalance: number
  minimumPayment?: number
  statementDate?: string
  dueDate?: string
  creditLimit?: number
  availableCredit?: number
  remainingInstallment?: number
  transactions: ParsedBillingTransaction[]
  warnings: string[]
}

// Date formats: `15-Aug-26`, `17-Jul-26`, `01-Aug-26`
const DATE_RE = /^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/
const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
}

function parseDate(d: string): string | null {
  const m = d.match(DATE_RE)
  if (!m) return null
  const day = Number(m[1])
  const month = MONTHS[m[2].toLowerCase()]
  const year = 2000 + Number(m[3])
  if (month === undefined || day < 1 || day > 31) return null
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseAmount(s: string): number | null {
  if (!s) return null
  const cleaned = s.replace(/[^\d.,-]/g, '')
  if (!cleaned) return null
  const hasDot = cleaned.includes('.')
  const hasComma = cleaned.includes(',')
  let num: number
  if (hasDot && hasComma) {
    const lastComma = cleaned.lastIndexOf(',')
    const lastDot = cleaned.lastIndexOf('.')
    if (lastComma > lastDot) {
      num = Number(cleaned.replace(/\./g, '').replace(',', '.'))
    } else {
      num = Number(cleaned.replace(/,/g, ''))
    }
  } else if (hasDot && !hasComma) {
    const afterDot = cleaned.split('.').pop() || ''
    num = afterDot.length === 3 ? Number(cleaned.replace(/\./g, '')) : Number(cleaned)
  } else if (hasComma && !hasDot) {
    const afterComma = cleaned.split(',').pop() || ''
    num = afterComma.length === 2 ? Number(cleaned.replace(',', '.')) : Number(cleaned.replace(/,/g, ''))
  } else {
    num = Number(cleaned)
  }
  return Number.isFinite(num) ? num : null
}

function parseCurrencyRate(line: string): { currency: string; original: number; rate: number } | null {
  // `(CNY 6.49 x 2,725.76)` or `(EUR 9.40CR x 20,934.78)`
  const m = line.match(/\(([A-Z]{3})\s+([\d.,]+)\s*(?:CR)?\s*[x×]\s*([\d.,]+)\)/)
  if (!m) return null
  const currency = m[1]
  const original = parseAmount(m[2])
  const rate = parseAmount(m[3])
  if (original == null || rate == null) return null
  return { currency, original, rate }
}

function isDateLine(line: string): boolean {
  return DATE_RE.test(line.trim())
}

function detectType(merchant: string): ParsedBillingTransaction['type'] {
  const upper = merchant.toUpperCase()
  if (upper.includes('PAYMENT THANK YOU')) return 'payment'
  if (upper.startsWith('DIS REV-') || upper.includes(' REV ')) return 'reversal'
  if (upper.includes('BUNGA') || upper.includes('ADMIN FEE') || upper.includes('TRX NOTIFICATION') || upper.includes('E-BILLING STATEMENT CHRGE')) return 'fee'
  if (upper === 'CR' || upper.trim() === 'CR') return 'reversal'
  return 'charge'
}

/**
 * Parse pdftotext -layout output. Each transaction is a line:
 * `17-Jul-26  17-Jul-26  SHOPEE Jakar 003/012  38,818.00` (sometimes `CR` suffix).
 * Multi-currency line follows as `(CNY 6.49 x 2,725.76)`.
 */
export function parseBillingText(text: string): ParsedBilling {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0)

  const result: ParsedBilling = { totalBalance: 0, transactions: [], warnings: [] }

  // Header: card number, product
  const cardNumberMatch = text.match(/(\d{4}\s\d{2}\*\*\s\*\*\*\*\s\d{4})/)
  if (cardNumberMatch) result.cardNumber = cardNumberMatch[1].replace(/\s/g, '')
  const productMatch = text.match(/MANDIRI\s+([A-Z0-9]+)/)
  if (productMatch) result.productName = productMatch[1]

  // Statement/due dates: `15-Aug-26  04-Sep-26` after label line
  const dateRow = lines.find((l) => {
    const parts = l.split(/\s{2,}/).map((p) => p.trim()).filter(Boolean)
    return parts.length >= 2 && parts.every(isDateLine)
  })
  if (dateRow) {
    const parts = dateRow.split(/\s{2,}/).map((p) => p.trim()).filter(Boolean)
    result.statementDate = parseDate(parts[0]) ?? undefined
    result.dueDate = parseDate(parts[1]) ?? undefined
  }

  // Header row with amounts: Basic  card  MANDIRI SKYZ  1,266,293.00  63,320.00
  const headerRow = lines.find((l) => l.startsWith('Basic'))
  if (headerRow) {
    const parts = headerRow.split(/\s{2,}/).map((p) => p.trim()).filter(Boolean)
    // [Basic, 5243..., MANDIRI SKYZ, 1,266,293.00, 63,320.00]
    const amtParts = parts.filter((p) => p.includes(','))
    if (amtParts[0]) result.totalBalance = parseAmount(amtParts[0]) ?? 0
    if (amtParts[1]) result.minimumPayment = parseAmount(amtParts[1]) ?? undefined
  }

  // Summary block (page 3): `28,000,000.00  21,420,818.00  5,312,892.00 LANCAR...`
  const summaryMatch = text.match(/([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+(?:LANCAR|DI\s+)[\s\S]{0,30}/)
  if (summaryMatch) {
    const a = parseAmount(summaryMatch[1])
    const b = parseAmount(summaryMatch[2])
    const c = parseAmount(summaryMatch[3])
    if (a && b && c && a > b && b > c) {
      result.creditLimit = a
      result.availableCredit = b
      result.remainingInstallment = c
    }
  }

  // Transactions: lines starting with a date, containing 2 dates + description + amount
  const txLines: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    // Transaction row: starts with date
    const parts = trimmed.split(/\s{2,}/).map((p) => p.trim()).filter(Boolean)
    if (isDateLine(parts[0] || '') && parts.length >= 2) {
      txLines.push(trimmed)
    }
  }

  // Pair with following currency line
  const transactions: ParsedBillingTransaction[] = []
  for (let i = 0; i < txLines.length; i++) {
    const line = txLines[i]
    const parts = line.split(/\s{2,}/).map((p) => p.trim()).filter(Boolean)

    // parts: [txDate, postDate, description..., amount, (CR)?]
    const txDate = parts[0]
    let isReversal = false
    let amountStr = parts[parts.length - 1]
    // Kalau part terakhir adalah CR (tanpa angka), amount ada di part sebelumnya
    if (/^CR$/i.test(amountStr)) {
      isReversal = true
      amountStr = parts[parts.length - 2]
    } else if (/CR/i.test(amountStr)) {
      isReversal = true
      amountStr = amountStr.replace(/\s*CR\s*/i, '').trim()
    }
    const amount = parseAmount(amountStr)
    if (amount == null) continue

    // Description = everything between postDate and amount
    const descParts = parts.slice(2, /^CR$/i.test(parts[parts.length - 1]) ? parts.length - 2 : parts.length - 1)
    let merchant = descParts.join(' ').trim()
    if (isReversal && !merchant) merchant = 'CR Adjustment'

    // Check next line in original lines (not txLines) for currency info
    // Currency lines like `(CNY 6.49 x 2,725.76)` don't start with a date
    let currencyInfo: { currency: string; original: number; rate: number } | null = null
    const lineIdx = lines.findIndex((l) => l.trim() === line.trim())
    for (let scan = lineIdx + 1; scan < Math.min(lineIdx + 3, lines.length); scan++) {
      const cur = parseCurrencyRate(lines[scan])
      if (cur) { currencyInfo = cur; break }
      // Stop if next non-currency line is a new transaction row
      const nextParts = lines[scan].trim().split(/\s{2,}/).map((p) => p.trim()).filter(Boolean)
      if (isDateLine(nextParts[0] || '')) break
    }

    const fullDesc = merchant + (currencyInfo ? ` (${currencyInfo.currency} ${currencyInfo.original} x ${currencyInfo.rate})` : '')

    // Installment: NNN/MMM in merchant
    const instMatch = merchant.match(/(\d{3})\/(\d{3})/)
    let type = detectType(merchant)
    // Payment menang atas CR marker (PAYMENT THANK YOU ... CR = pembayaran normal)
    if (type === 'payment') {
      isReversal = false
    } else if (isReversal) {
      type = 'reversal'
    }
    let installmentTenor: number | undefined
    let installmentTerm: number | undefined
    if (instMatch) {
      installmentTerm = Number(instMatch[1])
      installmentTenor = Number(instMatch[2])
      if (!isReversal) type = 'installment'
    } else if (merchant.toUpperCase().includes('CICILAN') && !isReversal) {
      type = 'installment'
    }

    let currency = 'IDR'
    let originalAmount: number | undefined
    let exchangeRate: number | undefined
    if (currencyInfo) {
      currency = currencyInfo.currency
      originalAmount = currencyInfo.original
      exchangeRate = currencyInfo.rate
    }

    transactions.push({
      date: parseDate(txDate) ?? txDate,
      merchant: merchant.slice(0, 100),
      amount,
      type,
      currency,
      ...(originalAmount != null ? { originalAmount } : {}),
      ...(exchangeRate != null ? { exchangeRate } : {}),
      ...(installmentTenor != null ? { installmentTenor } : {}),
      ...(installmentTerm != null ? { installmentTerm } : {}),
      description: fullDesc.slice(0, 200),
    })
  }

  result.transactions = transactions
  return result
}

export function validateBillingTransactions(txs: ParsedBillingTransaction[]): { valid: ParsedBillingTransaction[]; warnings: string[] } {
  const valid = txs.filter((t) => t.amount > 0)
  const warnings: string[] = []
  if (txs.length !== valid.length) {
    warnings.push(`${txs.length - valid.length} transaksi di-skip (amount 0)`)
  }
  return { valid, warnings }
}
