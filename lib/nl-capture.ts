// Natural-language quick capture parser (ported from HFOS v2 src/chatParser.js).
//
// Fallback path for lib/quick-capture.ts: when the strict
// DESKRIPSI-KATEGORI-DOMPET-JUMLAH format fails, this parser infers amount,
// intent category, and income/expense from free Indonesian text.

const AMOUNT_RE = /(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta|m)?\b/gi

/** Minimum nominal considered a real transaction (filters stray dates/qty). */
const MIN_AMOUNT = 500

export type CaptureIntent = {
  type: 'INCOME' | 'EXPENSE'
  hubCategory: string
  /** Suggested BudTrack category name, matched case-insensitively downstream. */
  categoryHint: string
  /** True when this should be treated as a debt/CC principal payment. */
  isDebtPayment?: boolean
  /** Goal bucket hint for goal-topup transactions. */
  goalHint?: string | null
  /** Candidate category names, preferred first; caller picks one the user has. */
  categoryCandidates?: string[]
  /** True when no rule matched (generic fallback). */
  isFallback?: boolean
}

export type ParsedNaturalCapture = {
  amount: number
  note: string
  intent: CaptureIntent
}

/**
 * Extract the first plausible IDR amount from free text.
 * Accepts `35rb`, `28k`, `1,5jt`, `Rp 45.000`, `45000`.
 */
export function parseIndonesianAmount(text: string): { amount: number; raw: string } | null {
  if (!text) return null

  AMOUNT_RE.lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = AMOUNT_RE.exec(text)) !== null) {
    const rawNum = match[1]
    const unit = (match[2] || '').toLowerCase()

    let value: number
    if (unit === 'jt' || unit === 'juta' || unit === 'm') {
      value = Math.round(parseFloat(rawNum.replace(',', '.')) * 1_000_000)
    } else if (unit === 'rb' || unit === 'ribu' || unit === 'k') {
      value = Math.round(parseFloat(rawNum.replace(',', '.')) * 1_000)
    } else {
      const cleaned = rawNum.replace(/[.,]/g, '')
      value = parseInt(cleaned, 10)
    }

    if (Number.isFinite(value) && value >= MIN_AMOUNT) {
      return { amount: value, raw: match[0] }
    }
  }

  return null
}

// NOTE: debt/CC intent is NOT in this table — classifyIntent() handles it
// first so the isDebtPayment flag is always set correctly.
//
// Each rule lists candidate category names in preference order. The caller
// picks the first one the user actually has (so we reuse "Makan" instead of
// inventing "Hiburan & Jajan"). Order matters: specific rules come first.
type Rule = {
  re: RegExp
  type: 'INCOME' | 'EXPENSE'
  hubCategory: string
  candidates: string[]
  goalHint?: string | null
}

