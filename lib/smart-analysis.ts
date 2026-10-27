import { z } from 'zod'

/**
 * Smart Financial Analysis (Insights page).
 *
 * The AI only writes narrative and picks categories/actions; every number the
 * UI shows (KPIs, category amounts) comes from these server-computed facts.
 * The old free-form prompts only gave the AI percentages, so it back-computed
 * rupiah amounts (wrong by a few hundred rupiah), and the summary and the
 * analysis were generated from different data and contradicted each other.
 */

// ---------------------------------------------------------------------------
// Facts
// ---------------------------------------------------------------------------

export type SmartAnalysisCategory = {
  name: string
  amount: number
  /** Share of total expense, 0-100. */
  percentage: number
  /** Money moved into savings/investments (still counted inside expense). */
  isSavings: boolean
}

export type SmartAnalysisFacts = {
  periodLabel: string
  previousLabel: string
  unitLabel: string
  totalIncome: number
  totalExpense: number
  netSavings: number
  /** netSavings / totalIncome * 100, or null when there is no income. */
  savingsRate: number | null
  /** Part of totalExpense that went to savings/investment categories. */
  savingsTransfers: number
  /** % change vs the previous period, or null when there is no baseline. */
  incomeChange: number | null
  expenseChange: number | null
  avgIncome: number
  avgExpense: number
  categories: SmartAnalysisCategory[]
}

// Keep this narrow on purpose: generic words like "rumah" would mis-flag
// everyday categories such as "Kebutuhan Rumah".
const SAVINGS_CATEGORY_PATTERN =
  /\b(tabungan|nabung|menabung|saving|savings|investasi|investment|reksa ?dana|reksadana|saham|deposito|dana darurat|emergency fund|emas|logam mulia|crypto|kripto)\b/i

export function isSavingsCategoryName(name: string): boolean {
  return SAVINGS_CATEGORY_PATTERN.test(name)
}

/** Percentage change, or null when the previous value is 0 (no baseline). */
export function percentChange(prev: number, curr: number): number | null {
  if (!Number.isFinite(prev) || !Number.isFinite(curr) || prev === 0) return null
  return ((curr - prev) / Math.abs(prev)) * 100
}

export function buildSmartAnalysisFacts(input: {
  periodLabel: string
  previousLabel: string
  unitLabel: string
  totalIncome: number
  totalExpense: number
  categoryTotals: Record<string, number>
  incomeChange: number | null
  expenseChange: number | null
  avgIncome: number
  avgExpense: number
}): SmartAnalysisFacts {
  const totalExpense = Math.max(0, input.totalExpense)
  const totalIncome = Math.max(0, input.totalIncome)
  const netSavings = totalIncome - totalExpense
  const denom = totalExpense > 0 ? totalExpense : 1

  const categories = Object.entries(input.categoryTotals)
    .filter(([, amount]) => amount > 0)
    .map(([name, amount]) => ({
      name,
      amount: Math.round(amount),
      percentage: (amount / denom) * 100,
      isSavings: isSavingsCategoryName(name),
    }))
    .sort((a, b) => b.amount - a.amount)

  return {
    periodLabel: input.periodLabel,
    previousLabel: input.previousLabel,
    unitLabel: input.unitLabel,
    totalIncome: Math.round(totalIncome),
    totalExpense: Math.round(totalExpense),
    netSavings: Math.round(netSavings),
    savingsRate: totalIncome > 0 ? (netSavings / totalIncome) * 100 : null,
    savingsTransfers: Math.round(categories.filter((c) => c.isSavings).reduce((s, c) => s + c.amount, 0)),
    incomeChange: input.incomeChange,
    expenseChange: input.expenseChange,
    avgIncome: Math.round(input.avgIncome),
    avgExpense: Math.round(input.avgExpense),
    categories,
  }
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)

const pct = (n: number | null) => (n === null ? 'n/a' : `${n.toFixed(1)}%`)
const signedPct = (n: number | null) => (n === null ? 'n/a (gak ada data periode sebelumnya)' : `${n > 0 ? '+' : ''}${n.toFixed(1)}%`)

const STYLE_RULES = `Gaya bahasa: Jaksel gaul, santai kayak temen yang ngerti finansial, tapi jangan norak dan jangan nyebut kata "jaksel". Campur Inggris secukupnya.`

