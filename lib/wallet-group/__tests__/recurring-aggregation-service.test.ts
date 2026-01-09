import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  verifyAllRecurringHaveWalletInfo,
  verifyTotalRecurringIncome,
  verifyTotalRecurringExpense,
  verifyRecurringCountMatchesWalletSummaries,
  verifyWalletSummaryTotals,
  verifyAllWalletSummaryTotals,
  verifyUpcomingTransactionsInRange,
  verifyUpcomingTransactionsAreActive,
  calculateExpectedTotalRecurring,
  verifyAllWalletsRepresented,
  verifyValidTypes,
  AggregatedRecurringTransaction,
  WalletRecurringSummary,
} from '../recurring-aggregation-service'

/**
 * Feature: wallet-linking, Property 20: Aggregated Recurring Completeness
 * Validates: Requirements 13.1, 13.2, 13.3
 * 
 * For any wallet group, the aggregated recurring transactions SHALL contain
 * ALL recurring items from ALL linked wallets, with correct totals for income and expense.
 */
describe('Property 20: Aggregated Recurring Completeness', () => {
  // Generator for recurring transaction type
  const recurringTypeArb = fc.constantFrom('income', 'expense') as fc.Arbitrary<'income' | 'expense'>

  // Generator for frequency
  const frequencyArb = fc.constantFrom('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY')

  // Generator for aggregated recurring transaction
  const aggregatedRecurringArb = (walletId: string, walletName: string) =>
    fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      description: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: null }),
      amount: fc.integer({ min: 1, max: 10000000 }).map(n => n / 100),
      type: recurringTypeArb,
      frequency: frequencyArb,
      startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
      nextDate: fc.date({ min: new Date('2025-01-01'), max: new Date('2030-12-31') }),
      category: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: null }),
      isActive: fc.boolean(),
      walletId: fc.constant(walletId),
      walletName: fc.constant(walletName),
      walletColor: fc.option(fc.constantFrom('#ff0000', '#00ff00', '#0000ff'), { nil: null }),
    })


  // Test that all recurring transactions have wallet attribution (Requirement 13.2)
  it('should verify all recurring transactions have wallet attribution', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.uuid(),
            fc.string({ minLength: 1, maxLength: 20 })
          ).chain(([walletId, walletName]) =>
            fc.array(aggregatedRecurringArb(walletId, walletName), { minLength: 0, maxLength: 5 })
          ),
          { minLength: 1, maxLength: 5 }
        ),
        (recurringPerWallet) => {
          const allRecurring = recurringPerWallet.flat()
          expect(verifyAllRecurringHaveWalletInfo(allRecurring)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test total recurring income calculation (Requirement 13.3)
  it('should verify total recurring income equals sum of active income items', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.constant(null),
            amount: fc.integer({ min: 1, max: 10000000 }).map(n => n / 100),
            type: recurringTypeArb,
            frequency: frequencyArb,
            startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
            nextDate: fc.date({ min: new Date('2025-01-01'), max: new Date('2030-12-31') }),
            category: fc.constant(null),
            isActive: fc.boolean(),
            walletId: fc.uuid(),
            walletName: fc.string({ minLength: 1, maxLength: 20 }),
            walletColor: fc.constant(null),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        (recurring: AggregatedRecurringTransaction[]) => {
          const totalRecurringIncome = recurring
            .filter((rt) => rt.isActive && rt.type === 'income')
            .reduce((sum, rt) => sum + rt.amount, 0)
          
          expect(verifyTotalRecurringIncome(recurring, totalRecurringIncome)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test total recurring expense calculation (Requirement 13.3)
  it('should verify total recurring expense equals sum of active expense items', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.constant(null),
            amount: fc.integer({ min: 1, max: 10000000 }).map(n => n / 100),
            type: recurringTypeArb,
            frequency: frequencyArb,
            startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
            nextDate: fc.date({ min: new Date('2025-01-01'), max: new Date('2030-12-31') }),
            category: fc.constant(null),
            isActive: fc.boolean(),
            walletId: fc.uuid(),
            walletName: fc.string({ minLength: 1, maxLength: 20 }),
            walletColor: fc.constant(null),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        (recurring: AggregatedRecurringTransaction[]) => {
          const totalRecurringExpense = recurring
            .filter((rt) => rt.isActive && rt.type === 'expense')
            .reduce((sum, rt) => sum + rt.amount, 0)
          
          expect(verifyTotalRecurringExpense(recurring, totalRecurringExpense)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })


  // Test recurring count matches wallet summaries
  it('should verify recurring count matches wallet summaries', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.uuid(),
            fc.string({ minLength: 1, maxLength: 20 })
          ),
          { minLength: 1, maxLength: 5 }
        ).chain((wallets) => {
          const recurringArb = fc.tuple(
            ...wallets.map(([walletId, walletName]) =>
              fc.array(
                fc.record({
                  id: fc.uuid(),
                  name: fc.string({ minLength: 1, maxLength: 50 }),
                  description: fc.constant(null),
                  amount: fc.integer({ min: 1, max: 10000000 }).map(n => n / 100),
                  type: recurringTypeArb,
                  frequency: frequencyArb,
                  startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
                  nextDate: fc.date({ min: new Date('2025-01-01'), max: new Date('2030-12-31') }),
                  category: fc.constant(null),
                  isActive: fc.boolean(),
                  walletId: fc.constant(walletId),
                  walletName: fc.constant(walletName),
                  walletColor: fc.constant(null),
                }),
                { minLength: 0, maxLength: 5 }
              )
            )
          )
          return fc.tuple(fc.constant(wallets), recurringArb)
        }),
        ([wallets, recurringArrays]) => {
          const allRecurring: AggregatedRecurringTransaction[] = recurringArrays.flat()
          
          // Create wallet summaries
          const walletSummaries: WalletRecurringSummary[] = wallets.map(([walletId, walletName], i) => {
            const walletRecurring = recurringArrays[i] as AggregatedRecurringTransaction[]
            return {
              walletId,
              walletName,
              walletColor: null,
              recurringIncome: walletRecurring.filter(rt => rt.isActive && rt.type === 'income').reduce((sum, rt) => sum + rt.amount, 0),
              recurringExpense: walletRecurring.filter(rt => rt.isActive && rt.type === 'expense').reduce((sum, rt) => sum + rt.amount, 0),
              items: walletRecurring,
              itemCount: walletRecurring.length,
            }
          })

          expect(verifyRecurringCountMatchesWalletSummaries(allRecurring, walletSummaries)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test wallet summary totals
  it('should verify wallet summary income/expense totals are correct', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.constant(null),
            amount: fc.integer({ min: 1, max: 10000000 }).map(n => n / 100),
            type: recurringTypeArb,
            frequency: frequencyArb,
            startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
            nextDate: fc.date({ min: new Date('2025-01-01'), max: new Date('2030-12-31') }),
            category: fc.constant(null),
            isActive: fc.boolean(),
            walletId: fc.constant('test-wallet'),
            walletName: fc.constant('Test Wallet'),
            walletColor: fc.constant(null),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        (recurring: AggregatedRecurringTransaction[]) => {
          const walletSummary: WalletRecurringSummary = {
            walletId: 'test-wallet',
            walletName: 'Test Wallet',
            walletColor: null,
            recurringIncome: recurring.filter(rt => rt.isActive && rt.type === 'income').reduce((sum, rt) => sum + rt.amount, 0),
            recurringExpense: recurring.filter(rt => rt.isActive && rt.type === 'expense').reduce((sum, rt) => sum + rt.amount, 0),
            items: recurring,
            itemCount: recurring.length,
          }

          expect(verifyWalletSummaryTotals(walletSummary)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })


  // Test upcoming transactions are active
  it('should verify upcoming transactions are all active', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.constant(null),
            amount: fc.integer({ min: 1, max: 10000000 }).map(n => n / 100),
            type: recurringTypeArb,
            frequency: frequencyArb,
            startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
            nextDate: fc.date({ min: new Date('2025-01-01'), max: new Date('2030-12-31') }),
            category: fc.constant(null),
            isActive: fc.constant(true), // Only active items in upcoming
            walletId: fc.uuid(),
            walletName: fc.string({ minLength: 1, maxLength: 20 }),
            walletColor: fc.constant(null),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        (upcomingTransactions: AggregatedRecurringTransaction[]) => {
          expect(verifyUpcomingTransactionsAreActive(upcomingTransactions)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test upcoming transactions are within date range
  it('should verify upcoming transactions are within date range', () => {
    fc.assert(
      fc.property(
        // Use integer timestamps to avoid NaN date issues
        fc.integer({ min: new Date('2025-01-01').getTime(), max: new Date('2025-06-01').getTime() }),
        fc.integer({ min: 1, max: 30 }),
        (startTimestamp, daysRange) => {
          const startDate = new Date(startTimestamp)
          const endDate = new Date(startDate)
          endDate.setDate(endDate.getDate() + daysRange)

          // Generate transactions within the range
          const upcomingTransactions: AggregatedRecurringTransaction[] = Array.from(
            { length: 5 },
            (_, i) => {
              const nextDate = new Date(startDate)
              nextDate.setDate(nextDate.getDate() + Math.floor(Math.random() * daysRange))
              return {
                id: `id-${i}`,
                name: `Recurring ${i}`,
                description: null,
                amount: 100,
                type: 'expense' as const,
                frequency: 'MONTHLY',
                startDate: new Date('2024-01-01'),
                nextDate,
                category: null,
                isActive: true,
                walletId: `wallet-${i}`,
                walletName: `Wallet ${i}`,
                walletColor: null,
              }
            }
          )

          expect(verifyUpcomingTransactionsInRange(upcomingTransactions, startDate, endDate)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test valid types
  it('should verify all recurring transactions have valid types', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.constant(null),
            amount: fc.integer({ min: 1, max: 10000000 }).map(n => n / 100),
            type: recurringTypeArb,
            frequency: frequencyArb,
            startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
            nextDate: fc.date({ min: new Date('2025-01-01'), max: new Date('2030-12-31') }),
            category: fc.constant(null),
            isActive: fc.boolean(),
            walletId: fc.uuid(),
            walletName: fc.string({ minLength: 1, maxLength: 20 }),
            walletColor: fc.constant(null),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        (recurring: AggregatedRecurringTransaction[]) => {
          expect(verifyValidTypes(recurring)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test total recurring calculation from wallet summaries
  it('should verify total recurring equals sum of wallet item counts', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.integer({ min: 0, max: 20 }),
          { minLength: 1, maxLength: 10 }
        ),
        (itemCounts) => {
          const walletSummaries: WalletRecurringSummary[] = itemCounts.map((count, i) => ({
            walletId: `wallet-${i}`,
            walletName: `Wallet ${i}`,
            walletColor: null,
            recurringIncome: 0,
            recurringExpense: 0,
            items: [],
            itemCount: count,
          }))

          const expectedTotal = itemCounts.reduce((sum, c) => sum + c, 0)
          expect(calculateExpectedTotalRecurring(walletSummaries)).toBe(expectedTotal)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test empty recurring array
  it('should handle empty recurring array', () => {
    const emptyRecurring: AggregatedRecurringTransaction[] = []
    expect(verifyAllRecurringHaveWalletInfo(emptyRecurring)).toBe(true)
    expect(verifyTotalRecurringIncome(emptyRecurring, 0)).toBe(true)
    expect(verifyTotalRecurringExpense(emptyRecurring, 0)).toBe(true)
    expect(verifyValidTypes(emptyRecurring)).toBe(true)
  })

  // Test empty wallet summaries
  it('should handle empty wallet summaries', () => {
    const emptySummaries: WalletRecurringSummary[] = []
    expect(calculateExpectedTotalRecurring(emptySummaries)).toBe(0)
    expect(verifyAllWalletSummaryTotals(emptySummaries)).toBe(true)
  })

  // Test inactive items don't count toward totals
  it('should verify inactive items do not count toward totals', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.constant(null),
            amount: fc.integer({ min: 1, max: 10000000 }).map(n => n / 100),
            type: recurringTypeArb,
            frequency: frequencyArb,
            startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
            nextDate: fc.date({ min: new Date('2025-01-01'), max: new Date('2030-12-31') }),
            category: fc.constant(null),
            isActive: fc.constant(false), // All inactive
            walletId: fc.uuid(),
            walletName: fc.string({ minLength: 1, maxLength: 20 }),
            walletColor: fc.constant(null),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (recurring: AggregatedRecurringTransaction[]) => {
          // All inactive, so totals should be 0
          expect(verifyTotalRecurringIncome(recurring, 0)).toBe(true)
          expect(verifyTotalRecurringExpense(recurring, 0)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})
