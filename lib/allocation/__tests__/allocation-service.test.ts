import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { AllocationService } from '../allocation-service';
import { TemplateService } from '../template-service';
import type { AllocationCategoryType } from '@/app/types/allocation';

const allocationService = new AllocationService();
const templateService = new TemplateService();

/**
 * **Feature: salary-allocation, Property 3: Income update recalculates amounts**
 * **Validates: Requirements 1.3**
 * 
 * For any allocation configuration and new income value, updating the income
 * should result in all allocation amounts being recalculated as (percentage / 100) * newIncome.
 */
describe('Property 3: Income update recalculates amounts', () => {
  it('should recalculate amounts correctly when income changes', () => {
    fc.assert(
      fc.property(
        // Generate positive income (1 to 100,000,000)
        fc.integer({ min: 1, max: 100_000_000 }),
        // Generate array of allocation items with percentages (using integer percentages for simplicity)
        fc.array(
          fc.record({
            categoryName: fc.string({ minLength: 1, maxLength: 20 }),
            categoryType: fc.constantFrom<AllocationCategoryType>('needs', 'wants', 'savings'),
            percentage: fc.integer({ min: 1, max: 50 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (income, items) => {
          const results = allocationService.calculateAllocation(income, items);
          
          // Verify each amount is calculated correctly
          for (let i = 0; i < items.length; i++) {
            const expectedAmount = Math.round((items[i].percentage / 100) * income);
            expect(results[i].amount).toBe(expectedAmount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: salary-allocation, Property 5: Custom allocation validation - over 100%**
 * **Validates: Requirements 3.2**
 * 
 * For any set of allocation percentages that sum to more than 100%,
 * the system should reject the allocation and return a validation error.
 */
describe('Property 5: Custom allocation validation - over 100%', () => {
  it('should reject percentages that sum to more than 100%', () => {
    fc.assert(
      fc.property(
        // Generate percentages that sum > 100
        fc.array(
          fc.float({ min: 20, max: 50, noNaN: true }),
          { minLength: 3, maxLength: 6 }
        ).filter(arr => arr.reduce((sum, p) => sum + p, 0) > 100),
        (percentages) => {
          const items = percentages.map(p => ({ percentage: p }));
          const result = allocationService.validatePercentages(items);
          
          expect(result.isValid).toBe(false);
          expect(result.totalPercentage).toBeGreaterThan(100);
          expect(result.error).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: salary-allocation, Property 6: Custom allocation validation - under 100%**
 * **Validates: Requirements 3.3**
 * 
 * For any set of allocation percentages that sum to less than 100%,
 * the system should accept the allocation and report the correct unallocated percentage.
 */
describe('Property 6: Custom allocation validation - under 100%', () => {
  it('should accept percentages under 100% and report unallocated amount', () => {
    fc.assert(
      fc.property(
        // Generate percentages that sum < 100
        fc.array(
          fc.float({ min: 5, max: 30, noNaN: true }),
          { minLength: 1, maxLength: 3 }
        ).filter(arr => arr.reduce((sum, p) => sum + p, 0) < 100),
        (percentages) => {
          const items = percentages.map(p => ({ percentage: p }));
          const result = allocationService.validatePercentages(items);
          const totalPercentage = percentages.reduce((sum, p) => sum + p, 0);
          
          expect(result.isValid).toBe(true);
          expect(result.unallocatedPercentage).toBeCloseTo(100 - totalPercentage, 5);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: salary-allocation, Property 4: Template produces correct percentages**
 * **Validates: Requirements 2.1, 2.2, 2.3**
 * 
 * For any preset template and any positive income, applying the template
 * should produce allocation items with percentages matching the template definition
 * and amounts equal to (percentage / 100) * income.
 */
describe('Property 4: Template produces correct percentages', () => {
  it('should produce correct percentages and amounts for 50-30-20 template', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000_000 }),
        (income) => {
          const template = templateService.getTemplate('50-30-20');
          const results = allocationService.calculateAllocation(income, template.categories);
          
          // Verify percentages match template
          expect(results[0].percentage).toBe(50); // needs
          expect(results[1].percentage).toBe(30); // wants
          expect(results[2].percentage).toBe(20); // savings
          
          // Verify amounts are calculated correctly
          expect(results[0].amount).toBe(Math.round(income * 0.5));
          expect(results[1].amount).toBe(Math.round(income * 0.3));
          expect(results[2].amount).toBe(Math.round(income * 0.2));
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce correct percentages and amounts for 70-20-10 template', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000_000 }),
        (income) => {
          const template = templateService.getTemplate('70-20-10');
          const results = allocationService.calculateAllocation(income, template.categories);
          
          // Verify percentages match template
          expect(results[0].percentage).toBe(70); // needs
          expect(results[1].percentage).toBe(20); // savings
          expect(results[2].percentage).toBe(10); // wants
          
          // Verify amounts are calculated correctly
          expect(results[0].amount).toBe(Math.round(income * 0.7));
          expect(results[1].amount).toBe(Math.round(income * 0.2));
          expect(results[2].amount).toBe(Math.round(income * 0.1));
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should calculate daily and weekly limits correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000_000 }),
        (income) => {
          const template = templateService.getTemplate('50-30-20');
          const results = allocationService.calculateAllocation(income, template.categories);
          
          for (const result of results) {
            // Allow for rounding differences of 1 due to intermediate calculations
            const expectedDaily = Math.round(result.amount / 30);
            const expectedWeekly = Math.round(result.amount / 4);
            expect(Math.abs(result.dailyLimit - expectedDaily)).toBeLessThanOrEqual(1);
            expect(Math.abs(result.weeklyLimit - expectedWeekly)).toBeLessThanOrEqual(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * **Feature: salary-allocation, Property 1: Valid income is stored correctly**
 * **Validates: Requirements 1.1**
 *
 * For any valid positive income amount, storing it in the system should result
 * in the same value being retrievable from the allocation interface.
 */
describe('Property 1: Valid income is stored correctly', () => {
  it('should accept and use valid positive income values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000_000 }),
        (income) => {
          const validation = allocationService.validateIncome(income);
          expect(validation.isValid).toBe(true);
          expect(validation.error).toBeUndefined();

          // Verify income is used correctly in calculation
          const items = [{ categoryName: 'Test', categoryType: 'needs' as const, percentage: 50 }];
          const results = allocationService.calculateAllocation(income, items);
          expect(results[0].amount).toBe(Math.round(income * 0.5));
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: salary-allocation, Property 2: Invalid income is rejected**
 * **Validates: Requirements 1.2**
 *
 * For any invalid income value (negative, zero, or non-numeric),
 * the system should reject the input and return a validation error.
 */
describe('Property 2: Invalid income is rejected', () => {
  it('should reject negative income values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100_000_000, max: -1 }),
        (income) => {
          const validation = allocationService.validateIncome(income);
          expect(validation.isValid).toBe(false);
          expect(validation.error).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject zero income', () => {
    const validation = allocationService.validateIncome(0);
    expect(validation.isValid).toBe(false);
    expect(validation.error).toBeDefined();
  });

  it('should reject non-numeric values', () => {
    const invalidValues = ['abc', null, undefined, NaN, {}, []];
    for (const value of invalidValues) {
      const validation = allocationService.validateIncome(value);
      expect(validation.isValid).toBe(false);
    }
  });
});


/**
 * **Feature: salary-allocation, Property 7: Allocation result contains required fields**
 * **Validates: Requirements 4.1, 4.3**
 *
 * For any allocation result, the display data should include category name,
 * percentage, nominal amount, and correct daily/weekly limits.
 */
describe('Property 7: Allocation result contains required fields', () => {
  it('should include all required fields in allocation results', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000_000 }),
        fc.array(
          fc.record({
            categoryName: fc.string({ minLength: 1, maxLength: 20 }),
            categoryType: fc.constantFrom<AllocationCategoryType>('needs', 'wants', 'savings'),
            percentage: fc.integer({ min: 1, max: 50 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (income, items) => {
          const results = allocationService.calculateAllocation(income, items);

          for (let i = 0; i < results.length; i++) {
            const result = results[i];

            // Required fields must exist
            expect(result.categoryName).toBeDefined();
            expect(result.categoryType).toBeDefined();
            expect(result.percentage).toBeDefined();
            expect(result.amount).toBeDefined();
            expect(result.dailyLimit).toBeDefined();
            expect(result.weeklyLimit).toBeDefined();

            // Values must match input
            expect(result.categoryName).toBe(items[i].categoryName);
            expect(result.categoryType).toBe(items[i].categoryType);
            expect(result.percentage).toBe(items[i].percentage);

            // Amount must be correctly calculated
            expect(result.amount).toBe(Math.round((items[i].percentage / 100) * income));

            // Daily/weekly limits must be reasonable
            expect(result.dailyLimit).toBeGreaterThanOrEqual(0);
            expect(result.weeklyLimit).toBeGreaterThanOrEqual(0);
            expect(result.weeklyLimit).toBeGreaterThanOrEqual(result.dailyLimit);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
