import prisma from '@/lib/prisma'
import { calculateWalletBalance } from '@/lib/walletBalance'

/**
 * Calculate emergency fund progress based on wallet balance
 */
export async function calculateEmergencyFundProgress(walletId: string) {
  try {
    // Calculate balance from transactions (source of truth)
    const balance = await calculateWalletBalance(walletId)

    // Get emergency fund target for this wallet
    const emergencyFund = await prisma.walletEmergencyFund.findUnique({
      where: { walletId },
    })

    if (!emergencyFund || !emergencyFund.isActive) {
      return {
        hasEmergencyFund: false,
        currentAmount: balance,
        targetAmount: 0,
        remaining: 0,
        percentage: 0,
      }
    }

    const currentAmount = balance
    const targetAmount = emergencyFund.targetAmount
    const remaining = Math.max(0, targetAmount - currentAmount)
    const percentage = targetAmount > 0 ? Math.min(100, (currentAmount / targetAmount) * 100) : 0

    return {
      hasEmergencyFund: true,
      currentAmount,
      targetAmount,
      remaining,
      percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
    }
  } catch (error) {
    console.error('Error calculating emergency fund progress:', error)
    throw error
  }
}

/**
 * Get emergency fund data for a specific wallet
 */
export async function getWalletEmergencyFund(walletId: string, userId: string) {
  try {
    const emergencyFund = await prisma.walletEmergencyFund.findUnique({
      where: { walletId },
      include: {
        wallet: {
          select: {
            id: true,
            name: true,
            balance: true,
            currencyCode: true,
          },
        },
      },
    })

    if (!emergencyFund) {
      // Return default structure if no emergency fund set
      const wallet = await prisma.wallet.findUnique({
        where: { id: walletId, userId },
        select: {
          id: true,
          name: true,
          balance: true,
          currencyCode: true,
        },
      })

      if (!wallet) {
        throw new Error('Wallet not found')
      }

      // Calculate balance from transactions (source of truth)
      const calculatedBalance = await calculateWalletBalance(walletId)

      return {
        walletId,
        wallet: { ...wallet, balance: calculatedBalance },
        targetAmount: 0,
        currentAmount: calculatedBalance,
        remaining: 0,
        percentage: 0,
        isActive: false,
      }
    }

    const progress = await calculateEmergencyFundProgress(walletId)

    return {
      id: emergencyFund.id,
      walletId: emergencyFund.walletId,
      wallet: emergencyFund.wallet,
      targetAmount: emergencyFund.targetAmount,
      currentAmount: progress.currentAmount,
      remaining: progress.remaining,
      percentage: progress.percentage,
      isActive: emergencyFund.isActive,
      createdAt: emergencyFund.createdAt,
      updatedAt: emergencyFund.updatedAt,
    }
  } catch (error) {
    console.error('Error getting wallet emergency fund:', error)
    throw error
  }
}

/**
 * Create or update emergency fund target for a wallet
 */
export async function setWalletEmergencyFundTarget(
  walletId: string,
  userId: string,
  targetAmount: number
) {
  try {
    // Verify wallet belongs to user
    const wallet = await prisma.wallet.findFirst({
      where: { id: walletId, userId },
    })

    if (!wallet) {
      throw new Error('Wallet not found or does not belong to user')
    }

    // Validate target amount
    if (targetAmount < 0) {
      throw new Error('Target amount must be positive')
    }

    // Upsert emergency fund
    const emergencyFund = await prisma.walletEmergencyFund.upsert({
      where: { walletId },
      update: {
        targetAmount,
        isActive: targetAmount > 0, // Auto-deactivate if target is 0
        updatedAt: new Date(),
      },
      create: {
        walletId,
        userId,
        targetAmount,
        isActive: targetAmount > 0,
      },
    })

    return emergencyFund
  } catch (error) {
    console.error('Error setting wallet emergency fund target:', error)
    throw error
  }
}

/**
 * Get all emergency funds for a user (across all wallets)
 */
