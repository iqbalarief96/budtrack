import prisma from '@/lib/prisma'
import { withComputedBalances } from '@/lib/walletBalance'

export interface MonthlyForecast {
  month: string // "2025-02"
  monthName: string // "February 2025"
  startingBalance: number
  projectedIncome: number
  projectedExpense: number
  endingBalance: number
  netChange: number
  status: 'healthy' | 'warning' | 'critical'
  incomeBreakdown: Array<{
    source: string
    amount: number
    type: 'recurring' | 'average'
  }>
  expenseBreakdown: Array<{
    name: string
    amount: number
    type: 'recurring' | 'average'
  }>
}

export interface CashFlowForecast {
  walletId: string
  walletName: string
  currentBalance: number
  forecastMonths: MonthlyForecast[]
  insights: Array<{
    type: 'warning' | 'info' | 'success'
    message: string
    month?: string
    amount?: number
  }>
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low'
    title: string
    description: string
    estimatedImpact?: number
  }>
  currencyCode: string
}

/**
 * Calculate the next N months of projected cash flow
 */
export async function calculateCashFlowForecast(
  walletId: string,
  userId: string,
  monthsToForecast: number = 6
): Promise<CashFlowForecast> {
  // Get wallet (balance from transactions, not the drifting column)
  const found = await prisma.wallet.findFirst({
    where: { id: walletId, userId },
  })

  if (!found) {
    throw new Error('Wallet not found')
  }
  const [wallet] = await withComputedBalances([found])

  // Get recurring transactions
  const recurringTransactions = await prisma.recurringTransaction.findMany({
    where: {
      walletId,
      userId,
      isActive: true,
    },
  })

  // Get historical transactions (last 6 months for pattern analysis)
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const historicalTransactions = await prisma.transaction.findMany({
    where: {
      walletId,
      userId,
      date: {
        gte: sixMonthsAgo,
      },
    },
    include: {
      category: true,
    },
  })

  // Calculate average monthly income/expense from history
  const monthlyAverages = calculateMonthlyAverages(historicalTransactions)

  // Generate forecast for next N months
  const forecastMonths: MonthlyForecast[] = []
  let runningBalance = wallet.balance

  const now = new Date()

  for (let i = 0; i < monthsToForecast; i++) {
    const forecastDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 1)
    const monthKey = formatMonthKey(forecastDate)
    const monthName = formatMonthName(forecastDate)

    // Project recurring transactions for this month
    const recurringIncome = calculateRecurringForMonth(
      recurringTransactions,
      forecastDate,
      'income'
    )
    const recurringExpense = calculateRecurringForMonth(
      recurringTransactions,
      forecastDate,
      'expense'
    )

    // Combine with historical averages for non-recurring spending
    const totalProjectedIncome = recurringIncome.total + monthlyAverages.income
    const totalProjectedExpense =
      recurringExpense.total + monthlyAverages.expense

    const netChange = totalProjectedIncome - totalProjectedExpense
    const endingBalance = runningBalance + netChange

    // Determine status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy'
    if (endingBalance < 0) {
      status = 'critical'
    } else if (endingBalance < wallet.balance * 0.2) {
      status = 'warning'
    }

    forecastMonths.push({
      month: monthKey,
      monthName,
      startingBalance: runningBalance,
      projectedIncome: totalProjectedIncome,
      projectedExpense: totalProjectedExpense,
      endingBalance,
      netChange,
      status,
      incomeBreakdown: [
        ...recurringIncome.items.map((item) => ({
          source: item.name,
          amount: item.amount,
          type: 'recurring' as const,
        })),
        {
          source: 'Average Other Income',
          amount: monthlyAverages.income,
          type: 'average' as const,
        },
      ],
      expenseBreakdown: [
        ...recurringExpense.items.map((item) => ({
          name: item.name,
          amount: item.amount,
          type: 'recurring' as const,
        })),
        {
          name: 'Average Other Expenses',
          amount: monthlyAverages.expense,
          type: 'average' as const,
        },
      ],
    })

    runningBalance = endingBalance
  }

  // Generate insights
  const insights = generateInsights(forecastMonths, wallet.balance)

  // Generate recommendations
  const recommendations = generateRecommendations(
    forecastMonths,
    wallet.balance,
    monthlyAverages
  )

  return {
    walletId: wallet.id,
    walletName: wallet.name,
    currentBalance: wallet.balance,
    forecastMonths,
    insights,
    recommendations,
    currencyCode: wallet.currencyCode,
  }
}

