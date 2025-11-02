import prisma from '@/lib/prisma'
import { SavingsType } from './savingsTracker'

// Map savings types to goal categories
export const SAVINGS_TO_GOAL_CATEGORY: Record<SavingsType, string[]> = {
  EMERGENCY: ['EMERGENCY_FUND'],
  EDUCATION: ['EDUCATION'],
  VACATION: ['VACATION'],
  RETIREMENT: ['RETIREMENT'],
  PROPERTY: ['HOME_DOWN_PAYMENT', 'PROPERTY'],
  VEHICLE: ['CAR', 'VEHICLE'],
  BANK: ['OTHER'],
  GOLD: ['OTHER'],
  CRYPTO: ['OTHER'],
  INVESTMENT: ['OTHER'],
  DEPOSIT: ['OTHER'],
  OTHER: ['OTHER'],
}

/**
 * Find matching active goal for a savings type
 */
export async function findMatchingGoal(userId: string, savingsType: SavingsType) {
  try {
    const possibleCategories = SAVINGS_TO_GOAL_CATEGORY[savingsType]

    // Find active goals matching the savings type
    const goal = await prisma.goal.findFirst({
      where: {
        userId,
        status: 'ONGOING',
        isArchived: false,
        category: {
          in: possibleCategories,
        },
      },
      orderBy: [
        { createdAt: 'desc' }, // Prefer most recent goal
      ],
    })

    return goal
  } catch (error) {
    console.error('Error finding matching goal:', error)
    return null
  }
}

/**
 * Auto-link a savings transaction to a matching goal
 */
export async function autoLinkSavingsToGoal(
  transactionId: string,
  userId: string,
  savingsType: SavingsType
): Promise<{ linked: boolean; goalId?: string; goalName?: string }> {
  try {
    // Find matching goal
    const goal = await findMatchingGoal(userId, savingsType)

    if (!goal) {
      return { linked: false }
    }

    // Get transaction details
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: {
        amount: true,
        description: true,
        date: true,
      },
    })

    if (!transaction) {
      throw new Error('Transaction not found')
    }

    // Create goal activity linked to transaction
    await prisma.goalActivity.create({
      data: {
        goalId: goal.id,
        userId,
        amount: transaction.amount,
        date: transaction.date,
        description: transaction.description || `Savings contribution`,
        transactionId,
      },
    })

    // Update goal current amount
    await prisma.goal.update({
      where: { id: goal.id },
      data: {
        current: {
          increment: transaction.amount,
        },
        // Auto-complete goal if target reached
        status: goal.current + transaction.amount >= goal.target ? 'COMPLETED' : 'ONGOING',
        updatedAt: new Date(),
      },
    })

    // Update transaction with goalId
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { goalId: goal.id },
    })

    return {
      linked: true,
      goalId: goal.id,
      goalName: goal.name,
    }
  } catch (error) {
    console.error('Error auto-linking savings to goal:', error)
    // Don't throw error - allow transaction to proceed even if linking fails
    return { linked: false }
  }
}

/**
 * Manually link a transaction to a goal
 */
export async function linkTransactionToGoal(
  transactionId: string,
  goalId: string,
  userId: string
): Promise<void> {
  try {
    // Verify goal belongs to user and is active
    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId,
        isArchived: false,
      },
    })

    if (!goal) {
      throw new Error('Goal not found or is archived')
    }

    // Verify transaction belongs to user
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
    })

    if (!transaction) {
      throw new Error('Transaction not found')
    }

    // Check if already linked to this goal
    const existingActivity = await prisma.goalActivity.findFirst({
      where: {
        transactionId,
        goalId,
      },
    })

    if (existingActivity) {
      throw new Error('Transaction already linked to this goal')
    }

    // If transaction was linked to a different goal, remove old link
    if (transaction.goalId && transaction.goalId !== goalId) {
      await unlinkTransactionFromGoal(transactionId, userId)
    }

    // Create goal activity
    await prisma.goalActivity.create({
      data: {
        goalId,
        userId,
        amount: transaction.amount,
        date: transaction.date,
        description: transaction.description || 'Manual contribution',
        transactionId,
      },
    })

    // Update goal current amount
    await prisma.goal.update({
      where: { id: goalId },
      data: {
        current: {
          increment: transaction.amount,
        },
        status: goal.current + transaction.amount >= goal.target ? 'COMPLETED' : 'ONGOING',
        updatedAt: new Date(),
      },
    })

    // Update transaction with goalId
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { goalId },
    })
  } catch (error) {
    console.error('Error linking transaction to goal:', error)
    throw error
  }
}

/**
 * Unlink a transaction from a goal
 */
export async function unlinkTransactionFromGoal(transactionId: string, userId: string): Promise<void> {
  try {
    // Get transaction with goal info
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
    })

    if (!transaction || !transaction.goalId) {
      return // Nothing to unlink
    }

    // Find and delete goal activity
    const goalActivity = await prisma.goalActivity.findFirst({
      where: {
        transactionId,
        goalId: transaction.goalId,
      },
    })

    if (goalActivity) {
      // Decrease goal current amount
      await prisma.goal.update({
        where: { id: transaction.goalId },
        data: {
          current: {
            decrement: goalActivity.amount,
          },
          updatedAt: new Date(),
        },
      })

      // Delete goal activity
      await prisma.goalActivity.delete({
        where: { id: goalActivity.id },
      })
    }

    // Remove goalId from transaction
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { goalId: null },
    })
  } catch (error) {
    console.error('Error unlinking transaction from goal:', error)
    throw error
  }
}

/**
 * Get all goals that match a savings type (for dropdown selection)
 */
export async function getMatchingGoalsForSavingsType(userId: string, savingsType: SavingsType) {
  try {
    const possibleCategories = SAVINGS_TO_GOAL_CATEGORY[savingsType]

    const goals = await prisma.goal.findMany({
      where: {
        userId,
        status: 'ONGOING',
        isArchived: false,
        category: {
          in: possibleCategories,
        },
      },
      select: {
        id: true,
        name: true,
        target: true,
        current: true,
        category: true,
        deadline: true,
      },
      orderBy: [
        { createdAt: 'desc' },
      ],
    })

    return goals.map((goal) => ({
      id: goal.id,
      name: goal.name,
      target: goal.target,
      current: goal.current,
      category: goal.category,
      deadline: goal.deadline,
      percentage: Math.min(100, (goal.current / goal.target) * 100),
    }))
  } catch (error) {
    console.error('Error getting matching goals:', error)
    return []
  }
}

/**
 * Get linked goal info for a transaction
 */
export async function getTransactionGoalLink(transactionId: string) {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        goal: {
          select: {
            id: true,
            name: true,
            target: true,
            current: true,
            category: true,
          },
        },
      },
    })

    if (!transaction || !transaction.goal) {
      return null
    }

    return {
      goalId: transaction.goal.id,
      goalName: transaction.goal.name,
      goalTarget: transaction.goal.target,
      goalCurrent: transaction.goal.current,
      goalCategory: transaction.goal.category,
      percentage: Math.min(100, (transaction.goal.current / transaction.goal.target) * 100),
    }
  } catch (error) {
    console.error('Error getting transaction goal link:', error)
    return null
  }
}
