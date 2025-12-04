import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  calculateProjectedDate,
  calculateProgress,
  isGoalOnTrack,
  calculateConfidenceLevel,
  calculateRequiredSavingRate,
  calculateGap,
  calculateMonthsRemaining,
} from '../projection-service'

/**
 * **Feature: financial-goals-timeline, Property 4: Projected Date Calculation**
 * **Validates: Requirements 1.2**
 *
 * For any goal with current amount, target amount, and monthly savings,
 * projected date SHALL be calculated as current date plus
 * (targetAmount - currentAmount) / monthlySavings months.
 */
describe('Property 4: Projected Date Calculation', () => {
  it('should calculate projected date as currentDate + (remaining / monthlySavings) months', () => {
    fc.assert(
      fc.property(
        // Current amount (0 to 999,999)
        fc.integer({ min: 0, max: 999_999 }),
        // Target amount (must be > current)
        fc.integer({ min: 1, max: 1_000_000 }),
        // Monthly savings (positive, 1 to 100,000)
        fc.integer({ min: 1, max: 100_000 }),
        (current, targetDelta, monthlySavings) => {
          // Ensure target > current
          const target = current + targetDelta
          const fromDate = new Date('2024-01-01')

          const result = calculateProjectedDate(current, target, monthlySavings, fromDate)

          // Should return a date
          expect(result).not.toBeNull()

          if (result) {
            // Calculate expected months
            const remainingAmount = target - current
            const expectedMonths = remainingAmount / monthlySavings

            // Calculate actual months difference
            const actualMonths = calculateMonthsRemaining(fromDate, result)

            // The implementation adds whole months then fractional days
            // Allow 5% tolerance for rounding differences in month/day calculations
            const tolerance = Math.max(1.5, expectedMonths * 0.05)
            expect(Math.abs(actualMonths - expectedMonths)).toBeLessThanOrEqual(tolerance)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return fromDate when goal is already achieved', () => {
    fc.assert(
      fc.property(
        // Target amount
        fc.integer({ min: 1, max: 1_000_000 }),
        // Extra amount above target
        fc.integer({ min: 0, max: 100_000 }),
        // Monthly savings
        fc.integer({ min: 1, max: 100_000 }),
        (target, extra, monthlySavings) => {
          const current = target + extra
          const fromDate = new Date('2024-01-01')

          const result = calculateProjectedDate(current, target, monthlySavings, fromDate)

          expect(result).not.toBeNull()
          expect(result!.getTime()).toBe(fromDate.getTime())
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return null when monthly savings is zero or negative', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500_000 }),
        fc.integer({ min: 500_001, max: 1_000_000 }),
        fc.integer({ min: -100_000, max: 0 }),
        (current, target, monthlySavings) => {
          const result = calculateProjectedDate(current, target, monthlySavings)

          expect(result).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * **Feature: financial-goals-timeline, Property 5: Progress Calculation**
 * **Validates: Requirements 1.3**
 *
 * For any goal with current amount and target amount,
 * progress percentage SHALL equal (currentAmount / targetAmount) * 100.
 */
describe('Property 5: Progress Calculation', () => {
  it('should calculate progress as (current / target) * 100', () => {
    fc.assert(
      fc.property(
        // Current amount (0 to 1,000,000)
        fc.integer({ min: 0, max: 1_000_000 }),
        // Target amount (positive, 1 to 1,000,000)
        fc.integer({ min: 1, max: 1_000_000 }),
        (current, target) => {
          const result = calculateProgress(current, target)
          const expected = (current / target) * 100

          // Result should be clamped to 0-100
          const clampedExpected = Math.max(0, Math.min(100, expected))
          expect(result).toBeCloseTo(clampedExpected, 5)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 0 for zero or negative target', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: -1_000_000, max: 0 }),
        (current, target) => {
          const result = calculateProgress(current, target)
          expect(result).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 100 when current equals target', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        (amount) => {
          const result = calculateProgress(amount, amount)
          expect(result).toBe(100)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 0 when current is 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        (target) => {
          const result = calculateProgress(0, target)
          expect(result).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should cap at 100 when current exceeds target', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        (target, extra) => {
          const current = target + extra
          const result = calculateProgress(current, target)
          expect(result).toBe(100)
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * **Feature: financial-goals-timeline, Property 6: Behind Schedule Detection**
 * **Validates: Requirements 1.4**
 *
 * For any projected date and target date, a goal SHALL be marked behind schedule
 * if and only if projectedDate > targetDate.
 */
describe('Property 6: Behind Schedule Detection', () => {
  it('should return true (on track) when projected date <= target date', () => {
    fc.assert(
      fc.property(
        // Base date - use integer timestamps to avoid NaN dates
        fc.integer({ min: 1704067200000, max: 1924905600000 }), // 2024-01-01 to 2030-12-31
        // Days before target (0 to 365)
        fc.integer({ min: 0, max: 365 }),
        (targetTimestamp, daysBefore) => {
          const targetDate = new Date(targetTimestamp)
          const projectedDate = new Date(targetTimestamp)
          projectedDate.setDate(projectedDate.getDate() - daysBefore)

          const result = isGoalOnTrack(projectedDate, targetDate)
          expect(result).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return false (behind schedule) when projected date > target date', () => {
    fc.assert(
      fc.property(
        // Base date - use integer timestamps to avoid NaN dates
        fc.integer({ min: 1704067200000, max: 1893369600000 }), // 2024-01-01 to 2029-12-31
        // Days after target (1 to 365)
        fc.integer({ min: 1, max: 365 }),
        (targetTimestamp, daysAfter) => {
          const targetDate = new Date(targetTimestamp)
          const projectedDate = new Date(targetTimestamp)
          projectedDate.setDate(projectedDate.getDate() + daysAfter)

          const result = isGoalOnTrack(projectedDate, targetDate)
          expect(result).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return true when target date is null (no deadline)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1704067200000, max: 1924905600000 }),
        (timestamp) => {
          const projectedDate = new Date(timestamp)
          const result = isGoalOnTrack(projectedDate, null)
          expect(result).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return false when projected date is null (cannot project)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1704067200000, max: 1924905600000 }),
        (timestamp) => {
          const targetDate = new Date(timestamp)
          const result = isGoalOnTrack(null, targetDate)
          expect(result).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return true when both dates are null', () => {
    const result = isGoalOnTrack(null, null)
    expect(result).toBe(true)
  })
})


/**
 * **Feature: financial-goals-timeline, Property 7: Confidence Level Assignment**
 * **Validates: Requirements 1.5**
 *
 * For any saving rate consistency score, confidence SHALL be 'high' if consistency > 0.8,
 * 'medium' if > 0.5, otherwise 'low'.
 */
describe('Property 7: Confidence Level Assignment', () => {
  it('should return high when consistency > 0.8', () => {
    fc.assert(
      fc.property(
        // Use integer and divide to get float in range (0.81 to 1.0)
        fc.integer({ min: 81, max: 100 }),
        (intVal) => {
          const consistency = intVal / 100
          const result = calculateConfidenceLevel(consistency)
          expect(result).toBe('high')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return medium when consistency > 0.5 and <= 0.8', () => {
    fc.assert(
      fc.property(
        // Use integer and divide to get float in range (0.51 to 0.80)
        fc.integer({ min: 51, max: 80 }),
        (intVal) => {
          const consistency = intVal / 100
          const result = calculateConfidenceLevel(consistency)
          expect(result).toBe('medium')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return low when consistency <= 0.5', () => {
    fc.assert(
      fc.property(
        // Use integer and divide to get float in range (0 to 0.50)
        fc.integer({ min: 0, max: 50 }),
        (intVal) => {
          const consistency = intVal / 100
          const result = calculateConfidenceLevel(consistency)
          expect(result).toBe('low')
        }
      ),
      { numRuns: 100 }
    )
  })

  // Boundary tests
  it('should return medium at exactly 0.8', () => {
    expect(calculateConfidenceLevel(0.8)).toBe('medium')
  })

  it('should return low at exactly 0.5', () => {
    expect(calculateConfidenceLevel(0.5)).toBe('low')
  })

  it('should return high at exactly 1.0', () => {
    expect(calculateConfidenceLevel(1.0)).toBe('high')
  })

  it('should return low at exactly 0', () => {
    expect(calculateConfidenceLevel(0)).toBe('low')
  })
})


/**
 * **Feature: financial-goals-timeline, Property 8: Required Saving Rate Calculation**
 * **Validates: Requirements 2.4, 2.5**
 *
 * For any goal with remaining amount and months remaining,
 * required saving rate SHALL equal remainingAmount / monthsRemaining.
 */
describe('Property 8: Required Saving Rate Calculation', () => {
  it('should calculate required rate as remainingAmount / monthsRemaining', () => {
    fc.assert(
      fc.property(
        // Current amount
        fc.integer({ min: 0, max: 500_000 }),
        // Target amount (> current)
        fc.integer({ min: 1, max: 500_000 }),
        // Months until deadline (1 to 120)
        fc.integer({ min: 1, max: 120 }),
        (current, targetDelta, monthsUntilDeadline) => {
          const target = current + targetDelta
          const fromDate = new Date('2024-01-01')
          const deadline = new Date(fromDate)
          deadline.setMonth(deadline.getMonth() + monthsUntilDeadline)

          const result = calculateRequiredSavingRate(current, target, deadline, fromDate)

          // Calculate expected
          const remainingAmount = target - current
          const monthsRemaining = calculateMonthsRemaining(fromDate, deadline)
          const expected = remainingAmount / monthsRemaining

          expect(result).toBeCloseTo(expected, 2)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 0 when goal is already achieved', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 0, max: 100_000 }),
        (target, extra) => {
          const current = target + extra
          const deadline = new Date('2025-12-31')

          const result = calculateRequiredSavingRate(current, target, deadline)
          expect(result).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 0 when no deadline is set', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500_000 }),
        fc.integer({ min: 500_001, max: 1_000_000 }),
        (current, target) => {
          const result = calculateRequiredSavingRate(current, target, null)
          expect(result).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return Infinity when deadline has passed', () => {
    const current = 1000
    const target = 10000
    const pastDeadline = new Date('2020-01-01')
    const fromDate = new Date('2024-01-01')

    const result = calculateRequiredSavingRate(current, target, pastDeadline, fromDate)
    expect(result).toBe(Infinity)
  })
})

/**
 * Additional test for calculateGap
 */
describe('Calculate Gap', () => {
  it('should calculate gap as requiredRate - currentRate', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100_000, noNaN: true }),
        fc.float({ min: 0, max: 100_000, noNaN: true }),
        (currentRate, requiredRate) => {
          const result = calculateGap(currentRate, requiredRate)
          expect(result).toBeCloseTo(requiredRate - currentRate, 5)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return positive gap when required > current', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 50_000, noNaN: true }),
        fc.float({ min: 1, max: 50_000, noNaN: true }),
        (currentRate, extra) => {
          const requiredRate = currentRate + extra
          const result = calculateGap(currentRate, requiredRate)
          expect(result).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return negative gap when current > required', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1, max: 50_000, noNaN: true }),
        fc.float({ min: 1, max: 50_000, noNaN: true }),
        (requiredRate, extra) => {
          const currentRate = requiredRate + extra
          const result = calculateGap(currentRate, requiredRate)
          expect(result).toBeLessThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 0 when rates are equal', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100_000, noNaN: true }),
        (rate) => {
          const result = calculateGap(rate, rate)
          expect(result).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})