export async function getUserEmergencyFunds(userId: string) {
  try {
    const wallets = await prisma.wallet.findMany({
      where: { userId },
      include: {
        emergencyFund: true,
      },
      orderBy: { isDefault: 'desc' },
    })

    const emergencyFunds = await Promise.all(
      wallets.map(async (wallet) => {
        const progress = await calculateEmergencyFundProgress(wallet.id)
        // Calculate balance from transactions (source of truth)
        const calculatedBalance = await calculateWalletBalance(wallet.id)

        return {
          walletId: wallet.id,
          walletName: wallet.name,
          walletBalance: calculatedBalance,
          targetAmount: wallet.emergencyFund?.targetAmount || 0,
          currentAmount: progress.currentAmount,
          remaining: progress.remaining,
          percentage: progress.percentage,
          isActive: wallet.emergencyFund?.isActive || false,
        }
      })
    )

    // Calculate totals
    const totalTarget = emergencyFunds.reduce((sum, ef) => sum + (ef.isActive ? ef.targetAmount : 0), 0)
    const totalCurrent = emergencyFunds.reduce((sum, ef) => sum + ef.currentAmount, 0)
    const totalRemaining = Math.max(0, totalTarget - totalCurrent)
    const totalPercentage = totalTarget > 0 ? Math.min(100, (totalCurrent / totalTarget) * 100) : 0

    return {
      wallets: emergencyFunds,
      totals: {
        targetAmount: totalTarget,
        currentAmount: totalCurrent,
        remaining: totalRemaining,
        percentage: Math.round(totalPercentage * 10) / 10,
      },
    }
  } catch (error) {
    console.error('Error getting user emergency funds:', error)
    throw error
  }
}

/**
 * Calculate average monthly expenses for emergency fund recommendation
 */
export async function calculateMonthlyExpenses(userId: string, walletId?: string, months: number = 6) {
  try {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - months)

    const whereClause: any = {
      userId,
      type: 'EXPENSE',
      date: {
        gte: sixMonthsAgo,
      },
    }

    // Filter by wallet if provided
    if (walletId) {
      whereClause.walletId = walletId
    }

    // Exclude savings transactions from essential expenses
    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        category: {
          select: {
            name: true,
            type: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    })

    // Filter out savings/investment transactions
    const essentialExpenses = transactions.filter((t) => {
      const catName = t.category?.name?.toLowerCase() || ''
      const desc = t.description?.toLowerCase() || ''

      // Exclude savings, investments, and non-essential categories
      const isSavings = catName.includes('saving') ||
                        catName.includes('tabungan') ||
                        catName.includes('investasi') ||
                        catName.includes('investment')

      const isSavingsDesc = desc.includes('tabungan') ||
                            desc.includes('saving') ||
                            desc.includes('invest')

      return !isSavings && !isSavingsDesc
    })

    if (essentialExpenses.length === 0) {
      return {
        averageMonthly: 0,
        totalExpenses: 0,
        transactionCount: 0,
        monthsAnalyzed: months,
        standardDeviation: 0,
        coefficientOfVariation: 0,
      }
    }

    // Calculate total and average
    const totalExpenses = essentialExpenses.reduce((sum, t) => sum + t.amount, 0)
    const averageMonthly = totalExpenses / months

    // Calculate standard deviation for volatility assessment
    const monthlyExpenses: number[] = []
    for (let i = 0; i < months; i++) {
      const monthStart = new Date()
      monthStart.setMonth(monthStart.getMonth() - i - 1)
      monthStart.setDate(1)

      const monthEnd = new Date()
      monthEnd.setMonth(monthEnd.getMonth() - i)
      monthEnd.setDate(0)

      const monthTotal = essentialExpenses
        .filter((t) => {
          const tDate = new Date(t.date)
          return tDate >= monthStart && tDate <= monthEnd
        })
        .reduce((sum, t) => sum + t.amount, 0)

      monthlyExpenses.push(monthTotal)
    }

    // Calculate standard deviation
    const mean = monthlyExpenses.reduce((sum, val) => sum + val, 0) / monthlyExpenses.length
    const squaredDiffs = monthlyExpenses.map((val) => Math.pow(val - mean, 2))
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / monthlyExpenses.length
    const standardDeviation = Math.sqrt(variance)

    // Coefficient of variation (CV) = standard deviation / mean
    // High CV (>0.5) = volatile spending, Low CV (<0.3) = stable spending
    const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 0

    return {
      averageMonthly: Math.round(averageMonthly),
      totalExpenses: Math.round(totalExpenses),
      transactionCount: essentialExpenses.length,
      monthsAnalyzed: months,
      standardDeviation: Math.round(standardDeviation),
      coefficientOfVariation: Math.round(coefficientOfVariation * 100) / 100,
    }
  } catch (error) {
    console.error('Error calculating monthly expenses:', error)
    throw error
  }
}
