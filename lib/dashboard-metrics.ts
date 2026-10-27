/**
 * Dashboard money flows. Client-safe, no dependencies besides the classifier.
 *
 * Moving money into savings is NOT spending. Each transaction in scope is one of:
 * - income:   real income
 * - expense:  consumption
 * - saved:    an expense that moved money into savings/investments
 * - internal: the savings-wallet leg of a transfer whose source leg is also in
 *             scope (e.g. "Semua"); counted once, as `saved`
 */
import { isSavingsTransaction } from './savings/classify'

export type FlowTx = {
  id: string
  amount: number
  type: string
  date: string | Date
  walletId: string
  description?: string | null
  category?: { name?: string | null; type?: string | null } | null
  transferPairId?: string | null
  migrationSourceTransactionId?: string | null
}

export type FlowKind = 'income' | 'expense' | 'saved' | 'internal'

/** Lookup of the other leg of savings transfers (auto-route / migration). */
export function buildTransferIndex(all: FlowTx[]) {
  const byId = new Map<string, FlowTx>()
  const expenseByPair = new Map<string, FlowTx>()
  const incomeByPair = new Map<string, FlowTx>()
  const incomeBySource = new Map<string, FlowTx>()
  for (const tx of all) {
    byId.set(tx.id, tx)
    const t = (tx.type || '').toUpperCase()
    if (tx.transferPairId && t === 'EXPENSE') expenseByPair.set(tx.transferPairId, tx)
    if (tx.transferPairId && t === 'INCOME') incomeByPair.set(tx.transferPairId, tx)
    if (tx.migrationSourceTransactionId && t === 'INCOME') incomeBySource.set(tx.migrationSourceTransactionId, tx)
  }
  return { byId, expenseByPair, incomeByPair, incomeBySource }
}
export type TransferIndex = ReturnType<typeof buildTransferIndex>

function sourceOfSavingsIncome(tx: FlowTx, index: TransferIndex): FlowTx | null {
  if (tx.transferPairId) {
    const leg = index.expenseByPair.get(tx.transferPairId)
    if (leg && leg.id !== tx.id) return leg
  }
  if (tx.migrationSourceTransactionId) return index.byId.get(tx.migrationSourceTransactionId) ?? null
  return null
}

function savingsIncomeOf(tx: FlowTx, index: TransferIndex): FlowTx | null {
  if (tx.transferPairId) {
    const leg = index.incomeByPair.get(tx.transferPairId)
    if (leg && leg.id !== tx.id) return leg
  }
  return index.incomeBySource.get(tx.id) ?? null
}

export function classifyFlow(tx: FlowTx, scope: Set<string>, index: TransferIndex): FlowKind {
  const type = (tx.type || '').toUpperCase()
  if (type === 'INCOME') {
    const source = sourceOfSavingsIncome(tx, index)
    return source && scope.has(source.walletId) ? 'internal' : 'income'
  }
  if (type === 'EXPENSE') {
    const moved = !!tx.transferPairId || isSavingsTransaction({
      description: tx.description,
      categoryName: tx.category?.name,
      categoryType: tx.category?.type,
    })
    return moved ? 'saved' : 'expense'
  }
  return 'internal'
}

export type DateRange = { start: Date; end: Date }

export type FlowTotals = {
  income: number
  /** Consumption only (savings transfers excluded). */
  expense: number
  /** Moved into savings/investments during the range. */
  saved: number
  /** Change of the scope's balance over the range. */
  net: number
  /** (income - consumption) / income * 100; null without income. */
  savingsRate: number | null
  txCount: number
  /** Consumption by category, largest first. */
  byCategory: Array<{ name: string; amount: number }>
}

const inRange = (tx: FlowTx, range: DateRange | null) => {
  if (!range) return true
  const d = new Date(tx.date)
  return d >= range.start && d <= range.end
}

export function computeFlowTotals(
  txs: FlowTx[],
  scope: Set<string>,
  index: TransferIndex,
  range: DateRange | null
): FlowTotals {
  let income = 0
  let expense = 0
  let saved = 0
  let savedLeavingScope = 0
  let txCount = 0
  const cats = new Map<string, number>()

  for (const tx of txs) {
    if (!scope.has(tx.walletId) || !inRange(tx, range)) continue
    const amount = Math.abs(Number(tx.amount) || 0)
    const kind = classifyFlow(tx, scope, index)
    if (kind === 'internal') continue
    txCount += 1
    if (kind === 'income') income += amount
    else if (kind === 'expense') {
      expense += amount
      const name = tx.category?.name || 'Tanpa kategori'
      cats.set(name, (cats.get(name) || 0) + amount)
    } else {
      saved += amount
      const leg = savingsIncomeOf(tx, index)
      if (!leg || !scope.has(leg.walletId)) savedLeavingScope += amount
    }
  }

  return {
    income,
    expense,
    saved,
    net: income - expense - savedLeavingScope,
    savingsRate: income > 0 ? ((income - expense) / income) * 100 : null,
    txCount,
    byCategory: Array.from(cats, ([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount),
  }
}

// ---------------------------------------------------------------------------
// Periods
// ---------------------------------------------------------------------------

export type DashboardPeriod = 'all' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export const PERIOD_OPTIONS: Array<{ value: DashboardPeriod; label: string }> = [
  { value: 'monthly', label: 'Bulan Ini' },
  { value: 'weekly', label: '7 Hari Terakhir' },
  { value: 'daily', label: 'Hari Ini' },
  { value: 'quarterly', label: '3 Bulan Terakhir' },
  { value: 'yearly', label: 'Tahun Ini' },
  { value: 'all', label: 'Semua Waktu' },
]

export const PERIOD_LABEL: Record<DashboardPeriod, string> = Object.fromEntries(
  PERIOD_OPTIONS.map((o) => [o.value, o.label])
) as Record<DashboardPeriod, string>

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds())

/** Same day-of-month n months away, clamped to the month's length. */
export function addMonthsClamped(d: Date, n: number): Date {
  const first = new Date(d.getFullYear(), d.getMonth() + n, 1)
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  return new Date(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), last), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds())
}