function factsBlock(f: SmartAnalysisFacts): string {
  const consumption = f.totalExpense - f.savingsTransfers
  const categoryLines = f.categories
    .map((c) => `- ${c.name}: ${rupiah(c.amount)} (${c.percentage.toFixed(1)}% dari pengeluaran)${c.isSavings ? ' [TABUNGAN/INVESTASI, bukan konsumsi]' : ''}`)
    .join('\n')

  return `PERIODE: ${f.periodLabel} (dibanding ${f.previousLabel})

ANGKA RESMI (ini satu-satunya sumber angka):
- Pemasukan: ${rupiah(f.totalIncome)}
- Pengeluaran total: ${rupiah(f.totalExpense)}
- Dipindah ke tabungan/investasi (sudah termasuk di pengeluaran): ${rupiah(f.savingsTransfers)}
- Pengeluaran konsumsi (pengeluaran total dikurangi tabungan/investasi): ${rupiah(consumption)}
- Sisa / net cashflow: ${rupiah(f.netSavings)}
- Saving rate (net / pemasukan): ${pct(f.savingsRate)}
- Perubahan pemasukan: ${signedPct(f.incomeChange)}
- Perubahan pengeluaran: ${signedPct(f.expenseChange)}
- Rata-rata per ${f.unitLabel}: pemasukan ${rupiah(f.avgIncome)}, pengeluaran ${rupiah(f.avgExpense)}

PENGELUARAN PER KATEGORI:
${categoryLines || '- (belum ada pengeluaran)'}`
}

const NUMBER_RULES = `ATURAN ANGKA (WAJIB):
- Pakai HANYA angka dari "ANGKA RESMI" dan "PENGELUARAN PER KATEGORI" di atas. Boleh menjumlahkan angka-angka itu, tapi JANGAN bikin, ngebulatin, atau ngitung ulang angka lain.
- Saving rate cuma satu, yaitu "Saving rate (net / pemasukan)". Kategori bertanda [TABUNGAN/INVESTASI] itu uang yang disisihin, bukan saving rate dan bukan konsumsi.`

/** Prompt for the structured cards (JSON). */
export function buildStructuredAnalysisPrompt(f: SmartAnalysisFacts): string {
  const names = f.categories.map((c) => c.name)
  return `Kamu analis keuangan pribadi. Baca data berikut dan kasih insight yang paling penting aja.

${factsBlock(f)}

${NUMBER_RULES}

${STYLE_RULES}

TUGAS: balas HANYA dengan satu objek JSON valid (tanpa markdown, tanpa backticks, tanpa teks lain) dengan bentuk persis:
{
  "verdict": {
    "status": "sehat" | "waspada" | "bahaya",
    "headline": "1 kalimat kondisi keuangan, maks 20 kata"
  },
  "highlights": [
    {
      "severity": "high" | "medium" | "positive",
      "title": "judul singkat, maks 8 kata",
      "insight": "maks 2 kalimat: kenapa ini penting + apa yang sebaiknya dilakuin",
      "category": "nama kategori PERSIS dari daftar, atau null",
      "action": {
        "type": "budget" | "transactions" | "categories" | "goals" | "none",
        "label": "teks tombol singkat, maks 4 kata",
        "amount": angka saran batas budget per ${f.unitLabel} (cuma kalau type = "budget"), atau null
      }
    }
  ],
  "dataIssues": [
    { "title": "masalah data, maks 8 kata", "detail": "maks 2 kalimat", "categories": ["nama kategori persis"] }
  ]
}

ATURAN ISI:
- "highlights": 2-4 item, urutkan dari yang paling berdampak. Minimal satu "positive" kalau memang ada hal bagus.
- "category" harus salah satu dari: ${names.length ? names.map((n) => JSON.stringify(n)).join(', ') : '(kosong)'}.
- "action.type": "budget" buat saran batasin kategori, "transactions" buat ngecek transaksi, "categories" buat ngerapihin kategori, "goals" buat nabung/target, "none" kalau gak perlu tombol.
- "dataIssues": isi kalau ada kategori yang kayaknya dobel/overlap atau pencatatan aneh; kalau gak ada, [].
- "status": "bahaya" kalau net cashflow negatif, "waspada" kalau saving rate < 10% atau ada pengeluaran yang jelas bermasalah, selain itu "sehat".`
}

