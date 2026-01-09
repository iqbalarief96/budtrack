import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  verifyGoalProgress,
  verifyOverallProgress,
  verifyTotalTargetAmount,
  verifyTotalCurrentAmount,
  verifyWalletContributions,
  verifyAllGoalsHaveValidContributions,
  verifySavingsRateRange,
  calculateExpectedTotalGoals,
  verifyWalletSummaryContributions,
  verifyAllWalletSummaryContributions,
  calculateSavingsRate,
  AggregatedGoal,
  WalletGoalContribution,
  WalletGoalSummary,
} from '../goal-aggregation-service'

/**
 * Feature: wallet-linking, Property 19: Aggregated Goals Completeness
 * Validates: Requirements 12.1, 12.2, 12.3
 * 
 * For any wallet group, the aggregated goals list SHALL contain ALL goals
 * from ALL linked wallets, and overall progress SHALL be calculated correctly
 * from individual goal progress.
 */
describe('Property 19: Aggregated Goals Completeness', () => {
  // Generator for wallet contribution
  const walletContributionArb = fc.record({
    walletId: fc.uuid(),
    walletName: fc.string({ minLength: 1, maxLength: 20 }),
    walletColor: fc.option(fc.constantFrom('#ff0000', '#00ff00', '#0000ff'), { nil: null }),
    contributionAmount: fc.integer({ min: 0, max: 10000000 }).map(n => n / 100),
    transactionCount: fc.integer({ min: 0, max: 100 }),
  })

  // Generator for aggregated goal
  const aggregatedGoalArb = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    targetAmount: fc.integer({ min: 1, max: 100000000 }).map(n => n / 100),
    currentAmount: fc.integer({ min: 0, max: 100000000 }).map(n => n / 100),
    progress: fc.constant(0), // Will be calculated
    targetDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }), { nil: null }),
    status: fc.constantFrom('ONGOING', 'COMPLETED', 'PAUSED'),
    category: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: null }),
    description: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: null }),
    icon: fc.option(fc.constantFrom('🎯', '💰', '🏠', '🚗', '✈️'), { nil: null }),
    color: fc.option(fc.constantFrom('#ff0000', '#00ff00', '#0000ff'), { nil: null }),
    isArchived: fc.boolean(),
    walletContributions: fc.array(walletContributionArb, { minLength: 0, maxLength: 5 }),
  }).map(goal => ({
    ...goal,
    progress: goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0,
  }))


  // Test goal progress calculation (Requirement 12.3)
  it('should verify goal progress calculation is correct', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100000000 }).map(n => n / 100),
        fc.integer({ min: 0, max: 100000000 }).map(n => n / 100),
        (targetAmount, currentAmount) => {
          const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0
          expect(verifyGoalProgress(targetAmount, currentAmount, progress)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test zero target handling
  it('should handle zero target amount correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000000 }).map(n => n / 100),
        (currentAmount) => {
          expect(verifyGoalProgress(0, currentAmount, 0)).toBe(true)
          expect(verifyOverallProgress(0, currentAmount, 0)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test overall progress calculation
  it('should verify overall progress calculation is correct', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100000000 }).map(n => n / 100),
        fc.integer({ min: 0, max: 100000000 }).map(n => n / 100),
        (totalTargetAmount, totalCurrentAmount) => {
          const overallProgress = totalTargetAmount > 0 
            ? (totalCurrentAmount / totalTargetAmount) * 100 
            : 0
          expect(verifyOverallProgress(totalTargetAmount, totalCurrentAmount, overallProgress)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test total target amount calculation
  it('should verify total target amount equals sum of goal targets', () => {
    fc.assert(
      fc.property(
        fc.array(aggregatedGoalArb, { minLength: 0, maxLength: 10 }),
        (goals: AggregatedGoal[]) => {
          const totalTargetAmount = goals.reduce((sum, g) => sum + g.targetAmount, 0)
          expect(verifyTotalTargetAmount(goals, totalTargetAmount)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test total current amount calculation
  it('should verify total current amount equals sum of goal current amounts', () => {
    fc.assert(
      fc.property(
        fc.array(aggregatedGoalArb, { minLength: 0, maxLength: 10 }),
        (goals: AggregatedGoal[]) => {
          const totalCurrentAmount = goals.reduce((sum, g) => sum + g.currentAmount, 0)
          expect(verifyTotalCurrentAmount(goals, totalCurrentAmount)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })


  // Test wallet contributions have valid info (Requirement 12.2)
  it('should verify all goals have valid wallet contributions', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            targetAmount: fc.integer({ min: 1, max: 100000000 }).map(n => n / 100),
            currentAmount: fc.integer({ min: 0, max: 100000000 }).map(n => n / 100),
            progress: fc.constant(0),
            targetDate: fc.constant(null),
            status: fc.constant('ONGOING'),
            category: fc.constant(null),
            description: fc.constant(null),
            icon: fc.constant(null),
            color: fc.constant(null),
            isArchived: fc.constant(false),
            walletContributions: fc.array(
              fc.record({
                walletId: fc.uuid(),
                walletName: fc.string({ minLength: 1, maxLength: 20 }),
                walletColor: fc.constant(null),
                contributionAmount: fc.integer({ min: 0, max: 10000000 }).map(n => n / 100),
                transactionCount: fc.integer({ min: 0, max: 100 }),
              }),
              { minLength: 1, maxLength: 5 }
            ),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (goals: AggregatedGoal[]) => {
          expect(verifyAllGoalsHaveValidContributions(goals)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test savings rate is in valid range
  it('should verify savings rate is non-negative', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000000 }).map(n => n / 100),
        fc.integer({ min: 0, max: 100000000 }).map(n => n / 100),
        (totalIncome, totalSavings) => {
          const savingsRate = calculateSavingsRate(totalIncome, totalSavings)
          expect(verifySavingsRateRange(savingsRate)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test savings rate calculation
  it('should verify savings rate calculation is correct', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100000000 }).map(n => n / 100),
        fc.integer({ min: 0, max: 100000000 }).map(n => n / 100),
        (totalIncome, totalSavings) => {
          const expectedRate = (totalSavings / totalIncome) * 100
          const calculatedRate = calculateSavingsRate(totalIncome, totalSavings)
          expect(Math.abs(calculatedRate - expectedRate)).toBeLessThan(0.01)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test zero income handling for savings rate
  it('should handle zero income correctly for savings rate', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000000 }).map(n => n / 100),
        (totalSavings) => {
          const savingsRate = calculateSavingsRate(0, totalSavings)
          expect(savingsRate).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })


  // Test wallet summary contributions
  it('should verify wallet summary contribution totals are correct', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.array(
          fc.integer({ min: 0, max: 10000000 }).map(n => n / 100),
          { minLength: 1, maxLength: 5 }
        ),
        (walletId, walletName, contributionAmounts) => {
          // Create goals with contributions from this wallet
          const goals: AggregatedGoal[] = contributionAmounts.map((amount, i) => ({
            id: `goal-${i}`,
            name: `Goal ${i}`,
            targetAmount: 10000,
            currentAmount: amount,
            progress: (amount / 10000) * 100,
            targetDate: null,
            status: 'ONGOING',
            category: null,
            description: null,
            icon: null,
            color: null,
            isArchived: false,
            walletContributions: [{
              walletId,
              walletName,
              walletColor: null,
              contributionAmount: amount,
              transactionCount: 1,
            }],
          }))

          const totalContribution = contributionAmounts.reduce((sum, a) => sum + a, 0)
          
          const walletSummary: WalletGoalSummary = {
            walletId,
            walletName,
            walletColor: null,
            goals,
            totalContribution,
            goalCount: goals.length,
          }

          expect(verifyWalletSummaryContributions(walletSummary)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test unique goal count calculation
  it('should calculate unique goal count correctly from wallet summaries', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }),
        (goalIds) => {
          // Create wallet summaries with overlapping goals
          const walletSummaries: WalletGoalSummary[] = [
            {
              walletId: 'wallet-1',
              walletName: 'Wallet 1',
              walletColor: null,
              goals: goalIds.slice(0, Math.ceil(goalIds.length / 2)).map(id => ({
                id,
                name: `Goal ${id}`,
                targetAmount: 1000,
                currentAmount: 500,
                progress: 50,
                targetDate: null,
                status: 'ONGOING',
                category: null,
                description: null,
                icon: null,
                color: null,
                isArchived: false,
                walletContributions: [],
              })),
              totalContribution: 0,
              goalCount: Math.ceil(goalIds.length / 2),
            },
            {
              walletId: 'wallet-2',
              walletName: 'Wallet 2',
              walletColor: null,
              goals: goalIds.slice(Math.floor(goalIds.length / 2)).map(id => ({
                id,
                name: `Goal ${id}`,
                targetAmount: 1000,
                currentAmount: 500,
                progress: 50,
                targetDate: null,
                status: 'ONGOING',
                category: null,
                description: null,
                icon: null,
                color: null,
                isArchived: false,
                walletContributions: [],
              })),
              totalContribution: 0,
              goalCount: goalIds.length - Math.floor(goalIds.length / 2),
            },
          ]

          const uniqueCount = calculateExpectedTotalGoals(walletSummaries)
          // Unique count should be <= total goal IDs (due to potential overlap)
          expect(uniqueCount).toBeLessThanOrEqual(goalIds.length)
          expect(uniqueCount).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test empty goals array
  it('should handle empty goals array', () => {
    const emptyGoals: AggregatedGoal[] = []
    expect(verifyTotalTargetAmount(emptyGoals, 0)).toBe(true)
    expect(verifyTotalCurrentAmount(emptyGoals, 0)).toBe(true)
    expect(verifyAllGoalsHaveValidContributions(emptyGoals)).toBe(true)
  })

  // Test empty wallet summaries
  it('should handle empty wallet summaries', () => {
    const emptySummaries: WalletGoalSummary[] = []
    expect(calculateExpectedTotalGoals(emptySummaries)).toBe(0)
    expect(verifyAllWalletSummaryContributions(emptySummaries)).toBe(true)
  })

  // Test progress is bounded correctly
  it('should verify progress can exceed 100% when current > target', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }).map(n => n / 100),
        fc.integer({ min: 1001, max: 10000 }).map(n => n / 100),
        (targetAmount, currentAmount) => {
          const progress = (currentAmount / targetAmount) * 100
          expect(progress).toBeGreaterThan(100)
          expect(verifyGoalProgress(targetAmount, currentAmount, progress)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})
