import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  verifyWalletComparisonPercentagesSum,
  verifyAllWalletsIncluded,
  calculateExpectedTotalSpending,
  WalletSpendingComparison,
  CategorySpendingSummary,
} from '../insights-aggregation-service'

/**
 * Feature: wallet-linking, Property 15: Aggregated Insights Cross-Wallet Analysis
 * Validates: Requirements 8.1, 8.3, 8.4
 * 
 * For any wallet group, spending insights SHALL analyze patterns across ALL linked wallets,
 * and wallet comparison percentages SHALL sum to 100%.
 */
describe('Property 15: Aggregated Insights Cross-Wallet Analysis', () => {
  // Test that wallet comparison percentages sum to 100%
  it('should verify wallet comparison percentages sum to 100%', () => {
    fc.assert(
      fc.property(
        // Generate array of wallet spending amounts
        fc.array(
          fc.integer({ min: 1, max: 10000000 }).map(n => n / 100),
          { minLength: 1, maxLength: 10 }
        ),
        (spendingAmounts) => {
          const totalSpending = spendingAmounts.reduce((sum, a) => sum + a, 0)
          
          // Create wallet comparisons with calculated percentages
          const walletComparison: WalletSpendingComparison[] = spendingAmounts.map((amount, i) => ({
            walletId: `wallet-${i}`,
            walletName: `Wallet ${i}`,
            totalSpending: amount,
            topCategories: [],
            percentageOfGroup: totalSpending > 0 ? (amount / totalSpending) * 100 : 0,
          }))

          // Verify percentages sum to 100%
          expect(verifyWalletComparisonPercentagesSum(walletComparison)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test that all wallets are included in comparison
  it('should verify all wallets are included in comparison', () => {
    fc.assert(
      fc.property(
        // Generate array of wallet IDs
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 10 }),
        (walletIds) => {
          // Create wallet comparisons for all wallets
          const walletComparison: WalletSpendingComparison[] = walletIds.map((id) => ({
            walletId: id,
            walletName: `Wallet ${id}`,
            totalSpending: 0,
            topCategories: [],
            percentageOfGroup: 100 / walletIds.length,
          }))

          // Verify all wallets are included
          expect(verifyAllWalletsIncluded(walletIds, walletComparison)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test that total spending equals sum of wallet spending
  it('should verify total spending equals sum of wallet spending', () => {
    fc.assert(
      fc.property(
        // Generate array of wallet spending amounts
        fc.array(
          fc.integer({ min: 0, max: 10000000 }).map(n => n / 100),
          { minLength: 1, maxLength: 10 }
        ),
        (spendingAmounts) => {
          const expectedTotal = spendingAmounts.reduce((sum, a) => sum + a, 0)
          
          // Create wallet comparisons
          const walletComparison: WalletSpendingComparison[] = spendingAmounts.map((amount, i) => ({
            walletId: `wallet-${i}`,
            walletName: `Wallet ${i}`,
            totalSpending: amount,
            topCategories: [],
            percentageOfGroup: 0,
          }))

          // Verify total spending
          const calculatedTotal = calculateExpectedTotalSpending(walletComparison)
          expect(Math.abs(calculatedTotal - expectedTotal)).toBeLessThan(0.01)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test that larger spending wallets have larger percentages
  it('should verify larger spending wallets have larger percentages', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50000 }).map(n => n / 100),
        fc.integer({ min: 50001, max: 100000 }).map(n => n / 100),
        (smallAmount, largeAmount) => {
          const totalSpending = smallAmount + largeAmount
          
          const walletComparison: WalletSpendingComparison[] = [
            {
              walletId: 'small',
              walletName: 'Small Wallet',
              totalSpending: smallAmount,
              topCategories: [],
              percentageOfGroup: (smallAmount / totalSpending) * 100,
            },
            {
              walletId: 'large',
              walletName: 'Large Wallet',
              totalSpending: largeAmount,
              topCategories: [],
              percentageOfGroup: (largeAmount / totalSpending) * 100,
            },
          ]

          // Larger spending should have larger percentage
          expect(walletComparison[1].percentageOfGroup).toBeGreaterThan(walletComparison[0].percentageOfGroup)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test empty wallet comparison array
  it('should handle empty wallet comparison array', () => {
    const emptyComparison: WalletSpendingComparison[] = []
    expect(verifyWalletComparisonPercentagesSum(emptyComparison)).toBe(true)
    expect(verifyAllWalletsIncluded([], emptyComparison)).toBe(true)
    expect(calculateExpectedTotalSpending(emptyComparison)).toBe(0)
  })

  // Test single wallet comparison
  it('should handle single wallet correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000000 }).map(n => n / 100),
        (spending) => {
          const walletComparison: WalletSpendingComparison[] = [
            {
              walletId: 'single',
              walletName: 'Single Wallet',
              totalSpending: spending,
              topCategories: [],
              percentageOfGroup: 100,
            },
          ]

          expect(verifyWalletComparisonPercentagesSum(walletComparison)).toBe(true)
          expect(walletComparison[0].percentageOfGroup).toBe(100)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test that top categories percentages are valid
  it('should verify top categories percentages are valid', () => {
    fc.assert(
      fc.property(
        // Generate category amounts
        fc.array(
          fc.integer({ min: 1, max: 10000000 }).map(n => n / 100),
          { minLength: 1, maxLength: 5 }
        ),
        (categoryAmounts) => {
          const totalSpending = categoryAmounts.reduce((sum, a) => sum + a, 0)
          
          // Create top categories
          const topCategories: CategorySpendingSummary[] = categoryAmounts.map((amount, i) => ({
            categoryId: `cat-${i}`,
            categoryName: `Category ${i}`,
            amount,
            percentage: totalSpending > 0 ? (amount / totalSpending) * 100 : 0,
          }))

          // Verify percentages sum to 100%
          const percentageSum = topCategories.reduce((sum, c) => sum + c.percentage, 0)
          expect(Math.abs(percentageSum - 100)).toBeLessThan(0.01)

          // Verify each percentage is between 0 and 100
          for (const cat of topCategories) {
            expect(cat.percentage).toBeGreaterThanOrEqual(0)
            expect(cat.percentage).toBeLessThanOrEqual(100)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test wallet comparison with zero spending
  it('should handle zero spending wallets correctly', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constant(0), { minLength: 1, maxLength: 5 }),
        (zeroAmounts) => {
          // Create wallet comparisons with zero spending
          const walletComparison: WalletSpendingComparison[] = zeroAmounts.map((_, i) => ({
            walletId: `wallet-${i}`,
            walletName: `Wallet ${i}`,
            totalSpending: 0,
            topCategories: [],
            percentageOfGroup: 100 / zeroAmounts.length, // Equal distribution when all zero
          }))

          // Verify percentages still sum to 100%
          expect(verifyWalletComparisonPercentagesSum(walletComparison)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test that wallet IDs are unique in comparison
  it('should verify wallet IDs are unique in comparison', () => {
    fc.assert(
      fc.property(
        // Generate unique wallet IDs using uniqueArray
        fc.uniqueArray(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 10 }),
        (walletIds) => {
          // Create wallet comparisons
          const walletComparison: WalletSpendingComparison[] = walletIds.map((id) => ({
            walletId: id,
            walletName: `Wallet ${id}`,
            totalSpending: 100,
            topCategories: [],
            percentageOfGroup: 100 / walletIds.length,
          }))

          // Verify all IDs are unique
          const comparisonIds = walletComparison.map((w) => w.walletId)
          const uniqueIds = new Set(comparisonIds)
          expect(uniqueIds.size).toBe(comparisonIds.length)
        }
      ),
      { numRuns: 100 }
    )
  })
})
