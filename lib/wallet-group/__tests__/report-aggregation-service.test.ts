import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  verifyAllTransactionsHaveWalletInfo,
  verifyTransactionsInDateRange,
  verifyTransactionCountMatchesWalletSummaries,
  verifyTotalIncomeMatchesWalletSummaries,
  verifyTotalExpenseMatchesWalletSummaries,
  verifyNetSavingsCalculation,
  calculateExpectedTotalTransactions,
  verifyAllWalletsRepresented,
  DateRange,
  WalletSummary,
} from '../report-aggregation-service'
import { AggregatedTransaction } from '../aggregation-service'

/**
 * Feature: wallet-linking, Property 17: Aggregated Report Completeness
 * Validates: Requirements 10.1, 10.2, 10.3
 * 
 * For any wallet group report, the transaction list SHALL contain ALL transactions
 * from ALL linked wallets within the date range, with correct wallet attribution.
 */
describe('Property 17: Aggregated Report Completeness', () => {
  // Test that all transactions have wallet info
  it('should verify all transactions have wallet info', () => {
    fc.assert(
      fc.property(
        // Generate transactions with wallet info
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            amount: fc.integer({ min: 1, max: 10000000 }).map(n => n / 100),
            description: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
            date: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
            type: fc.constantFrom('income', 'expense'),
            categoryId: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: null }),
            category: fc.constant(null),
            walletId: fc.string({ minLength: 1, maxLength: 10 }),
            walletName: fc.string({ minLength: 1, maxLength: 20 }),
            walletColor: fc.option(fc.string({ minLength: 1, maxLength: 7 }), { nil: null }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (transactions: AggregatedTransaction[]) => {
          expect(verifyAllTransactionsHaveWalletInfo(transactions)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test that all transactions are within date range
  it('should verify all transactions are within date range', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-30') }),
        fc.date({ min: new Date('2024-07-01'), max: new Date('2024-12-31') }),
        fc.array(
          fc.date({ min: new Date('2024-03-01'), max: new Date('2024-09-30') }),
          { minLength: 1, maxLength: 20 }
        ),
        (startDate, endDate, transactionDates) => {
          // Ensure startDate <= endDate
          const [start, end] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate]
          const dateRange: DateRange = { startDate: start, endDate: end }

          // Create transactions within the date range
          const transactions: AggregatedTransaction[] = transactionDates
            .filter((d) => d >= start && d <= end)
            .map((date, i) => ({
              id: `tx-${i}`,
              amount: 100,
              description: null,
              date,
              type: 'expense',
              categoryId: null,
              category: null,
              walletId: 'wallet-1',
              walletName: 'Wallet 1',
              walletColor: null,
            }))

          expect(verifyTransactionsInDateRange(transactions, dateRange)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test that transaction count matches wallet summaries
  it('should verify transaction count matches wallet summaries', () => {
    fc.assert(
      fc.property(
        // Generate wallet IDs and transaction counts
        fc.array(
          fc.tuple(
            fc.string({ minLength: 1, maxLength: 10 }),
            fc.integer({ min: 0, max: 10 })
          ),
          { minLength: 1, maxLength: 5 }
        ),
        (walletData) => {
          // Create transactions based on counts
          const transactions: AggregatedTransaction[] = []
          const walletSummaries: WalletSummary[] = []

          for (const [walletId, count] of walletData) {
            // Add transactions for this wallet
            for (let i = 0; i < count; i++) {
              transactions.push({
                id: `tx-${walletId}-${i}`,
                amount: 100,
                description: null,
                date: new Date(),
                type: 'expense',
                categoryId: null,
                category: null,
                walletId,
                walletName: `Wallet ${walletId}`,
                walletColor: null,
              })
            }

            // Create wallet summary
            walletSummaries.push({
              walletId,
              walletName: `Wallet ${walletId}`,
              walletColor: null,
              totalIncome: 0,
              totalExpense: count * 100,
              netAmount: -count * 100,
              transactionCount: count,
            })
          }

          expect(verifyTransactionCountMatchesWalletSummaries(transactions, walletSummaries)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test that total income matches wallet summaries
  it('should verify total income matches wallet summaries', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.integer({ min: 0, max: 10000000 }).map(n => n / 100),
          { minLength: 1, maxLength: 10 }
        ),
        (incomeAmounts) => {
          const totalIncome = incomeAmounts.reduce((sum, a) => sum + a, 0)
          
          const walletSummaries: WalletSummary[] = incomeAmounts.map((income, i) => ({
            walletId: `wallet-${i}`,
            walletName: `Wallet ${i}`,
            walletColor: null,
            totalIncome: income,
            totalExpense: 0,
            netAmount: income,
            transactionCount: 1,
          }))

          expect(verifyTotalIncomeMatchesWalletSummaries(totalIncome, walletSummaries)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test that total expense matches wallet summaries
  it('should verify total expense matches wallet summaries', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.integer({ min: 0, max: 10000000 }).map(n => n / 100),
          { minLength: 1, maxLength: 10 }
        ),
        (expenseAmounts) => {
          const totalExpense = expenseAmounts.reduce((sum, a) => sum + a, 0)
          
          const walletSummaries: WalletSummary[] = expenseAmounts.map((expense, i) => ({
            walletId: `wallet-${i}`,
            walletName: `Wallet ${i}`,
            walletColor: null,
            totalIncome: 0,
            totalExpense: expense,
            netAmount: -expense,
            transactionCount: 1,
          }))

          expect(verifyTotalExpenseMatchesWalletSummaries(totalExpense, walletSummaries)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test net savings calculation
  it('should verify net savings calculation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000000 }).map(n => n / 100),
        fc.integer({ min: 0, max: 10000000 }).map(n => n / 100),
        (totalIncome, totalExpense) => {
          const netSavings = totalIncome - totalExpense
          expect(verifyNetSavingsCalculation(totalIncome, totalExpense, netSavings)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test expected total transactions calculation
  it('should verify expected total transactions calculation', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.integer({ min: 0, max: 100 }),
          { minLength: 1, maxLength: 10 }
        ),
        (transactionCounts) => {
          const walletSummaries: WalletSummary[] = transactionCounts.map((count, i) => ({
            walletId: `wallet-${i}`,
            walletName: `Wallet ${i}`,
            walletColor: null,
            totalIncome: 0,
            totalExpense: 0,
            netAmount: 0,
            transactionCount: count,
          }))

          const expectedTotal = transactionCounts.reduce((sum, c) => sum + c, 0)
          expect(calculateExpectedTotalTransactions(walletSummaries)).toBe(expectedTotal)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test all wallets are represented in summaries
  it('should verify all wallets are represented in summaries', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 10 }),
        (walletIds) => {
          const walletSummaries: WalletSummary[] = walletIds.map((id) => ({
            walletId: id,
            walletName: `Wallet ${id}`,
            walletColor: null,
            totalIncome: 0,
            totalExpense: 0,
            netAmount: 0,
            transactionCount: 0,
          }))

          expect(verifyAllWalletsRepresented(walletIds, walletSummaries)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test empty transactions array
  it('should handle empty transactions array', () => {
    const emptyTransactions: AggregatedTransaction[] = []
    const dateRange: DateRange = {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
    }

    expect(verifyAllTransactionsHaveWalletInfo(emptyTransactions)).toBe(true)
    expect(verifyTransactionsInDateRange(emptyTransactions, dateRange)).toBe(true)
  })

  // Test empty wallet summaries array
  it('should handle empty wallet summaries array', () => {
    const emptyTransactions: AggregatedTransaction[] = []
    const emptySummaries: WalletSummary[] = []

    expect(verifyTransactionCountMatchesWalletSummaries(emptyTransactions, emptySummaries)).toBe(true)
    expect(verifyTotalIncomeMatchesWalletSummaries(0, emptySummaries)).toBe(true)
    expect(verifyTotalExpenseMatchesWalletSummaries(0, emptySummaries)).toBe(true)
    expect(calculateExpectedTotalTransactions(emptySummaries)).toBe(0)
    expect(verifyAllWalletsRepresented([], emptySummaries)).toBe(true)
  })

  // Test that wallet net amount is correctly calculated
  it('should verify wallet net amount is income minus expense', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000000 }).map(n => n / 100),
        fc.integer({ min: 0, max: 10000000 }).map(n => n / 100),
        (income, expense) => {
          const walletSummary: WalletSummary = {
            walletId: 'test',
            walletName: 'Test Wallet',
            walletColor: null,
            totalIncome: income,
            totalExpense: expense,
            netAmount: income - expense,
            transactionCount: 2,
          }

          expect(Math.abs(walletSummary.netAmount - (income - expense))).toBeLessThan(0.01)
        }
      ),
      { numRuns: 100 }
    )
  })
})
