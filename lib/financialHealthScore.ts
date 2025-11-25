import prisma from '@/lib/prisma'

export interface ScoreComponent {
  name: string
  score: number // 0-100
  weight: number // percentage of total score
  status: 'excellent' | 'good' | 'fair' | 'poor'
  message: string
  details: string
  recommendation?: string
  breakdown?: {
    // For Emergency Fund
    currentAmount?: number
    targetAmount?: number
    monthsCovered?: number
    // For Savings Rate
    income?: number
    expenses?: number
    savingsAmount?: number
    // For Budget Adherence
    totalBudgets?: number
    budgetsOnTrack?: number
    // For Spending Consistency
    avgMonthlySpending?: number
    variance?: number
  }
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  earnedDate?: Date
  isEarned: boolean
  progress?: number // 0-100
}

export interface FinancialHealthScore {
  overallScore: number // 0-100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'
  status: 'excellent' | 'good' | 'fair' | 'poor'
  components: {
    emergencyFund: ScoreComponent
    savingsRate: ScoreComponent
    budgetAdherence: ScoreComponent
    debtRatio: ScoreComponent
    spendingConsistency: ScoreComponent
  }
  achievements: Achievement[]
  strengths: string[]
  improvements: string[]
  trend?: 'improving' | 'stable' | 'declining'
  lastCalculated: Date
}

/**
 * Calculate Emergency Fund Readiness Score (0-100)
 * Scoring:
 * - 100: 6+ months expenses
 * - 80: 3-6 months expenses
 * - 60: 1-3 months expenses
 * - 40: < 1 month expenses
 * - 20: No emergency fund
 */
async function calculateEmergencyFundScore(
  userId: string,
  walletId?: string,
  period: number = 3
): Promise<ScoreComponent> {
  // Get all wallet emergency funds (filtered by walletId if provided)
  const walletEmergencyFunds = await prisma.walletEmergencyFund.findMany({
    where: {
      userId,
      isActive: true,
      ...(walletId && { walletId }),
    },
    include: {
      wallet: true,
    },
  })

  let totalTarget = 0
  let totalCurrent = 0

  // Check wallet-level emergency funds first
  if (walletEmergencyFunds.length > 0) {
    totalTarget = walletEmergencyFunds.reduce((sum, ef) => sum + ef.targetAmount, 0)
    totalCurrent = walletEmergencyFunds.reduce((sum, ef) => sum + ef.wallet.balance, 0)
  } else {
    // If no wallet-level emergency fund, check for user-level emergency fund
    const userEmergencyFund = await prisma.emergencyFund.findFirst({
      where: {
        userId,
        isActive: true
      },
    })

    if (userEmergencyFund) {
      totalTarget = userEmergencyFund.targetAmount
      // For user-level emergency fund, use the specified wallet balance or default/main wallet balance
      let wallet
      if (walletId) {
        wallet = await prisma.wallet.findUnique({ where: { id: walletId } })
      } else {
        const defaultWallet = await prisma.wallet.findFirst({
          where: {
            userId,
            isDefault: true,
          },
        })
        // If no default wallet, use the first wallet
        wallet = defaultWallet || await prisma.wallet.findFirst({
          where: { userId },
          orderBy: { createdAt: 'asc' },
        })
      }

      totalCurrent = wallet?.balance || 0
    } else {
      // Auto-detect wallets with "emergency" or "darurat" in the name
      if (walletId) {
        // If specific wallet is selected, only check that wallet
        const wallet = await prisma.wallet.findUnique({
          where: { id: walletId, userId },
        })
        
        if (wallet) {
          const nameLower = wallet.name.toLowerCase()
          const isEmergencyWallet = nameLower.includes('emergency') || 
                                   nameLower.includes('darurat') || 
                                   nameLower.includes('dana darurat')
          
          if (isEmergencyWallet) {
            totalCurrent = wallet.balance
            totalTarget = 0 // Will be calculated based on expenses later
          }
        }
      } else {
        // If no specific wallet, sum all emergency wallets
        const allWallets = await prisma.wallet.findMany({
          where: { userId },
        })

        // Filter wallets with emergency-related names (case-insensitive)
        const emergencyWallets = allWallets.filter(w => {
          const nameLower = w.name.toLowerCase()
          return nameLower.includes('emergency') || 
                 nameLower.includes('darurat') || 
                 nameLower.includes('dana darurat')
        })

        if (emergencyWallets.length > 0) {
          // Sum up all emergency wallets
          totalCurrent = emergencyWallets.reduce((sum, w) => sum + w.balance, 0)
          totalTarget = 0 // Will be calculated based on expenses later
        }
      }
    }
  }

  // Get average monthly expenses based on period
  const periodStartDate = new Date()
  periodStartDate.setMonth(periodStartDate.getMonth() - period)

  const expenses = await prisma.transaction.aggregate({
    where: {
      userId,
      type: 'EXPENSE',
      date: {
        gte: periodStartDate,
      },
      ...(walletId && { walletId }),
    },
    _sum: {
      amount: true,
    },
  })

  const avgMonthlyExpense = (expenses._sum.amount || 0) / period
  const monthsCovered = avgMonthlyExpense > 0 ? totalCurrent / avgMonthlyExpense : 0

  // If no target was set (auto-detected wallet), use 3 months of expenses as target
  if (totalTarget === 0 && avgMonthlyExpense > 0) {
    totalTarget = avgMonthlyExpense * 3
  }

  let score = 0
  let status: 'excellent' | 'good' | 'fair' | 'poor' = 'poor'
  let message = ''

  if (monthsCovered >= 6) {
    score = 100
    status = 'excellent'
    message = 'Emergency fund fully funded! 🎉'
  } else if (monthsCovered >= 3) {
    score = 80
    status = 'good'
    message = '3-6 months expenses covered'
  } else if (monthsCovered >= 1) {
    score = 60
    status = 'fair'
    message = '1-3 months expenses covered'
  } else if (monthsCovered > 0) {
    score = 40
    status = 'poor'
    message = 'Less than 1 month covered'
  } else {
    score = 20
    status = 'poor'
    message = 'No emergency fund'
  }

  return {
    name: 'Emergency Fund Readiness',
    score,
    weight: 25,
    status,
    message,
    details: `${monthsCovered.toFixed(1)} months of expenses covered`,
    recommendation:
      monthsCovered < 3
        ? `Build emergency fund to cover 3-6 months expenses (target: ${(avgMonthlyExpense * 3).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })})`
        : undefined,
    breakdown: {
      currentAmount: totalCurrent,
      targetAmount: totalTarget,
      monthsCovered: Math.round(monthsCovered * 10) / 10,
    },
  }
}