/**
 * Calculate average monthly income and expense from historical data
 */
function calculateMonthlyAverages(transactions: any[]): {
  income: number
  expense: number
} {
  if (transactions.length === 0) {
    return { income: 0, expense: 0 }
  }

  // Group by month
  const monthlyData: Record<
    string,
    { income: number; expense: number }
  > = {}

  transactions.forEach((tx) => {
    const monthKey = formatMonthKey(new Date(tx.date))
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expense: 0 }
    }

    const txType = tx.type.toUpperCase()
    if (txType === 'INCOME') {
      monthlyData[monthKey].income += tx.amount
    } else if (txType === 'EXPENSE') {
      monthlyData[monthKey].expense += tx.amount
    }
  })

  // Calculate averages
  const months = Object.values(monthlyData)
  const avgIncome =
    months.reduce((sum, m) => sum + m.income, 0) / months.length
  const avgExpense =
    months.reduce((sum, m) => sum + m.expense, 0) / months.length

  return {
    income: avgIncome || 0,
    expense: avgExpense || 0,
  }
}

/**
 * Calculate recurring transactions for a specific month
 */
function calculateRecurringForMonth(
  recurring: any[],
  monthDate: Date,
  type: 'income' | 'expense'
): {
  total: number
  items: Array<{ name: string; amount: number }>
} {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const monthEnd = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() + 1,
    0
  )

  const items: Array<{ name: string; amount: number }> = []
  let total = 0

  recurring.forEach((rec) => {
    // Handle both lowercase and uppercase type values
    if (rec.type.toLowerCase() !== type.toLowerCase()) return

    // Calculate how many times this recurring transaction occurs in this month
    const occurrences = calculateOccurrencesInMonth(
      rec,
      monthStart,
      monthEnd
    )

    if (occurrences > 0) {
      const monthlyAmount = rec.amount * occurrences
      items.push({
        name: rec.name,
        amount: monthlyAmount,
      })
      total += monthlyAmount
    }
  })

  return { total, items }
}

/**
 * Calculate how many times a recurring transaction occurs in a month
 */
function calculateOccurrencesInMonth(
  recurring: any,
  monthStart: Date,
  monthEnd: Date
): number {
  const frequency = recurring.frequency.toLowerCase()

  // Simplified calculation - can be enhanced
  switch (frequency) {
    case 'daily':
      return monthEnd.getDate()
    case 'weekly':
      return 4
    case 'biweekly':
      return 2
    case 'monthly':
      return 1
    case 'quarterly':
      // Check if this month is a quarter month
      const month = monthStart.getMonth()
      return month % 3 === 0 ? 1 : 0
    case 'yearly':
      // Check if this month matches the start month
      const recurringMonth = new Date(recurring.startDate).getMonth()
      return monthStart.getMonth() === recurringMonth ? 1 : 0
    default:
      return 0
  }
}

/**
 * Generate insights from forecast data
 */
function generateInsights(
  forecasts: MonthlyForecast[],
  currentBalance: number
): Array<{
  type: 'warning' | 'info' | 'success'
  message: string
  month?: string
  amount?: number
}> {
  const insights: Array<{
    type: 'warning' | 'info' | 'success'
    message: string
    month?: string
    amount?: number
  }> = []

  // Check for negative balance months
  const negativeMonths = forecasts.filter((f) => f.endingBalance < 0)
  if (negativeMonths.length > 0) {
    const firstNegative = negativeMonths[0]
    insights.push({
      type: 'warning',
      message: `Cash flow akan negatif di ${firstNegative.monthName}. Shortfall: ${Math.abs(firstNegative.endingBalance).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}`,
      month: firstNegative.month,
      amount: firstNegative.endingBalance,
    })
  }

  // Check for months with significant drops
  forecasts.forEach((forecast, index) => {
    if (index === 0) {
      const drop = currentBalance - forecast.endingBalance
      const dropPercentage = (drop / currentBalance) * 100

      if (dropPercentage > 30) {
        insights.push({
          type: 'warning',
          message: `Balance turun ${dropPercentage.toFixed(0)}% di ${forecast.monthName}`,
          month: forecast.month,
          amount: drop,
        })
      }
    }
  })

  // Check for consistently positive trend
  const allPositive = forecasts.every((f) => f.netChange > 0)
  if (allPositive) {
    insights.push({
      type: 'success',
      message: 'Cash flow positif untuk semua bulan yang diprediksi! 🎉',
    })
  }

  // Check for high expense months
  const avgExpense =
    forecasts.reduce((sum, f) => sum + f.projectedExpense, 0) /
    forecasts.length
  forecasts.forEach((forecast) => {
    if (forecast.projectedExpense > avgExpense * 1.5) {
      insights.push({
        type: 'info',
        message: `${forecast.monthName} memiliki pengeluaran lebih tinggi dari biasanya`,
        month: forecast.month,
        amount: forecast.projectedExpense,
      })
    }
  })

  return insights
}

