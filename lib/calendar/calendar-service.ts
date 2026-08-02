export type CalendarItemKind = 'bill' | 'recurring' | 'goal' | 'shared_bill'

export type CalendarItem = {
  kind: CalendarItemKind
  id: string
  title: string
  amount: number
  date: string // YYYY-MM-DD (UTC)
  type: 'expense' | 'income' | 'goal'
  walletId?: string
  walletName?: string
  isOverdue?: boolean
}

export type CalendarItemLoose = {
  date: string
  [key: string]: unknown
}

const pad = (n: number) => String(n).padStart(2, '0')

export function toDateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export function parseMonthParam(
  param: string | null,
  now: Date = new Date()
): { year: number; month: number; start: Date; end: Date; label: string } {
  let year = now.getUTCFullYear()
  let month = now.getUTCMonth() + 1

  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [y, m] = param.split('-').map(Number)
    if (m >= 1 && m <= 12) {
      year = y
      month = m
    }
  }

  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 0)) // last day of month

  return { year, month, start, end, label: `${year}-${pad(month)}` }
}

export function buildMonthDates(year: number, month: number): string[] {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const dates: string[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(`${year}-${pad(month)}-${pad(d)}`)
  }
  return dates
}

/**
 * Step a date forward by a frequency. Mirrors the mapping in
 * lib/recurring-automation.ts but uses UTC methods so projections are
 * deterministic regardless of server timezone.
 */
export function stepDateByFrequency(date: Date, frequency: string): Date {
  const next = new Date(date)
  switch (frequency.toUpperCase()) {
    case 'DAILY':
      next.setUTCDate(next.getUTCDate() + 1)
      break
    case 'WEEKLY':
      next.setUTCDate(next.getUTCDate() + 7)
      break
    case 'BIWEEKLY':
      next.setUTCDate(next.getUTCDate() + 14)
      break
    case 'QUARTERLY':
      next.setUTCMonth(next.getUTCMonth() + 3)
      break
    case 'YEARLY':
      next.setUTCFullYear(next.getUTCFullYear() + 1)
      break
    case 'MONTHLY':
    default:
      next.setUTCMonth(next.getUTCMonth() + 1)
  }
  return next
}

export function projectRecurringIntoRange(
  startDate: Date,
  frequency: string,
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  const results: Date[] = []
  let cursor = new Date(startDate)
  while (cursor.getTime() <= rangeEnd.getTime()) {
    if (cursor.getTime() >= rangeStart.getTime()) {
      results.push(new Date(cursor))
    }
    cursor = stepDateByFrequency(cursor, frequency)
  }
  return results
}

export function groupItemsByDate<T extends CalendarItemLoose>(items: T[]): Record<string, T[]> {
  const grouped: Record<string, T[]> = {}
  for (const item of items) {
    if (!grouped[item.date]) grouped[item.date] = []
    grouped[item.date].push(item)
  }
  return grouped
}

export function isOverdue(dateStr: string, today: Date = new Date()): boolean {
  return dateStr < toDateKey(today)
}