/**
 * Calculate Savings Rate Score (0-100)
 * Scoring:
 * - 100: 30%+ savings rate
 * - 80: 20-30% savings rate
 * - 60: 10-20% savings rate
 * - 40: 5-10% savings rate
 * - 20: <5% savings rate
 */
async function calculateSavingsRateScore(
  userId: string,
  walletId?: string,
  period: number = 3
): Promise<ScoreComponent> {
  const periodStartDate = new Date()
  periodStartDate.setMonth(periodStartDate.getMonth() - period)

  // Get savings/investment categories to exclude from expenses
  const savingsCategories = await prisma.category.findMany({
    where: {
      userId,
      OR: [
        { name: { contains: 'Saving' } },
        { name: { contains: 'saving' } },
        { name: { contains: 'Investment' } },
        { name: { contains: 'investment' } },
      ],
    },
    select: { id: true },
  })

  const savingsCategoryIds = savingsCategories.map((c) => c.id)

  const [income, expenses] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        userId,
        type: 'INCOME',
        date: { gte: periodStartDate },
        ...(walletId && { walletId }),
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        type: 'EXPENSE',
        date: { gte: periodStartDate },
        // Exclude savings/investment categories from expenses
        categoryId: { notIn: savingsCategoryIds.length > 0 ? savingsCategoryIds : undefined },
        ...(walletId && { walletId }),
      },
      _sum: { amount: true },
    }),
  ])

  const totalIncome = income._sum.amount || 0
  const totalExpenses = expenses._sum.amount || 0
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0

  let score = 0
  let status: 'excellent' | 'good' | 'fair' | 'poor' = 'poor'
  let message = ''

  if (savingsRate >= 30) {
    score = 100
    status = 'excellent'
    message = 'Outstanding savings rate! 🌟'
  } else if (savingsRate >= 20) {
    score = 80
    status = 'good'
    message = 'Great savings discipline'
  } else if (savingsRate >= 10) {
    score = 60
    status = 'fair'
    message = 'Decent savings rate'
  } else if (savingsRate >= 5) {
    score = 40
    status = 'poor'
    message = 'Low savings rate'
  } else if (savingsRate >= 0) {
    score = 20
    status = 'poor'
    message = 'Minimal or no savings'
  } else {
    score = 0
    status = 'poor'
    message = 'Spending exceeds income'
  }

  return {
    name: 'Savings Rate',
    score,
    weight: 25,
    status,
    message,
    details: `${savingsRate.toFixed(1)}% of income saved`,
    recommendation:
      savingsRate < 20 ? 'Aim for 20% savings rate by reducing non-essential expenses' : undefined,
    breakdown: {
      income: totalIncome,
      expenses: totalExpenses,
      savingsAmount: totalIncome - totalExpenses,
    },
  }
}

/**
 * Calculate Budget Adherence Score (0-100)
 * Scoring based on % of budgets stayed within
 */
