import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  detectSpendingSpike,
  detectLargeTransaction,
  detectFrequencyChange,
  calculateSeverity,
  calculateBaseline,
  calculateDeviation,
  detectAnomalies,
  TransactionForAnomaly,
} from '../anomaly-service'
import { SEVERITY_THRESHOLDS, DEFAULT_ANOMALY_CONFIG } from '@/app/types/spending-insights'

/**
 * **Feature: spending-insights, Property 5: Spending Spike Detection**
 * **Validates: Requirements 2.1**
 *
 * For any current spending and baseline, a spike anomaly SHALL be generated
 * if and only if current > baseline * 1.5.
 */
describe('Property 5: Spending Spike Detection', () => {
  it('should detect spike when current > baseline * 1.5', () => {
    fc.assert(
      fc.property(
        // Baseline amount (positive)
        fc.integer({ min: 100, max: 1000000 }),
        // Extra percentage above 50% (51% to 200%)
        fc.integer({ min: 51, max: 200 }),
        (baseline, extraPercent) => {
          // Current is baseline * (1 + extraPercent/100), which is > baseline * 1.5
          const current = baseline * (1 + extraPercent / 100)
          
          const result = detectSpendingSpike(current, baseline, 0.5)
          
          expect(result).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should NOT detect spike when current <= baseline * 1.5', () => {
    fc.assert(
      fc.property(
        // Baseline amount (positive)
        fc.integer({ min: 100, max: 1000000 }),
        // Percentage at or below 50% (0% to 49%)
        fc.integer({ min: 0, max: 49 }),
        (baseline, percent) => {
          // Current is baseline * (1 + percent/100), which is <= baseline * 1.5
          const current = baseline * (1 + percent / 100)
          
          const result = detectSpendingSpike(current, baseline, 0.5)
          
          expect(result).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should detect spike at exactly 50% boundary as false (not strictly greater)', () => {
    // Test exact boundary: current = baseline * 1.5 should be false (not > 1.5)
    const baseline = 1000
    const current = baseline * 1.5 // Exactly 50% above
    
    const result = detectSpendingSpike(current, baseline, 0.5)
    
    expect(result).toBe(false)
  })

  it('should detect spike when baseline is 0 and current is positive', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        (current) => {
          const result = detectSpendingSpike(current, 0, 0.5)
          expect(result).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should NOT detect spike when both baseline and current are 0', () => {
    const result = detectSpendingSpike(0, 0, 0.5)
    expect(result).toBe(false)
  })

  it('should work with custom threshold', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1000000 }),
        fc.integer({ min: 10, max: 100 }), // Custom threshold percentage
        fc.integer({ min: 1, max: 100 }), // Extra above threshold
        (baseline, thresholdPercent, extra) => {
          const threshold = thresholdPercent / 100
          const current = baseline * (1 + threshold + extra / 100)
          
          const result = detectSpendingSpike(current, baseline, threshold)
          
          expect(result).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * **Feature: spending-insights, Property 6: Large Transaction Detection**
 * **Validates: Requirements 2.2**
 *
 * For any transaction amount and category average, a large transaction anomaly
 * SHALL be generated if and only if amount > categoryAverage * 3.
 */
describe('Property 6: Large Transaction Detection', () => {
  it('should detect large transaction when amount > categoryAverage * 3', () => {
    fc.assert(
      fc.property(
        // Category average (positive)
        fc.integer({ min: 100, max: 100000 }),
        // Multiplier above 3 (3.01 to 10)
        fc.double({ min: 3.01, max: 10, noNaN: true }),
        (categoryAverage, multiplier) => {
          const amount = categoryAverage * multiplier
          
          const result = detectLargeTransaction(amount, categoryAverage, 3)
          
          expect(result).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should NOT detect large transaction when amount <= categoryAverage * 3', () => {
    fc.assert(
      fc.property(
        // Category average (positive)
        fc.integer({ min: 100, max: 100000 }),
        // Multiplier at or below 3 (0.1 to 2.99)
        fc.double({ min: 0.1, max: 2.99, noNaN: true }),
        (categoryAverage, multiplier) => {
          const amount = categoryAverage * multiplier
          
          const result = detectLargeTransaction(amount, categoryAverage, 3)
          
          expect(result).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should NOT detect large transaction at exactly 3x boundary', () => {
    // Test exact boundary: amount = categoryAverage * 3 should be false (not > 3x)
    const categoryAverage = 1000
    const amount = categoryAverage * 3 // Exactly 3x
    
    const result = detectLargeTransaction(amount, categoryAverage, 3)
    
    expect(result).toBe(false)
  })

  it('should detect large transaction when categoryAverage is 0 and amount is positive', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000000 }),
        (amount) => {
          const result = detectLargeTransaction(amount, 0, 3)
          expect(result).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle negative amounts by using absolute value', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 100000 }),
        fc.double({ min: 3.01, max: 10, noNaN: true }),
        (categoryAverage, multiplier) => {
          const amount = -(categoryAverage * multiplier) // Negative amount
          
          const result = detectLargeTransaction(amount, categoryAverage, 3)
          
          expect(result).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should work with custom multiplier', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 100000 }),
        fc.integer({ min: 2, max: 10 }), // Custom multiplier
        fc.double({ min: 0.01, max: 2, noNaN: true }), // Extra above multiplier
        (categoryAverage, customMultiplier, extra) => {
          const amount = categoryAverage * (customMultiplier + extra)
          
          const result = detectLargeTransaction(amount, categoryAverage, customMultiplier)
          
          expect(result).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * **Feature: spending-insights, Property 7: Frequency Change Detection**
 * **Validates: Requirements 2.3**
 *
 * For any current and baseline frequency values, a frequency change anomaly
 * SHALL be generated if and only if |current - baseline| / baseline > 0.4.
 */
describe('Property 7: Frequency Change Detection', () => {
  it('should detect frequency change when |current - baseline| / baseline > 0.4', () => {
    fc.assert(
      fc.property(
        // Baseline frequency (positive)
        fc.integer({ min: 10, max: 1000 }),
        // Change percentage above 40% (41% to 200%)
        fc.integer({ min: 41, max: 200 }),
        // Direction (increase or decrease)
        fc.boolean(),
        (baseline, changePercent, isIncrease) => {
          const change = baseline * (changePercent / 100)
          const current = isIncrease ? baseline + change : Math.max(0, baseline - change)
          
          // Only test if the actual change is > 40%
          const actualChange = Math.abs(current - baseline) / baseline
          if (actualChange <= 0.4) return // Skip edge cases where rounding affects result
          
          const result = detectFrequencyChange(current, baseline, 0.4)
          
          expect(result).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should NOT detect frequency change when |current - baseline| / baseline <= 0.4', () => {
    fc.assert(
      fc.property(
        // Baseline frequency (positive)
        fc.integer({ min: 10, max: 1000 }),
        // Change percentage at or below 40% (0% to 39%)
        fc.integer({ min: 0, max: 39 }),
        // Direction (increase or decrease)
        fc.boolean(),
        (baseline, changePercent, isIncrease) => {
          const change = baseline * (changePercent / 100)
          const current = isIncrease ? baseline + change : baseline - change
          
          const result = detectFrequencyChange(current, baseline, 0.4)
          
          expect(result).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should NOT detect frequency change at exactly 40% boundary', () => {
    // Test exact boundary: change = 40% should be false (not > 40%)
    const baseline = 100
    const current = baseline * 1.4 // Exactly 40% increase
    
    const result = detectFrequencyChange(current, baseline, 0.4)
    
    expect(result).toBe(false)
  })

  it('should detect frequency change when baseline is 0 and current is positive', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        (current) => {
          const result = detectFrequencyChange(current, 0, 0.4)
          expect(result).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should NOT detect frequency change when both are 0', () => {
    const result = detectFrequencyChange(0, 0, 0.4)
    expect(result).toBe(false)
  })

  it('should work with custom threshold', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 1000 }),
        fc.integer({ min: 10, max: 90 }), // Custom threshold percentage
        fc.integer({ min: 1, max: 50 }), // Extra above threshold
        (baseline, thresholdPercent, extra) => {
          const threshold = thresholdPercent / 100
          const current = baseline * (1 + threshold + extra / 100)
          
          const result = detectFrequencyChange(current, baseline, threshold)
          
          expect(result).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})


/**
 * **Feature: spending-insights, Property 8: Severity Assignment Consistency**
 * **Validates: Requirements 2.4**
 *
 * For any deviation percentage, severity SHALL be assigned as:
 * - low: 10-30%
 * - medium: 30-60%
 * - high: >60%
 */
describe('Property 8: Severity Assignment Consistency', () => {
  it('should assign low severity for deviations 10-29%', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 29 }),
        (deviation) => {
          const result = calculateSeverity(deviation)
          expect(result).toBe('low')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should assign medium severity for deviations 30-59%', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 30, max: 59 }),
        (deviation) => {
          const result = calculateSeverity(deviation)
          expect(result).toBe('medium')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should assign high severity for deviations >= 60%', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 60, max: 500 }),
        (deviation) => {
          const result = calculateSeverity(deviation)
          expect(result).toBe('high')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should assign low severity for deviations < 10%', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 9 }),
        (deviation) => {
          const result = calculateSeverity(deviation)
          expect(result).toBe('low')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle negative deviations by using absolute value', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -500, max: -60 }),
        (deviation) => {
          const result = calculateSeverity(deviation)
          expect(result).toBe('high')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should assign correct severity at exact boundaries', () => {
    // At 30% boundary - should be medium
    expect(calculateSeverity(30)).toBe('medium')
    
    // At 60% boundary - should be high
    expect(calculateSeverity(60)).toBe('high')
    
    // Just below 30% - should be low
    expect(calculateSeverity(29.9)).toBe('low')
    
    // Just below 60% - should be medium
    expect(calculateSeverity(59.9)).toBe('medium')
  })

  it('should be consistent: same deviation always produces same severity', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500 }),
        (deviation) => {
          const result1 = calculateSeverity(deviation)
          const result2 = calculateSeverity(deviation)
          const result3 = calculateSeverity(deviation)
          
          expect(result1).toBe(result2)
          expect(result2).toBe(result3)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should follow monotonic severity increase with deviation', () => {
    // Higher deviation should never result in lower severity
    const severityOrder = { low: 0, medium: 1, high: 2 }
    
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 400 }),
        fc.integer({ min: 1, max: 100 }),
        (baseDeviation, extra) => {
          const lowerDeviation = baseDeviation
          const higherDeviation = baseDeviation + extra
          
          const lowerSeverity = calculateSeverity(lowerDeviation)
          const higherSeverity = calculateSeverity(higherDeviation)
          
          expect(severityOrder[higherSeverity]).toBeGreaterThanOrEqual(severityOrder[lowerSeverity])
        }
      ),
      { numRuns: 100 }
    )
  })
})
