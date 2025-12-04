import prisma from '@/lib/prisma';
import type {
  NetWorthGoal,
  CreateGoalInput,
  UpdateGoalInput,
  GoalProgress,
  Milestone,
} from '@/app/types/net-worth';

/**
 * NetWorthGoalService - Manages net worth goals
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export class NetWorthGoalService {
  /**
   * Create a new net worth goal
   * 
   * Requirements: 4.1
   */
  async createGoal(userId: string, data: CreateGoalInput): Promise<NetWorthGoal> {
    // Validate target date is in the future
    if (data.targetDate <= new Date()) {
      throw new Error('Target date must be in the future');
    }

    // Validate target amount is positive
    if (data.targetAmount <= 0) {
      throw new Error('Target amount must be positive');
    }

    const goal = await (prisma as any).netWorthGoal.create({
      data: {
        userId,
        targetAmount: data.targetAmount,
        targetDate: data.targetDate,
        isActive: true,
      },
    });

    return this.mapToGoal(goal);
  }

  /**
   * Update an existing net worth goal
   * 
   * Requirements: 4.5
   */
  async updateGoal(goalId: string, data: UpdateGoalInput): Promise<NetWorthGoal> {
    // Validate target date if provided
    if (data.targetDate && data.targetDate <= new Date()) {
      throw new Error('Target date must be in the future');
    }

    // Validate target amount if provided
    if (data.targetAmount !== undefined && data.targetAmount <= 0) {
      throw new Error('Target amount must be positive');
    }

    const goal = await (prisma as any).netWorthGoal.update({
      where: { id: goalId },
      data: {
        ...(data.targetAmount !== undefined && { targetAmount: data.targetAmount }),
        ...(data.targetDate !== undefined && { targetDate: data.targetDate }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return this.mapToGoal(goal);
  }


  /**
   * Delete a net worth goal
   * 
   * Requirements: 4.5
   */
  async deleteGoal(goalId: string): Promise<void> {
    await (prisma as any).netWorthGoal.delete({
      where: { id: goalId },
    });
  }

  /**
   * Get all goals for a user
   * 
   * Requirements: 4.1
   */
  async getGoals(userId: string): Promise<NetWorthGoal[]> {
    const goals = await (prisma as any).netWorthGoal.findMany({
      where: { userId },
      orderBy: { targetDate: 'asc' },
    });

    return goals.map((g: any) => this.mapToGoal(g));
  }

  /**
   * Get a single goal by ID
   */
  async getGoal(goalId: string): Promise<NetWorthGoal | null> {
    const goal = await (prisma as any).netWorthGoal.findUnique({
      where: { id: goalId },
    });

    return goal ? this.mapToGoal(goal) : null;
  }

  /**
   * Calculate progress towards a goal
   * Formula: (currentNetWorth / targetAmount) * 100, capped at 100%
   * 
   * Requirements: 4.2
   */
  calculateProgress(goal: NetWorthGoal, currentNetWorth: number): GoalProgress {
    const targetAmount = goal.targetAmount;
    
    // Calculate progress percentage, capped at 100%
    const progressPercentage = targetAmount > 0
      ? Math.min((currentNetWorth / targetAmount) * 100, 100)
      : 0;

    // Calculate remaining amount (can be negative if exceeded)
    const remainingAmount = Math.max(targetAmount - currentNetWorth, 0);

    // Calculate months remaining
    const monthsRemaining = this.calculateMonthsRemaining(goal.targetDate);

    // Calculate required monthly growth
    const requiredMonthlyGrowth = this.calculateRequiredGrowth(
      currentNetWorth,
      targetAmount,
      monthsRemaining
    );

    // Determine if on track
    const isOnTrack = progressPercentage >= this.getExpectedProgress(goal);

    return {
      currentNetWorth,
      targetAmount,
      progressPercentage,
      remainingAmount,
      requiredMonthlyGrowth,
      monthsRemaining,
      isOnTrack,
    };
  }

  /**
   * Calculate required monthly growth rate to achieve goal
   * Formula: (targetAmount - currentNetWorth) / monthsRemaining
   * 
   * Requirements: 4.3
   */
  calculateRequiredGrowth(
    currentNetWorth: number,
    targetAmount: number,
    monthsRemaining: number
  ): number {
    // If already achieved or no time remaining
    if (currentNetWorth >= targetAmount || monthsRemaining <= 0) {
      return 0;
    }

    return (targetAmount - currentNetWorth) / monthsRemaining;
  }

  /**
   * Calculate months remaining until target date
   */
  calculateMonthsRemaining(targetDate: Date): number {
    const now = new Date();
    const target = new Date(targetDate);
    
    const yearDiff = target.getFullYear() - now.getFullYear();
    const monthDiff = target.getMonth() - now.getMonth();
    
    const totalMonths = yearDiff * 12 + monthDiff;
    
    return Math.max(totalMonths, 0);
  }

  /**
   * Check if a milestone has been reached
   * Milestones: 25%, 50%, 75%, 100%
   * 
   * Requirements: 4.4
   */
  checkMilestone(progressPercentage: number): Milestone | null {
    if (progressPercentage >= 100) {
      return 100;
    }
    if (progressPercentage >= 75) {
      return 75;
    }
    if (progressPercentage >= 50) {
      return 50;
    }
    if (progressPercentage >= 25) {
      return 25;
    }
    return null;
  }

  /**
   * Get expected progress based on time elapsed
   */
  private getExpectedProgress(goal: NetWorthGoal): number {
    const now = new Date();
    const created = new Date(goal.createdAt);
    const target = new Date(goal.targetDate);

    const totalDuration = target.getTime() - created.getTime();
    const elapsed = now.getTime() - created.getTime();

    if (totalDuration <= 0) {
      return 100;
    }

    return (elapsed / totalDuration) * 100;
  }

  /**
   * Map database record to NetWorthGoal type
   */
  private mapToGoal(record: {
    id: string;
    userId: string;
    targetAmount: number;
    targetDate: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): NetWorthGoal {
    return {
      id: record.id,
      userId: record.userId,
      targetAmount: record.targetAmount,
      targetDate: record.targetDate,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}

// Export singleton instance
export const netWorthGoalService = new NetWorthGoalService();
