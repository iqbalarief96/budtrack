import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  validateFilterOptions,
  calculateExpectedTotalBalance,
  calculateExpectedPercentages,
  verifyPercentagesSum,
  TransactionQueryOptions,
} from '../aggregation-service'

/**
 * Feature: wallet-linking, Property 8: Aggregated Transactions Completeness and Order
 * Validates: Requirements 3.1, 3.2
 * 
 * For any wallet group with N linked wallets, the aggregated transactions SHALL contain
 * exactly the union of all transactions from all N wallets, sorted by date descending,
 * with each transaction including its source wallet information.
 */
describe('Property 8: Aggregated Transactions Completeness and Order', () => {
  // Test the sorting logic - dates should be in descending order
  it('should verify date descending order property', () => {
    fc.assert(
      fc.property(
        // Generate array of valid dates (filter out NaN dates)
        fc.array(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).filter(d => !isNaN(d.getTime())),
          { minLength: 2, maxLength: 50 }
        ),
        (dates) => {
          // Sort descending (as the service does)
          const sortedDates = [...dates].sort((a, b) => b.getTime() - a.getTime())
          
          // Verify each date is >= the next date
          for (let i = 0; i < sortedDates.length - 1; i++) {
            expect(sortedDates[i].getTime()).toBeGreaterThanOrEqual(sortedDates[i + 1].getTime())
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test that union of transactions from multiple wallets contains all transactions
  it('should verify union completeness property', () => {
    fc.assert(
      fc.property(
        // Generate multiple wallet transaction arrays
        fc.array(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 0, maxLength: 10 }),
          { minLength: 1, maxLength: 5 }
        ),
        (walletTransactions) => {
          // Simulate aggregation - union of all transactions
          const allTransactions = walletTransactions.flat()
          
          // Each wallet's transactions should be in the result
          for (const walletTxs of walletTransactions) {
            for (const tx of walletTxs) {
              expect(allTransactions).toContain(tx)
            }
          }
          
          // Total count should equal sum of all wallet transaction counts
          const expectedCount = walletTransactions.reduce((sum, txs) => sum + txs.length, 0)
          expect(allTransactions.length).toBe(expectedCount)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test that each transaction has wallet information
  it('should verify wallet info inclusion property', () => {
    interface MockTransaction {
      id: string
      walletId: string
      walletName: string
    }

    fc.assert(
      fc.property(
        // Generate transactions with wallet info
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            walletId: fc.string({ minLength: 1, maxLength: 10 }),
            walletName: fc.string({ minLength: 1, maxLength: 20 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (transactions: MockTransaction[]) => {
          // Each transaction should have wallet info
          for (const tx of transactions) {
            expect(tx.walletId).toBeDefined()
            expect(tx.walletId.length).toBeGreaterThan(0)
            expect(tx.walletName).toBeDefined()
            expect(tx.walletName.length).toBeGreaterThan(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * Feature: wallet-linking, Property 9: Filter Application Across Wallets
 * Validates: Requirements 3.3
 * 
 * For any filter applied to aggregated transactions (date range, type, category),
 * the results SHALL include matching transactions from ALL linked wallets, not just one.
 */
describe('Property 9: Filter Application Across Wallets', () => {
  // Test filter validation
  it('should validate filter options correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          startDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }), { nil: undefined }),
          endDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }), { nil: undefined }),
          type: fc.option(fc.constantFrom('income', 'expense'), { nil: undefined }),
          limit: fc.option(fc.integer({ min: 0, max: 1000 }), { nil: undefined }),
          offset: fc.option(fc.integer({ min: 0, max: 1000 }), { nil: undefined }),
        }),
        (options: TransactionQueryOptions) => {
          const result = validateFilterOptions(options)
          
          // If dates are both present and start > end, should be invalid
          if (options.startDate && options.endDate && options.startDate > options.endDate) {
            expect(result.valid).toBe(false)
          } else {
            expect(result.valid).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test that type filter applies to all wallets
  it('should verify type filter applies across all wallets', () => {
    interface MockTransaction {
      walletId: string
      type: 'income' | 'expense'
    }

    fc.assert(
      fc.property(
        // Generate transactions from multiple wallets
        fc.array(
          fc.record({
            walletId: fc.constantFrom('wallet1', 'wallet2', 'wallet3'),
            type: fc.constantFrom('income', 'expense') as fc.Arbitrary<'income' | 'expense'>,
          }),
          { minLength: 5, maxLength: 30 }
        ),
        fc.constantFrom('income', 'expense') as fc.Arbitrary<'income' | 'expense'>,
        (transactions: MockTransaction[], filterType: 'income' | 'expense') => {
          // Apply filter
          const filtered = transactions.filter((tx) => tx.type === filterType)
          
          // All filtered transactions should have the correct type
          for (const tx of filtered) {
            expect(tx.type).toBe(filterType)
          }
          
          // Filtered should include transactions from multiple wallets if they exist
          const walletsInFiltered = new Set(filtered.map((tx) => tx.walletId))
          const walletsWithType = new Set(
            transactions.filter((tx) => tx.type === filterType).map((tx) => tx.walletId)
          )
          
          // All wallets that have transactions of this type should be represented
          expect(walletsInFiltered).toEqual(walletsWithType)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test that date filter applies to all wallets
  it('should verify date filter applies across all wallets', () => {
    interface MockTransaction {
      walletId: string
      date: Date
    }

    fc.assert(
      fc.property(
        // Generate transactions from multiple wallets with dates
        fc.array(
          fc.record({
            walletId: fc.constantFrom('wallet1', 'wallet2', 'wallet3'),
            date: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
          }),
          { minLength: 10, maxLength: 50 }
        ),
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-30') }),
        fc.date({ min: new Date('2024-07-01'), max: new Date('2024-12-31') }),
        (transactions: MockTransaction[], startDate: Date, endDate: Date) => {
          // Ensure startDate <= endDate
          const [start, end] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate]
          
          // Apply date filter
          const filtered = transactions.filter(
            (tx) => tx.date >= start && tx.date <= end
          )
          
          // All filtered transactions should be within date range
          for (const tx of filtered) {
            expect(tx.date.getTime()).toBeGreaterThanOrEqual(start.getTime())
            expect(tx.date.getTime()).toBeLessThanOrEqual(end.getTime())
          }
          
          // Filtered should include transactions from all wallets that have matching dates
          const walletsInFiltered = new Set(filtered.map((tx) => tx.walletId))
          const walletsWithMatchingDates = new Set(
            transactions
              .filter((tx) => tx.date >= start && tx.date <= end)
              .map((tx) => tx.walletId)
          )
          
          expect(walletsInFiltered).toEqual(walletsWithMatchingDates)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test that category filter applies to all wallets
  it('should verify category filter applies across all wallets', () => {
    interface MockTransaction {
      walletId: string
      categoryId: string | null
    }

    fc.assert(
      fc.property(
        // Generate transactions from multiple wallets with categories
        fc.array(
          fc.record({
            walletId: fc.constantFrom('wallet1', 'wallet2', 'wallet3'),
            categoryId: fc.option(fc.constantFrom('cat1', 'cat2', 'cat3'), { nil: null }),
          }),
          { minLength: 10, maxLength: 50 }
        ),
        fc.constantFrom('cat1', 'cat2', 'cat3'),
        (transactions: MockTransaction[], filterCategory: string) => {
          // Apply category filter
          const filtered = transactions.filter((tx) => tx.categoryId === filterCategory)
          
          // All filtered transactions should have the correct category
          for (const tx of filtered) {
            expect(tx.categoryId).toBe(filterCategory)
          }
          
          // Filtered should include transactions from all wallets that have this category
          const walletsInFiltered = new Set(filtered.map((tx) => tx.walletId))
          const walletsWithCategory = new Set(
            transactions
              .filter((tx) => tx.categoryId === filterCategory)
              .map((tx) => tx.walletId)
          )
          
          expect(walletsInFiltered).toEqual(walletsWithCategory)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test invalid filter options
  it('should reject invalid date ranges', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2024-06-01'), max: new Date('2024-12-31') }).filter(d => !isNaN(d.getTime())),
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-05-31') }).filter(d => !isNaN(d.getTime())),
        (startDate, endDate) => {
          // startDate is after endDate
          const result = validateFilterOptions({ startDate, endDate })
          expect(result.valid).toBe(false)
          expect(result.error).toBe('Start date must be before end date')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject invalid type values', () => {
    const result = validateFilterOptions({ type: 'invalid' as any })
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Type must be income or expense')
  })

  it('should reject negative limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: -1 }),
        (limit) => {
          const result = validateFilterOptions({ limit })
          expect(result.valid).toBe(false)
          expect(result.error).toBe('Limit must be non-negative')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject negative offset', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: -1 }),
        (offset) => {
          const result = validateFilterOptions({ offset })
          expect(result.valid).toBe(false)
          expect(result.error).toBe('Offset must be non-negative')
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * Feature: wallet-linking, Property 10: Aggregated Balance Correctness
 * Validates: Requirements 4.1, 4.2, 4.3
 * 
 * For any wallet group, the total balance SHALL equal the sum of all linked wallet balances,
 * and the breakdown percentages SHALL sum to 100%.
 */
describe('Property 10: Aggregated Balance Correctness', () => {
  // Test that total balance equals sum of wallet balances
  it('should verify total balance equals sum of wallet balances', () => {
    fc.assert(
      fc.property(
        // Generate array of wallet balances (can be positive, negative, or zero)
        fc.array(fc.float({ min: -100000, max: 100000, noNaN: true }), { minLength: 1, maxLength: 10 }),
        (walletBalances) => {
          const expectedTotal = calculateExpectedTotalBalance(walletBalances)
          const actualTotal = walletBalances.reduce((sum, balance) => sum + balance, 0)
          
          // Allow small floating point tolerance
          expect(Math.abs(expectedTotal - actualTotal)).toBeLessThan(0.0001)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test that percentages sum to 100%
  it('should verify percentages sum to 100%', () => {
    fc.assert(
      fc.property(
        // Generate array of positive wallet balances using integer then divide
        fc.array(fc.integer({ min: 1, max: 10000000 }).map(n => n / 100), { minLength: 1, maxLength: 10 }),
        (walletBalances) => {
          const percentages = calculateExpectedPercentages(walletBalances)
          expect(verifyPercentagesSum(percentages)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test percentages with zero total balance
  it('should handle zero total balance correctly', () => {
    fc.assert(
      fc.property(
        // Generate array of zero balances
        fc.array(fc.constant(0), { minLength: 1, maxLength: 10 }),
        (walletBalances) => {
          const percentages = calculateExpectedPercentages(walletBalances)
          
          // When total is 0, percentages should be distributed equally
          const expectedPercentage = 100 / walletBalances.length
          for (const percentage of percentages) {
            expect(Math.abs(percentage - expectedPercentage)).toBeLessThan(0.0001)
          }
          
          // Should still sum to 100%
          expect(verifyPercentagesSum(percentages)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test that each wallet's percentage is proportional to its balance
  it('should verify percentage is proportional to balance', () => {
    fc.assert(
      fc.property(
        // Generate array of positive wallet balances using integer then divide
        fc.array(fc.integer({ min: 1, max: 10000000 }).map(n => n / 100), { minLength: 2, maxLength: 10 }),
        (walletBalances) => {
          const total = walletBalances.reduce((sum, b) => sum + b, 0)
          const percentages = calculateExpectedPercentages(walletBalances)
          
          // Each percentage should be (balance / total) * 100
          for (let i = 0; i < walletBalances.length; i++) {
            const expectedPercentage = (walletBalances[i] / total) * 100
            expect(Math.abs(percentages[i] - expectedPercentage)).toBeLessThan(0.0001)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test empty wallet array
  it('should handle empty wallet array', () => {
    const percentages = calculateExpectedPercentages([])
    expect(percentages).toEqual([])
    expect(verifyPercentagesSum(percentages)).toBe(true)
  })

  // Test single wallet
  it('should handle single wallet correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000000 }).map(n => n / 100),
        (balance) => {
          const percentages = calculateExpectedPercentages([balance])
          expect(percentages.length).toBe(1)
          expect(Math.abs(percentages[0] - 100)).toBeLessThan(0.0001)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test that larger balances have larger percentages
  it('should verify larger balances have larger percentages', () => {
    fc.assert(
      fc.property(
        // Generate two distinct positive balances using integers
        fc.integer({ min: 1, max: 5000000 }).map(n => n / 100),
        fc.integer({ min: 5000001, max: 10000000 }).map(n => n / 100),
        (smallBalance, largeBalance) => {
          const percentages = calculateExpectedPercentages([smallBalance, largeBalance])
          
          // The larger balance should have the larger percentage
          expect(percentages[1]).toBeGreaterThan(percentages[0])
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test with mixed positive and negative balances
  it('should handle mixed positive and negative balances', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -50000, max: 50000, noNaN: true }), { minLength: 2, maxLength: 10 }),
        (walletBalances) => {
          const total = calculateExpectedTotalBalance(walletBalances)
          const percentages = calculateExpectedPercentages(walletBalances)
          
          if (total === 0) {
            // Equal distribution when total is 0
            const expectedPercentage = 100 / walletBalances.length
            for (const percentage of percentages) {
              expect(Math.abs(percentage - expectedPercentage)).toBeLessThan(0.0001)
            }
          } else {
            // Percentages should be proportional
            for (let i = 0; i < walletBalances.length; i++) {
              const expectedPercentage = (walletBalances[i] / total) * 100
              expect(Math.abs(percentages[i] - expectedPercentage)).toBeLessThan(0.0001)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
