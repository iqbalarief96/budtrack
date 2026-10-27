import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  shouldGenerateSpendingIncreaseInsight,
  calculatePercentageIncrease,
  generateSpendingIncreaseInsight,
  shouldGenerateAbsenceInsight,
  generateAbsenceInsight,
  shouldGenerateWeekendPatternInsight,
  generateWeekendPatternInsight,
  calculateWeekendWeekdaySpending,
  calculateDaysSince,
  SPENDING_INCREASE_THRESHOLD,
  ABSENCE_DAYS_THRESHOLD,
  WEEKEND_PATTERN_THRESHOLD,
} from '../insight-service'

/**
 * **Feature: spending-insights, Property 9: Spending Increase Insight Generation**
 * **Validates: Requirements 3.1**
 *
 * For any category with spending increase, an insight SHALL be generated
 * if and only if increase > 20%.
 */
describe('Property 9: Spending Increase Insight Generation', () => {
  it('should generate insight when increase is greater than 20%', () => {
    fc.assert(
      fc.property(
        // Previous amount (positive, non-zero)
        fc.integer({ min: 100, max: 1000000 }),
        // Increase percentage (> 20%, using 21-200 to ensure > 20%)
        fc.integer({ min: 21, max: 200 }),
        (previousAmount, increasePercent) => {
          const currentAmount = previousAmount * (1 + increasePercent / 100)

          const result = shouldGenerateSpendingIncreaseInsight(currentAmount, previousAmount)

          expect(result).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should NOT generate insight when increase is 20% or less', () => {
    fc.assert(
      fc.property(
        // Previous amount (positive, non-zero)
        fc.integer({ min: 100, max: 1000000 }),
        // Increase percentage (0-20%, using 0-19 to ensure <= 20%)
        fc.integer({ min: 0, max: 19 }),
        (previousAmount, increasePercent) => {
          const currentAmount = previousAmount * (1 + increasePercent / 100)

          const result = shouldGenerateSpendingIncreaseInsight(currentAmount, previousAmount)

          expect(result).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should NOT generate insight when spending decreases', () => {
    fc.assert(
      fc.property(
        // Previous amount (positive, non-zero)
        fc.integer({ min: 100, max: 1000000 }),
        // Decrease percentage (1-99%)
        fc.integer({ min: 1, max: 99 }),
        (previousAmount, decreasePercent) => {
          const currentAmount = previousAmount * (1 - decreasePercent / 100)

          const result = shouldGenerateSpendingIncreaseInsight(currentAmount, previousAmount)

          expect(result).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should generate insight when previous is 0 and current is positive', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        (currentAmount) => {
          const result = shouldGenerateSpendingIncreaseInsight(currentAmount, 0)

          expect(result).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should NOT generate insight when both are 0', () => {
    const result = shouldGenerateSpendingIncreaseInsight(0, 0)
    expect(result).toBe(false)
  })

  it('should return exactly at 20% boundary (not generate)', () => {
    // Exactly 20% increase should NOT generate (need > 20%)
    const previousAmount = 100
    const currentAmount = 120 // Exactly 20% increase

    const result = shouldGenerateSpendingIncreaseInsight(currentAmount, previousAmount)

    expect(result).toBe(false)
  })

  it('should return just above 20% boundary (generate)', () => {
    // Just above 20% should generate
    const previousAmount = 100
    const currentAmount = 120.01 // Just above 20%

    const result = shouldGenerateSpendingIncreaseInsight(currentAmount, previousAmount)

    expect(result).toBe(true)
  })

  /**
   * Regression: floating point noise at the exact boundary.
   *
   * Values such as 107 * 1.2 = 128.4 produce a ratio of 0.20000000000000007,
   * which used to be treated as "greater than 20%" and generate an insight.
   * These cases must be deterministic and never generate.
   */
  it('should NOT generate at exactly 20% for values that hit float error', () => {
    const boundaryCases: Array<[number, number]> = [
      [107, 128.4],
      [112, 134.4],
      [999999, 1199998.8],
      [137, 164.4],
    ]

    for (const [previousAmount, currentAmount] of boundaryCases) {
      expect(
        shouldGenerateSpendingIncreaseInsight(currentAmount, previousAmount)
      ).toBe(false)
    }
  })

  it('should still generate for a clear increase despite float noise', () => {
    // 107 -> 128.41 is genuinely > 20%
    expect(shouldGenerateSpendingIncreaseInsight(128.41, 107)).toBe(true)
  })


  it('should calculate correct percentage increase', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        fc.integer({ min: 1, max: 1000000 }),
        (currentAmount, previousAmount) => {
          const result = calculatePercentageIncrease(currentAmount, previousAmount)

          const expected = ((currentAmount - previousAmount) / previousAmount) * 100

          expect(result).toBeCloseTo(expected, 5)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('generateSpendingIncreaseInsight should return insight only when threshold exceeded', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.integer({ min: 100, max: 1000000 }),
        fc.integer({ min: 0, max: 200 }),
        fc.uuid(),
        (categoryId, categoryName, previousAmount, changePercent, userId) => {
          const currentAmount = previousAmount * (1 + changePercent / 100)

          const result = generateSpendingIncreaseInsight(
            categoryId,
            categoryName,
            currentAmount,
            previousAmount,
            userId
          )

          const shouldGenerate = changePercent > 20

          if (shouldGenerate) {
            expect(result).not.toBeNull()
            expect(result?.type).toBe('spending_increase')
            expect(result?.categoryId).toBe(categoryId)
            expect(result?.userId).toBe(userId)
          } else {
            expect(result).toBeNull()
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * Additional tests for absence and weekend pattern insights
 * These support the main insight generation functionality
 */
describe('Absence Insight Generation', () => {
  it('should generate absence insight when days >= 14', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 14, max: 365 }),
        (daysSinceLastSpend) => {
          const result = shouldGenerateAbsenceInsight(daysSinceLastSpend)
          expect(result).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should NOT generate absence insight when days < 14', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 13 }),
        (daysSinceLastSpend) => {
          const result = shouldGenerateAbsenceInsight(daysSinceLastSpend)
          expect(result).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('generateAbsenceInsight should return insight only when threshold met', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.integer({ min: 0, max: 100 }),
        fc.uuid(),
        (categoryId, categoryName, daysSinceLastSpend, userId) => {
          const result = generateAbsenceInsight(
            categoryId,
            categoryName,
            daysSinceLastSpend,
            userId
          )

          const shouldGenerate = daysSinceLastSpend >= 14

          if (shouldGenerate) {
            expect(result).not.toBeNull()
            expect(result?.type).toBe('absence')
          } else {
            expect(result).toBeNull()
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Weekend Pattern Insight Generation', () => {
  it('should generate weekend pattern insight when difference > 30%', () => {
    fc.assert(
      fc.property(
        // Base amount (the smaller value)
        fc.integer({ min: 100, max: 100000 }),
        // Difference percentage (> 30%, using 31-200)
        // The formula: difference/max > threshold
        // If weekendAvg = base and weekdayAvg = base * (1 + diff/100)
        // Then difference = base * diff/100, max = base * (1 + diff/100)
        // So ratio = (diff/100) / (1 + diff/100) = diff / (100 + diff)
        // For ratio > 0.30: diff / (100 + diff) > 0.30
        // diff > 0.30 * (100 + diff) => diff > 30 + 0.30*diff => 0.70*diff > 30 => diff > 42.86
        // So we need differencePercent > 43 to guarantee > 30% difference
        fc.integer({ min: 44, max: 200 }),
        (baseAmount, differencePercent) => {
          // Always use the larger value as the higher one
          const smallerValue = baseAmount
          const largerValue = baseAmount * (1 + differencePercent / 100)

          const result = shouldGenerateWeekendPatternInsight(largerValue, smallerValue)

          expect(result).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should NOT generate weekend pattern insight when difference <= 30%', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 100000 }),
        // For ratio <= 0.30: diff / (100 + diff) <= 0.30
        // diff <= 0.30 * (100 + diff) => diff <= 30 + 0.30*diff => 0.70*diff <= 30 => diff <= 42.86
        // So we need differencePercent <= 42 to guarantee <= 30% difference
        fc.integer({ min: 0, max: 42 }),
        (baseAmount, differencePercent) => {
          const smallerValue = baseAmount
          const largerValue = baseAmount * (1 + differencePercent / 100)

          const result = shouldGenerateWeekendPatternInsight(largerValue, smallerValue)

          expect(result).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should NOT generate when both values are 0', () => {
    const result = shouldGenerateWeekendPatternInsight(0, 0)
    expect(result).toBe(false)
  })

  it('generateWeekendPatternInsight should return insight only when threshold exceeded', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 100000 }),
        fc.integer({ min: 0, max: 200 }),
        fc.uuid(),
        (baseAmount, differencePercent, userId) => {
          const smallerValue = baseAmount
          const largerValue = baseAmount * (1 + differencePercent / 100)

          const result = generateWeekendPatternInsight(largerValue, smallerValue, userId)

          // Calculate actual percentage difference using the same formula as the function
          // difference / max > threshold
          // diff / (100 + diff) > 0.30 means diff > 42.86
          const shouldGenerate = differencePercent > 42.86

          if (shouldGenerate) {
            expect(result).not.toBeNull()
            expect(result?.type).toBe('weekend_pattern')
          } else {
            expect(result).toBeNull()
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Utility Functions', () => {
  it('calculateDaysSince should return correct number of days', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 365 }),
        (daysAgo) => {
          const referenceDate = new Date('2024-06-15')
          const lastDate = new Date(referenceDate)
          lastDate.setDate(lastDate.getDate() - daysAgo)

          const result = calculateDaysSince(lastDate, referenceDate)

          expect(result).toBe(daysAgo)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('calculateDaysSince should return Infinity for null date', () => {
    const result = calculateDaysSince(null)
    expect(result).toBe(Infinity)
  })

  it('calculateWeekendWeekdaySpending should correctly categorize transactions', () => {
    // Create transactions on known dates
    // Saturday June 15, 2024
    const saturdayTx = { id: '1', amount: 100, date: new Date('2024-06-15'), categoryId: null }
    // Sunday June 16, 2024
    const sundayTx = { id: '2', amount: 200, date: new Date('2024-06-16'), categoryId: null }
    // Monday June 17, 2024
    const mondayTx = { id: '3', amount: 50, date: new Date('2024-06-17'), categoryId: null }
    // Tuesday June 18, 2024
    const tuesdayTx = { id: '4', amount: 75, date: new Date('2024-06-18'), categoryId: null }

    const result = calculateWeekendWeekdaySpending([saturdayTx, sundayTx, mondayTx, tuesdayTx])

    expect(result.weekendCount).toBe(2)
    expect(result.weekdayCount).toBe(2)
    expect(result.weekendTotal).toBe(300) // 100 + 200
    expect(result.weekdayTotal).toBe(125) // 50 + 75
    expect(result.weekendAverage).toBe(150) // 300 / 2
    expect(result.weekdayAverage).toBe(62.5) // 125 / 2
  })
})
