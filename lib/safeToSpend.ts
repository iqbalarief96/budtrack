import prisma from '@/lib/prisma'
import { calculateWalletBalance } from '@/lib/walletBalance'

export interface SafeToSpendBreakdown {
  walletId: string
  walletName: string
  totalBalance: number
  upcomingBills: number
  budgetAllocations: number
  savingsGoals: number
  emergencyBuffer: number
  safeToSpend: number
  currencyCode: string
  breakdown: {
    upcomingBillsDetails: Array<{
      name: string
      amount: number
      nextDate: Date
      daysUntilDue: number
    }>
    budgetDetails: Array<{
      categoryName: string
      budgetAmount: number
      spent: number
      remaining: number
    }>
    goalDetails: Array<{
      goalName: string
      target: number
      current: number
      remaining: number
    }>
    emergencyFundDetails: {
      targetAmount: number
      currentBalance: number
      shortfall: number
    } | null
  }
}

/**
 * Calculate safe-to-spend amount for a specific wallet
 * This shows how much money can be safely spent after accounting for:
 * - Upcoming recurring bills (next 30 days)
 * - Active budget allocations (remaining budget for current period)
 * - Savings goals (amounts needed to reach goals)
 * - Emergency fund buffer (if target not yet met)
 */
export async function calculateSafeToSpend(
  walletId: string,
  userId: string
): Promise<SafeToSpendBreakdown> {
  // Get wallet details
  const wallet = await prisma.wallet.findFirst({
    where: {
      id: walletId,
      userId,
    },
  })

  if (!wallet) {
    throw new Error('Wallet not found')
  }

  // Calculate balance from transactions (source of truth)
  const walletBalance = await calculateWalletBalance(walletId)

  // 1. Get upcoming bills (recurring transactions in next 30 days)
  const now = new Date()
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

  const upcomingRecurringTransactions = await prisma.recurringTransaction.findMany({
    where: {
      walletId,
      userId,
      isActive: true,
      type: 'expense',
      nextPaymentDate: {
        gte: now,
        lte: thirtyDaysFromNow,
      },
    },
    orderBy: {
      nextPaymentDate: 'asc',
    },
  })

  const upcomingBillsTotal = upcomingRecurringTransactions.reduce(
    (sum, bill) => sum + bill.amount,
    0
  )

  const upcomingBillsDetails = upcomingRecurringTransactions.map((bill) => {
    const daysUntilDue = Math.ceil(
      (bill.nextPaymentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )
    return {
      name: bill.name,
      amount: bill.amount,
      nextDate: bill.nextPaymentDate,
      daysUntilDue,
    }
  })

  // 2. Get active budgets and calculate remaining allocations
  const activeBudgets = await prisma.budget.findMany({
    where: {
      walletId,
      userId,
      endDate: {
        gte: now,
      },
      startDate: {
        lte: now,
      },
    },
    include: {
      category: true,
    },
  })

  // Calculate actual spending for each budget
  const budgetDetailsPromises = activeBudgets.map(async (budget) => {
    const spending = await prisma.transaction.aggregate({
      where: {
        userId,
        walletId,
        categoryId: budget.categoryId,
        type: 'EXPENSE',
        date: {
          gte: budget.startDate,
          lte: budget.endDate,
        },
      },
      _sum: {
        amount: true,
      },
    })

    const spent = spending._sum.amount || 0
    const remaining = Math.max(budget.amount - spent, 0)

    return {
      categoryName: budget.category.name,
      budgetAmount: budget.amount,
      spent,
      remaining,
    }
  })

  const budgetDetails = await Promise.all(budgetDetailsPromises)
  const budgetAllocationsTotal = budgetDetails.reduce(
    (sum, budget) => sum + budget.remaining,
    0
  )

  // 3. Get active savings goals and calculate MONTHLY allocation needed
  const activeGoals = await prisma.goal.findMany({
    where: {
      userId,
      status: 'ONGOING',
      isArchived: false,
    },
  })

  const goalDetails = activeGoals.map((goal) => {
    const remaining = Math.max(goal.target - goal.current, 0)
    let monthlyAllocation = 0

    if (goal.deadline) {
      const today = new Date()
      const deadline = new Date(goal.deadline)

      // Calculate months remaining
      const monthsRemaining = (deadline.getFullYear() - today.getFullYear()) * 12 +
        (deadline.getMonth() - today.getMonth())

      // If deadline is in future, calculate monthly need. 
      // If deadline passed or is this month, treat as immediate need but maybe capped?
      // For safe-to-spend, let's be realistic: if deadline is 10 months away, we need 1/10th now.
      const monthsDivisor = Math.max(monthsRemaining, 1) // Avoid division by zero
      monthlyAllocation = remaining / monthsDivisor
    } else {
      // If no deadline, maybe assume a 12-month horizon or just 0 (optional goal)
      // Let's assume 0 for now to be less aggressive, or user can set deadline.
      monthlyAllocation = 0
    }

    return {
      goalName: goal.name,
      target: goal.target,
      current: goal.current,
      remaining: remaining, // Total remaining
      monthlyAllocation: monthlyAllocation // What we actually deduct for safe-to-spend
    }
  })

  const savingsGoalsTotal = goalDetails.reduce(
    (sum, goal) => sum + goal.monthlyAllocation,
    0
  )

  // 4. Get emergency fund for this wallet (check both wallet-level and user-level)
  let emergencyBufferTotal = 0
  let emergencyFundDetails = null

  console.log('[SafeToSpend] Checking emergency funds for wallet:', walletId, 'user:', userId)

  try {
    const walletEmergencyFund = await prisma.walletEmergencyFund.findUnique({
      where: {
        walletId,
      },
    })

    console.log('[SafeToSpend] Wallet-level emergency fund:', walletEmergencyFund)

    // Prioritize wallet-level emergency fund
    if (walletEmergencyFund && walletEmergencyFund.isActive) {
      const shortfall = Math.max(walletEmergencyFund.targetAmount - walletBalance, 0)
      emergencyBufferTotal = shortfall
      emergencyFundDetails = {
        targetAmount: walletEmergencyFund.targetAmount,
        currentBalance: walletBalance,
        shortfall,
      }
      console.log('[SafeToSpend] Using wallet-level emergency fund. Shortfall:', shortfall)
    } else {
      console.log('[SafeToSpend] No active wallet-level emergency fund, checking user-level')
      // Fallback to user-level emergency fund if wallet-level doesn't exist
      try {
        const user = await prisma.user.findUnique({
          where: {
            id: userId,
          },
          include: {
            emergencyFund: true,
          },
        })

        console.log('[SafeToSpend] User emergency fund:', user?.emergencyFund)

        if (user?.emergencyFund && user.emergencyFund.isActive) {
          // For user-level emergency fund, use the wallet balance as current emergency fund amount
          // and calculate shortfall against the full target amount
          const targetAmount = user.emergencyFund.targetAmount
          const currentAmount = walletBalance

          console.log('[SafeToSpend] User-level emergency fund calculation:', {
            targetAmount,
            currentAmount,
            walletBalance: walletBalance,
          })

          // Shortfall is the amount still needed to reach the emergency fund target
          const shortfall = Math.max(targetAmount - currentAmount, 0)
          emergencyBufferTotal = shortfall
          emergencyFundDetails = {
            targetAmount,
            currentBalance: currentAmount,
            shortfall,
          }
          console.log('[SafeToSpend] Using user-level emergency fund. Shortfall:', shortfall)
        } else {
          console.log('[SafeToSpend] No active user-level emergency fund found')
        }
      } catch (userEmergencyFundError) {
        // If user-level emergency fund check fails, just skip it
        console.error('[SafeToSpend] Error checking user-level emergency fund:', userEmergencyFundError)
        emergencyBufferTotal = 0
      }
    }
  } catch (emergencyFundError) {
    // If emergency fund check fails entirely, just skip it
    console.error('[SafeToSpend] Error checking emergency funds:', emergencyFundError)
    emergencyBufferTotal = 0
  }

  console.log('[SafeToSpend] Final emergency buffer total:', emergencyBufferTotal)

  // 5. Calculate safe to spend
  const safeToSpend = Math.max(
    walletBalance -
    upcomingBillsTotal -
    budgetAllocationsTotal -
    savingsGoalsTotal -
    emergencyBufferTotal,
    0
  )

  return {
    walletId: wallet.id,
    walletName: wallet.name,
    totalBalance: walletBalance,
    upcomingBills: upcomingBillsTotal,
    budgetAllocations: budgetAllocationsTotal,
    savingsGoals: savingsGoalsTotal,
    emergencyBuffer: emergencyBufferTotal,
    safeToSpend,
    currencyCode: wallet.currencyCode,
    breakdown: {
      upcomingBillsDetails,
      budgetDetails,
      goalDetails,
      emergencyFundDetails,
    },
  }
}

/**
 * Calculate safe-to-spend across all wallets for a user
 */
export async function calculateAllWalletsSafeToSpend(userId: string) {
  const wallets = await prisma.wallet.findMany({
    where: {
      userId,
    },
    orderBy: {
      isDefault: 'desc',
    },
  })

  const calculations = await Promise.all(
    wallets.map((wallet) => calculateSafeToSpend(wallet.id, userId))
  )

  // Calculate totals (convert to primary currency if needed - for now assume all same currency)
  const totals = calculations.reduce(
    (acc, calc) => ({
      totalBalance: acc.totalBalance + calc.totalBalance,
      upcomingBills: acc.upcomingBills + calc.upcomingBills,
      budgetAllocations: acc.budgetAllocations + calc.budgetAllocations,
      savingsGoals: acc.savingsGoals + calc.savingsGoals,
      emergencyBuffer: acc.emergencyBuffer + calc.emergencyBuffer,
      safeToSpend: acc.safeToSpend + calc.safeToSpend,
    }),
    {
      totalBalance: 0,
      upcomingBills: 0,
      budgetAllocations: 0,
      savingsGoals: 0,
      emergencyBuffer: 0,
      safeToSpend: 0,
    }
  )

  return {
    wallets: calculations,
    totals,
    primaryCurrency: wallets[0]?.currencyCode || 'IDR',
  }
}
