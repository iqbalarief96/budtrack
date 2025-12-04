import prisma from './prisma';

interface BudgetForecast {
  budgetId: string;
  budgetName: string;
  currentSpent: number;
  budgetAmount: number;
  daysRemaining: number;
  totalDays: number;
  projectedSpending: number;
  projectedOverage: number;
  dailyAverageSpent: number;
  recommendedDailySpending: number;
  willExceed: boolean;
  exceedDate?: Date;
  status: 'on_track' | 'warning' | 'danger';
}

/**
 * Calculate budget forecast based on current spending patterns
 */
export async function calculateBudgetForecast(
  userId: string,
  budgetId: string
): Promise<BudgetForecast | null> {
  // Get budget details
  const budget = await prisma.budget.findFirst({
    where: {
      id: budgetId,
      userId,
    },
    include: {
      category: true,
    },
  });

  if (!budget) return null;

  // Calculate days
  const now = new Date();
  const startDate = new Date(budget.startDate);
  const endDate = new Date(budget.endDate);
  
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysElapsed = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, totalDays - daysElapsed);

  // Get current spending
  const spending = await prisma.transaction.aggregate({
    where: {
      userId,
      categoryId: budget.categoryId,
      walletId: budget.walletId,
      type: { in: ['expense', 'EXPENSE'] },
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    _sum: {
      amount: true,
    },
  });

  const currentSpent = spending._sum.amount || 0;

  // Calculate projections
  const dailyAverageSpent = daysElapsed > 0 ? currentSpent / daysElapsed : 0;
  const projectedSpending = dailyAverageSpent * totalDays;
  const projectedOverage = Math.max(0, projectedSpending - budget.amount);
  const recommendedDailySpending = daysRemaining > 0 
    ? (budget.amount - currentSpent) / daysRemaining 
    : 0;

  // Determine if will exceed
  const willExceed = projectedSpending > budget.amount;
  
  // Calculate exceed date if applicable
  let exceedDate: Date | undefined;
  if (willExceed && dailyAverageSpent > 0) {
    const daysUntilExceed = (budget.amount - currentSpent) / dailyAverageSpent;
    if (daysUntilExceed > 0) {
      exceedDate = new Date(now.getTime() + daysUntilExceed * 24 * 60 * 60 * 1000);
    }
  }

  // Determine status
  const spentPercentage = (currentSpent / budget.amount) * 100;
  const timePercentage = (daysElapsed / totalDays) * 100;
  
  let status: 'on_track' | 'warning' | 'danger';
  if (spentPercentage > timePercentage + 20) {
    status = 'danger'; // Spending 20%+ ahead of schedule
  } else if (spentPercentage > timePercentage + 10) {
    status = 'warning'; // Spending 10%+ ahead of schedule
  } else {
    status = 'on_track';
  }

  return {
    budgetId: budget.id,
    budgetName: budget.category.name,
    currentSpent,
    budgetAmount: budget.amount,
    daysRemaining,
    totalDays,
    projectedSpending,
    projectedOverage,
    dailyAverageSpent,
    recommendedDailySpending,
    willExceed,
    exceedDate,
    status,
  };
}

/**
 * Get forecasts for all active budgets
 */
export async function getAllBudgetForecasts(userId: string): Promise<BudgetForecast[]> {
  const budgets = await prisma.budget.findMany({
    where: {
      userId,
      endDate: {
        gte: new Date(),
      },
    },
    select: {
      id: true,
    },
  });

  const forecasts = await Promise.all(
    budgets.map(budget => calculateBudgetForecast(userId, budget.id))
  );

  return forecasts.filter((f): f is BudgetForecast => f !== null);
}

/**
 * Check if budget needs alert
 */
export function shouldSendBudgetAlert(forecast: BudgetForecast): boolean {
  // Send alert if:
  // 1. Will exceed budget
  // 2. Status is danger
  // 3. Exceed date is within next 7 days
  
  if (!forecast.willExceed) return false;
  if (forecast.status === 'danger') return true;
  
  if (forecast.exceedDate) {
    const daysUntilExceed = Math.ceil(
      (forecast.exceedDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExceed <= 7;
  }
  
  return false;
}
