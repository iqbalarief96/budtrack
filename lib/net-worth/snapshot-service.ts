import prisma from '@/lib/prisma';
import { netWorthCalculator } from './calculator';
import type {
  NetWorthSnapshot,
  TimeFilter,
  CategoryBreakdown,
} from '@/app/types/net-worth';

/**
 * SnapshotService - Manages historical net worth snapshots
 * 
 * Requirements: 2.1, 2.2, 2.3
 */
export class SnapshotService {
  /**
   * Create a new net worth snapshot for a user
   * Calculates current net worth from wallets and debts
   * 
   * Requirements: 2.3
   */
  async createSnapshot(userId: string, date?: Date): Promise<NetWorthSnapshot> {
    const snapshotDate = date || new Date();
    // Normalize to start of day for consistent date comparison
    const normalizedDate = new Date(
      snapshotDate.getFullYear(),
      snapshotDate.getMonth(),
      snapshotDate.getDate()
    );

    // Fetch user's wallets and debts
    const [wallets, debts] = await Promise.all([
      prisma.wallet.findMany({
        where: { userId },
        select: { id: true, name: true, balance: true, type: true },
      }),
      prisma.debt.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          currentBalance: true,
          type: true,
          isActive: true,
        },
      }),
    ]);

    // Calculate net worth using the calculator
    const calculation = netWorthCalculator.calculate(wallets, debts);

    // Prepare breakdown as JSON
    const breakdown = {
      assets: calculation.assetBreakdown,
      liabilities: calculation.liabilityBreakdown,
    };

    // Upsert snapshot (update if exists for same date, create otherwise)
    const snapshot = await prisma.netWorthSnapshot.upsert({
      where: {
        userId_date: {
          userId,
          date: normalizedDate,
        },
      },
      update: {
        totalAssets: calculation.totalAssets,
        totalLiabilities: calculation.totalLiabilities,
        netWorth: calculation.netWorth,
        breakdown: JSON.stringify(breakdown),
      },
      create: {
        userId,
        date: normalizedDate,
        totalAssets: calculation.totalAssets,
        totalLiabilities: calculation.totalLiabilities,
        netWorth: calculation.netWorth,
        breakdown: JSON.stringify(breakdown),
      },
    });

    return this.mapToSnapshot(snapshot);
  }


  /**
   * Get historical snapshots for a user with optional time filtering
   * 
   * Requirements: 2.1, 2.2
   */
  async getHistory(userId: string, filter?: TimeFilter): Promise<NetWorthSnapshot[]> {
    const dateRange = this.getDateRange(filter);

    const snapshots = await prisma.netWorthSnapshot.findMany({
      where: {
        userId,
        ...(dateRange.startDate && {
          date: {
            gte: dateRange.startDate,
            ...(dateRange.endDate && { lte: dateRange.endDate }),
          },
        }),
      },
      orderBy: { date: 'asc' },
    });

    return snapshots.map((s: {
      id: string;
      userId: string;
      date: Date;
      totalAssets: number;
      totalLiabilities: number;
      netWorth: number;
      breakdown: string;
      createdAt: Date;
    }) => this.mapToSnapshot(s));
  }

  /**
   * Get the latest snapshot for a user
   * 
   * Requirements: 2.1
   */
  async getLatestSnapshot(userId: string): Promise<NetWorthSnapshot | null> {
    const snapshot = await prisma.netWorthSnapshot.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    return snapshot ? this.mapToSnapshot(snapshot) : null;
  }

  /**
   * Get the previous snapshot before a given date
   */
  async getPreviousSnapshot(
    userId: string,
    beforeDate: Date
  ): Promise<NetWorthSnapshot | null> {
    const snapshot = await prisma.netWorthSnapshot.findFirst({
      where: {
        userId,
        date: { lt: beforeDate },
      },
      orderBy: { date: 'desc' },
    });

    return snapshot ? this.mapToSnapshot(snapshot) : null;
  }

  /**
   * Calculate date range based on time filter
   * 
   * Requirements: 2.2
   */
  getDateRange(filter?: TimeFilter): { startDate?: Date; endDate?: Date } {
    if (!filter) {
      return {};
    }

    // If explicit dates are provided, use them
    if (filter.startDate || filter.endDate) {
      return {
        startDate: filter.startDate,
        endDate: filter.endDate,
      };
    }

    // Calculate based on period
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let startDate: Date;

    switch (filter.period) {
      case '3M':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6M':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '1Y':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'ALL':
      default:
        return { endDate };
    }

    // Normalize start date to beginning of day
    startDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate()
    );

    return { startDate, endDate };
  }

  /**
   * Filter snapshots by date range (pure function for testing)
   * 
   * Requirements: 2.2
   */
  filterSnapshotsByDateRange(
    snapshots: NetWorthSnapshot[],
    startDate?: Date,
    endDate?: Date
  ): NetWorthSnapshot[] {
    return snapshots.filter((snapshot) => {
      const snapshotDate = new Date(snapshot.date);
      
      if (startDate && snapshotDate < startDate) {
        return false;
      }
      
      if (endDate && snapshotDate > endDate) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Map database record to NetWorthSnapshot type
   */
  private mapToSnapshot(record: {
    id: string;
    userId: string;
    date: Date;
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
    breakdown: string;
    createdAt: Date;
  }): NetWorthSnapshot {
    let breakdown: { assets: CategoryBreakdown[]; liabilities: CategoryBreakdown[] };
    
    try {
      breakdown = JSON.parse(record.breakdown);
    } catch {
      breakdown = { assets: [], liabilities: [] };
    }

    return {
      id: record.id,
      userId: record.userId,
      date: record.date,
      totalAssets: record.totalAssets,
      totalLiabilities: record.totalLiabilities,
      netWorth: record.netWorth,
      breakdown,
      createdAt: record.createdAt,
    };
  }
}

// Export singleton instance
export const snapshotService = new SnapshotService();