const RULES: Rule[] = [
  { re: /\b(tarik tunai|tartun|ambil atm)\b/, type: 'EXPENSE', hubCategory: 'Living_Cost', candidates: ['Tarik Tunai'] },
  { re: /\b(darurat|emergency|rdpu)\b/, type: 'EXPENSE', hubCategory: 'Emergency_Fund', candidates: ['Dana Darurat', 'Emergency Funds', 'Savings', 'Tabungan'], goalHint: 'Emergency_Fund' },
  { re: /\b(tabungan|nabung|setor tabungan|emas|logam mulia|antam|reksadana|reksa dana|saham|obligasi|sbn|deposito|investasi|invest|bibit|crypto|kripto|bitcoin|btc|eth)\b/, type: 'EXPENSE', hubCategory: 'Savings_Investment', candidates: ['Savings', 'Tabungan', 'Tabungan & Investasi'], goalHint: 'Investment' },
  // Food delivery before transport so "grabfood" is not a ride.
  { re: /\b(gofood|grabfood|shopeefood|go-food|grab food)\b/, type: 'EXPENSE', hubCategory: 'Living_Cost', candidates: ['Makan', 'GoFood / GrabFood', 'Makanan', 'Food'] },
  { re: /\b(netflix|spotify|youtube premium|disney|vidio|langganan|subscribe|subscription|chatgpt|claude|icloud|google one)\b/, type: 'EXPENSE', hubCategory: 'Living_Cost', candidates: ['Langganan', 'Subscribe web', 'Akun AI'] },
  { re: /\b(kuota|pulsa|paket data|paket internet)\b/, type: 'EXPENSE', hubCategory: 'Living_Cost', candidates: ['Kuota', 'Pulsa & Paket Data'] },
  { re: /\b(listrik|pln|token listrik|token|wifi|internet|indihome|biznet|firstmedia|myrepublic|pdam|tagihan air)\b/, type: 'EXPENSE', hubCategory: 'Living_Cost', candidates: ['Listrik & WiFi', 'Listrik & Internet', 'Tagihan & Utilitas', 'Tagihan'] },
  { re: /\b(bensin|pertalite|pertamax|shell|spbu|parkir|tol|e-?toll|tapcash|flazz|gojek|goride|grab|grabbike|maxim|krl|mrt|lrt|tj|transjakarta|ojek|ojol|angkot|taksi|taxi|kereta|servis motor|servis mobil|bengkel|oli|ban)\b|top ?up (ovo|gopay)/, type: 'EXPENSE', hubCategory: 'Living_Cost', candidates: ['Transport', 'Transportasi', 'BBM / Bensin', 'Transportation'] },
  { re: /\b(pajak|stnk|pbb)\b/, type: 'EXPENSE', hubCategory: 'Sinking_Protection', candidates: ['Pajak'], goalHint: 'Sinking_Annual' },
  { re: /\b(bpjs|asuransi|premi)\b/, type: 'EXPENSE', hubCategory: 'Sinking_Protection', candidates: ['Asuransi'], goalHint: 'Sinking_Annual' },
  { re: /\b(behel|kawat gigi)\b/, type: 'EXPENSE', hubCategory: 'Living_Cost', candidates: ['Behel', 'Kesehatan & Obat'] },
  { re: /\b(obat|apotek|apotik|dokter|klinik|rumah sakit|rs|puskesmas|vitamin|gigi|periksa|lab)\b/, type: 'EXPENSE', hubCategory: 'Living_Cost', candidates: ['Kesehatan & Obat', 'Vitamin'] },
  { re: /\b(anak|sekolah|spp|pendidikan|imunisasi|popok|pampers|kursus|les)\b/, type: 'EXPENSE', hubCategory: 'Child_Education', candidates: ['Anak & Keluarga', 'Pendidikan'], goalHint: 'Child_Fund' },
  // Raw groceries / supermarkets. Cooked food words are NOT here.
  { re: /\b(belanja dapur|belanja sayur|belanja bulanan|sayur|sayuran|beras|minyak goreng|telur|bumbu|sembako|pasar|groceries|borma|superindo|alfamart|indomaret|yomart|griya|transmart|hypermart|lotte mart)\b/, type: 'EXPENSE', hubCategory: 'Living_Cost', candidates: ['Belanja', 'Belanja Harian', 'Kebutuhan Rumah'] },
  // Eating & drinking.
  { re: /\b(makan|maksi|mabar|sarapan|lunch|dinner|kopi|ngopi|coffee|kafe|cafe|jajan|cemilan|camilan|snack|minum|es teh|boba|roti|bakso|mie|mi ayam|nasi|sate|soto|martabak|seblak|ramen|sushi|pizza|burger|kfc|mcd|hokben|warteg|warkop|padang|gacoan|geprek|penyet|ayam|bebek|seafood|dimsum|gorengan|bakmi|pecel|lontong|bubur|kue|donat)\b/, type: 'EXPENSE', hubCategory: 'Living_Cost', candidates: ['Makan', 'Makanan', 'Makanan & Minuman', 'Food', 'Food & Dining'] },
  { re: /\b(nonton|bioskop|xxi|cgv|cinepolis|film|game|steam|roblox|nintendo|psn|playstation|konser|karaoke|hobi|rekreasi|wisata)\b/, type: 'EXPENSE', hubCategory: 'Guilt_Free', candidates: ['Hiburan', 'Entertainment'] },
  { re: /\b(date|dating|pacaran)\b/, type: 'EXPENSE', hubCategory: 'Guilt_Free', candidates: ['Dating', 'Hiburan'] },
  { re: /\b(shopee|spay)\b/, type: 'EXPENSE', hubCategory: 'Living_Cost', candidates: ['Shopee', 'Belanja Online', 'Belanja'] },
  { re: /\b(tokopedia|tokped)\b/, type: 'EXPENSE', hubCategory: 'Living_Cost', candidates: ['Tokopedia', 'Belanja Online', 'Belanja'] },
  { re: /\b(lazada)\b/, type: 'EXPENSE', hubCategory: 'Living_Cost', candidates: ['Lazada', 'Belanja Online', 'Belanja'] },
  { re: /\b(tiktok shop|tiktokshop)\b/, type: 'EXPENSE', hubCategory: 'Living_Cost', candidates: ['TikTok Shop', 'Belanja Online', 'Belanja'] },
  { re: /\b(baju|kaos|celana|sepatu|sendal|sandal|tas|jaket|pakaian)\b/, type: 'EXPENSE', hubCategory: 'Guilt_Free', candidates: ['Pakaian', 'Shopping', 'Belanja'] },
  { re: /\b(sabun|shampoo|sampo|pasta gigi|odol|skincare|perawatan|potong rambut|cukur|salon)\b/, type: 'EXPENSE', hubCategory: 'Living_Cost', candidates: ['Perawatan Diri', 'Kebutuhan Rumah', 'Kebutuhan'] },
  { re: /\b(kado|hadiah buat|ngamplop|amplop|sumbangan|donasi|sedekah|zakat|infaq)\b/, type: 'EXPENSE', hubCategory: 'Living_Cost', candidates: ['Hadiah & Donasi', 'Gifts'] },
  { re: /\b(belanja|beli)\b/, type: 'EXPENSE', hubCategory: 'Living_Cost', candidates: ['Belanja', 'Shopping'] },
  // Income
  { re: /\b(gaji|salary|payroll)\b/, type: 'INCOME', hubCategory: 'Income', candidates: ['Gaji', 'Salary'] },
  { re: /\b(bonus|thr|insentif|honor|komisi)\b/, type: 'INCOME', hubCategory: 'Income', candidates: ['Bonus', 'Bonus / THR', 'Bonuses'] },
  { re: /\b(cashback|refund)\b/, type: 'INCOME', hubCategory: 'Income', candidates: ['Cashback / Refund', 'Pendapatan Lain'] },
  { re: /\b(dividen|profit|bunga)\b/, type: 'INCOME', hubCategory: 'Income', candidates: ['Investasi & Dividen', 'Pendapatan Lain'] },
  { re: /\b(pendapatan|income|transfer masuk|terima|dapet duit|freelance|jual)\b/, type: 'INCOME', hubCategory: 'Income', candidates: ['Pendapatan Lain', 'Freelance / Sampingan'] },
]

