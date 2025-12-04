import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { NetWorthCalculator, WalletInput, DebtInput } from '../calculator';

const calculator = new NetWorthCalculator();

// Generators for property-based testing
const walletArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  balance: fc.float({ min: 0, max: 1_000_000_000, noNaN: true }),
  type: fc.constantFrom('MAIN', 'SAVINGS', 'INVESTMENT'),
});

const debtArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  currentBalance: fc.float({ min: 0, max: 1_000_000_000, noNaN: true }),
  type: fc.constantFrom('CREDIT_CARD', 'PERSONAL_LOAN', 'MORTGAGE', 'STUDENT_LOAN', 'AUTO_LOAN', 'OTHER'),
  isActive: fc.boolean(),
});

/**
 * **Feature: net-worth-tracker, Property 1: Net Worth Calculation Accuracy**
 * **Validates: Requirements 1.1, 1.3, 1.4**
 *
 * For any set of wallets and debts, the calculated net worth SHALL equal
 * the sum of all wallet balances minus the sum of all active debt amounts.
 */
describe('Property 1: Net Worth Calculation Accuracy', () => {
  it('should calculate net worth as totalAssets - totalLiabilities', () => {
    fc.assert(
      fc.property(
        fc.array(walletArbitrary, { minLength: 0, maxLength: 10 }),
        fc.array(debtArbitrary, { minLength: 0, maxLength: 10 }),
        (wallets, debts) => {
          const result = calculator.calculate(wallets, debts);

          // Calculate expected values manually
          const expectedAssets = wallets.reduce((sum, w) => sum + w.balance, 0);
          const expectedLiabilities = debts
            .filter((d) => d.isActive)
            .reduce((sum, d) => sum + d.currentBalance, 0);
          const expectedNetWorth = expectedAssets - expectedLiabilities;

          // Verify calculations
          expect(result.totalAssets).toBeCloseTo(expectedAssets, 5);
          expect(result.totalLiabilities).toBeCloseTo(expectedLiabilities, 5);
          expect(result.netWorth).toBeCloseTo(expectedNetWorth, 5);
        }
      ),
      { numRuns: 100 }
    );
  });


  it('should only include active debts in liabilities', () => {
    fc.assert(
      fc.property(
        fc.array(debtArbitrary, { minLength: 1, maxLength: 10 }),
        (debts) => {
          const liabilities = calculator.calculateLiabilities(debts);

          // Only active debts should be counted
          const expectedLiabilities = debts
            .filter((d) => d.isActive)
            .reduce((sum, d) => sum + d.currentBalance, 0);

          expect(liabilities).toBeCloseTo(expectedLiabilities, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include all wallet balances in assets', () => {
    fc.assert(
      fc.property(
        fc.array(walletArbitrary, { minLength: 1, maxLength: 10 }),
        (wallets) => {
          const assets = calculator.calculateAssets(wallets);

          const expectedAssets = wallets.reduce((sum, w) => sum + w.balance, 0);

          expect(assets).toBeCloseTo(expectedAssets, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return zero for empty wallets and debts', () => {
    const result = calculator.calculate([], []);

    expect(result.totalAssets).toBe(0);
    expect(result.totalLiabilities).toBe(0);
    expect(result.netWorth).toBe(0);
  });
});


/**
 * **Feature: net-worth-tracker, Property 2: Asset Breakdown Sum Consistency**
 * **Validates: Requirements 1.2, 3.1**
 *
 * For any set of wallets grouped by type, the sum of all category amounts
 * SHALL equal the total assets value.
 */
describe('Property 2: Asset Breakdown Sum Consistency', () => {
  it('should have breakdown sum equal to total assets', () => {
    fc.assert(
      fc.property(
        fc.array(walletArbitrary, { minLength: 0, maxLength: 10 }),
        (wallets) => {
          const result = calculator.calculate(wallets, []);

          // Sum of all category amounts in breakdown
          const breakdownSum = result.assetBreakdown.reduce(
            (sum, category) => sum + category.amount,
            0
          );

          // Should equal total assets
          expect(breakdownSum).toBeCloseTo(result.totalAssets, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have percentages sum to 100% when assets exist', () => {
    fc.assert(
      fc.property(
        fc.array(walletArbitrary, { minLength: 1, maxLength: 10 }).filter(
          (wallets) => wallets.some((w) => w.balance > 0)
        ),
        (wallets) => {
          const result = calculator.calculate(wallets, []);

          if (result.totalAssets > 0) {
            const percentageSum = result.assetBreakdown.reduce(
              (sum, category) => sum + category.percentage,
              0
            );
            expect(percentageSum).toBeCloseTo(100, 5);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should group wallets by type correctly', () => {
    fc.assert(
      fc.property(
        fc.array(walletArbitrary, { minLength: 1, maxLength: 10 }),
        (wallets) => {
          const result = calculator.calculate(wallets, []);

          // Each wallet should appear in exactly one category
          const allItems = result.assetBreakdown.flatMap((cat) => cat.items);
          expect(allItems.length).toBe(wallets.length);

          // Each category should match wallet types
          for (const category of result.assetBreakdown) {
            const walletsInCategory = wallets.filter((w) => w.type === category.category);
            expect(category.items.length).toBe(walletsInCategory.length);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: net-worth-tracker, Property 3: Liability Breakdown Sum Consistency**
 * **Validates: Requirements 1.2, 3.2**
 *
 * For any set of debts grouped by type, the sum of all category amounts
 * SHALL equal the total liabilities value.
 */
describe('Property 3: Liability Breakdown Sum Consistency', () => {
  it('should have breakdown sum equal to total liabilities', () => {
    fc.assert(
      fc.property(
        fc.array(debtArbitrary, { minLength: 0, maxLength: 10 }),
        (debts) => {
          const result = calculator.calculate([], debts);

          // Sum of all category amounts in breakdown
          const breakdownSum = result.liabilityBreakdown.reduce(
            (sum, category) => sum + category.amount,
            0
          );

          // Should equal total liabilities
          expect(breakdownSum).toBeCloseTo(result.totalLiabilities, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have percentages sum to 100% when liabilities exist', () => {
    fc.assert(
      fc.property(
        fc.array(debtArbitrary, { minLength: 1, maxLength: 10 }).filter(
          (debts) => debts.some((d) => d.isActive && d.currentBalance > 0)
        ),
        (debts) => {
          const result = calculator.calculate([], debts);

          if (result.totalLiabilities > 0) {
            const percentageSum = result.liabilityBreakdown.reduce(
              (sum, category) => sum + category.percentage,
              0
            );
            expect(percentageSum).toBeCloseTo(100, 5);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should only include active debts in breakdown', () => {
    fc.assert(
      fc.property(
        fc.array(debtArbitrary, { minLength: 1, maxLength: 10 }),
        (debts) => {
          const result = calculator.calculate([], debts);

          // Count items in breakdown
          const itemCount = result.liabilityBreakdown.reduce(
            (sum, cat) => sum + cat.items.length,
            0
          );

          // Should equal number of active debts
          const activeDebts = debts.filter((d) => d.isActive);
          expect(itemCount).toBe(activeDebts.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * **Feature: net-worth-tracker, Property 4: Percentage Change Calculation**
 * **Validates: Requirements 1.5, 3.5**
 *
 * For any two net worth values (current and previous), the percentage change
 * SHALL equal ((current - previous) / |previous|) * 100, with appropriate
 * handling for zero previous value.
 */
describe('Property 4: Percentage Change Calculation', () => {
  it('should calculate percentage change correctly for non-zero previous', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -1_000_000_000, max: 1_000_000_000, noNaN: true }),
        fc.float({ min: 1, max: 1_000_000_000, noNaN: true }), // Non-zero previous
        (current, previous) => {
          const result = calculator.calculateChange(current, previous);

          const expectedChange = ((current - previous) / Math.abs(previous)) * 100;
          const expectedDirection =
            expectedChange > 0 ? 'up' : expectedChange < 0 ? 'down' : 'stable';

          expect(result.value).toBeCloseTo(Math.abs(expectedChange), 5);
          expect(result.direction).toBe(expectedDirection);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should calculate percentage change correctly for negative previous', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -1_000_000_000, max: 1_000_000_000, noNaN: true }),
        fc.float({ min: -1_000_000_000, max: -1, noNaN: true }), // Negative previous
        (current, previous) => {
          const result = calculator.calculateChange(current, previous);

          const expectedChange = ((current - previous) / Math.abs(previous)) * 100;
          const expectedDirection =
            expectedChange > 0 ? 'up' : expectedChange < 0 ? 'down' : 'stable';

          expect(result.value).toBeCloseTo(Math.abs(expectedChange), 5);
          expect(result.direction).toBe(expectedDirection);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle zero previous value correctly', () => {
    // When previous is 0 and current is positive
    const resultPositive = calculator.calculateChange(100, 0);
    expect(resultPositive.value).toBe(100);
    expect(resultPositive.direction).toBe('up');

    // When previous is 0 and current is negative
    const resultNegative = calculator.calculateChange(-100, 0);
    expect(resultNegative.value).toBe(100);
    expect(resultNegative.direction).toBe('down');

    // When both are 0
    const resultZero = calculator.calculateChange(0, 0);
    expect(resultZero.value).toBe(0);
    expect(resultZero.direction).toBe('stable');
  });

  it('should return stable when current equals previous', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -1_000_000_000, max: 1_000_000_000, noNaN: true }),
        (value) => {
          const result = calculator.calculateChange(value, value);

          expect(result.value).toBe(0);
          expect(result.direction).toBe('stable');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return up direction when current > previous', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1, max: 1_000_000_000, noNaN: true }),
        fc.float({ min: 1, max: 1_000_000_000, noNaN: true }),
        (a, b) => {
          const current = Math.max(a, b) + 1; // Ensure current > previous
          const previous = Math.min(a, b);

          const result = calculator.calculateChange(current, previous);

          expect(result.direction).toBe('up');
          expect(result.value).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return down direction when current < previous', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1, max: 1_000_000_000, noNaN: true }),
        fc.float({ min: 1, max: 1_000_000_000, noNaN: true }),
        (a, b) => {
          const current = Math.min(a, b);
          const previous = Math.max(a, b) + 1; // Ensure previous > current

          const result = calculator.calculateChange(current, previous);

          expect(result.direction).toBe('down');
          expect(result.value).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