/** Prompt for the long, collapsible markdown analysis. */
export function buildDeepAnalysisPrompt(f: SmartAnalysisFacts): string {
  return `Kamu analis keuangan pribadi. Bikin analisis lengkap dari data berikut.

${factsBlock(f)}

${NUMBER_RULES}

${STYLE_RULES}

FORMAT (Markdown):
- Pakai heading level 3 (###) aja, JANGAN pakai # atau ##, dan jangan kasih judul utama.
- Bagian: ### Pola Pengeluaran, ### Tabungan & Kesehatan Finansial, ### Langkah Konkret.
- Jangan ngulang daftar semua kategori (user udah liat di chart); bahas yang relevan aja.
- Tiap poin singkat (maks 2 kalimat). "Langkah Konkret" berisi 3 langkah bernomor.`
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export type SmartAnalysisAction = {
  type: 'budget' | 'transactions' | 'categories' | 'goals' | 'none'
  label: string | null
  amount: number | null
}

export type SmartAnalysisHighlight = {
  severity: 'high' | 'medium' | 'positive'
  title: string
  insight: string
  category: string | null
  action: SmartAnalysisAction | null
}

export type SmartAnalysisDataIssue = {
  title: string
  detail: string
  categories: string[]
}

export type SmartAnalysis = {
  verdict: { status: 'sehat' | 'waspada' | 'bahaya'; headline: string }
  highlights: SmartAnalysisHighlight[]
  dataIssues: SmartAnalysisDataIssue[]
}

const clip = (max: number) => z.string().trim().min(1).transform((s) => (s.length > max ? `${s.slice(0, max - 1)}…` : s))

const SEVERITY_ALIASES: Record<string, SmartAnalysisHighlight['severity']> = {
  high: 'high', critical: 'high', danger: 'high', bahaya: 'high', warning: 'medium',
  medium: 'medium', waspada: 'medium', info: 'medium', low: 'medium',
  positive: 'positive', success: 'positive', good: 'positive', sehat: 'positive',
}
const STATUS_ALIASES: Record<string, SmartAnalysis['verdict']['status']> = {
  sehat: 'sehat', healthy: 'sehat', good: 'sehat', aman: 'sehat',
  waspada: 'waspada', warning: 'waspada', caution: 'waspada', medium: 'waspada',
  bahaya: 'bahaya', danger: 'bahaya', critical: 'bahaya', bad: 'bahaya',
}
const ACTION_TYPES = new Set(['budget', 'transactions', 'categories', 'goals', 'none'])

const alias = <T extends string>(map: Record<string, T>) =>
  z.string().transform((s, ctx) => {
    const v = map[s.trim().toLowerCase()]
    if (!v) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `unknown value ${s}` })
      return z.NEVER
    }
    return v
  })

const ActionSchema = z
  .object({
    type: z.string().transform((s) => s.trim().toLowerCase()),
    label: z.string().trim().max(60).nullish(),
    amount: z.coerce.number().finite().positive().max(1_000_000_000_000).nullish(),
  })
  .transform((a): SmartAnalysisAction | null =>
    ACTION_TYPES.has(a.type)
      ? { type: a.type as SmartAnalysisAction['type'], label: a.label || null, amount: a.type === 'budget' ? a.amount ?? null : null }
      : null
  )

const RawSchema = z.object({
  verdict: z.object({ status: alias(STATUS_ALIASES), headline: clip(220) }),
  highlights: z
    .array(
      z.object({
        severity: alias(SEVERITY_ALIASES),
        title: clip(90),
        insight: clip(400),
        category: z.string().trim().nullish(),
        action: ActionSchema.nullish().catch(null),
      })
    )
    .min(1),
  dataIssues: z
    .array(
      z.object({
        title: clip(90),
        detail: clip(300),
        categories: z.array(z.string()).nullish(),
      })
    )
    .nullish()
    .catch([]),
})

/** Pull the first top-level JSON object out of a model response. */
function extractJsonObject(raw: string): unknown {
  const text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  try {
    return JSON.parse(text)
  } catch {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end <= start) return null
    try {
      return JSON.parse(text.slice(start, end + 1))
    } catch {
      return null
    }
  }
}

/**
 * Parse + validate the model's JSON. Unknown category names are dropped (so the
 * UI never looks up a non-existent amount), lists are capped, and anything that
 * doesn't fit the shape returns null so the caller can fall back to markdown.
 */
export function parseSmartAnalysis(raw: string, categoryNames: string[]): SmartAnalysis | null {
  const json = extractJsonObject(raw)
  if (!json || typeof json !== 'object') return null

  const result = RawSchema.safeParse(json)
  if (!result.success) return null

  const byLower = new Map(categoryNames.map((name) => [name.toLowerCase(), name]))
  const canonical = (name?: string | null) => (name ? byLower.get(name.trim().toLowerCase()) ?? null : null)

  const highlights = result.data.highlights.slice(0, 4).map((h) => ({
    severity: h.severity,
    title: h.title,
    insight: h.insight,
    category: canonical(h.category),
    action: h.action ?? null,
  }))

  const dataIssues = (result.data.dataIssues ?? []).slice(0, 3).map((d) => ({
    title: d.title,
    detail: d.detail,
    categories: (d.categories ?? []).map(canonical).filter((n): n is string => !!n),
  }))

  return { verdict: result.data.verdict, highlights, dataIssues }
}
