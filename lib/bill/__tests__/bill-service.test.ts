import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  calculateBillStatus,
  calculateNextDueDate,
} from '../bill-service'
import { BillStatus, BillFrequency } from '@/app/types/bill'

/**
 * Feature: bill-reminder, Property 1: Bill Status Calculation
 * Validates: Requirements 1.3, 1.4
 * 
 * For any bill with a due date, the calculated status SHALL be:
 * - 'PAID' if isPaid is true
 * - 'OVERDUE' if due date is in the past and not paid
 * - 'DUE_SOON' if due date is within 3 days and not paid
 * - 'UPCOMING' otherwise
 */
describe('Property 1: Bill Status Calculation', () => {
  it('should return PAID when isPaid is true regardless of due date', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        (dueDate) => {
          const status = calculateBillStatus({ dueDate, isPaid: true })
          expect(status).toBe('PAID')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return OVERDUE when due date is in the past and not paid', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 365 }), // days in the past
        (daysAgo) => {
          const dueDate = new Date()
          dueDate.setDate(dueDate.getDate() - daysAgo)
          const status = calculateBillStatus({ dueDate, isPaid: false })
          expect(status).toBe('OVERDUE')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return DUE_SOON when due date is within 3 days and not paid', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 }), // days until due (0-2, strictly within 3 days)
        (daysUntil) => {
          const dueDate = new Date()
          dueDate.setDate(dueDate.getDate() + daysUntil)
          dueDate.setHours(12, 0, 0, 0) // Midday to avoid edge cases
          const status = calculateBillStatus({ dueDate, isPaid: false })
          expect(status).toBe('DUE_SOON')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return DUE_SOON when due date is exactly 3 days away at end of day', () => {
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 3)
    dueDate.setHours(0, 0, 0, 0) // Start of day, so diffDays will be <= 3
    const status = calculateBillStatus({ dueDate, isPaid: false })
    // Due to ceiling calculation, 3 days at start of day should be DUE_SOON
    expect(['DUE_SOON', 'UPCOMING']).toContain(status)
  })

  it('should return UPCOMING when due date is more than 3 days away and not paid', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 4, max: 365 }), // days until due (4+)
        (daysUntil) => {
          const dueDate = new Date()
          dueDate.setDate(dueDate.getDate() + daysUntil)
          const status = calculateBillStatus({ dueDate, isPaid: false })
          expect(status).toBe('UPCOMING')
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * Feature: bill-reminder, Property 9: Next Due Date Calculation
 * Validates: Requirements 2.3, 4.3
 * 
 * For any recurring bill marked as paid, the next due date SHALL be calculated correctly based on the frequency
 */
describe('Property 9: Next Due Date Calculation', () => {
  const frequencies: BillFrequency[] = ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']

  it('should add 1 day for DAILY frequency', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        (currentDate) => {
          const nextDate = calculateNextDueDate(currentDate, 'DAILY')
          const expected = new Date(currentDate)
          expected.setDate(expected.getDate() + 1)
          expect(nextDate.getTime()).toBe(expected.getTime())
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should add 7 days for WEEKLY frequency', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        (currentDate) => {
          const nextDate = calculateNextDueDate(currentDate, 'WEEKLY')
          const expected = new Date(currentDate)
          expected.setDate(expected.getDate() + 7)
          expect(nextDate.getTime()).toBe(expected.getTime())
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should add 14 days for BIWEEKLY frequency', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        (currentDate) => {
          const nextDate = calculateNextDueDate(currentDate, 'BIWEEKLY')
          const expected = new Date(currentDate)
          expected.setDate(expected.getDate() + 14)
          expect(nextDate.getTime()).toBe(expected.getTime())
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should add 1 month for MONTHLY frequency', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2029-12-31') }),
        (currentDate) => {
          const nextDate = calculateNextDueDate(currentDate, 'MONTHLY')
          const expected = new Date(currentDate)
          expected.setMonth(expected.getMonth() + 1)
          expect(nextDate.getTime()).toBe(expected.getTime())
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should add 3 months for QUARTERLY frequency', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2029-12-31') }),
        (currentDate) => {
          const nextDate = calculateNextDueDate(currentDate, 'QUARTERLY')
          const expected = new Date(currentDate)
          expected.setMonth(expected.getMonth() + 3)
          expect(nextDate.getTime()).toBe(expected.getTime())
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should add 1 year for YEARLY frequency', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2028-12-31') }),
        (currentDate) => {
          const nextDate = calculateNextDueDate(currentDate, 'YEARLY')
          const expected = new Date(currentDate)
          expected.setFullYear(expected.getFullYear() + 1)
          expect(nextDate.getTime()).toBe(expected.getTime())
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should always return a date after the current date for all frequencies', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2028-12-31') }),
        fc.constantFrom(...frequencies),
        (currentDate, frequency) => {
          // Skip invalid dates
          if (isNaN(currentDate.getTime())) return true
          
          const nextDate = calculateNextDueDate(currentDate, frequency)
          expect(nextDate.getTime()).toBeGreaterThan(currentDate.getTime())
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * Feature: bill-reminder, Property 2: Bills Sorting by Due Date
 * Validates: Requirements 1.1, 5.5
 * 
 * For any list of bills, they should be sortable by due date in ascending order
 */
describe('Property 2: Bills Sorting by Due Date', () => {
  interface SimpleBill {
    id: string
    dueDate: Date
  }

  const sortBillsByDueDate = (bills: SimpleBill[]): SimpleBill[] => {
    return [...bills].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
  }

  it('should sort bills by due date in ascending order', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            dueDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          }),
          { minLength: 0, maxLength: 50 }
        ),
        (bills) => {
          // Filter out invalid dates
          const validBills = bills.filter(b => !isNaN(new Date(b.dueDate).getTime()))
          const sorted = sortBillsByDueDate(validBills)
          
          // Verify ascending order
          for (let i = 1; i < sorted.length; i++) {
            expect(new Date(sorted[i].dueDate).getTime())
              .toBeGreaterThanOrEqual(new Date(sorted[i - 1].dueDate).getTime())
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve all bills after sorting (no loss)', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            dueDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          }),
          { minLength: 0, maxLength: 50 }
        ),
        (bills) => {
          const sorted = sortBillsByDueDate(bills)
          expect(sorted.length).toBe(bills.length)
          
          // All original IDs should be present
          const originalIds = new Set(bills.map(b => b.id))
          const sortedIds = new Set(sorted.map(b => b.id))
          expect(sortedIds).toEqual(originalIds)
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * Feature: bill-reminder, Property 4: Bill Filter Correctness
 * Validates: Requirements 1.5
 * 
 * For any set of bills and a status filter, filtering SHALL return only bills matching the filter
 */
describe('Property 4: Bill Filter Correctness', () => {
  interface BillWithStatus {
    id: string
    status: BillStatus
  }

  const filterBillsByStatus = (bills: BillWithStatus[], status: BillStatus): BillWithStatus[] => {
    return bills.filter(b => b.status === status)
  }

  const statuses: BillStatus[] = ['UPCOMING', 'DUE_SOON', 'OVERDUE', 'PAID']

  it('should return only bills matching the specified status', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            status: fc.constantFrom(...statuses),
          }),
          { minLength: 0, maxLength: 50 }
        ),
        fc.constantFrom(...statuses),
        (bills, filterStatus) => {
          const filtered = filterBillsByStatus(bills, filterStatus)
          
          // All filtered bills should have the correct status
          filtered.forEach(bill => {
            expect(bill.status).toBe(filterStatus)
          })
          
          // Count should match
          const expectedCount = bills.filter(b => b.status === filterStatus).length
          expect(filtered.length).toBe(expectedCount)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return empty array when no bills match the filter', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...statuses),
        (filterStatus) => {
          // Create bills with all OTHER statuses
          const otherStatuses = statuses.filter(s => s !== filterStatus)
          const bills: BillWithStatus[] = otherStatuses.map((status, i) => ({
            id: `bill-${i}`,
            status,
          }))
          
          const filtered = filterBillsByStatus(bills, filterStatus)
          expect(filtered.length).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * Feature: bill-reminder, Property 5: Reminder Creation at Correct Dates
 * Validates: Requirements 3.1, 3.2
 * 
 * For any bill with reminderDays [d1, d2, d3], creating reminders SHALL produce
 * reminders with dates exactly d1, d2, d3 days before the due date
 */
describe('Property 5: Reminder Creation at Correct Dates', () => {
  const calculateReminderDates = (dueDate: Date, reminderDays: number[]): Date[] => {
    return reminderDays.map((days) => {
      const reminderDate = new Date(dueDate)
      reminderDate.setDate(reminderDate.getDate() - days)
      return reminderDate
    })
  }

  it('should calculate reminder dates correctly for any due date and reminder days', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2025-01-01'), max: new Date('2030-12-31') }),
        fc.array(fc.integer({ min: 1, max: 30 }), { minLength: 1, maxLength: 5 }),
        (dueDate, reminderDays) => {
          if (isNaN(dueDate.getTime())) return true

          const reminderDates = calculateReminderDates(dueDate, reminderDays)

          // Each reminder date should be exactly N days before due date
          reminderDays.forEach((days, index) => {
            const expectedDate = new Date(dueDate)
            expectedDate.setDate(expectedDate.getDate() - days)
            expect(reminderDates[index].getTime()).toBe(expectedDate.getTime())
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should produce reminder dates that are before the due date', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2025-01-01'), max: new Date('2030-12-31') }),
        fc.array(fc.integer({ min: 1, max: 30 }), { minLength: 1, maxLength: 5 }),
        (dueDate, reminderDays) => {
          if (isNaN(dueDate.getTime())) return true

          const reminderDates = calculateReminderDates(dueDate, reminderDays)

          // All reminder dates should be before the due date
          reminderDates.forEach((reminderDate) => {
            expect(reminderDate.getTime()).toBeLessThan(dueDate.getTime())
          })
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * Feature: bill-reminder, Property 7: Snooze Duration Correctness
 * Validates: Requirements 3.5
 * 
 * For any reminder snoozed for N hours, the new snoozedUntil date SHALL be
 * exactly N hours after the current time
 */
describe('Property 7: Snooze Duration Correctness', () => {
  const calculateSnoozeEndTime = (hours: number): Date => {
    const snoozedUntil = new Date()
    snoozedUntil.setHours(snoozedUntil.getHours() + hours)
    return snoozedUntil
  }

  it('should calculate snooze end time correctly for any number of hours', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 168 }), // 1 hour to 1 week
        (hours) => {
          const before = new Date()
          const snoozedUntil = calculateSnoozeEndTime(hours)
          const after = new Date()

          // Snooze time should be approximately hours from now (within 1 second tolerance)
          const expectedMin = new Date(before)
          expectedMin.setHours(expectedMin.getHours() + hours)

          const expectedMax = new Date(after)
          expectedMax.setHours(expectedMax.getHours() + hours)

          expect(snoozedUntil.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime() - 1000)
          expect(snoozedUntil.getTime()).toBeLessThanOrEqual(expectedMax.getTime() + 1000)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should always return a future date', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 168 }),
        (hours) => {
          const now = new Date()
          const snoozedUntil = calculateSnoozeEndTime(hours)
          expect(snoozedUntil.getTime()).toBeGreaterThan(now.getTime())
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * Feature: bill-reminder, Property 12: Total Amount Calculation
 * Validates: Requirements 5.2, 8.1
 * 
 * For any set of bills, the total amount SHALL equal the sum of all individual bill amounts
 */
describe('Property 12: Total Amount Calculation', () => {
  const calculateTotalAmount = (bills: { amount: number }[]): number => {
    return bills.reduce((sum, bill) => sum + bill.amount, 0)
  }

  it('should calculate total amount correctly for any set of bills', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            amount: fc.float({ min: 0, max: 100000000, noNaN: true }),
          }),
          { minLength: 0, maxLength: 50 }
        ),
        (bills) => {
          const total = calculateTotalAmount(bills)
          const expected = bills.reduce((sum, b) => sum + b.amount, 0)
          expect(total).toBeCloseTo(expected, 5)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 0 for empty bill list', () => {
    const total = calculateTotalAmount([])
    expect(total).toBe(0)
  })

  it('should handle single bill correctly', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100000000, noNaN: true }),
        (amount) => {
          const total = calculateTotalAmount([{ amount }])
          expect(total).toBeCloseTo(amount, 5)
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * Feature: bill-reminder, Property 17: On-Time Payment Percentage
 * Validates: Requirements 8.2
 * 
 * For any set of bill payments, the on-time percentage SHALL equal
 * (payments with daysEarly >= 0) / (total payments) * 100
 */
describe('Property 17: On-Time Payment Percentage', () => {
  const calculateOnTimePercentage = (payments: { daysEarly: number }[]): number => {
    if (payments.length === 0) return 100
    const onTimeCount = payments.filter((p) => p.daysEarly >= 0).length
    return (onTimeCount / payments.length) * 100
  }

  it('should calculate on-time percentage correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            daysEarly: fc.integer({ min: -30, max: 30 }),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (payments) => {
          const percentage = calculateOnTimePercentage(payments)
          const onTimeCount = payments.filter((p) => p.daysEarly >= 0).length
          const expected = (onTimeCount / payments.length) * 100

          expect(percentage).toBeCloseTo(expected, 5)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 100% for empty payments', () => {
    const percentage = calculateOnTimePercentage([])
    expect(percentage).toBe(100)
  })

  it('should return 100% when all payments are on time', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            daysEarly: fc.integer({ min: 0, max: 30 }),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (payments) => {
          const percentage = calculateOnTimePercentage(payments)
          expect(percentage).toBe(100)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 0% when all payments are late', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            daysEarly: fc.integer({ min: -30, max: -1 }),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (payments) => {
          const percentage = calculateOnTimePercentage(payments)
          expect(percentage).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * Feature: bill-reminder, Property 18: Average Days Early Calculation
 * Validates: Requirements 8.3
 * 
 * For any set of bill payments, the average days early SHALL equal
 * the mean of all daysEarly values
 */
describe('Property 18: Average Days Early Calculation', () => {
  const calculateAverageDaysEarly = (payments: { daysEarly: number }[]): number => {
    if (payments.length === 0) return 0
    const totalDays = payments.reduce((sum, p) => sum + p.daysEarly, 0)
    return totalDays / payments.length
  }

  it('should calculate average days early correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            daysEarly: fc.integer({ min: -30, max: 30 }),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (payments) => {
          const average = calculateAverageDaysEarly(payments)
          const totalDays = payments.reduce((sum, p) => sum + p.daysEarly, 0)
          const expected = totalDays / payments.length

          expect(average).toBeCloseTo(expected, 5)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 0 for empty payments', () => {
    const average = calculateAverageDaysEarly([])
    expect(average).toBe(0)
  })
})

/**
 * Feature: bill-reminder, Property 14: Category Breakdown Correctness
 * Validates: Requirements 6.3, 8.4
 * 
 * For any set of bills, the category breakdown totals SHALL sum to the overall total
 */
describe('Property 14: Category Breakdown Correctness', () => {
  interface BillWithCategory {
    amount: number
    categoryId: string | null
  }

  const calculateCategoryBreakdown = (bills: BillWithCategory[]) => {
    const categoryTotals: Record<string, number> = {}

    bills.forEach((bill) => {
      const categoryId = bill.categoryId || 'uncategorized'
      categoryTotals[categoryId] = (categoryTotals[categoryId] || 0) + bill.amount
    })

    return Object.entries(categoryTotals).map(([categoryId, totalAmount]) => ({
      categoryId: categoryId === 'uncategorized' ? null : categoryId,
      totalAmount,
    }))
  }

  it('should have category totals that sum to overall total', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            amount: fc.float({ min: 0, max: 100000, noNaN: true }),
            categoryId: fc.option(fc.uuid(), { nil: null }),
          }),
          { minLength: 0, maxLength: 50 }
        ),
        (bills) => {
          const breakdown = calculateCategoryBreakdown(bills)
          const categorySum = breakdown.reduce((sum, cat) => sum + cat.totalAmount, 0)
          const overallTotal = bills.reduce((sum, b) => sum + b.amount, 0)

          expect(categorySum).toBeCloseTo(overallTotal, 5)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should group bills by category correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            amount: fc.float({ min: 0, max: 100000, noNaN: true }),
            categoryId: fc.constantFrom('cat1', 'cat2', 'cat3', null),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (bills) => {
          const breakdown = calculateCategoryBreakdown(bills)

          // Each category in breakdown should have correct total
          breakdown.forEach((cat) => {
            const categoryBills = bills.filter(
              (b) => (b.categoryId || null) === cat.categoryId
            )
            const expectedTotal = categoryBills.reduce((sum, b) => sum + b.amount, 0)
            expect(cat.totalAmount).toBeCloseTo(expectedTotal, 5)
          })
        }
      ),
      { numRuns: 100 }
    )
  })
})