/** Range for the selected period (null = all time). Ends at the end of today. */
export function periodRange(period: DashboardPeriod, now = new Date()): DateRange | null {
  const end = endOfDay(now)
  switch (period) {
    case 'daily': return { start: startOfDay(now), end }
    case 'weekly': return { start: startOfDay(addDays(now, -6)), end }
    case 'monthly': return { start: new Date(now.getFullYear(), now.getMonth(), 1), end }
    case 'quarterly': return { start: startOfDay(addMonthsClamped(now, -3)), end }
    case 'yearly': return { start: new Date(now.getFullYear(), 0, 1), end }
    default: return null
  }
}

/**
 * The same elapsed span one period earlier (e.g. 1–27 Sep for 1–27 Oct), so
 * a month in progress is compared fairly. null for "all time".
 */
export function previousPeriodRange(period: DashboardPeriod, now = new Date()): DateRange | null {
  const cur = periodRange(period, now)
  if (!cur) return null
  const shift = (d: Date) => {
    switch (period) {
      case 'daily': return addDays(d, -1)
      case 'weekly': return addDays(d, -7)
      case 'monthly': return addMonthsClamped(d, -1)
      case 'quarterly': return addMonthsClamped(d, -3)
      case 'yearly': return addMonthsClamped(d, -12)
      default: return d
    }
  }
  return { start: shift(cur.start), end: shift(cur.end) }
}

/** Short label for the comparison span, e.g. "1–27 Sep" (shown as "vs …"). */
export function previousPeriodLabel(period: DashboardPeriod, now = new Date()): string {
  const r = previousPeriodRange(period, now)
  if (!r) return ''
  const mon = (d: Date) => d.toLocaleString('id-ID', { month: 'short' })
  switch (period) {
    case 'daily': return 'kemarin'
    case 'weekly': return '7 hari sebelumnya'
    case 'monthly': return `1–${r.end.getDate()} ${mon(r.end)}`
    case 'quarterly': return `${r.start.getDate()} ${mon(r.start)}–${r.end.getDate()} ${mon(r.end)}`
    case 'yearly': return `periode sama ${r.start.getFullYear()}`
    default: return ''
  }
}

// ---------------------------------------------------------------------------
// Monthly history & pace
// ---------------------------------------------------------------------------

export type MonthlyFlow = {
  key: string
  label: string
  income: number
  expense: number
  saved: number
  /** True for the current, still-running month. */
  partial: boolean
}

export function monthlyFlows(
  txs: FlowTx[],
  scope: Set<string>,
  index: TransferIndex,
  months = 6,
  now = new Date()
): MonthlyFlow[] {
  const out: MonthlyFlow[] = []
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999)
    const t = computeFlowTotals(txs, scope, index, { start, end })
    out.push({
      key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
      label: start.toLocaleString('id-ID', { month: 'short' }),
      income: t.income,
      expense: t.expense,
      saved: t.saved,
      partial: i === 0,
    })
  }
  return out
}

/**
 * Average monthly (income - consumption) over the last `n` COMPLETE months that
 * have activity: what the user can realistically put toward goals per month.
 */
export function averageMonthlySurplus(history: MonthlyFlow[], n = 3): number | null {
  const complete = history.filter((m) => !m.partial && (m.income > 0 || m.expense > 0)).slice(-n)
  if (!complete.length) return null
  return complete.reduce((s, m) => s + (m.income - m.expense), 0) / complete.length
}

// ---------------------------------------------------------------------------
// Health score
// ---------------------------------------------------------------------------

export type HealthScore = {
  score: number | null
  label: 'Sehat' | 'Waspada' | 'Bahaya' | null
  reasons: string[]
}

/**
 * Transparent 0-100 score driven mainly by the saving rate (the old one
 * ignored it and showed 85 "Good" next to a 0.8% saving rate).
 */
export function computeHealthScore(input: {
  savingsRate: number | null
  net: number
  negativeWallets: number
  budgetUsage: number | null
  txCount: number
}): HealthScore {
  if (input.txCount < 5) return { score: null, label: null, reasons: [] }
  let score = 50
  const reasons: string[] = []
  const rate = input.savingsRate
  if (rate === null) reasons.push('Belum ada pemasukan')
  else {
    reasons.push(`Saving rate ${rate.toFixed(0)}%`)
    score += rate >= 20 ? 30 : rate >= 10 ? 20 : rate >= 0 ? 5 : -20
  }
  score += input.net >= 0 ? 10 : -10
  if (input.net < 0) reasons.push('Cashflow minus')
  if (input.negativeWallets > 0) {
    score -= 15
    reasons.push(`${input.negativeWallets} dompet minus`)
  }
  if (input.budgetUsage !== null) {
    if (input.budgetUsage > 100) { score -= 15; reasons.push('Budget jebol') }
    else if (input.budgetUsage > 90) { score -= 5; reasons.push(`Budget ${input.budgetUsage}%`) }
  }
  score = Math.max(0, Math.min(100, Math.round(score)))
  return { score, label: score >= 70 ? 'Sehat' : score >= 45 ? 'Waspada' : 'Bahaya', reasons }
}
