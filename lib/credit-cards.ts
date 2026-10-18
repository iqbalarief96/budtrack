export const VALID_CREDIT_CARD_STATUSES = new Set(['active', 'paused', 'closed', 'archived'])
export const VALID_CREDIT_CARD_TRANSACTION_TYPES = new Set(['charge', 'payment', 'fee', 'adjustment', 'installment', 'refund', 'reversal'])

export function clampBillingDay(value: unknown, fallback = 1) {
  const day = Number.parseInt(String(value ?? fallback), 10)
  if (!Number.isFinite(day)) return fallback
  return Math.min(Math.max(day, 1), 31)
}

export function numberOrDefault(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function parseOptionalDate(value: unknown) {
  if (!value || typeof value !== 'string') return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function dateForDay(year: number, month: number, day: number) {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(day, lastDay))
}

export function getNextStatementDate(statementDay: number, now = new Date()) {
  const day = clampBillingDay(statementDay)
  let candidate = dateForDay(now.getFullYear(), now.getMonth(), day)
  candidate.setHours(23, 59, 59, 999)

  if (candidate < now) {
    candidate = dateForDay(now.getFullYear(), now.getMonth() + 1, day)
    candidate.setHours(23, 59, 59, 999)
  }

  return candidate
}

export function getNextDueDate(statementDay: number, dueDay: number, now = new Date()) {
  const nextStatement = getNextStatementDate(statementDay, now)
  const due = dateForDay(nextStatement.getFullYear(), nextStatement.getMonth(), clampBillingDay(dueDay))
  due.setHours(23, 59, 59, 999)

  if (due <= nextStatement) {
    const nextMonthDue = dateForDay(nextStatement.getFullYear(), nextStatement.getMonth() + 1, clampBillingDay(dueDay))
    nextMonthDue.setHours(23, 59, 59, 999)
    return nextMonthDue
  }

  return due
}

export function daysUntil(date: Date, now = new Date()) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

export function summarizeCreditCard(card: {
  creditLimit: number
  currentBalance: number
  statementDay: number
  dueDay: number
  minimumPaymentRate: number
}) {
  const utilization = card.creditLimit > 0 ? Math.min(999, (card.currentBalance / card.creditLimit) * 100) : 0
  const availableCredit = Math.max(0, card.creditLimit - card.currentBalance)
  const nextStatementDate = getNextStatementDate(card.statementDay)
  const nextDueDate = getNextDueDate(card.statementDay, card.dueDay)
  const minimumPayment = Math.max(0, Math.ceil(card.currentBalance * card.minimumPaymentRate))

  return {
    utilization,
    availableCredit,
    nextStatementDate,
    nextDueDate,
    daysUntilDue: daysUntil(nextDueDate),
    minimumPayment,
    isHighUtilization: utilization >= 80,
    isDueSoon: daysUntil(nextDueDate) <= 7,
  }
}

export function normalizeCreditCardPayload(body: any) {
  const status = typeof body.status === 'string' && VALID_CREDIT_CARD_STATUSES.has(body.status) ? body.status : 'active'
  const creditLimit = Math.max(0, numberOrDefault(body.creditLimit, 0))
  const currentBalance = Math.max(0, numberOrDefault(body.currentBalance, 0))
  const minimumPaymentRate = Math.min(Math.max(numberOrDefault(body.minimumPaymentRate, 0.03), 0), 1)

  return {
    walletId: body.walletId || null,
    name: String(body.name || '').trim(),
    issuer: body.issuer ? String(body.issuer).trim() : null,
    lastFour: body.lastFour ? String(body.lastFour).replace(/\D/g, '').slice(-4) : null,
    creditLimit,
    currentBalance,
    statementDay: clampBillingDay(body.statementDay, 20),
    dueDay: clampBillingDay(body.dueDay, 10),
    apr: body.apr === '' || body.apr === null || body.apr === undefined ? null : numberOrDefault(body.apr, 0),
    minimumPaymentRate,
    reminderDaysBefore: Math.max(0, Number.parseInt(String(body.reminderDaysBefore ?? 7), 10) || 7),
    status,
    notes: body.notes ? String(body.notes).trim() : null,
  }
}

export function normalizeCreditCardPatch(body: any) {
  const data: Record<string, unknown> = {}
  if ('walletId' in body) data.walletId = body.walletId || null
  if ('name' in body) data.name = String(body.name || '').trim()
  if ('issuer' in body) data.issuer = body.issuer ? String(body.issuer).trim() : null
  if ('lastFour' in body) data.lastFour = body.lastFour ? String(body.lastFour).replace(/\D/g, '').slice(-4) : null
  if ('creditLimit' in body) data.creditLimit = Math.max(0, numberOrDefault(body.creditLimit, 0))
  if ('currentBalance' in body) data.currentBalance = Math.max(0, numberOrDefault(body.currentBalance, 0))
  if ('statementDay' in body) data.statementDay = clampBillingDay(body.statementDay, 20)
  if ('dueDay' in body) data.dueDay = clampBillingDay(body.dueDay, 10)
  if ('apr' in body) data.apr = body.apr === '' || body.apr === null || body.apr === undefined ? null : numberOrDefault(body.apr, 0)
  if ('minimumPaymentRate' in body) data.minimumPaymentRate = Math.min(Math.max(numberOrDefault(body.minimumPaymentRate, 0.03), 0), 1)
  if ('reminderDaysBefore' in body) data.reminderDaysBefore = Math.max(0, Number.parseInt(String(body.reminderDaysBefore ?? 7), 10) || 7)
  if ('status' in body && VALID_CREDIT_CARD_STATUSES.has(String(body.status))) data.status = String(body.status)
  if ('notes' in body) data.notes = body.notes ? String(body.notes).trim() : null
  return data
}

export function transactionDelta(type: string, amount: number) {
  switch (type) {
    case 'payment':
    case 'refund':
    case 'reversal':
      return -Math.abs(amount)
    case 'adjustment':
      return amount
    case 'charge':
    case 'fee':
    case 'installment':
    default:
      return Math.abs(amount)
  }
}

/** Label UI untuk tipe transaksi (Bahasa Indonesia) */
export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  charge: 'Charge',
  payment: 'Payment',
  fee: 'Fee',
  adjustment: 'Adjustment',
  installment: 'Cicilan',
  refund: 'Refund',
  reversal: 'Reversal / Koreksi',
}

export const TRANSACTION_TYPE_OPTIONS = Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => ({ value, label }))
