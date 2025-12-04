import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  calculateAccelerationSavings,
  suggestOptimalOrdering,
  calculateRecommendationImpact,
} from '../recommendation-service'
import { TimelineGoal, GoalProjection } from '@/app/types/goals-timeline'

/**
 * **Feature: financial-goals-timeline, Property 13: Acceleration Savings Calculation**
 * **Validates: Requirements 6.1**
 *
 * For any goal and desired months to save, additional monthly savings SHALL equal
 * (remainingAmount / newMonths) - currentMonthlySavings.
 */
describe('Property 13: Acceleration Savings Calculation', () => {
  it('should calculate additional savings as (remainingAmount / newMonths) - currentMonthlySavings', () => {
    fc.assert(
      fc.property(
        // Remaining amount (positive, 1 to 1,000,000)
        fc.integer({ min: 1, max: 1_000_000 }),
        // Current months remaining (must be > monthsToSave, 2 to 120)
        fc.integer({ min: 2, max: 120 }),
        // Months to save (1 to currentMonths - 1)
        fc.integer({ min: 1, max: 60 }),
        // Current monthly savings (positive, 1 to 100,000)
        fc.integer({ min: 1, max: 100_000 }),
        (remainingAmount, currentMonthsRemaining, monthsToSaveBase, currentMonthlySavings) => {
          // Ensure monthsToSave < currentMonthsRemaining
          const monthsToSave = Math.min(monthsToSaveBase, currentMonthsRemaining - 1)
          if (monthsToSave <= 0) return // Skip invalid cases

          const result = calculateAccelerationSavings(
            remainingAmount,
            currentMonthsRemaining,
            monthsToSave,
            currentMonthlySavings
          )

          // Calculate expected
          const newMonths = currentMonthsRemaining - monthsToSave
          const requiredMonthlySavings = remainingAmount / newMonths
          const expected = Math.max(0, requiredMonthlySavings - currentMonthlySavings)

          expect(result).toBeCloseTo(expected, 2)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 0 when goal is already achieved (remainingAmount <= 0)', () => {
    fc.assert(
      fc.property(
        // Remaining amount (0 or negative)
        fc.integer({ min: -100_000, max: 0 }),
        fc.integer({ min: 1, max: 120 }),
        fc.integer({ min: 1, max: 60 }),
        fc.integer({ min: 1, max: 100_000 }),
        (remainingAmount, currentMonthsRemaining, monthsToSave, currentMonthlySavings) => {
          const result = calculateAccelerationSavings(
            remainingAmount,
            currentMonthsRemaining,
            monthsToSave,
            currentMonthlySavings
          )

          expect(result).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 0 when no time remaining (currentMonthsRemaining <= 0)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        // Current months remaining (0 or negative)
        fc.integer({ min: -100, max: 0 }),
        fc.integer({ min: 1, max: 60 }),
        fc.integer({ min: 1, max: 100_000 }),
        (remainingAmount, currentMonthsRemaining, monthsToSave, currentMonthlySavings) => {
          const result = calculateAccelerationSavings(
            remainingAmount,
            currentMonthsRemaining,
            monthsToSave,
            currentMonthlySavings
          )

          expect(result).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })


  it('should return Infinity when trying to save more months than remaining', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        // Current months remaining
        fc.integer({ min: 1, max: 60 }),
        // Extra months to save (making monthsToSave >= currentMonthsRemaining)
        fc.integer({ min: 0, max: 60 }),
        fc.integer({ min: 1, max: 100_000 }),
        (remainingAmount, currentMonthsRemaining, extraMonths, currentMonthlySavings) => {
          // monthsToSave >= currentMonthsRemaining means newMonths <= 0
          const monthsToSave = currentMonthsRemaining + extraMonths

          const result = calculateAccelerationSavings(
            remainingAmount,
            currentMonthsRemaining,
            monthsToSave,
            currentMonthlySavings
          )

          expect(result).toBe(Infinity)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 0 when current savings already exceed required rate', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000 }),
        fc.integer({ min: 12, max: 120 }),
        fc.integer({ min: 1, max: 6 }),
        (remainingAmount, currentMonthsRemaining, monthsToSave) => {
          // Calculate what the required savings would be
          const newMonths = currentMonthsRemaining - monthsToSave
          const requiredMonthlySavings = remainingAmount / newMonths
          
          // Set current savings higher than required
          const currentMonthlySavings = requiredMonthlySavings + 1000

          const result = calculateAccelerationSavings(
            remainingAmount,
            currentMonthsRemaining,
            monthsToSave,
            currentMonthlySavings
          )

          expect(result).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * Additional tests for suggestOptimalOrdering
 */
describe('suggestOptimalOrdering', () => {
  it('should order goals by remaining amount (smallest first)', () => {
    fc.assert(
      fc.property(
        // Generate array of 2-5 goals with different remaining amounts
        fc.array(
          fc.record({
            target: fc.integer({ min: 1000, max: 100_000 }),
            current: fc.integer({ min: 0, max: 50_000 }),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        (goalData) => {
          // Create TimelineGoal objects
          const goals: TimelineGoal[] = goalData.map((g, i) => ({
            goal: {
              id: `goal-${i}`,
              name: `Goal ${i}`,
              target: g.target,
              current: Math.min(g.current, g.target - 1), // Ensure not achieved
              status: 'ACTIVE',
            },
            projection: createMockProjection(`goal-${i}`),
            priority: i + 1,
            milestones: [],
          }))

          const result = suggestOptimalOrdering(goals)

          // Verify ordering: each goal's remaining amount should be <= next goal's
          for (let i = 0; i < result.length - 1; i++) {
            const remainingCurrent = result[i].goal.target - result[i].goal.current
            const remainingNext = result[i + 1].goal.target - result[i + 1].goal.current
            expect(remainingCurrent).toBeLessThanOrEqual(remainingNext)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should not modify original array', () => {
    const goals: TimelineGoal[] = [
      createMockTimelineGoal('1', 10000, 2000),
      createMockTimelineGoal('2', 5000, 1000),
    ]
    const originalOrder = goals.map(g => g.goal.id)

    suggestOptimalOrdering(goals)

    expect(goals.map(g => g.goal.id)).toEqual(originalOrder)
  })
})

/**
 * Additional tests for calculateRecommendationImpact
 */
describe('calculateRecommendationImpact', () => {
  it('should calculate positive timeline savings when additional savings are provided', () => {
    fc.assert(
      fc.property(
        // Remaining amount
        fc.integer({ min: 10_000, max: 1_000_000 }),
        // Current monthly savings (positive)
        fc.integer({ min: 1000, max: 50_000 }),
        // Additional monthly savings (positive)
        fc.integer({ min: 100, max: 10_000 }),
        (remainingAmount, currentMonthlySavings, additionalMonthlySavings) => {
          const goals: TimelineGoal[] = [
            createMockTimelineGoal('1', remainingAmount + 1000, 1000),
          ]

          const result = calculateRecommendationImpact(
            goals,
            additionalMonthlySavings,
            currentMonthlySavings
          )

          // With additional savings, timeline should be shortened
          expect(result.timelineSavings).toBeGreaterThanOrEqual(0)
          expect(result.additionalSavingsNeeded).toBe(additionalMonthlySavings)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return empty affected goals when all goals are achieved', () => {
    const goals: TimelineGoal[] = [
      createMockTimelineGoal('1', 10000, 10000), // Already achieved
      createMockTimelineGoal('2', 5000, 6000),   // Already achieved
    ]

    const result = calculateRecommendationImpact(goals, 1000, 5000)

    expect(result.affectedGoals).toHaveLength(0)
    expect(result.timelineSavings).toBe(0)
  })
})

// Helper functions
function createMockProjection(goalId: string): GoalProjection {
  return {
    goalId,
    projectedDate: new Date('2025-12-31'),
    confidenceLevel: 'medium',
    requiredSavingRate: 1000,
    currentProgress: 50,
    monthsRemaining: 12,
    isOnTrack: true,
  }
}

function createMockTimelineGoal(
  id: string,
  target: number,
  current: number
): TimelineGoal {
  return {
    goal: {
      id,
      name: `Goal ${id}`,
      target,
      current,
      status: 'ACTIVE',
    },
    projection: createMockProjection(id),
    priority: 1,
    milestones: [],
  }
}
