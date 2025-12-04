import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  calculateCategoryAverage,
  calculateTrend,
  compareMonths,
  getTopCategories,
  calculateMonthlySpending,
  calculateDayOfWeekPatterns,
  TransactionForAnalysis,
} from '../pattern-service'
import { SpendingPattern, MonthlySpending } from '@/app/types/spending-insights'

/**
 * Helper to generate a valid transaction for testing
 * Using integer cents to avoid 32-bit float issues with fast-check
 */
const transactionArbitrary = fc.record({
  id: fc.uuid(),
  amount: fc.integer({ min: 1, max: 10000000 }).map(cents => cents / 100), // 0.01 to 100000
  date: fc.date({ min: new Date('2023-01-01'), max: new Date('2024-12-31') }),
  categoryId: fc.option(fc.uuid(), { nil: null }),
})

/**
 * **Feature: spending-insights, Property 1: Category Average Calculation**
 * **Validates: Requirements 1.1**
 *
 * For any set of transactions in a category over N months,
 * the average spending SHALL equal the sum of all transaction amounts divided by N.
 */
describe('Property 1: Category Average Calculation', () => {
  it('should calculate average as sum of amounts divided by months', () => {
    fc.assert(
      fc.property(
        // Array of transaction amounts (1 to 50 transactions) - using integer cents
        fc.array(fc.integer({ min: 1, max: 10000000 }).map(c => c / 100), { minLength: 1, maxLength: 50 }),
        // Number of months (1 to 12)
        fc.integer({ min: 1, max: 12 }),
        (amounts, months) => {
          // Create transactions from amounts
          const transactions: TransactionForAnalysis[] = amounts.map((amount, i) => ({
            id: `tx-${i}`,
            amount,
            date: new Date('2024-01-15'),
            categoryId: 'cat-1',
          }))

          const result = calculateCategoryAverage(transactions, months)

          // Expected: sum of amounts / months
          const totalAmount = amounts.reduce((sum, a) => sum + Math.abs(a), 0)
          const expected = totalAmount / months

          expect(result).toBeCloseTo(expected, 5)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 0 when months is 0 or negative', () => {
    fc.assert(
      fc.property(
        fc.array(transactionArbitrary, { minLength: 1, maxLength: 10 }),
        fc.integer({ min: -10, max: 0 }),
        (transactions, months) => {
          const result = calculateCategoryAverage(transactions as TransactionForAnalysis[], months)
          expect(result).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 0 when transactions array is empty', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 12 }),
        (months) => {
          const result = calculateCategoryAverage([], months)
          expect(result).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle negative amounts by using absolute values', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 10000000 }).map(c => -c / 100), { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 1, max: 12 }),
        (negativeAmounts, months) => {
          const transactions: TransactionForAnalysis[] = negativeAmounts.map((amount, i) => ({
            id: `tx-${i}`,
            amount,
            date: new Date('2024-01-15'),
            categoryId: 'cat-1',
          }))

          const result = calculateCategoryAverage(transactions, months)

          // Should use absolute values
          const totalAmount = negativeAmounts.reduce((sum, a) => sum + Math.abs(a), 0)
          const expected = totalAmount / months

          expect(result).toBeCloseTo(expected, 5)
          expect(result).toBeGreaterThanOrEqual(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * **Feature: spending-insights, Property 2: Trend Detection Accuracy**
 * **Validates: Requirements 1.2**
 *
 * For any sequence of monthly spending values, trend detection SHALL correctly identify
 * increasing (last > first by >10%), decreasing (last < first by >10%), or stable patterns.
 */
describe('Property 2: Trend Detection Accuracy', () => {
  it('should detect increasing trend when last > first by more than 10%', () => {
    fc.assert(
      fc.property(
        // First amount (positive)
        fc.integer({ min: 100, max: 100000 }),
        // Increase percentage (> 10%)
        fc.integer({ min: 11, max: 200 }),
        // Number of months (2 to 12)
        fc.integer({ min: 2, max: 12 }),
        (firstAmount, increasePercent, numMonths) => {
          const lastAmount = firstAmount * (1 + increasePercent / 100)

          // Create monthly data with first and last values
          const monthlyData: MonthlySpending[] = []
          for (let i = 0; i < numMonths; i++) {
            const month = new Date(2024, i, 1)
            // Linear interpolation between first and last
            const amount = firstAmount + ((lastAmount - firstAmount) * i) / (numMonths - 1)
            monthlyData.push({ month, amount, transactionCount: 1 })
          }

          const result = calculateTrend(monthlyData)

          expect(result.direction).toBe('increasing')
          expect(result.percentage).toBeGreaterThan(10)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should detect decreasing trend when last < first by more than 10%', () => {
    fc.assert(
      fc.property(
        // First amount (positive)
        fc.integer({ min: 100, max: 100000 }),
        // Decrease percentage (> 10%)
        fc.integer({ min: 11, max: 90 }),
        // Number of months (2 to 12)
        fc.integer({ min: 2, max: 12 }),
        (firstAmount, decreasePercent, numMonths) => {
          const lastAmount = firstAmount * (1 - decreasePercent / 100)

          // Create monthly data with first and last values
          const monthlyData: MonthlySpending[] = []
          for (let i = 0; i < numMonths; i++) {
            const month = new Date(2024, i, 1)
            // Linear interpolation between first and last
            const amount = firstAmount + ((lastAmount - firstAmount) * i) / (numMonths - 1)
            monthlyData.push({ month, amount, transactionCount: 1 })
          }

          const result = calculateTrend(monthlyData)

          expect(result.direction).toBe('decreasing')
          expect(result.percentage).toBeGreaterThan(10)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should detect stable trend when change is within 10%', () => {
    fc.assert(
      fc.property(
        // First amount (positive)
        fc.integer({ min: 100, max: 100000 }),
        // Change percentage (-9 to 9 to avoid boundary issues)
        fc.integer({ min: -9, max: 9 }),
        // Number of months (2 to 12)
        fc.integer({ min: 2, max: 12 }),
        (firstAmount, changePercent, numMonths) => {
          const lastAmount = firstAmount * (1 + changePercent / 100)

          // Create monthly data with first and last values
          const monthlyData: MonthlySpending[] = []
          for (let i = 0; i < numMonths; i++) {
            const month = new Date(2024, i, 1)
            // Linear interpolation between first and last
            const amount = firstAmount + ((lastAmount - firstAmount) * i) / (numMonths - 1)
            monthlyData.push({ month, amount, transactionCount: 1 })
          }

          const result = calculateTrend(monthlyData)

          expect(result.direction).toBe('stable')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return stable at exactly 10% boundary', () => {
    // Test exact boundary case
    const monthlyData: MonthlySpending[] = [
      { month: new Date(2024, 0, 1), amount: 100, transactionCount: 1 },
      { month: new Date(2024, 1, 1), amount: 110, transactionCount: 1 },
    ]

    const result = calculateTrend(monthlyData)
    // Exactly 10% should be stable (not > 10%)
    expect(result.direction).toBe('stable')
  })

  it('should return stable with 0% when less than 2 data points', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100000 }),
        (amount) => {
          const monthlyData: MonthlySpending[] = [
            { month: new Date(2024, 0, 1), amount, transactionCount: 1 },
          ]

          const result = calculateTrend(monthlyData)

          expect(result.direction).toBe('stable')
          expect(result.percentage).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle empty array', () => {
    const result = calculateTrend([])
    expect(result.direction).toBe('stable')
    expect(result.percentage).toBe(0)
  })

  it('should handle first amount being 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100000 }),
        (lastAmount) => {
          const monthlyData: MonthlySpending[] = [
            { month: new Date(2024, 0, 1), amount: 0, transactionCount: 0 },
            { month: new Date(2024, 1, 1), amount: lastAmount, transactionCount: 1 },
          ]

          const result = calculateTrend(monthlyData)

          // When first is 0 and last > 0, should be increasing
          expect(result.direction).toBe('increasing')
          expect(result.percentage).toBe(100)
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * **Feature: spending-insights, Property 3: Month-over-Month Comparison**
 * **Validates: Requirements 1.3**
 *
 * For any two monthly totals, the percentage difference SHALL equal
 * ((current - previous) / |previous|) * 100.
 */
describe('Property 3: Month-over-Month Comparison', () => {
  it('should calculate percentage change as ((current - previous) / |previous|) * 100', () => {
    fc.assert(
      fc.property(
        // Current month amount (positive)
        fc.integer({ min: 1, max: 1000000 }),
        // Previous month amount (positive, non-zero)
        fc.integer({ min: 1, max: 1000000 }),
        (current, previous) => {
          const result = compareMonths(current, previous)

          // Expected difference
          const expectedDifference = current - previous
          // Expected percentage change
          const expectedPercentageChange = (expectedDifference / Math.abs(previous)) * 100

          expect(result.difference).toBe(expectedDifference)
          expect(result.percentageChange).toBeCloseTo(expectedPercentageChange, 5)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return positive percentage when current > previous', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500000 }),
        fc.integer({ min: 1, max: 500000 }),
        (previous, extra) => {
          const current = previous + extra
          const result = compareMonths(current, previous)

          expect(result.difference).toBeGreaterThan(0)
          expect(result.percentageChange).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return negative percentage when current < previous', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 1000000 }),
        fc.integer({ min: 1, max: 500000 }),
        (previous, reduction) => {
          // Ensure current is less than previous
          const current = Math.max(1, previous - reduction)
          if (current >= previous) return // Skip if not actually less

          const result = compareMonths(current, previous)

          expect(result.difference).toBeLessThan(0)
          expect(result.percentageChange).toBeLessThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 0 difference and percentage when current equals previous', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        (amount) => {
          const result = compareMonths(amount, amount)

          expect(result.difference).toBe(0)
          expect(result.percentageChange).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle previous being 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        (current) => {
          const result = compareMonths(current, 0)

          expect(result.difference).toBe(current)
          expect(result.percentageChange).toBe(100) // 100% increase from 0
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 0 when both current and previous are 0', () => {
    const result = compareMonths(0, 0)
    expect(result.difference).toBe(0)
    expect(result.percentageChange).toBe(0)
  })
})


/**
 * **Feature: spending-insights, Property 4: Top Categories Ordering**
 * **Validates: Requirements 1.4**
 *
 * For any set of category totals, the top N categories SHALL be returned
 * in descending order by amount.
 */
describe('Property 4: Top Categories Ordering', () => {
  /**
   * Helper to generate a spending pattern
   */
  const patternArbitrary = fc.record({
    categoryId: fc.uuid(),
    categoryName: fc.string({ minLength: 1, maxLength: 20 }),
    averageAmount: fc.integer({ min: 0, max: 1000000 }),
    trend: fc.constantFrom('increasing', 'decreasing', 'stable') as fc.Arbitrary<'increasing' | 'decreasing' | 'stable'>,
    trendPercentage: fc.integer({ min: 0, max: 100 }),
    monthlyData: fc.constant([]),
  })

  it('should return categories in descending order by averageAmount', () => {
    fc.assert(
      fc.property(
        // Array of patterns (1 to 20)
        fc.array(patternArbitrary, { minLength: 1, maxLength: 20 }),
        // Limit (1 to 10)
        fc.integer({ min: 1, max: 10 }),
        (patterns, limit) => {
          const result = getTopCategories(patterns as SpendingPattern[], limit)

          // Result should be in descending order
          for (let i = 1; i < result.length; i++) {
            expect(result[i - 1].averageAmount).toBeGreaterThanOrEqual(result[i].averageAmount)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return at most N categories', () => {
    fc.assert(
      fc.property(
        fc.array(patternArbitrary, { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 1, max: 10 }),
        (patterns, limit) => {
          const result = getTopCategories(patterns as SpendingPattern[], limit)

          expect(result.length).toBeLessThanOrEqual(limit)
          expect(result.length).toBeLessThanOrEqual(patterns.length)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return exactly min(N, patterns.length) categories', () => {
    fc.assert(
      fc.property(
        fc.array(patternArbitrary, { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 1, max: 10 }),
        (patterns, limit) => {
          const result = getTopCategories(patterns as SpendingPattern[], limit)

          const expectedLength = Math.min(limit, patterns.length)
          expect(result.length).toBe(expectedLength)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return empty array when limit is 0 or negative', () => {
    fc.assert(
      fc.property(
        fc.array(patternArbitrary, { minLength: 1, maxLength: 10 }),
        fc.integer({ min: -10, max: 0 }),
        (patterns, limit) => {
          const result = getTopCategories(patterns as SpendingPattern[], limit)
          expect(result).toEqual([])
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return empty array when patterns array is empty', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (limit) => {
          const result = getTopCategories([], limit)
          expect(result).toEqual([])
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should include the highest amount categories', () => {
    fc.assert(
      fc.property(
        // Generate patterns with distinct amounts
        fc.array(fc.integer({ min: 1, max: 1000000 }), { minLength: 5, maxLength: 20 }),
        fc.integer({ min: 1, max: 5 }),
        (amounts, limit) => {
          // Create patterns with unique amounts
          const patterns: SpendingPattern[] = amounts.map((amount, i) => ({
            categoryId: `cat-${i}`,
            categoryName: `Category ${i}`,
            averageAmount: amount,
            trend: 'stable' as const,
            trendPercentage: 0,
            monthlyData: [],
          }))

          const result = getTopCategories(patterns, limit)

          // Sort original amounts descending and take top N
          const sortedAmounts = [...amounts].sort((a, b) => b - a).slice(0, limit)

          // Result amounts should match top N sorted amounts
          const resultAmounts = result.map(p => p.averageAmount)
          expect(resultAmounts).toEqual(sortedAmounts)
        }
      ),
      { numRuns: 100 }
    )
  })
})
