import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { AllocationSerializer } from '../allocation-serializer';
import type {
  SalaryAllocationConfig,
  AllocationTemplateType,
  AllocationCategoryType,
} from '@/app/types/allocation';

const serializer = new AllocationSerializer();

// Helper to generate valid allocation configs
const allocationConfigArb = fc.record({
  id: fc.uuid(),
  userId: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  monthlyIncome: fc.integer({ min: 1, max: 100_000_000 }),
  templateType: fc.constantFrom<AllocationTemplateType>('50-30-20', '70-20-10', 'custom'),
  isActive: fc.boolean(),
  items: fc.array(
    fc.record({
      id: fc.uuid(),
      configId: fc.uuid(),
      categoryName: fc.string({ minLength: 1, maxLength: 30 }),
      categoryType: fc.constantFrom<AllocationCategoryType>('needs', 'wants', 'savings'),
      percentage: fc.integer({ min: 1, max: 100 }),
      amount: fc.integer({ min: 0, max: 100_000_000 }),
      mappedCategoryId: fc.option(fc.uuid(), { nil: null }),
      icon: fc.option(fc.string({ minLength: 1, maxLength: 5 }), { nil: null }),
      color: fc.option(fc.string({ minLength: 7, maxLength: 7 }), { nil: null }),
      createdAt: fc.date(),
      updatedAt: fc.date(),
    }),
    { minLength: 1, maxLength: 6 }
  ),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

/**
 * **Feature: salary-allocation, Property 11: JSON serialization round-trip**
 * **Validates: Requirements 7.1, 7.2**
 *
 * For any valid allocation configuration, serializing to JSON then deserializing
 * should produce an equivalent configuration with matching percentages and category names.
 */
describe('Property 11: JSON serialization round-trip', () => {
  it('should preserve data through serialize/deserialize cycle', () => {
    fc.assert(
      fc.property(allocationConfigArb, (config) => {
        // Serialize
        const json = serializer.serialize(config as SalaryAllocationConfig);

        // Deserialize
        const parsed = serializer.deserialize(json);

        // Verify key fields are preserved
        expect(parsed.name).toBe(config.name);
        expect(parsed.templateType).toBe(config.templateType);
        expect(parsed.items.length).toBe(config.items.length);

        // Verify each item's essential data is preserved
        for (let i = 0; i < config.items.length; i++) {
          expect(parsed.items[i].categoryName).toBe(config.items[i].categoryName);
          expect(parsed.items[i].categoryType).toBe(config.items[i].categoryType);
          expect(parsed.items[i].percentage).toBe(config.items[i].percentage);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should produce valid JSON', () => {
    fc.assert(
      fc.property(allocationConfigArb, (config) => {
        const json = serializer.serialize(config as SalaryAllocationConfig);

        // Should not throw when parsing
        expect(() => JSON.parse(json)).not.toThrow();

        // Should have version field
        const parsed = JSON.parse(json);
        expect(parsed.version).toBeDefined();
        expect(typeof parsed.version).toBe('string');
      }),
      { numRuns: 100 }
    );
  });

  it('should reject invalid JSON', () => {
    const invalidJsons = [
      'not json at all',
      '{ invalid json }',
      '{"name": "test"}', // missing required fields
      '{"version": "1.0", "name": "test"}', // missing items
    ];

    for (const invalid of invalidJsons) {
      expect(() => serializer.deserialize(invalid)).toThrow();
    }
  });
});

/**
 * **Feature: salary-allocation, Property 12: Import displays parsed data**
 * **Validates: Requirements 7.3**
 *
 * For any imported JSON configuration, the system should display (pretty print)
 * the parsed configuration data before applying, and the displayed data should
 * match the parsed values.
 */
describe('Property 12: Import displays parsed data', () => {
  it('should display all category names and percentages in pretty print', () => {
    fc.assert(
      fc.property(allocationConfigArb, (config) => {
        // Serialize then deserialize to get export data
        const json = serializer.serialize(config as SalaryAllocationConfig);
        const parsed = serializer.deserialize(json);

        // Pretty print
        const display = serializer.prettyPrint(parsed);

        // Verify config name is displayed
        expect(display).toContain(parsed.name);

        // Verify each category name and percentage is displayed
        for (const item of parsed.items) {
          expect(display).toContain(item.categoryName);
          expect(display).toContain(`${item.percentage}%`);
        }

        // Verify total percentage is displayed
        const totalPercentage = parsed.items.reduce((sum, item) => sum + item.percentage, 0);
        expect(display).toContain(`${totalPercentage}%`);
      }),
      { numRuns: 100 }
    );
  });

  it('should show warning for unallocated percentage', () => {
    fc.assert(
      fc.property(
        allocationConfigArb.filter((config) => {
          const total = config.items.reduce((sum, item) => sum + item.percentage, 0);
          return total < 100;
        }),
        (config) => {
          const json = serializer.serialize(config as SalaryAllocationConfig);
          const parsed = serializer.deserialize(json);
          const display = serializer.prettyPrint(parsed);

          const totalPercentage = parsed.items.reduce((sum, item) => sum + item.percentage, 0);
          const unallocated = 100 - totalPercentage;

          // Should show unallocated warning
          expect(display).toContain('Belum dialokasikan');
          expect(display).toContain(`${unallocated}%`);
        }
      ),
      { numRuns: 50 }
    );
  });
});
