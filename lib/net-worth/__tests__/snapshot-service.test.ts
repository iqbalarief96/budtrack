import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { SnapshotService } from '../snapshot-service';
import type { NetWorthSnapshot, CategoryBreakdown } from '@/app/types/net-worth';

const service = new SnapshotService();

// Generator for valid dates (avoiding NaN dates)
const validDateArbitrary = fc.integer({ 
  min: new Date('2020-01-01').getTime(), 
  max: new Date('2030-12-31').getTime() 
}).map(ts => new Date(ts));

// Generator for snapshot data
const snapshotArbitrary: fc.Arbitrary<NetWorthSnapshot> = fc.record({
  id: fc.uuid(),
  userId: fc.uuid(),
  date: validDateArbitrary,
  totalAssets: fc.float({ min: 0, max: 1_000_000_000, noNaN: true }),
  totalLiabilities: fc.float({ min: 0, max: 1_000_000_000, noNaN: true }),
  netWorth: fc.float({ min: -1_000_000_000, max: 1_000_000_000, noNaN: true }),
  breakdown: fc.constant({ assets: [] as CategoryBreakdown[], liabilities: [] as CategoryBreakdown[] }),
  createdAt: validDateArbitrary,
});

// Generator for date ranges (using integer timestamps to avoid NaN)
const dateRangeArbitrary = fc.record({
  startDate: fc.integer({ 
    min: new Date('2020-01-01').getTime(), 
    max: new Date('2025-12-31').getTime() 
  }).map(ts => new Date(ts)),
  endDate: fc.integer({ 
    min: new Date('2020-01-01').getTime(), 
    max: new Date('2030-12-31').getTime() 
  }).map(ts => new Date(ts)),
}).filter(({ startDate, endDate }) => startDate <= endDate);

/**
 * **Feature: net-worth-tracker, Property 5: Time Filter Accuracy**
 * **Validates: Requirements 2.2**
 *
 * For any set of snapshots and time filter, the returned snapshots SHALL only
 * include records within the specified date range.
 */
describe('Property 5: Time Filter Accuracy', () => {
  it('should only return snapshots within the specified date range', () => {
    fc.assert(
      fc.property(
        fc.array(snapshotArbitrary, { minLength: 0, maxLength: 20 }),
        dateRangeArbitrary,
        (snapshots, { startDate, endDate }) => {
          const filtered = service.filterSnapshotsByDateRange(
            snapshots,
            startDate,
            endDate
          );

          // All filtered snapshots should be within the date range
          for (const snapshot of filtered) {
            const snapshotDate = new Date(snapshot.date);
            expect(snapshotDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
            expect(snapshotDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
          }

          // All snapshots within range should be included
          const expectedCount = snapshots.filter((s) => {
            const d = new Date(s.date);
            return d >= startDate && d <= endDate;
          }).length;

          expect(filtered.length).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });


  it('should return all snapshots when no date range is specified', () => {
    fc.assert(
      fc.property(
        fc.array(snapshotArbitrary, { minLength: 0, maxLength: 20 }),
        (snapshots) => {
          const filtered = service.filterSnapshotsByDateRange(snapshots);

          // All snapshots should be returned
          expect(filtered.length).toBe(snapshots.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should filter correctly with only startDate specified', () => {
    fc.assert(
      fc.property(
        fc.array(snapshotArbitrary, { minLength: 0, maxLength: 20 }),
        validDateArbitrary,
        (snapshots, startDate) => {
          const filtered = service.filterSnapshotsByDateRange(
            snapshots,
            startDate,
            undefined
          );

          // All filtered snapshots should be >= startDate
          for (const snapshot of filtered) {
            const snapshotDate = new Date(snapshot.date);
            expect(snapshotDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
          }

          // Count should match expected
          const expectedCount = snapshots.filter(
            (s) => new Date(s.date) >= startDate
          ).length;
          expect(filtered.length).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should filter correctly with only endDate specified', () => {
    fc.assert(
      fc.property(
        fc.array(snapshotArbitrary, { minLength: 0, maxLength: 20 }),
        validDateArbitrary,
        (snapshots, endDate) => {
          const filtered = service.filterSnapshotsByDateRange(
            snapshots,
            undefined,
            endDate
          );

          // All filtered snapshots should be <= endDate
          for (const snapshot of filtered) {
            const snapshotDate = new Date(snapshot.date);
            expect(snapshotDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
          }

          // Count should match expected
          const expectedCount = snapshots.filter(
            (s) => new Date(s.date) <= endDate
          ).length;
          expect(filtered.length).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return empty array when no snapshots match the range', () => {
    fc.assert(
      fc.property(
        fc.array(snapshotArbitrary, { minLength: 1, maxLength: 10 }),
        (snapshots) => {
          // Create a date range that's definitely before all snapshots
          const minDate = new Date(
            Math.min(...snapshots.map((s) => new Date(s.date).getTime()))
          );
          const endDate = new Date(minDate.getTime() - 86400000 * 365); // 1 year before
          const startDate = new Date(endDate.getTime() - 86400000 * 30); // 30 days before that

          const filtered = service.filterSnapshotsByDateRange(
            snapshots,
            startDate,
            endDate
          );

          expect(filtered.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('getDateRange', () => {
  it('should return correct date range for 3M period', () => {
    const result = service.getDateRange({ period: '3M' });
    
    expect(result.startDate).toBeDefined();
    expect(result.endDate).toBeDefined();
    
    if (result.startDate && result.endDate) {
      const diffMonths = (result.endDate.getFullYear() - result.startDate.getFullYear()) * 12 +
        (result.endDate.getMonth() - result.startDate.getMonth());
      expect(diffMonths).toBe(3);
    }
  });

  it('should return correct date range for 6M period', () => {
    const result = service.getDateRange({ period: '6M' });
    
    expect(result.startDate).toBeDefined();
    expect(result.endDate).toBeDefined();
    
    if (result.startDate && result.endDate) {
      const diffMonths = (result.endDate.getFullYear() - result.startDate.getFullYear()) * 12 +
        (result.endDate.getMonth() - result.startDate.getMonth());
      expect(diffMonths).toBe(6);
    }
  });

  it('should return correct date range for 1Y period', () => {
    const result = service.getDateRange({ period: '1Y' });
    
    expect(result.startDate).toBeDefined();
    expect(result.endDate).toBeDefined();
    
    if (result.startDate && result.endDate) {
      const diffYears = result.endDate.getFullYear() - result.startDate.getFullYear();
      expect(diffYears).toBe(1);
    }
  });

  it('should return only endDate for ALL period', () => {
    const result = service.getDateRange({ period: 'ALL' });
    
    expect(result.startDate).toBeUndefined();
    expect(result.endDate).toBeDefined();
  });

  it('should return empty object when no filter provided', () => {
    const result = service.getDateRange();
    
    expect(result.startDate).toBeUndefined();
    expect(result.endDate).toBeUndefined();
  });

  it('should use explicit dates when provided', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-06-30');
    
    const result = service.getDateRange({
      period: '3M', // Should be ignored when explicit dates provided
      startDate,
      endDate,
    });
    
    expect(result.startDate).toEqual(startDate);
    expect(result.endDate).toEqual(endDate);
  });
});
