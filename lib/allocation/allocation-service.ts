import type {
  AllocationResult,
  AllocationCategoryType,
  ValidationResult,
} from '@/app/types/allocation';

interface AllocationInput {
  categoryName: string;
  categoryType: AllocationCategoryType;
  percentage: number;
  icon?: string;
  color?: string;
}

/**
 * AllocationService - Core calculation logic for salary allocation
 */
export class AllocationService {
  /**
   * Calculate allocation amounts from income and percentage items
   * Formula: amount = (percentage / 100) * income
   */
  calculateAllocation(income: number, items: AllocationInput[]): AllocationResult[] {
    if (income <= 0) {
      throw new Error('Income must be a positive number');
    }

    return items.map((item) => {
      const amount = (item.percentage / 100) * income;
      const { daily, weekly } = this.calculateDailyWeeklyLimits(amount);

      return {
        categoryName: item.categoryName,
        categoryType: item.categoryType,
        percentage: item.percentage,
        amount: Math.round(amount), // Round to nearest integer for IDR
        dailyLimit: daily,
        weeklyLimit: weekly,
        icon: item.icon,
        color: item.color,
      };
    });
  }

  /**
   * Validate that percentages sum to <= 100%
   * Returns validation result with details
   */
  validatePercentages(items: { percentage: number }[]): ValidationResult {
    const totalPercentage = items.reduce((sum, item) => sum + item.percentage, 0);
    const unallocatedPercentage = 100 - totalPercentage;

    if (totalPercentage > 100) {
      return {
        isValid: false,
        totalPercentage,
        unallocatedPercentage,
        error: `Total alokasi melebihi 100% (${totalPercentage.toFixed(1)}%)`,
      };
    }

    return {
      isValid: true,
      totalPercentage,
      unallocatedPercentage,
    };
  }

  /**
   * Calculate daily and weekly spending limits from monthly amount
   * Daily = monthly / 30
   * Weekly = monthly / 4
   */
  calculateDailyWeeklyLimits(monthlyAmount: number): { daily: number; weekly: number } {
    return {
      daily: Math.round(monthlyAmount / 30),
      weekly: Math.round(monthlyAmount / 4),
    };
  }

  /**
   * Recalculate all amounts when income changes
   * Preserves percentages, updates amounts
   */
  recalculateAmounts(
    newIncome: number,
    items: AllocationInput[]
  ): AllocationResult[] {
    return this.calculateAllocation(newIncome, items);
  }

  /**
   * Validate income value
   */
  validateIncome(income: unknown): { isValid: boolean; error?: string } {
    if (typeof income !== 'number' || isNaN(income)) {
      return { isValid: false, error: 'Masukkan angka yang valid' };
    }
    if (income <= 0) {
      return { isValid: false, error: 'Gaji harus lebih dari 0' };
    }
    return { isValid: true };
  }
}

// Export singleton instance
export const allocationService = new AllocationService();
