import type {
  NetWorthCalculation,
  CategoryBreakdown,
  BreakdownItem,
  PercentageChange,
  ChangeDirection,
} from '@/app/types/net-worth';

/**
 * Wallet type for calculation
 */
export interface WalletInput {
  id: string;
  name: string;
  balance: number;
  type: string; // MAIN, SAVINGS, INVESTMENT
}

/**
 * Debt type for calculation
 */
export interface DebtInput {
  id: string;
  name: string;
  currentBalance: number;
  type: string; // CREDIT_CARD, PERSONAL_LOAN, MORTGAGE, etc.
  isActive: boolean;
}

/**
 * NetWorthCalculator - Core calculation logic for net worth tracking
 * 
 * Requirements: 1.1, 1.3, 1.4
 */
export class NetWorthCalculator {
  /**
   * Calculate total assets from wallets
   * Formula: sum of all wallet balances
   * 
   * Requirements: 1.3
   */
  calculateAssets(wallets: WalletInput[]): number {
    return wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
  }

  /**
   * Calculate total liabilities from debts
   * Formula: sum of all active debt current balances
   * 
   * Requirements: 1.4
   */
  calculateLiabilities(debts: DebtInput[]): number {
    return debts
      .filter((debt) => debt.isActive)
      .reduce((sum, debt) => sum + debt.currentBalance, 0);
  }

  /**
   * Calculate complete net worth with breakdown
   * Formula: totalAssets - totalLiabilities
   * 
   * Requirements: 1.1, 1.2, 1.3, 1.4
   */
  calculate(wallets: WalletInput[], debts: DebtInput[]): NetWorthCalculation {
    const totalAssets = this.calculateAssets(wallets);
    const totalLiabilities = this.calculateLiabilities(debts);
    const netWorth = totalAssets - totalLiabilities;

    const assetBreakdown = this.groupByCategory(wallets, 'type', totalAssets);
    const liabilityBreakdown = this.groupByCategory(
      debts.filter((d) => d.isActive),
      'type',
      totalLiabilities
    );

    return {
      totalAssets,
      totalLiabilities,
      netWorth,
      assetBreakdown,
      liabilityBreakdown,
      calculatedAt: new Date(),
    };
  }


  /**
   * Group items by category and calculate breakdown
   * 
   * Requirements: 1.2, 3.1, 3.2
   */
  groupByCategory<T extends { id: string; name: string }>(
    items: T[],
    categoryField: keyof T,
    total: number
  ): CategoryBreakdown[] {
    const groups = new Map<string, BreakdownItem[]>();

    // Group items by category
    for (const item of items) {
      const category = String(item[categoryField]);
      const amount = this.getItemAmount(item);

      if (!groups.has(category)) {
        groups.set(category, []);
      }

      groups.get(category)!.push({
        id: item.id,
        name: item.name,
        amount,
      });
    }

    // Convert to CategoryBreakdown array
    const breakdowns: CategoryBreakdown[] = [];

    for (const [category, categoryItems] of groups) {
      const categoryAmount = categoryItems.reduce((sum, item) => sum + item.amount, 0);
      const percentage = total > 0 ? (categoryAmount / total) * 100 : 0;

      breakdowns.push({
        category,
        amount: categoryAmount,
        percentage,
        items: categoryItems,
      });
    }

    // Sort by amount descending
    return breakdowns.sort((a, b) => b.amount - a.amount);
  }

  /**
   * Get amount from item (wallet balance or debt currentBalance)
   */
  private getItemAmount<T extends Record<string, unknown>>(item: T): number {
    if ('balance' in item && typeof item.balance === 'number') {
      return item.balance;
    }
    if ('currentBalance' in item && typeof item.currentBalance === 'number') {
      return item.currentBalance;
    }
    return 0;
  }

  /**
   * Calculate percentage change between two values
   * Formula: ((current - previous) / |previous|) * 100
   * 
   * Requirements: 1.5, 3.5
   */
  calculateChange(current: number, previous: number): PercentageChange {
    // Handle zero previous value
    if (previous === 0) {
      if (current === 0) {
        return { value: 0, direction: 'stable' };
      }
      // When previous is 0 and current is not, return 100% change
      return {
        value: 100,
        direction: current > 0 ? 'up' : 'down',
      };
    }

    const percentageChange = ((current - previous) / Math.abs(previous)) * 100;
    
    let direction: ChangeDirection;
    if (percentageChange > 0) {
      direction = 'up';
    } else if (percentageChange < 0) {
      direction = 'down';
    } else {
      direction = 'stable';
    }

    return {
      value: Math.abs(percentageChange),
      direction,
    };
  }
}

// Export singleton instance
export const netWorthCalculator = new NetWorthCalculator();
