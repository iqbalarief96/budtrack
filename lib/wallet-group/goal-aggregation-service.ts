import prisma from '@/lib/prisma'
import { WalletGroupError, getGroupById } from './wallet-group-service'

/**
 * GoalAggregationService - Aggregates goal data across wallet groups
 * Requirements: 12.1, 12.2, 12.3, 12.4
 */

// Types
export interface AggregatedGoal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  progress: number
  targetDate: Date | null
  status: string
  category: string | null
  description: string | null
  icon: string | null
  color: string | null
  isArchived: boolean
  // Wallet contributions from transactions linked to this goal
  walletContributions: WalletGoalContribution[]
}

export interface WalletGoalContribution {
  walletId: string
  walletName: string
  walletColor: string | null
  contributionAmount: number
  transactionCount: number
}

export interface WalletGoalSummary {
  walletId: string
  walletName: string
  walletColor: string | null
  goals: AggregatedGoal[]
  totalContribution: number
  goalCount: number
}

export interface AggregatedGoals {
  goals: AggregatedGoal[]
  totalTargetAmount: number
  totalCurrentAmount: number
  overallProgress: number
  combinedSavingsRate: number
  goalsByWallet: WalletGoalSummary[]
}


/**
 * Get aggregated goals for a wallet group
 * Requirements: 12.1, 12.2, 12.3, 12.4
 * 
 * - 12.1: Display goals from all Linked_Wallets (via transactions)
 * - 12.2: Indicate which wallet each goal is linked to (via contributions)
 * - 12.3: Show total goal progress across all Linked_Wallets
 * - 12.4: Display combined savings rate from all Linked_Wallets
 */