const DEFAULT_CANDIDATES = ['Lain-lain', 'Others']

function toIntent(r: Pick<Rule, 'type' | 'hubCategory' | 'candidates' | 'goalHint'>, isDebtPayment = false): CaptureIntent {
  return {
    type: r.type,
    hubCategory: r.hubCategory,
    categoryHint: r.candidates[0],
    categoryCandidates: r.candidates,
    ...(isDebtPayment ? { isDebtPayment: true } : {}),
    ...(r.goalHint ? { goalHint: r.goalHint } : {}),
  }
}

/**
 * Classify free text into a BudTrack-compatible intent.
 * Debt/CC detection is intentionally checked first so "bayar cc 600rb" does
 * not fall through to a generic expense rule.
 */
export function classifyIntent(note: string): CaptureIntent {
  const t = (note || '').toLowerCase()

  if (/\b(cc|kartu kredit|cicilan|kredit|paylater|kredivo|akulaku|spaylater)\b/.test(t)) {
    const isCC = /\b(cc|kartu kredit)\b/.test(t)
    return toIntent({
      type: 'EXPENSE',
      hubCategory: 'Debt_Payment',
      candidates: isCC ? ['CC', 'Pembayaran Kartu Kredit'] : ['Bayar Cicilan', 'Sewa / Cicilan Rumah'],
    }, true)
  }

  for (const rule of RULES) {
    if (rule.re.test(t)) return toIntent(rule)
  }

  return { ...toIntent({ type: 'EXPENSE', hubCategory: 'Living_Cost', candidates: DEFAULT_CANDIDATES }), isFallback: true }
}

/**
 * Parse free-form Indonesian text into amount + note + intent.
 * Returns null when no usable amount is found, so the caller can surface a
 * format error instead of writing a bogus transaction.
 */
export function parseNaturalCapture(text: string): ParsedNaturalCapture | null {
  const trimmed = (text || '').trim()
  if (!trimmed) return null

  const amountHit = parseIndonesianAmount(trimmed)
  if (!amountHit) return null

  const note = trimmed
    .replace(amountHit.raw, '')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    amount: amountHit.amount,
    note: note || 'Transaksi Chat',
    intent: classifyIntent(note || trimmed),
  }
}