async function calculateBudgetAdherenceScore(
  userId: string,
  walletId?: string
): Promise<ScoreComponent> {
  const activeBudgets = await prisma.budget.findMany({
    where: {
      userId,
      endDate: {
        gte: new Date(),
      },
      ...(walletId && { walletId }),
    },
  })

  if (activeBudgets.length === 0) {
    return {
      name: 'Budget Adherence',
      score: 50,
      weight: 20,
      status: 'fair',
      message: 'No active budgets',
      details: 'Create budgets to track spending',
      recommendation: 'Set up budgets for major expense categories',
    }
  }

  // Calculate spending for each budget
  const budgetPerformance = await Promise.all(
    activeBudgets.map(async (budget) => {
      const spending = await prisma.transaction.aggregate({
        where: {
          userId,
          categoryId: budget.categoryId,
          walletId: budget.walletId,
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
      const percentage = (spent / budget.amount) * 100
      return { spent, budget: budget.amount, percentage, withinBudget: percentage <= 100 }
    })
  )

  const withinBudgetCount = budgetPerformance.filter((bp) => bp.withinBudget).length
  const adherenceRate = (withinBudgetCount / activeBudgets.length) * 100

  let score = adherenceRate
  let status: 'excellent' | 'good' | 'fair' | 'poor' = 'poor'
  let message = ''

  if (adherenceRate >= 90) {
    status = 'excellent'
    message = 'Excellent budget discipline!'
  } else if (adherenceRate >= 70) {
    status = 'good'
    message = 'Good budget adherence'
  } else if (adherenceRate >= 50) {
    status = 'fair'
    message = 'Room for improvement'
  } else {
    status = 'poor'
    message = 'Often exceeding budgets'
  }

  return {
    name: 'Budget Adherence',
    score,
    weight: 20,
    status,
    message,
    details: `${withinBudgetCount}/${activeBudgets.length} budgets on track`,
    recommendation:
      adherenceRate < 70 ? 'Review and adjust budgets to match actual spending patterns' : undefined,
    breakdown: {
      totalBudgets: activeBudgets.length,
      budgetsOnTrack: withinBudgetCount,
    },
  }
}

/**
 * Calculate Debt Ratio Score (0-100)
 * For now, we'll use a placeholder since debt tracking isn't fully implemented
 */
async function calculateDebtRatioScore(userId: string, walletId?: string): Promise<ScoreComponent> {
  // Future: Calculate actual debt ratio
  // For now, assume no debt = perfect score
  return {
    name: 'Debt Ratio',
    score: 100,
    weight: 15,
    status: 'excellent',
    message: 'No debt tracked',
    details: 'Debt tracking not yet configured',
    recommendation: undefined,
  }
}

/**
 * Calculate Spending Consistency Score (0-100)
 * Based on variance in monthly spending
 */
async function calculateSpendingConsistencyScore(
  userId: string,
  walletId?: string,
  period: number = 3
): Promise<ScoreComponent> {
  // Use period parameter for consistency calculation (min 2 months for meaningful variance)
  const consistencyPeriod = Math.max(period, 2)
  const periodStartDate = new Date()
  periodStartDate.setMonth(periodStartDate.getMonth() - consistencyPeriod)

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: 'EXPENSE',
      date: {
        gte: periodStartDate,
      },
      ...(walletId && { walletId }),
    },
  })

  // Group by month
  const monthlySpending: Record<string, number> = {}
  transactions.forEach((tx) => {
    const monthKey = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`
    monthlySpending[monthKey] = (monthlySpending[monthKey] || 0) + tx.amount
  })

  const months = Object.values(monthlySpending)
  if (months.length < 2) {
    return {
      name: 'Spending Consistency',
      score: 50,
      weight: 20,
      status: 'fair',
      message: 'Insufficient data',
      details: 'Need at least 2 months of data',
    }
  }

  // Calculate coefficient of variation
  const mean = months.reduce((sum, m) => sum + m, 0) / months.length
  const variance = months.reduce((sum, m) => sum + Math.pow(m - mean, 2), 0) / months.length
  const stdDev = Math.sqrt(variance)
  const coefficientOfVariation = mean > 0 ? (stdDev / mean) * 100 : 100

  // Lower CV = more consistent = higher score
  let score = Math.max(0, 100 - coefficientOfVariation)
  let status: 'excellent' | 'good' | 'fair' | 'poor' = 'poor'
  let message = ''

  if (coefficientOfVariation < 10) {
    status = 'excellent'
    message = 'Very consistent spending'
  } else if (coefficientOfVariation < 20) {
    status = 'good'
    message = 'Consistent spending patterns'
  } else if (coefficientOfVariation < 40) {
    status = 'fair'
    message = 'Moderate spending variance'
  } else {
    status = 'poor'
    message = 'Highly variable spending'
  }

  return {
    name: 'Spending Consistency',
    score,
    weight: 20,
    status,
    message,
    details: `${coefficientOfVariation.toFixed(1)}% variance`,
    recommendation:
      coefficientOfVariation > 30
        ? 'Create consistent spending habits and budgets to reduce variance'
        : undefined,
    breakdown: {
      avgMonthlySpending: Math.round(mean),
      variance: Math.round(coefficientOfVariation * 10) / 10,
    },
  }
}

/**
 * Calculate overall financial health score
 */
export async function calculateFinancialHealthScore(
  userId: string,
  walletId?: string,
  period: number = 3
): Promise<FinancialHealthScore> {
  const [emergencyFund, savingsRate, budgetAdherence, debtRatio, spendingConsistency] =
    await Promise.all([
      calculateEmergencyFundScore(userId, walletId, period),
      calculateSavingsRateScore(userId, walletId, period),
      calculateBudgetAdherenceScore(userId, walletId),
      calculateDebtRatioScore(userId, walletId),
      calculateSpendingConsistencyScore(userId, walletId, period),
    ])

  const components = {
    emergencyFund,
    savingsRate,
    budgetAdherence,
    debtRatio,
    spendingConsistency,
  }

  // Calculate weighted overall score
  const overallScore = Math.round(
    (emergencyFund.score * emergencyFund.weight +
      savingsRate.score * savingsRate.weight +
      budgetAdherence.score * budgetAdherence.weight +
      debtRatio.score * debtRatio.weight +
      spendingConsistency.score * spendingConsistency.weight) /
      100
  )

  // Determine grade
  let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'
  if (overallScore >= 95) grade = 'A+'
  else if (overallScore >= 85) grade = 'A'
  else if (overallScore >= 70) grade = 'B'
  else if (overallScore >= 55) grade = 'C'
  else if (overallScore >= 40) grade = 'D'
  else grade = 'F'

  // Determine status
  let status: 'excellent' | 'good' | 'fair' | 'poor'
  if (overallScore >= 85) status = 'excellent'
  else if (overallScore >= 70) status = 'good'
  else if (overallScore >= 55) status = 'fair'
  else status = 'poor'

  // Identify strengths and improvements
  const componentList = Object.values(components)
  const strengths = componentList
    .filter((c) => c.score >= 80)
    .map((c) => c.name)

  const improvements = componentList
    .filter((c) => c.recommendation)
    .map((c) => c.recommendation!)

  // Generate achievements
  const achievements = generateAchievements(components, overallScore)

  return {
    overallScore,
    grade,
    status,
    components,
    achievements,
    strengths,
    improvements,
    lastCalculated: new Date(),
  }
}

/**
 * Generate achievements based on score components
 */
function generateAchievements(
  components: Record<string, ScoreComponent>,
  overallScore: number
): Achievement[] {
  const achievements: Achievement[] = [
    {
      id: 'emergency-fund-3mo',
      title: 'Safety Net',
      description: 'Built 3 months emergency fund',
      icon: '🛡️',
      isEarned: components.emergencyFund.score >= 80,
      progress: components.emergencyFund.score,
    },
    {
      id: 'emergency-fund-6mo',
      title: 'Fort Knox',
      description: 'Built 6+ months emergency fund',
      icon: '🏰',
      isEarned: components.emergencyFund.score >= 100,
      progress: components.emergencyFund.score,
    },
    {
      id: 'super-saver',
      title: 'Super Saver',
      description: 'Maintain 20%+ savings rate',
      icon: '💰',
      isEarned: components.savingsRate.score >= 80,
      progress: components.savingsRate.score,
    },
    {
      id: 'budget-master',
      title: 'Budget Master',
      description: 'Stay within 90% of budgets',
      icon: '📊',
      isEarned: components.budgetAdherence.score >= 90,
      progress: components.budgetAdherence.score,
    },
    {
      id: 'financial-zen',
      title: 'Financial Zen',
      description: 'Maintain consistent spending',
      icon: '🧘',
      isEarned: components.spendingConsistency.score >= 80,
      progress: components.spendingConsistency.score,
    },
    {
      id: 'a-plus-grade',
      title: 'Financial Excellence',
      description: 'Achieve overall A+ grade',
      icon: '🌟',
      isEarned: overallScore >= 95,
      progress: overallScore,
    },
    {
      id: 'all-green',
      title: 'All Green',
      description: 'Score 80+ in all categories',
      icon: '✅',
      isEarned: Object.values(components).every((c) => c.score >= 80),
      progress: Math.min(...Object.values(components).map((c) => c.score)),
    },
  ]

  return achievements.map((a) => ({
    ...a,
    earnedDate: a.isEarned ? new Date() : undefined,
  }))
}
