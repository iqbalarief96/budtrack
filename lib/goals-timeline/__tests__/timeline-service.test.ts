import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  sortByPriority,
  detectMilestone,
  detectNewMilestone,
  checkBehindSchedule,
  calculateProjectedProgress,
} from '../timeline-service'
import type { TimelineGoal, GoalProjection, Milestone } from '@/app/types/goals-timeline'

// Helper to create a mock TimelineGoal for testing
function createMockTimelineGoal(
  id: string,
  priority: number,
  progress: number = 50
): TimelineGoal {
  const projection: GoalProjection = {
    goalId: id,
    projectedDate: new Date('2025-12-31'),
    confidenceLevel: 'medium',
    requiredSavingRate: 1000,
    currentProgress: progress,
    monthsRemaining: 12,
    isOnTrack: true,
  }

  const milestones: Milestone[] = [
    { percentage: 25, targetDate: new Date('2025-03-31'), isAchieved: progress >= 25 },
    { percentage: 50, targetDate: new Date('2025-06-30'), isAchieved: progress >= 50 },
    { percentage: 75, targetDate: new Date('2025-09-30'), isAchieved: progress >= 75 },
    { percentage: 100, targetDate: new Date('2025-12-31'), isAchieved: progress >= 100 },
  ]

  return {
    goal: {
      id,
      name: `Goal ${id}`,
      target: 10000,
      current: progress * 100,
      deadline: new Date('2025-12-31'),
      status: 'ONGOING',
    },
    projection,
    priority,
    milestones,
  }
}

/**
 * **Feature: financial-goals-timeline, Property 9: Priority Ordering**
 * **Validates: Requirements 3.1, 3.2**
 *
 * For any set of goals with priorities, goals SHALL be returned in ascending priority order (1 = highest).
 */