/**
 * Generate recommendations based on forecast
 */
function generateRecommendations(
  forecasts: MonthlyForecast[],
  currentBalance: number,
  averages: { income: number; expense: number }
): Array<{
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  estimatedImpact?: number
}> {
  const recommendations: Array<{
    priority: 'high' | 'medium' | 'low'
    title: string
    description: string
    estimatedImpact?: number
  }> = []

  // Check for upcoming negative months
  const criticalMonths = forecasts.filter((f) => f.status === 'critical')
  if (criticalMonths.length > 0) {
    const firstCritical = criticalMonths[0]
    const shortfall = Math.abs(firstCritical.endingBalance)

    recommendations.push({
      priority: 'high',
      title: 'Siapkan dana untuk bulan kritis',
      description: `Set aside Rp ${shortfall.toLocaleString('id-ID')} sekarang untuk ${firstCritical.monthName}`,
      estimatedImpact: shortfall,
    })
  }

  // Check expense ratio
  if (averages.expense > averages.income * 0.8) {
    const savingsPotential = averages.expense * 0.1
    recommendations.push({
      priority: 'high',
      title: 'Kurangi pengeluaran bulanan',
      description: `Expense ratio Anda tinggi (${((averages.expense / averages.income) * 100).toFixed(0)}%). Target: kurangi 10% untuk meningkatkan savings`,
      estimatedImpact: savingsPotential,
    })
  }

  // Check for income growth opportunity
  const projectedSavings = forecasts[forecasts.length - 1].endingBalance - currentBalance
  if (projectedSavings < currentBalance * 0.2) {
    recommendations.push({
      priority: 'medium',
      title: 'Tingkatkan income streams',
      description: 'Projected savings rendah. Pertimbangkan tambahan sumber income',
      estimatedImpact: averages.income * 0.2,
    })
  }

  // Emergency fund recommendation
  const threeMonthsExpense = averages.expense * 3
  if (currentBalance < threeMonthsExpense) {
    recommendations.push({
      priority: 'high',
      title: 'Build emergency fund',
      description: `Target emergency fund: ${threeMonthsExpense.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })} (3 bulan expenses)`,
      estimatedImpact: threeMonthsExpense - currentBalance,
    })
  }

  return recommendations
}

/**
 * Format date to month key (YYYY-MM)
 */
function formatMonthKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Format date to readable month name
 */
function formatMonthName(date: Date): string {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
  return `${months[date.getMonth()]} ${date.getFullYear()}`
}

/**
 * Calculate forecast for all wallets
 */
export async function calculateAllWalletsForecast(
  userId: string,
  monthsToForecast: number = 6
) {
  const wallets = await withComputedBalances(await prisma.wallet.findMany({
    where: { userId },
    orderBy: { isDefault: 'desc' },
  }))

  const forecasts = await Promise.all(
    wallets.map((wallet) =>
      calculateCashFlowForecast(wallet.id, userId, monthsToForecast)
    )
  )

  return {
    wallets: forecasts,
    summary: {
      totalCurrentBalance: wallets.reduce((sum, w) => sum + w.balance, 0),
      totalProjectedBalance: forecasts.reduce(
        (sum, f) =>
          sum + (f.forecastMonths[monthsToForecast - 1]?.endingBalance || 0),
        0
      ),
      criticalMonths: forecasts.flatMap((f) =>
        f.forecastMonths
          .filter((m) => m.status === 'critical')
          .map((m) => ({
            walletName: f.walletName,
            month: m.monthName,
            shortfall: Math.abs(m.endingBalance),
          }))
      ),
    },
  }
}
