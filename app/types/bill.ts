// Bill Types for Bill Reminder & Due Date Tracker feature

export type BillStatus = 'UPCOMING' | 'DUE_SOON' | 'OVERDUE' | 'PAID'

export type BillFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'

export type ReminderStatus = 'PENDING' | 'SENT' | 'DISMISSED' | 'SNOOZED'

export interface BillInput {
  name: string
  amount: number
  dueDate: Date | string
  categoryId?: string
  walletId: string
  recurringTransactionId?: string
  reminderDays?: number[] // e.g., [1, 3, 7]
  notes?: string
  isRecurring?: boolean
  frequency?: BillFrequency
}

export interface Bill {
  id: string
  userId: string
  name: string
  amount: number
  dueDate: Date | string
  categoryId: string | null
  walletId: string
  recurringTransactionId: string | null
  reminderDays: number[]
  notes: string | null
  isRecurring: boolean
  frequency: BillFrequency | null
  isPaid: boolean
  paidDate: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
  // Computed field
  status?: BillStatus
  // Relations (optional, included when fetched with include)
  category?: {
    id: string
    name: string
    icon: string | null
    color: string | null
  } | null
  wallet?: {
    id: string
    name: string
  } | null
  recurringTransaction?: {
    id: string
    name: string
    frequency: string
  } | null
}

export interface BillPayment {
  id: string
  billId: string
  amount: number
  paidDate: Date | string
  dueDate: Date | string
  daysEarly: number // Positive = early, negative = late
  notes: string | null
  createdAt: Date | string
}

export interface BillReminder {
  id: string
  billId: string
  userId: string
  reminderDate: Date | string
  daysBefore: number
  status: ReminderStatus
  snoozedUntil: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
  // Relations
  bill?: Bill
}

export interface BillFilters {
  status?: BillStatus | BillStatus[]
  categoryId?: string
  walletId?: string
  isPaid?: boolean
  dueDateFrom?: Date | string
  dueDateTo?: Date | string
  search?: string
}

export interface BillStats {
  totalMonthlyAmount: number
  totalBillsCount: number
  paidOnTimePercentage: number
  averageDaysBeforeDue: number
  upcomingTotal: number
  overdueTotal: number
  dueSoonTotal: number
  byCategory: Array<{
    categoryId: string | null
    categoryName: string
    totalAmount: number
    count: number
  }>
}

export interface BillWithPayments extends Bill {
  payments: BillPayment[]
}

export interface BillWithReminders extends Bill {
  reminders: BillReminder[]
}

// API Response types
export interface BillsResponse {
  bills: Bill[]
  total: number
}

export interface BillStatsResponse {
  stats: BillStats
}

export interface ImportResult {
  imported: number
  bills: Bill[]
}

// Constants
export const DEFAULT_REMINDER_DAYS = [1, 3, 7]

export const BILL_STATUS_CONFIG: Record<BillStatus, { label: string; color: string; bgColor: string }> = {
  UPCOMING: { label: 'Upcoming', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  DUE_SOON: { label: 'Due Soon', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  OVERDUE: { label: 'Overdue', color: 'text-red-600', bgColor: 'bg-red-100' },
  PAID: { label: 'Paid', color: 'text-green-600', bgColor: 'bg-green-100' },
}

export const FREQUENCY_OPTIONS: { value: BillFrequency; label: string }[] = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Bi-weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
]

export const REMINDER_DAY_OPTIONS = [
  { value: 1, label: '1 day before' },
  { value: 3, label: '3 days before' },
  { value: 7, label: '1 week before' },
  { value: 14, label: '2 weeks before' },
  { value: 30, label: '1 month before' },
]