describe('Property 9: Priority Ordering', () => {
  it('should sort goals in ascending priority order (1 = highest)', () => {
    fc.assert(
      fc.property(
        // Generate array of unique priorities (1 to 100)
        fc.array(
          fc.integer({ min: 1, max: 100 }),
          { minLength: 1, maxLength: 20 }
        ),
        (priorities) => {
          // Create goals with these priorities
          const goals = priorities.map((priority, index) =>
            createMockTimelineGoal(`goal-${index}`, priority)
          )

          // Sort using our function
          const sorted = sortByPriority(goals)

          // Verify ascending order
          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i].priority).toBeGreaterThanOrEqual(sorted[i - 1].priority)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve all goals after sorting', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.integer({ min: 1, max: 100 }),
          { minLength: 1, maxLength: 20 }
        ),
        (priorities) => {
          const goals = priorities.map((priority, index) =>
            createMockTimelineGoal(`goal-${index}`, priority)
          )

          const sorted = sortByPriority(goals)

          // Same length
          expect(sorted.length).toBe(goals.length)

          // All original goals present
          const originalIds = goals.map(g => g.goal.id).sort()
          const sortedIds = sorted.map(g => g.goal.id).sort()
          expect(sortedIds).toEqual(originalIds)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should not modify the original array', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.integer({ min: 1, max: 100 }),
          { minLength: 2, maxLength: 10 }
        ),
        (priorities) => {
          const goals = priorities.map((priority, index) =>
            createMockTimelineGoal(`goal-${index}`, priority)
          )
          const originalOrder = goals.map(g => g.goal.id)

          sortByPriority(goals)

          // Original array unchanged
          const afterOrder = goals.map(g => g.goal.id)
          expect(afterOrder).toEqual(originalOrder)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle empty array', () => {
    const result = sortByPriority([])
    expect(result).toEqual([])
  })

  it('should handle single element array', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (priority) => {
          const goals = [createMockTimelineGoal('goal-1', priority)]
          const sorted = sortByPriority(goals)

          expect(sorted.length).toBe(1)
          expect(sorted[0].priority).toBe(priority)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle goals with same priority (stable sort)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 2, max: 10 }),
        (priority, count) => {
          // All goals have same priority
          const goals = Array.from({ length: count }, (_, i) =>
            createMockTimelineGoal(`goal-${i}`, priority)
          )

          const sorted = sortByPriority(goals)

          // All should have same priority
          sorted.forEach(g => {
            expect(g.priority).toBe(priority)
          })
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * **Feature: financial-goals-timeline, Property 10: Milestone Detection**
 * **Validates: Requirements 5.1**
 *
 * For any progress percentage, milestone detection SHALL correctly identify
 * when progress crosses 25%, 50%, 75%, or 100% thresholds.
 */
describe('Property 10: Milestone Detection', () => {
  it('should return 100 for progress >= 100', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 200 }),
        (progress) => {
          const result = detectMilestone(progress)
          expect(result).toBe(100)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 75 for progress >= 75 and < 100', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 75, max: 99 }),
        (progress) => {
          const result = detectMilestone(progress)
          expect(result).toBe(75)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 50 for progress >= 50 and < 75', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 50, max: 74 }),
        (progress) => {
          const result = detectMilestone(progress)
          expect(result).toBe(50)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 25 for progress >= 25 and < 50', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 25, max: 49 }),
        (progress) => {
          const result = detectMilestone(progress)
          expect(result).toBe(25)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return null for progress < 25', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 24 }),
        (progress) => {
          const result = detectMilestone(progress)
          expect(result).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return correct milestone for any valid progress', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 150 }),
        (progress) => {
          const result = detectMilestone(progress)

          if (progress >= 100) {
            expect(result).toBe(100)
          } else if (progress >= 75) {
            expect(result).toBe(75)
          } else if (progress >= 50) {
            expect(result).toBe(50)
          } else if (progress >= 25) {
            expect(result).toBe(25)
          } else {
            expect(result).toBeNull()
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  // Test detectNewMilestone
  it('should detect newly crossed milestone', () => {
    fc.assert(
      fc.property(
        // Previous progress (0-99)
        fc.integer({ min: 0, max: 99 }),
        // Progress increase (1-100)
        fc.integer({ min: 1, max: 100 }),
        (previous, increase) => {
          const current = Math.min(previous + increase, 150)
          const result = detectNewMilestone(previous, current)

          // Check if any threshold was crossed
          const thresholds = [25, 50, 75, 100]
          let expectedMilestone: number | null = null

          for (const threshold of thresholds) {
            if (previous < threshold && current >= threshold) {
              expectedMilestone = threshold
              break // Return first crossed milestone
            }
          }

          expect(result).toBe(expectedMilestone)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return null when no new milestone is crossed', () => {
    fc.assert(
      fc.property(
        // Progress within same milestone range
        fc.integer({ min: 26, max: 49 }),
        fc.integer({ min: 26, max: 49 }),
        (previous, current) => {
          // Both in 25-49 range, no new milestone
          const result = detectNewMilestone(previous, current)
          expect(result).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return null when progress decreases', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 50, max: 100 }),
        fc.integer({ min: 0, max: 49 }),
        (previous, current) => {
          // Progress went down, no new milestone
          const result = detectNewMilestone(previous, current)
          expect(result).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * **Feature: financial-goals-timeline, Property 11: Behind Schedule Alert**
 * **Validates: Requirements 5.3**
 *
 * For any actual and projected progress values, an alert SHALL be generated
 * if and only if (projected - actual) / projected > 0.1.
 */
describe('Property 11: Behind Schedule Alert', () => {
  it('should return true when gap > 10%', () => {
    fc.assert(
      fc.property(
        // Projected progress (must be > 0 to calculate gap)
        fc.integer({ min: 20, max: 100 }),
        // Gap percentage > 10%
        fc.integer({ min: 11, max: 50 }),
        (projected, gapPercent) => {
          // Calculate actual that creates the desired gap
          const actual = projected - (projected * gapPercent / 100)
          
          const result = checkBehindSchedule(actual, projected)
          expect(result).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return false when gap <= 10%', () => {
    fc.assert(
      fc.property(
        // Projected progress (must be > 0)
        fc.integer({ min: 20, max: 100 }),
        // Gap percentage < 10% (use 0-9 to avoid boundary)
        fc.integer({ min: 0, max: 9 }),
        (projected, gapPercent) => {
          // Calculate actual that creates the desired gap
          const actual = projected - (projected * gapPercent / 100)
          
          const result = checkBehindSchedule(actual, projected)
          expect(result).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return false when projected is 0 or negative', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: -100, max: 0 }),
        (actual, projected) => {
          const result = checkBehindSchedule(actual, projected)
          expect(result).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return false when actual >= projected', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 0, max: 50 }),
        (projected, extra) => {
          const actual = projected + extra
          
          const result = checkBehindSchedule(actual, projected)
          expect(result).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should correctly calculate gap formula: (projected - actual) / projected > 0.1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (projected, actual) => {
          const result = checkBehindSchedule(actual, projected)
          
          // Calculate expected result using the formula
          const gap = projected > 0 ? (projected - actual) / projected : 0
          const expected = gap > 0.1
          
          expect(result).toBe(expected)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Boundary tests
  it('should return false at exactly 10% gap', () => {
    const projected = 100
    const actual = 90 // Exactly 10% gap
    
    const result = checkBehindSchedule(actual, projected)
    expect(result).toBe(false)
  })

  it('should return true at 10.1% gap', () => {
    const projected = 100
    const actual = 89.9 // 10.1% gap
    
    const result = checkBehindSchedule(actual, projected)
    expect(result).toBe(true)
  })
})

/**
 * Additional tests for calculateProjectedProgress
 */
describe('Calculate Projected Progress', () => {
  it('should return 0 at start date', () => {
    const startDate = new Date('2024-01-01')
    const endDate = new Date('2024-12-31')
    
    const result = calculateProjectedProgress(startDate, endDate, startDate)
    expect(result).toBeCloseTo(0, 1)
  })

  it('should return 100 at or after end date', () => {
    const startDate = new Date('2024-01-01')
    const endDate = new Date('2024-12-31')
    const afterEnd = new Date('2025-01-15')
    
    const result = calculateProjectedProgress(startDate, endDate, afterEnd)
    expect(result).toBe(100)
  })

  it('should return approximately 50 at midpoint', () => {
    const startDate = new Date('2024-01-01')
    const endDate = new Date('2024-12-31')
    const midpoint = new Date('2024-07-01')
    
    const result = calculateProjectedProgress(startDate, endDate, midpoint)
    // Allow some tolerance for date calculation differences
    expect(result).toBeGreaterThan(45)
    expect(result).toBeLessThan(55)
  })

  it('should return progress proportional to elapsed time', () => {
    fc.assert(
      fc.property(
        // Days from start (0 to 365)
        fc.integer({ min: 0, max: 365 }),
        (daysElapsed) => {
          const startDate = new Date('2024-01-01')
          const endDate = new Date('2024-12-31')
          const currentDate = new Date(startDate)
          currentDate.setDate(currentDate.getDate() + daysElapsed)
          
          const result = calculateProjectedProgress(startDate, endDate, currentDate)
          
          // Result should be between 0 and 100
          expect(result).toBeGreaterThanOrEqual(0)
          expect(result).toBeLessThanOrEqual(100)
          
          // Progress should increase with elapsed time
          const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
          const expectedProgress = (daysElapsed / totalDays) * 100
          const clampedExpected = Math.max(0, Math.min(100, expectedProgress))
          
          expect(result).toBeCloseTo(clampedExpected, 1)
        }
      ),
      { numRuns: 100 }
    )
  })
})
