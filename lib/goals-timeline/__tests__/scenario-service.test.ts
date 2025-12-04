import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  calculateScenarioImpact,
  compareScenarios,
  GoalForScenario,
} from '../scenario-service'
import { Scenario, GoalAdjustment } from '@/app/types/goals-timeline'

/**
 * **Feature: financial-goals-timeline, Property 12: Scenario Impact Calculation**
 * **Validates: Requirements 4.3, 4.5**
 *
 * For any scenario with adjusted monthly savings, new projected dates
 * SHALL be recalculated using the adjusted values.
 */
describe('Property 12: Scenario Impact Calculation', () => {
  // Generator for goals
  const goalArbitrary = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    target: fc.integer({ min: 1000, max: 10_000_000 }),
    current: fc.integer({ min: 0, max: 5_000_000 }),
    deadline: fc.option(
      fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31') }),
      { nil: null }
    ),
  }).filter(g => g.current < g.target) // Ensure goal is not yet achieved

  it('should recalculate projected dates when monthly savings increase', () => {
    fc.assert(
      fc.property(
        // Array of 1-5 goals
        fc.array(goalArbitrary, { minLength: 1, maxLength: 5 }),
        // Base monthly savings (positive)
        fc.integer({ min: 100, max: 100_000 }),
        // Positive adjustment (increase savings)
        fc.integer({ min: 1, max: 50_000 }),
        (goals, baseMonthlySavings, adjustment) => {
          const fromDate = new Date('2024-01-01')
          
          // Calculate with no adjustment (baseline)
          const baselineProjections = calculateScenarioImpact(
            goals,
            baseMonthlySavings,
            0,
            [],
            fromDate
          )
          
          // Calculate with positive adjustment
          const adjustedProjections = calculateScenarioImpact(
            goals,
            baseMonthlySavings,
            adjustment,
            [],
            fromDate
          )

          // For each goal, new date should be <= original date (faster or same)
          for (let i = 0; i < goals.length; i++) {
            const baseline = baselineProjections[i]
            const adjusted = adjustedProjections[i]
            
            // With more savings, projected date should be earlier or same
            expect(adjusted.newDate.getTime()).toBeLessThanOrEqual(baseline.newDate.getTime())
            
            // Impact should be positive (months saved)
            expect(adjusted.impactMonths).toBeGreaterThanOrEqual(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })


  it('should recalculate projected dates when monthly savings decrease', () => {
    fc.assert(
      fc.property(
        // Array of 1-5 goals
        fc.array(goalArbitrary, { minLength: 1, maxLength: 5 }),
        // Base monthly savings (must be > adjustment to stay positive)
        fc.integer({ min: 10_000, max: 100_000 }),
        // Negative adjustment (decrease savings, but keep total positive)
        fc.integer({ min: 1, max: 5_000 }),
        (goals, baseMonthlySavings, adjustmentMagnitude) => {
          const fromDate = new Date('2024-01-01')
          const adjustment = -adjustmentMagnitude // Make it negative
          
          // Ensure adjusted savings is still positive
          if (baseMonthlySavings + adjustment <= 0) return
          
          // Calculate with no adjustment (baseline)
          const baselineProjections = calculateScenarioImpact(
            goals,
            baseMonthlySavings,
            0,
            [],
            fromDate
          )
          
          // Calculate with negative adjustment
          const adjustedProjections = calculateScenarioImpact(
            goals,
            baseMonthlySavings,
            adjustment,
            [],
            fromDate
          )

          // For each goal, new date should be >= original date (slower or same)
          for (let i = 0; i < goals.length; i++) {
            const baseline = baselineProjections[i]
            const adjusted = adjustedProjections[i]
            
            // With less savings, projected date should be later or same
            expect(adjusted.newDate.getTime()).toBeGreaterThanOrEqual(baseline.newDate.getTime())
            
            // Impact should be negative or zero (months added)
            expect(adjusted.impactMonths).toBeLessThanOrEqual(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should apply goal-specific target adjustments', () => {
    fc.assert(
      fc.property(
        // Single goal for simplicity
        goalArbitrary,
        // Base monthly savings
        fc.integer({ min: 1000, max: 50_000 }),
        // Target reduction percentage (10-50%)
        fc.integer({ min: 10, max: 50 }),
        (goal, baseMonthlySavings, reductionPercent) => {
          const fromDate = new Date('2024-01-01')
          const goals = [goal]
          
          // Calculate baseline
          const baselineProjections = calculateScenarioImpact(
            goals,
            baseMonthlySavings,
            0,
            [],
            fromDate
          )
          
          // Calculate with reduced target
          const newTarget = Math.floor(goal.target * (1 - reductionPercent / 100))
          // Ensure new target is still greater than current
          if (newTarget <= goal.current) return
          
          const goalAdjustments: GoalAdjustment[] = [{
            goalId: goal.id,
            newTargetAmount: newTarget,
          }]
          
          const adjustedProjections = calculateScenarioImpact(
            goals,
            baseMonthlySavings,
            0,
            goalAdjustments,
            fromDate
          )

          // With lower target, projected date should be earlier
          expect(adjustedProjections[0].newDate.getTime())
            .toBeLessThanOrEqual(baselineProjections[0].newDate.getTime())
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should calculate impact months correctly', () => {
    fc.assert(
      fc.property(
        goalArbitrary,
        fc.integer({ min: 1000, max: 50_000 }),
        fc.integer({ min: 100, max: 10_000 }),
        (goal, baseMonthlySavings, adjustment) => {
          const fromDate = new Date('2024-01-01')
          const goals = [goal]
          
          const projections = calculateScenarioImpact(
            goals,
            baseMonthlySavings,
            adjustment,
            [],
            fromDate
          )

          const projection = projections[0]
          
          // Impact months should be the difference between original and new dates
          if (Number.isFinite(projection.impactMonths)) {
            const expectedImpactMs = projection.originalDate.getTime() - projection.newDate.getTime()
            const expectedImpactMonths = expectedImpactMs / (1000 * 60 * 60 * 24 * 30)
            
            // Allow small tolerance for rounding
            expect(Math.abs(projection.impactMonths - expectedImpactMonths)).toBeLessThan(0.2)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return same dates when adjustment is zero', () => {
    fc.assert(
      fc.property(
        fc.array(goalArbitrary, { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 1000, max: 100_000 }),
        (goals, baseMonthlySavings) => {
          const fromDate = new Date('2024-01-01')
          
          const projections = calculateScenarioImpact(
            goals,
            baseMonthlySavings,
            0,
            [],
            fromDate
          )

          // All impact months should be 0 when no adjustment
          for (const projection of projections) {
            expect(projection.impactMonths).toBe(0)
            expect(projection.originalDate.getTime()).toBe(projection.newDate.getTime())
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * Tests for compareScenarios function
 * Requirements: 4.4
 */
describe('Compare Scenarios', () => {
  it('should identify the best scenario based on total impact', () => {
    fc.assert(
      fc.property(
        // Generate 2-3 scenarios with different impacts
        fc.integer({ min: 2, max: 3 }),
        fc.array(fc.integer({ min: -12, max: 12 }), { minLength: 1, maxLength: 5 }),
        (numScenarios, impactValues) => {
          const scenarios: Scenario[] = []
          
          for (let i = 0; i < numScenarios; i++) {
            const projections = impactValues.map((impact, idx) => ({
              goalId: `goal-${idx}`,
              originalDate: new Date('2025-06-01'),
              newDate: new Date('2025-06-01'),
              impactMonths: impact * (i + 1), // Different multiplier for each scenario
            }))
            
            scenarios.push({
              id: `scenario-${i}`,
              name: `Scenario ${i + 1}`,
              monthlySavingsAdjustment: 1000 * (i + 1),
              goalAdjustments: [],
              projections,
            })
          }
          
          const comparison = compareScenarios(scenarios)
          
          // Calculate expected best scenario
          const scenarioTotals = scenarios.map(s => ({
            id: s.id,
            total: s.projections.reduce((sum, p) => sum + p.impactMonths, 0),
          }))
          scenarioTotals.sort((a, b) => b.total - a.total)
          const expectedBest = scenarioTotals[0].id
          
          expect(comparison.bestScenario).toBe(expectedBest)
          expect(comparison.scenarios).toHaveLength(numScenarios)
          expect(comparison.summary).toBeTruthy()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle empty scenarios array', () => {
    const comparison = compareScenarios([])
    
    expect(comparison.bestScenario).toBe('')
    expect(comparison.scenarios).toHaveLength(0)
    expect(comparison.summary).toBe('No scenarios to compare')
  })

  it('should handle single scenario', () => {
    const scenario: Scenario = {
      id: 'single',
      name: 'Only Scenario',
      monthlySavingsAdjustment: 1000,
      goalAdjustments: [],
      projections: [{
        goalId: 'goal-1',
        originalDate: new Date('2025-06-01'),
        newDate: new Date('2025-03-01'),
        impactMonths: 3,
      }],
    }
    
    const comparison = compareScenarios([scenario])
    
    expect(comparison.bestScenario).toBe('single')
    expect(comparison.scenarios).toHaveLength(1)
    expect(comparison.summary).toContain('Only Scenario')
  })

  it('should generate meaningful summary', () => {
    const scenarios: Scenario[] = [
      {
        id: 'aggressive',
        name: 'Aggressive Savings',
        monthlySavingsAdjustment: 5000,
        goalAdjustments: [],
        projections: [{
          goalId: 'goal-1',
          originalDate: new Date('2025-12-01'),
          newDate: new Date('2025-06-01'),
          impactMonths: 6,
        }],
      },
      {
        id: 'moderate',
        name: 'Moderate Savings',
        monthlySavingsAdjustment: 2000,
        goalAdjustments: [],
        projections: [{
          goalId: 'goal-1',
          originalDate: new Date('2025-12-01'),
          newDate: new Date('2025-09-01'),
          impactMonths: 3,
        }],
      },
    ]
    
    const comparison = compareScenarios(scenarios)
    
    expect(comparison.summary).toContain('Aggressive Savings')
    expect(comparison.summary).toContain('Moderate Savings')
    expect(comparison.summary).toContain('saves')
  })
})