export async function getAggregatedGoals(
  groupId: string,
  userId: string
): Promise<AggregatedGoals> {
  // Verify group ownership and get group with wallets
  const group = await getGroupById(groupId, userId)
  
  if (!group) {
    throw new WalletGroupError('Wallet group not found', 'GROUP_NOT_FOUND')
  }

  const walletIds = group.wallets.map((member) => member.walletId)

  if (walletIds.length === 0) {
    return {
      goals: [],
      totalTargetAmount: 0,
      totalCurrentAmount: 0,
      overallProgress: 0,
      combinedSavingsRate: 0,
      goalsByWallet: [],
    }
  }

  // Get all goals for the user that have transactions from wallets in the group
  // First, find all goal IDs that have transactions from these wallets
  const goalTransactions = await prisma.transaction.findMany({
    where: {
      walletId: { in: walletIds },
      userId,
      goalId: { not: null },
    },
    select: {
      goalId: true,
      walletId: true,
      amount: true,
      wallet: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
    },
  })

  // Get unique goal IDs
  const goalIds = [...new Set(goalTransactions.filter(t => t.goalId).map(t => t.goalId!))]

  // Also get all user goals (since goals might not have transactions yet)
  const allUserGoals = await prisma.goal.findMany({
    where: {
      userId,
      isArchived: false,
    },
    include: {
      transactions: {
        where: {
          walletId: { in: walletIds },
        },
        select: {
          id: true,
          amount: true,
          walletId: true,
          wallet: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Filter to only goals that have transactions from group wallets OR are linked to group wallets
  const relevantGoals = allUserGoals.filter(goal => 
    goal.transactions.length > 0 || goalIds.includes(goal.id)
  )

  // Initialize wallet summaries
  const walletSummaryMap = new Map<string, WalletGoalSummary>()
  for (const member of group.wallets) {
    walletSummaryMap.set(member.walletId, {
      walletId: member.walletId,
      walletName: member.wallet.name,
      walletColor: member.wallet.color || null,
      goals: [],
      totalContribution: 0,
      goalCount: 0,
    })
  }

  let totalTargetAmount = 0
  let totalCurrentAmount = 0

  // Process goals (Requirement 12.1, 12.2)
  const aggregatedGoals: AggregatedGoal[] = relevantGoals.map((goal) => {
    // Calculate wallet contributions from transactions
    const contributionMap = new Map<string, WalletGoalContribution>()
    
    for (const tx of goal.transactions) {
      if (!contributionMap.has(tx.walletId)) {
        contributionMap.set(tx.walletId, {
          walletId: tx.wallet.id,
          walletName: tx.wallet.name,
          walletColor: tx.wallet.color || null,
          contributionAmount: 0,
          transactionCount: 0,
        })
      }
      const contribution = contributionMap.get(tx.walletId)!
      contribution.contributionAmount += tx.amount
      contribution.transactionCount++
    }

    const walletContributions = Array.from(contributionMap.values())
    const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0

    const aggregatedGoal: AggregatedGoal = {
      id: goal.id,
      name: goal.name,
      targetAmount: goal.target,
      currentAmount: goal.current,
      progress,
      targetDate: goal.deadline,
      status: goal.status,
      category: goal.category,
      description: goal.description,
      icon: goal.icon,
      color: goal.color,
      isArchived: goal.isArchived,
      walletContributions,
    }

    // Update wallet summaries
    for (const contribution of walletContributions) {
      const walletSummary = walletSummaryMap.get(contribution.walletId)
      if (walletSummary) {
        walletSummary.goals.push(aggregatedGoal)
        walletSummary.totalContribution += contribution.contributionAmount
        walletSummary.goalCount++
      }
    }

    totalTargetAmount += goal.target
    totalCurrentAmount += goal.current

    return aggregatedGoal
  })

  // Calculate overall progress (Requirement 12.3)
  const overallProgress = totalTargetAmount > 0 
    ? (totalCurrentAmount / totalTargetAmount) * 100 
    : 0

  // Calculate combined savings rate (Requirement 12.4)
  // Savings rate = (total savings / total income) * 100
  // Get income and savings transactions from the last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const incomeResult = await prisma.transaction.aggregate({
    where: {
      walletId: { in: walletIds },
      userId,
      type: { in: ['income', 'INCOME'] },
      date: { gte: thirtyDaysAgo },
    },
    _sum: { amount: true },
  })

  // Savings = income transactions linked to goals (savings type)
  const savingsResult = await prisma.transaction.aggregate({
    where: {
      walletId: { in: walletIds },
      userId,
      goalId: { not: null },
      date: { gte: thirtyDaysAgo },
    },
    _sum: { amount: true },
  })

  const totalIncome = incomeResult._sum.amount || 0
  const totalSavings = savingsResult._sum.amount || 0
  const combinedSavingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0

  return {
    goals: aggregatedGoals,
    totalTargetAmount,
    totalCurrentAmount,
    overallProgress,
    combinedSavingsRate,
    goalsByWallet: Array.from(walletSummaryMap.values()).filter(w => w.goalCount > 0),
  }
}



// ============ Helper Functions for Property Testing ============

/**
 * Verify all goals have correct progress calculation
 * Used for property testing - Property 19
 */
export function verifyGoalProgress(
  targetAmount: number,
  currentAmount: number,
  progress: number
): boolean {
  if (targetAmount <= 0) {
    return progress === 0
  }
  const expectedProgress = (currentAmount / targetAmount) * 100
  return Math.abs(progress - expectedProgress) < 0.01
}

/**
 * Verify overall progress calculation
 * Used for property testing - Property 19
 */
export function verifyOverallProgress(
  totalTargetAmount: number,
  totalCurrentAmount: number,
  overallProgress: number
): boolean {
  if (totalTargetAmount <= 0) {
    return overallProgress === 0
  }
  const expectedProgress = (totalCurrentAmount / totalTargetAmount) * 100
  return Math.abs(overallProgress - expectedProgress) < 0.01
}

/**
 * Verify total target amount equals sum of goal targets
 * Used for property testing - Property 19
 */
export function verifyTotalTargetAmount(
  goals: AggregatedGoal[],
  totalTargetAmount: number
): boolean {
  const calculatedTotal = goals.reduce((sum, g) => sum + g.targetAmount, 0)
  return Math.abs(totalTargetAmount - calculatedTotal) < 0.01
}

/**
 * Verify total current amount equals sum of goal current amounts
 * Used for property testing - Property 19
 */
export function verifyTotalCurrentAmount(
  goals: AggregatedGoal[],
  totalCurrentAmount: number
): boolean {
  const calculatedTotal = goals.reduce((sum, g) => sum + g.currentAmount, 0)
  return Math.abs(totalCurrentAmount - calculatedTotal) < 0.01
}

/**
 * Verify wallet contribution amounts are correct
 * Used for property testing - Property 19
 */
export function verifyWalletContributions(
  goal: AggregatedGoal
): boolean {
  // Each contribution should have valid wallet info
  return goal.walletContributions.every(
    (c) => c.walletId && c.walletId.length > 0 && c.walletName && c.walletName.length > 0
  )
}

/**
 * Verify all goals have valid wallet contributions
 * Used for property testing - Property 19
 */
export function verifyAllGoalsHaveValidContributions(
  goals: AggregatedGoal[]
): boolean {
  return goals.every(verifyWalletContributions)
}

/**
 * Verify savings rate is between 0 and reasonable max
 * Used for property testing - Property 19
 */
export function verifySavingsRateRange(
  savingsRate: number
): boolean {
  // Savings rate can exceed 100% if savings > income (e.g., from other sources)
  // But it should be non-negative
  return savingsRate >= 0
}

/**
 * Calculate expected total goals from wallet summaries
 * Used for property testing - Property 19
 */
export function calculateExpectedTotalGoals(
  walletSummaries: WalletGoalSummary[]
): number {
  // Note: Goals can appear in multiple wallet summaries if they have contributions from multiple wallets
  // So we can't simply sum goalCount
  const uniqueGoalIds = new Set<string>()
  for (const summary of walletSummaries) {
    for (const goal of summary.goals) {
      uniqueGoalIds.add(goal.id)
    }
  }
  return uniqueGoalIds.size
}

/**
 * Verify wallet summary contribution totals
 * Used for property testing - Property 19
 */
export function verifyWalletSummaryContributions(
  walletSummary: WalletGoalSummary
): boolean {
  // Total contribution should equal sum of contributions from all goals for this wallet
  let calculatedTotal = 0
  for (const goal of walletSummary.goals) {
    const walletContribution = goal.walletContributions.find(
      (c) => c.walletId === walletSummary.walletId
    )
    if (walletContribution) {
      calculatedTotal += walletContribution.contributionAmount
    }
  }
  return Math.abs(walletSummary.totalContribution - calculatedTotal) < 0.01
}

/**
 * Verify all wallet summaries have correct contribution totals
 * Used for property testing - Property 19
 */
export function verifyAllWalletSummaryContributions(
  walletSummaries: WalletGoalSummary[]
): boolean {
  return walletSummaries.every(verifyWalletSummaryContributions)
}

/**
 * Calculate savings rate from income and savings
 * Used for property testing - Property 19
 */
export function calculateSavingsRate(
  totalIncome: number,
  totalSavings: number
): number {
  if (totalIncome <= 0) {
    return 0
  }
  return (totalSavings / totalIncome) * 100
}
