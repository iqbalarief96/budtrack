import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateSavingRate,
  calculateAverage,
  calculateTrend,
  calculateConsistency,
  analyzeSavingRate,
} from '../saving-rate-service';
import type { SavingRateData } from '@/app/types/goals-timeline';

/**
 * **Feature: financial-goals-timeline, Property 1: Saving Rate Calculation**
 * **Validates: Requirements 2.1**
 *
 * For any income and expense values, saving rate SHALL equal ((income - expenses) / income) * 100,
 * with appropriate handling for zero income.
 */
describe('Property 1: Saving Rate Calculation', () => {
  it('should calculate saving rate as ((income - expenses) / income) * 100 for positive income', () => {
    fc.assert(
      fc.property(
        // Generate positive income (1 to 100,000,000)
        fc.integer({ min: 1, max: 100_000_000 }),
        // Generate expenses (0 to income * 2 to allow negative savings)
        fc.integer({ min: 0, max: 200_000_000 }),
        (income, expenses) => {
          const result = calculateSavingRate(income, expenses);
          const expectedRate = ((income - expenses) / income) * 100;
          
          // Result should match expected formula (clamped to -100 to 100)
          const clampedExpected = Math.max(-100, Math.min(100, expectedRate));
          expect(result).toBeCloseTo(clampedExpected, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return 0 for zero income', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100_000_000 }),
        (expenses) => {
          const result = calculateSavingRate(0, expenses);
          expect(result).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return 0 for negative income', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100_000_000, max: -1 }),
        fc.integer({ min: 0, max: 100_000_000 }),
        (income, expenses) => {
          const result = calculateSavingRate(income, expenses);
          expect(result).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return 100% when expenses are 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000_000 }),
        (income) => {
          const result = calculateSavingRate(income, 0);
          expect(result).toBe(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return 0% when expenses equal income', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000_000 }),
        (income) => {
          const result = calculateSavingRate(income, income);
          expect(result).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * **Feature: financial-goals-timeline, Property 2: Period Average Calculation**
 * **Validates: Requirements 2.2**
 *
 * For any set of monthly saving rates, the N-month average SHALL equal the sum of rates divided by N.
 */
describe('Property 2: Period Average Calculation', () => {
  it('should calculate average as sum of rates divided by N', () => {
    fc.assert(
      fc.property(
        // Generate array of rates (-100 to 100)
        fc.array(
          fc.float({ min: -100, max: 100, noNaN: true }),
          { minLength: 1, maxLength: 24 }
        ),
        (rates) => {
          const result = calculateAverage(rates);
          const expectedAverage = rates.reduce((sum, r) => sum + r, 0) / rates.length;
          
          expect(result).toBeCloseTo(expectedAverage, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return 0 for empty array', () => {
    const result = calculateAverage([]);
    expect(result).toBe(0);
  });

  it('should return the single value for array with one element', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -100, max: 100, noNaN: true }),
        (rate) => {
          const result = calculateAverage([rate]);
          expect(result).toBeCloseTo(rate, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle analyzeSavingRate period averages correctly', () => {
    fc.assert(
      fc.property(
        // Generate 12 months of saving rate data
        fc.array(
          fc.record({
            month: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
            income: fc.integer({ min: 0, max: 100_000_000 }),
            expenses: fc.integer({ min: 0, max: 100_000_000 }),
            savings: fc.integer({ min: -100_000_000, max: 100_000_000 }),
            savingRate: fc.float({ min: -100, max: 100, noNaN: true }),
          }),
          { minLength: 1, maxLength: 12 }
        ),
        (history) => {
          const analysis = analyzeSavingRate(history);
          const rates = history.map(h => h.savingRate);
          
          // Verify 3-month average
          const last3 = rates.slice(-3);
          const expected3Month = last3.reduce((sum, r) => sum + r, 0) / last3.length;
          expect(analysis.average3Month).toBeCloseTo(expected3Month, 5);
          
          // Verify 6-month average
          const last6 = rates.slice(-6);
          const expected6Month = last6.reduce((sum, r) => sum + r, 0) / last6.length;
          expect(analysis.average6Month).toBeCloseTo(expected6Month, 5);
          
          // Verify 12-month average
          const last12 = rates.slice(-12);
          const expected12Month = last12.reduce((sum, r) => sum + r, 0) / last12.length;
          expect(analysis.average12Month).toBeCloseTo(expected12Month, 5);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * **Feature: financial-goals-timeline, Property 3: Trend Detection**
 * **Validates: Requirements 2.3**
 *
 * For any sequence of saving rates, trend SHALL be 'improving' if last > first by >10%,
 * 'declining' if last < first by >10%, otherwise 'stable'.
 */
describe('Property 3: Trend Detection', () => {
  it('should return improving when last > first by more than 10%', () => {
    fc.assert(
      fc.property(
        // Generate first rate (non-zero to avoid division issues)
        fc.float({ min: 1, max: 50, noNaN: true }),
        // Generate improvement percentage > 10%
        fc.float({ min: 11, max: 100, noNaN: true }),
        // Generate middle values (don't affect trend calculation)
        fc.array(
          fc.float({ min: -100, max: 100, noNaN: true }),
          { minLength: 0, maxLength: 10 }
        ),
        (first, improvementPercent, middle) => {
          const last = first + (first * improvementPercent / 100);
          const rates = [first, ...middle, last];
          
          const result = calculateTrend(rates);
          expect(result.direction).toBe('improving');
          expect(result.percentage).toBeGreaterThan(10);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return declining when last < first by more than 10%', () => {
    fc.assert(
      fc.property(
        // Generate first rate (positive to ensure meaningful decline)
        fc.float({ min: 20, max: 100, noNaN: true }),
        // Generate decline percentage > 10%
        fc.float({ min: 11, max: 50, noNaN: true }),
        // Generate middle values
        fc.array(
          fc.float({ min: -100, max: 100, noNaN: true }),
          { minLength: 0, maxLength: 10 }
        ),
        (first, declinePercent, middle) => {
          const last = first - (first * declinePercent / 100);
          const rates = [first, ...middle, last];
          
          const result = calculateTrend(rates);
          expect(result.direction).toBe('declining');
          expect(result.percentage).toBeLessThan(-10);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return stable when change is within 10%', () => {
    fc.assert(
      fc.property(
        // Generate first rate (non-zero)
        fc.float({ min: 10, max: 90, noNaN: true }),
        // Generate change percentage within -10% to 10%
        fc.float({ min: -10, max: 10, noNaN: true }),
        // Generate middle values
        fc.array(
          fc.float({ min: -100, max: 100, noNaN: true }),
          { minLength: 0, maxLength: 10 }
        ),
        (first, changePercent, middle) => {
          const last = first + (first * changePercent / 100);
          const rates = [first, ...middle, last];
          
          const result = calculateTrend(rates);
          expect(result.direction).toBe('stable');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return stable for single element array', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -100, max: 100, noNaN: true }),
        (rate) => {
          const result = calculateTrend([rate]);
          expect(result.direction).toBe('stable');
          expect(result.percentage).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return stable for empty array', () => {
    const result = calculateTrend([]);
    expect(result.direction).toBe('stable');
    expect(result.percentage).toBe(0);
  });

  it('should handle zero first value correctly', () => {
    // When first is 0 and last is positive, should be improving
    const result1 = calculateTrend([0, 10, 20]);
    expect(result1.direction).toBe('improving');
    
    // When first is 0 and last is negative, should be declining
    const result2 = calculateTrend([0, -5, -10]);
    expect(result2.direction).toBe('declining');
    
    // When first is 0 and last is 0, should be stable
    const result3 = calculateTrend([0, 5, 0]);
    expect(result3.direction).toBe('stable');
  });
});

/**
 * Additional test for consistency calculation
 */
describe('Consistency Calculation', () => {
  it('should return 1 for perfectly consistent rates', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -100, max: 100, noNaN: true }),
        fc.integer({ min: 2, max: 12 }),
        (rate, count) => {
          const rates = Array(count).fill(rate);
          const result = calculateConsistency(rates);
          expect(result).toBeCloseTo(1, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return lower consistency for high variance rates', () => {
    // High variance rates should have lower consistency
    const highVarianceRates = [-50, 50, -50, 50, -50, 50];
    const lowVarianceRates = [48, 50, 52, 49, 51, 50];
    
    const highVarianceConsistency = calculateConsistency(highVarianceRates);
    const lowVarianceConsistency = calculateConsistency(lowVarianceRates);
    
    expect(lowVarianceConsistency).toBeGreaterThan(highVarianceConsistency);
  });

  it('should return 1 for single element array', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -100, max: 100, noNaN: true }),
        (rate) => {
          const result = calculateConsistency([rate]);
          expect(result).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return value between 0 and 1', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.float({ min: -100, max: 100, noNaN: true }),
          { minLength: 2, maxLength: 24 }
        ),
        (rates) => {
          const result = calculateConsistency(rates);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
