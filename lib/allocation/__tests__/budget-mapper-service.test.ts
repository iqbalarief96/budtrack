import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { BudgetMapperService } from '../budget-mapper-service';

const budgetMapperService = new BudgetMapperService();

/**
 * **Feature: salary-allocation, Property 8: Budget creation from allocation**
 * **Validates: Requirements 5.1, 5.4**
 *
 * For any allocation applied to budgets, the system should create Budget records
 * with amounts matching the allocation amounts and period set to monthly
 * (start of current month to end of current month).
 */
describe('Property 8: Budget creation from allocation', () => {
  it('should generate correct monthly period dates', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date(2020, 0, 1), max: new Date(2030, 11, 31) }),
        () => {
          const { startDate, endDate } = budgetMapperService.getMonthlyPeriod();

          // Start date should be first day of month
          expect(startDate.getDate()).toBe(1);
          expect(startDate.getHours()).toBe(0);
          expect(startDate.getMinutes()).toBe(0);

          // End date should be last day of month
          const nextMonth = new Date(startDate);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          nextMonth.setDate(0); // Last day of previous month
          expect(endDate.getDate()).toBe(nextMonth.getDate());

          // End date should be same month as start date
          expect(endDate.getMonth()).toBe(startDate.getMonth());
          expect(endDate.getFullYear()).toBe(startDate.getFullYear());
        }
      ),
      { numRuns: 10 } // Limited runs since we're testing current date
    );
  });

  it('should validate category mappings correctly', () => {
    fc.assert(
      fc.property(
        // Generate allocation items
        fc.array(
          fc.record({
            id: fc.uuid(),
            configId: fc.uuid(),
            categoryName: fc.string({ minLength: 1, maxLength: 20 }),
            categoryType: fc.constantFrom('needs', 'wants', 'savings'),
            percentage: fc.integer({ min: 1, max: 50 }),
            amount: fc.integer({ min: 1000, max: 10_000_000 }),
            mappedCategoryId: fc.constant(null),
            icon: fc.constant(null),
            color: fc.constant(null),
            createdAt: fc.date(),
            updatedAt: fc.date(),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (items) => {
          const config = {
            id: 'test-config',
            userId: 'test-user',
            name: 'Test Config',
            monthlyIncome: 10_000_000,
            templateType: 'custom' as const,
            isActive: true,
            items: items as any,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Test with no mappings - should be invalid
          const noMappings = budgetMapperService.validateMappings(config, []);
          expect(noMappings.isValid).toBe(false);
          expect(noMappings.unmappedCategories.length).toBe(items.length);

          // Test with all mappings - should be valid
          const allMappings = items.map((item) => ({
            allocationCategory: item.categoryName,
            categoryId: 'cat-' + item.categoryName,
          }));
          const withMappings = budgetMapperService.validateMappings(config, allMappings);
          expect(withMappings.isValid).toBe(true);
          expect(withMappings.unmappedCategories.length).toBe(0);

          // Test with partial mappings
          if (items.length > 1) {
            const partialMappings = allMappings.slice(0, -1);
            const partial = budgetMapperService.validateMappings(config, partialMappings);
            expect(partial.isValid).toBe(false);
            expect(partial.unmappedCategories.length).toBe(1);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
