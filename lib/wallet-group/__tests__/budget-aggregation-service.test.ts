import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  verifySpentEqualsContributions,
  verifyAllBudgetsSpentCorrect,
  verifyBudgetPercentage,
  verifyRemainingAmount,
  verifyOverallUtilization,
  calculateExpectedTotalSpent,
  calculateExpectedTotalBudgeted,
  AggregatedBudget,
  WalletBudgetContribution,
} from '../budget-aggregation-service'

/**
 * Feature: wallet-linking, Property 16: Aggregated Budget Calculation Correctness
 * Validates: Requirements 9.1, 9.2
 * 
 * For any wallet group with budgets, the spent amount for each budget category
 * SHALL equal the sum of spending from ALL linked wallets in that category.
 */
describe('Property 16: Aggregated Budget Calculation Correctness', () => {
  // Test that spent amount equals sum of wallet contributions
  it('should verify spent amount equals sum of wallet contributions', () => {
    fc.assert(
      fc.property(
        // Generate wallet contributions
        fc.array(
          fc.record({
            walletId: fc.string({ minLength: 1, maxLength: 10 }),
            walletName: fc.string({ minLength: 1, maxLength: 20 }),
            spent: fc.integer({ min: 0, max: 10000000 }).map(n => n / 100),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        fc.integer({ min: 1, max: 10000000 }).map(n => n / 100),
        (contributions: WalletBudgetContribution[], budgetAmount) => {
          const spentAmount = contributions.reduce((sum, c) => sum + c.spent, 0)
          
          const budget: AggregatedBudget = {
            budgetId: 'test-budget',
            categoryId: 'test-category',
            categoryName: 'Test Category',
            categoryIcon: null,
            categoryColor: null,
            budgetAmount,
            spentAmount,
            remainingAmount: budgetAmount - spentAmount,
            percentage: budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0,
            walletContributions: contributions,
          }

          expect(verifySpentEqualsContributions(budget)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test that all budgets have correct spent calculation
  it('should verify all budgets have correct spent calculation', () => {
    fc.assert(
      fc.property(
        // Generate multiple budgets
        fc.array(
          fc.tuple(
            fc.array(
              fc.record({
                walletId: fc.string({ minLength: 1, maxLength: 10 }),
                walletName: fc.string({ minLength: 1, maxLength: 20 }),
                spent: fc.integer({ min: 0, max: 10000000 }).map(n => n / 100),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            fc.integer({ min: 1, max: 10000000 }).map(n => n / 100)
          ),
          { minLength: 1, maxLength: 5 }
        ),
        (budgetData) => {
          const budgets: AggregatedBudget[] = budgetData.map(([contributions, budgetAmount], i) => {
            const spentAmount = contributions.reduce((sum, c) => sum + c.spent, 0)
            return {
              budgetId: `budget-${i}`,
              categoryId: `category-${i}`,
              categoryName: `Category ${i}`,
              categoryIcon: null,
              categoryColor: null,
              budgetAmount,
              spentAmount,
              remainingAmount: budgetAmount - spentAmount,
              percentage: budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0,
              walletContributions: contributions,
            }
          })

          expect(verifyAllBudgetsSpentCorrect(budgets)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test budget percentage calculation
  it('should verify budget percentage calculation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000000 }).map(n => n / 100),
        fc.integer({ min: 0, max: 10000000 }).map(n => n / 100),
        (budgetAmount, spentAmount) => {
          const percentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0
          expect(verifyBudgetPercentage(budgetAmount, spentAmount, percentage)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test remaining amount calculation
  it('should verify remaining amount calculation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000000 }).map(n => n / 100),
        fc.integer({ min: 0, max: 10000000 }).map(n => n / 100),
        (budgetAmount, spentAmount) => {
          const remainingAmount = budgetAmount - spentAmount
          expect(verifyRemainingAmount(budgetAmount, spentAmount, remainingAmount)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test overall utilization calculation
  it('should verify overall utilization calculation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000000 }).map(n => n / 100),
        fc.integer({ min: 0, max: 10000000 }).map(n => n / 100),
        (totalBudgeted, totalSpent) => {
          const overallUtilization = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0
          expect(verifyOverallUtilization(totalBudgeted, totalSpent, overallUtilization)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test zero budget handling
  it('should handle zero budget correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000000 }).map(n => n / 100),
        (spentAmount) => {
          const percentage = 0 // Zero budget means 0% utilization
          expect(verifyBudgetPercentage(0, spentAmount, percentage)).toBe(true)
          expect(verifyOverallUtilization(0, spentAmount, 0)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test total spent calculation
  it('should verify total spent equals sum of budget spent amounts', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.integer({ min: 0, max: 10000000 }).map(n => n / 100),
          { minLength: 1, maxLength: 10 }
        ),
        (spentAmounts) => {
          const budgets: AggregatedBudget[] = spentAmounts.map((spent, i) => ({
            budgetId: `budget-${i}`,
            categoryId: `category-${i}`,
            categoryName: `Category ${i}`,
            categoryIcon: null,
            categoryColor: null,
            budgetAmount: 1000,
            spentAmount: spent,
            remainingAmount: 1000 - spent,
            percentage: (spent / 1000) * 100,
            walletContributions: [],
          }))

          const expectedTotal = spentAmounts.reduce((sum, s) => sum + s, 0)
          const calculatedTotal = calculateExpectedTotalSpent(budgets)
          expect(Math.abs(calculatedTotal - expectedTotal)).toBeLessThan(0.01)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test total budgeted calculation
  it('should verify total budgeted equals sum of budget amounts', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.integer({ min: 1, max: 10000000 }).map(n => n / 100),
          { minLength: 1, maxLength: 10 }
        ),
        (budgetAmounts) => {
          const budgets: AggregatedBudget[] = budgetAmounts.map((amount, i) => ({
            budgetId: `budget-${i}`,
            categoryId: `category-${i}`,
            categoryName: `Category ${i}`,
            categoryIcon: null,
            categoryColor: null,
            budgetAmount: amount,
            spentAmount: 0,
            remainingAmount: amount,
            percentage: 0,
            walletContributions: [],
          }))

          const expectedTotal = budgetAmounts.reduce((sum, a) => sum + a, 0)
          const calculatedTotal = calculateExpectedTotalBudgeted(budgets)
          expect(Math.abs(calculatedTotal - expectedTotal)).toBeLessThan(0.01)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test empty budgets array
  it('should handle empty budgets array', () => {
    const emptyBudgets: AggregatedBudget[] = []
    expect(verifyAllBudgetsSpentCorrect(emptyBudgets)).toBe(true)
    expect(calculateExpectedTotalSpent(emptyBudgets)).toBe(0)
    expect(calculateExpectedTotalBudgeted(emptyBudgets)).toBe(0)
  })

  // Test that higher spending results in higher percentage
  it('should verify higher spending results in higher percentage', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 10000000 }).map(n => n / 100), // Budget amount
        fc.integer({ min: 1, max: 500 }).map(n => n / 100), // Small spent
        fc.integer({ min: 501, max: 1000 }).map(n => n / 100), // Large spent
        (budgetAmount, smallSpent, largeSpent) => {
          const smallPercentage = (smallSpent / budgetAmount) * 100
          const largePercentage = (largeSpent / budgetAmount) * 100
          
          expect(largePercentage).toBeGreaterThan(smallPercentage)
        }
      ),
      { numRuns: 100 }
    )
  })
})
