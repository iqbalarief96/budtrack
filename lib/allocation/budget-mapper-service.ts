import prisma from '@/lib/prisma';
import type { SalaryAllocationConfig } from '@/app/types/allocation';

interface CategoryMapping {
  allocationCategory: string;
  categoryId: string;
}

interface CreatedBudget {
  id: string;
  categoryName: string;
  amount: number;
}

/**
 * BudgetMapperService - Converts allocation configurations to budget records
 */
export class BudgetMapperService {
  /**
   * Create budgets from an allocation configuration
   * Returns array of created budget IDs
   */
  async createBudgetsFromAllocation(
    config: SalaryAllocationConfig,
    walletId: string,
    categoryMappings: CategoryMapping[],
    userId: string
  ): Promise<CreatedBudget[]> {
    // Create mapping lookup
    const mappingLookup = new Map<string, string>();
    for (const mapping of categoryMappings) {
      mappingLookup.set(mapping.allocationCategory, mapping.categoryId);
    }

    // Get current month start and end dates
    const { startDate, endDate } = this.getMonthlyPeriod();

    const createdBudgets: CreatedBudget[] = [];

    // Create budget for each allocation item that has a category mapping
    for (const item of config.items) {
      const categoryId = mappingLookup.get(item.categoryName);
      
      if (!categoryId) {
        // Skip items without category mapping
        continue;
      }

      // Check if budget already exists for this category/wallet/period
      const existingBudget = await prisma.budget.findFirst({
        where: {
          userId,
          walletId,
          categoryId,
          startDate: { gte: startDate },
          endDate: { lte: endDate },
        },
      });

      if (existingBudget) {
        // Update existing budget
        const updated = await prisma.budget.update({
          where: { id: existingBudget.id },
          data: { amount: item.amount },
        });
        createdBudgets.push({
          id: updated.id,
          categoryName: item.categoryName,
          amount: item.amount,
        });
      } else {
        // Create new budget
        const budget = await prisma.budget.create({
          data: {
            userId,
            walletId,
            categoryId,
            amount: item.amount,
            spent: 0,
            startDate,
            endDate,
            periodType: 'MONTHLY',
            isRecurring: false,
          },
        });
        createdBudgets.push({
          id: budget.id,
          categoryName: item.categoryName,
          amount: item.amount,
        });
      }
    }

    return createdBudgets;
  }

  /**
   * Get start and end dates for current month
   */
  getMonthlyPeriod(): { startDate: Date; endDate: Date } {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    return { startDate, endDate };
  }

  /**
   * Validate that all allocation categories have mappings
   */
  validateMappings(
    config: SalaryAllocationConfig,
    categoryMappings: CategoryMapping[]
  ): { isValid: boolean; unmappedCategories: string[] } {
    const mappedCategories = new Set(categoryMappings.map(m => m.allocationCategory));
    const unmappedCategories: string[] = [];

    for (const item of config.items) {
      if (!mappedCategories.has(item.categoryName)) {
        unmappedCategories.push(item.categoryName);
      }
    }

    return {
      isValid: unmappedCategories.length === 0,
      unmappedCategories,
    };
  }
}

// Export singleton instance
export const budgetMapperService = new BudgetMapperService();
