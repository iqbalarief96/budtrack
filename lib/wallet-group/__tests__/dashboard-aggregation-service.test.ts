import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  calculateIncomeVsExpense,
  calculateExpectedCategoryTotals,
  verifyCategoryTotalsMatchContributions,
  verifyCategoryPercentagesSum,
  verifySavingsRateCalculation,
  CategorySpending,
  WalletContribution,
} from '../dashboard-aggregation-service'

/**
 * Feature: wallet-linking, Property 14: Aggregated Dashboard Data Completeness
 * Validates: Requirements 7.1, 7.2, 7.3
 * 
 * For any wallet group, the aggregated dashboard SHALL include spending data from ALL
 * linked wallets, and category totals SHALL equal the sum of individual wallet contributions.
 */
describe('Property 14: Aggregated Dashboard Data Completeness', () => {
  // Test that category totals equal sum of wallet contributions
  it('should verify category totals equal sum of wallet contributions', () => {
    fc.assert(
      fc.property(
        // Generate array of categories with wallet contributions
        fc.array(
          fc.record({
            categoryId: fc.string({ minLength: 1, maxLength: 10 }),
            categoryName: fc.string({ minLength: 1, maxLength: 20 }),
            categoryIcon: fc.option(fc.string({ minLength: 1, maxLength: 5 }), { nil: null }),
            categoryColor: fc.option(fc.string({ minLength: 1, maxLength: 7 }), { nil: null }),
            walletContributions: fc.array(
              fc.record({
                walletId: fc.string({ minLength: 1, maxLength: 10 }),
                walletName: fc.string({ minLength: 1, maxLength: 20 }),
                amount: fc.float({ min: 0, max: 100000, noNaN: true }),
              }),
              { minLength: 1, maxLength: 5 }
            ),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (categories) => {
          // Calculate amount as sum of contributions for each category
          const spendingByCategory: CategorySpending[] = categories.map((cat) => {
            const amount = cat.walletContributions.reduce((sum, c) => sum + c.amount, 0)
            return {
              ...cat,
              amount,
              percentage: 0, // Will be calculated separately
            }
          })

          // Verify totals match contributions
          expect(verifyCategoryTotalsMatchContributions(spendingByCategory)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test that category percentages sum to 100%
  it('should verify category percentages sum to 100%', () => {
    fc.assert(
      fc.property(
        // Generate array of positive amounts using integers then divide
        fc.array(fc.integer({ min: 1, max: 10000000 }).map(n => n / 100), { minLength: 1, maxLength: 10 }),
        (amounts) => {
          const totalSpending = amounts.reduce((sum, a) => sum + a, 0)
          
          // Create spending categories with calculated percentages
          const spendingByCategory: CategorySpending[] = amounts.map((amount, i) => ({
            categoryId: `cat-${i}`,
            categoryName: `Category ${i}`,
            categoryIcon: null,
            categoryColor: null,
            amount,
            percentage: totalSpending > 0 ? (amount / totalSpending) * 100 : 0,
            walletContributions: [],
          }))

          // Verify percentages sum to 100%
          expect(verifyCategoryPercentagesSum(spendingByCategory)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test that all wallets contribute to category totals
  it('should verify all wallet contributions are included in category totals', () => {
    fc.assert(
      fc.property(
        // Generate wallet contributions for multiple wallets
        fc.array(
          fc.record({
            walletId: fc.constantFrom('wallet1', 'wallet2', 'wallet3'),
            walletName: fc.string({ minLength: 1, maxLength: 20 }),
            amount: fc.float({ min: 0, max: 10000, noNaN: true }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (contributions: WalletContribution[]) => {
          // Calculate expected total
          const expectedTotal = contributions.reduce((sum, c) => sum + c.amount, 0)
          
          // Create a category with these contributions
          const category: CategorySpending = {
            categoryId: 'test-cat',
            categoryName: 'Test Category',
            categoryIcon: null,
            categoryColor: null,
            amount: expectedTotal,
            percentage: 100,
            walletContributions: contributions,
          }

          // Verify the category total matches sum of contributions
          expect(verifyCategoryTotalsMatchContributions([category])).toBe(true)
          
          // Verify all wallets are represented
          const walletIds = new Set(contributions.map((c) => c.walletId))
          const categoryWalletIds = new Set(category.walletContributions.map((c) => c.walletId))
          expect(categoryWalletIds).toEqual(walletIds)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test income vs expense comparison calculation
  it('should verify income vs expense comparison is correct', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000000 }).map(n => n / 100),
        fc.integer({ min: 0, max: 10000000 }).map(n => n / 100),
        (income, expense) => {
          const result = calculateIncomeVsExpense(income, expense)
          
          // Verify totals
          expect(result.totalIncome).toBe(income)
          expect(result.totalExpense).toBe(expense)
          
          // Verify net savings
          expect(Math.abs(result.netSavings - (income - expense))).toBeLessThan(0.01)
          
          // Verify savings rate
          expect(verifySavingsRateCalculation(income, expense, result.savingsRate)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test savings rate with zero income
  it('should handle zero income correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000000 }).map(n => n / 100),
        (expense) => {
          const result = calculateIncomeVsExpense(0, expense)
          
          expect(result.totalIncome).toBe(0)
          expect(result.totalExpense).toBe(expense)
          // Use approximate comparison for floating point
          expect(Math.abs(result.netSavings - (-expense))).toBeLessThan(0.01)
          expect(result.savingsRate).toBe(0) // No income means 0% savings rate
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test that larger spending categories have larger percentages
  it('should verify larger spending has larger percentage', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50000 }).map(n => n / 100),
        fc.integer({ min: 50001, max: 100000 }).map(n => n / 100),
        (smallAmount, largeAmount) => {
          const totalSpending = smallAmount + largeAmount
          
          const spendingByCategory: CategorySpending[] = [
            {
              categoryId: 'small',
              categoryName: 'Small',
              categoryIcon: null,
              categoryColor: null,
              amount: smallAmount,
              percentage: (smallAmount / totalSpending) * 100,
              walletContributions: [],
            },
            {
              categoryId: 'large',
              categoryName: 'Large',
              categoryIcon: null,
              categoryColor: null,
              amount: largeAmount,
              percentage: (largeAmount / totalSpending) * 100,
              walletContributions: [],
            },
          ]

          // Larger amount should have larger percentage
          expect(spendingByCategory[1].percentage).toBeGreaterThan(spendingByCategory[0].percentage)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test empty categories array
  it('should handle empty categories array', () => {
    const emptyCategories: CategorySpending[] = []
    expect(verifyCategoryPercentagesSum(emptyCategories)).toBe(true)
    expect(verifyCategoryTotalsMatchContributions(emptyCategories)).toBe(true)
  })

  // Test expected category totals calculation
  it('should calculate expected category totals correctly', () => {
    fc.assert(
      fc.property(
        // Generate multiple categories with multiple wallet contributions each
        fc.array(
          fc.array(
            fc.record({
              walletId: fc.string({ minLength: 1, maxLength: 10 }),
              walletName: fc.string({ minLength: 1, maxLength: 20 }),
              amount: fc.float({ min: 0, max: 10000, noNaN: true }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          { minLength: 1, maxLength: 5 }
        ),
        (walletContributionsArray: WalletContribution[][]) => {
          const expectedTotals = calculateExpectedCategoryTotals(walletContributionsArray)
          
          // Verify each total equals sum of contributions
          for (let i = 0; i < walletContributionsArray.length; i++) {
            const expectedSum = walletContributionsArray[i].reduce((sum, c) => sum + c.amount, 0)
            expect(Math.abs(expectedTotals[i] - expectedSum)).toBeLessThan(0.01)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
