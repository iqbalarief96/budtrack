export type DebtType =
  | 'CREDIT_CARD'
  | 'PERSONAL_LOAN'
  | 'MORTGAGE'
  | 'STUDENT_LOAN'
  | 'AUTO_LOAN'
  | 'OTHER'

export type PayoffStrategy = 'SNOWBALL' | 'AVALANCHE' | 'CUSTOM'

export interface DebtInput {
  id: string
  name: string
  type: DebtType
  currentBalance: number
  interestRate: number // Annual percentage (e.g., 18 for 18%)
  minimumPayment: number
}

export interface PaymentScheduleEntry {
  month: number
  date: Date
  debtId: string
  debtName: string
  payment: number
  principalPaid: number
  interestPaid: number
  remainingBalance: number
  isPayoff: boolean
}

export interface DebtPayoffPlan {
  strategy: PayoffStrategy
  totalMonthlyPayment: number
  payoffTimeline: PaymentScheduleEntry[]
  totalInterestPaid: number
  totalPrincipal: number
  monthsToPayoff: number
  debtFreeDate: Date
  summary: {
    firstDebtPayoff: { name: string; month: number }
    lastDebtPayoff: { name: string; month: number }
    averageMonthlyPayment: number
  }
}

export interface PayoffComparison {
  snowball: DebtPayoffPlan
  avalanche: DebtPayoffPlan
  recommended: PayoffStrategy
  savings: {
    interestSaved: number
    monthsSaved: number
  }
  insights: string[]
}

/**
 * Calculate monthly interest for a debt
 */
function calculateMonthlyInterest(balance: number, annualRate: number): number {
  const monthlyRate = annualRate / 100 / 12
  return balance * monthlyRate
}

/**
 * Snowball Method: Pay off smallest balance first
 * Provides psychological wins with quick payoffs
 */
export function calculateSnowballPayoff(
  debts: DebtInput[],
  extraMonthlyPayment: number = 0
): DebtPayoffPlan {
  // Sort by balance (smallest first)
  const sortedDebts = [...debts].sort((a, b) => a.currentBalance - b.currentBalance)

  return calculatePayoffPlan(sortedDebts, extraMonthlyPayment, 'SNOWBALL')
}

/**
 * Avalanche Method: Pay off highest interest first
 * Mathematically optimal - saves most money
 */
export function calculateAvalanchePayoff(
  debts: DebtInput[],
  extraMonthlyPayment: number = 0
): DebtPayoffPlan {
  // Sort by interest rate (highest first)
  const sortedDebts = [...debts].sort((a, b) => b.interestRate - a.interestRate)

  return calculatePayoffPlan(sortedDebts, extraMonthlyPayment, 'AVALANCHE')
}

/**
 * Core payoff calculation engine
 */
function calculatePayoffPlan(
  prioritizedDebts: DebtInput[],
  extraMonthlyPayment: number,
  strategy: PayoffStrategy
): DebtPayoffPlan {
  const timeline: PaymentScheduleEntry[] = []

  // Clone debts to track balances
  const debts = prioritizedDebts.map((d) => ({
    ...d,
    remainingBalance: d.currentBalance,
    isPaidOff: false,
  }))

  // Calculate total monthly payment (all minimums + extra)
  const totalMinimumPayment = debts.reduce((sum, d) => sum + d.minimumPayment, 0)
  const totalMonthlyPayment = totalMinimumPayment + extraMonthlyPayment

  let month = 0
  let totalInterestPaid = 0
  const now = new Date()

  // Payment loop - continue until all debts paid off
  while (debts.some((d) => !d.isPaidOff)) {
    month++
    const currentDate = new Date(now.getFullYear(), now.getMonth() + month, 1)

    // Available extra payment this month
    let availableExtra = extraMonthlyPayment

    // Pay all debts
    debts.forEach((debt, index) => {
      if (debt.isPaidOff) return

      // Calculate interest
      const interest = calculateMonthlyInterest(debt.remainingBalance, debt.interestRate)

      // Determine payment amount
      let payment = debt.minimumPayment

      // If this is the priority debt (first unpaid), add extra
      const isPriority = debts.findIndex((d) => !d.isPaidOff) === index
      if (isPriority && availableExtra > 0) {
        payment += availableExtra
        availableExtra = 0
      }

      // Cap payment at remaining balance + interest
      payment = Math.min(payment, debt.remainingBalance + interest)

      // Split payment between interest and principal
      const interestPaid = interest
      const principalPaid = payment - interestPaid

      // Update balance
      debt.remainingBalance -= principalPaid
      totalInterestPaid += interestPaid

      // Check if paid off
      const isPayoff = debt.remainingBalance <= 0.01 // Tolerance for floating point
      if (isPayoff) {
        debt.isPaidOff = true
        debt.remainingBalance = 0
        // Extra that was going to this debt now available for next priority
        availableExtra += debt.minimumPayment
      }

      // Record in timeline
      timeline.push({
        month,
        date: currentDate,
        debtId: debt.id,
        debtName: debt.name,
        payment,
        principalPaid,
        interestPaid,
        remainingBalance: Math.max(0, debt.remainingBalance),
        isPayoff,
      })
    })

    // Safety check - prevent infinite loop
    if (month > 600) {
      // 50 years is enough!
      break
    }
  }

  // Calculate summary
  const debtFreeDate = new Date(now.getFullYear(), now.getMonth() + month, 1)
  const totalPrincipal = debts.reduce((sum, d) => sum + d.currentBalance, 0)

  // Find first and last payoff
  const payoffs = timeline.filter((e) => e.isPayoff)
  const firstPayoff = payoffs[0]
  const lastPayoff = payoffs[payoffs.length - 1]

  return {
    strategy,
    totalMonthlyPayment,
    payoffTimeline: timeline,
    totalInterestPaid,
    totalPrincipal,
    monthsToPayoff: month,
    debtFreeDate,
    summary: {
      firstDebtPayoff: {
        name: firstPayoff?.debtName || 'N/A',
        month: firstPayoff?.month || 0,
      },
      lastDebtPayoff: {
        name: lastPayoff?.debtName || 'N/A',
        month: lastPayoff?.month || 0,
      },
      averageMonthlyPayment: totalMonthlyPayment,
    },
  }
}

/**
 * Compare Snowball vs Avalanche and recommend best strategy
 */
export function comparePayoffStrategies(
  debts: DebtInput[],
  extraMonthlyPayment: number = 0
): PayoffComparison {
  const snowball = calculateSnowballPayoff(debts, extraMonthlyPayment)
  const avalanche = calculateAvalanchePayoff(debts, extraMonthlyPayment)

  // Calculate savings (Avalanche should save money, Snowball might be faster psychologically)
  const interestSaved = snowball.totalInterestPaid - avalanche.totalInterestPaid
  const monthsSaved = snowball.monthsToPayoff - avalanche.monthsToPayoff

  // Determine recommendation
  let recommended: PayoffStrategy = 'AVALANCHE'
  const insights: string[] = []

  if (interestSaved > 1000000) {
    // Significant savings (> 1M IDR)
    recommended = 'AVALANCHE'
    insights.push(
      `Avalanche method saves Rp ${interestSaved.toLocaleString('id-ID')} in interest!`
    )
  } else if (interestSaved > 100000) {
    recommended = 'AVALANCHE'
    insights.push(
      `Avalanche method saves Rp ${interestSaved.toLocaleString('id-ID')} - recommended!`
    )
  } else if (monthsSaved > 3) {
    recommended = 'AVALANCHE'
    insights.push(
      `Avalanche method gets you debt-free ${monthsSaved} months earlier!`
    )
  } else if (debts.length >= 5) {
    // Many debts - Snowball for quick wins
    recommended = 'SNOWBALL'
    insights.push(
      `With ${debts.length} debts, Snowball method provides quick psychological wins!`
    )
  } else if (Math.abs(interestSaved) < 50000 && monthsSaved < 2) {
    // Negligible difference
    recommended = 'SNOWBALL'
    insights.push(
      'Minimal difference between methods - Snowball provides motivation through quick wins!'
    )
  }

  // Add comparison insights
  insights.push(
    `Snowball: First debt paid in ${snowball.summary.firstDebtPayoff.month} months (${snowball.summary.firstDebtPayoff.name})`
  )
  insights.push(
    `Avalanche: Save Rp ${interestSaved.toLocaleString('id-ID')} total in interest`
  )

  if (monthsSaved !== 0) {
    insights.push(
      monthsSaved > 0
        ? `Avalanche is ${monthsSaved} months faster`
        : `Snowball is ${Math.abs(monthsSaved)} months faster`
    )
  }

  return {
    snowball,
    avalanche,
    recommended,
    savings: {
      interestSaved,
      monthsSaved,
    },
    insights,
  }
}

/**
 * Calculate impact of extra payment
 */
export function calculateExtraPaymentImpact(
  debts: DebtInput[],
  currentExtra: number,
  newExtra: number,
  strategy: PayoffStrategy = 'AVALANCHE'
): {
  current: DebtPayoffPlan
  withExtra: DebtPayoffPlan
  impact: {
    monthsSaved: number
    interestSaved: number
    percentReduction: number
  }
} {
  const calculateFn = strategy === 'SNOWBALL' ? calculateSnowballPayoff : calculateAvalanchePayoff

  const current = calculateFn(debts, currentExtra)
  const withExtra = calculateFn(debts, newExtra)

  const monthsSaved = current.monthsToPayoff - withExtra.monthsToPayoff
  const interestSaved = current.totalInterestPaid - withExtra.totalInterestPaid
  const percentReduction = (monthsSaved / current.monthsToPayoff) * 100

  return {
    current,
    withExtra,
    impact: {
      monthsSaved,
      interestSaved,
      percentReduction,
    },
  }
}

/**
 * Generate actionable recommendations
 */
export function generateDebtRecommendations(
  debts: DebtInput[],
  comparison: PayoffComparison
): Array<{
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  estimatedSavings?: number
}> {
  const recommendations: Array<{
    priority: 'high' | 'medium' | 'low'
    title: string
    description: string
    estimatedSavings?: number
  }> = []

  // High-interest debt warning
  const highInterestDebts = debts.filter((d) => d.interestRate > 15)
  if (highInterestDebts.length > 0) {
    const totalHighInterest = highInterestDebts.reduce((sum, d) => sum + d.currentBalance, 0)
    recommendations.push({
      priority: 'high',
      title: 'Focus on high-interest debt',
      description: `You have Rp ${totalHighInterest.toLocaleString('id-ID')} in debts with >15% interest. Prioritize these to save on interest.`,
      estimatedSavings: comparison.savings.interestSaved,
    })
  }

  // Recommend strategy
  recommendations.push({
    priority: 'high',
    title: `Use ${comparison.recommended} method`,
    description:
      comparison.recommended === 'AVALANCHE'
        ? `Pay highest interest debt first to save Rp ${comparison.savings.interestSaved.toLocaleString('id-ID')}`
        : 'Pay smallest debt first for quick psychological wins',
  })

  // Extra payment suggestion
  const currentTotal = debts.reduce((sum, d) => sum + d.minimumPayment, 0)
  const suggestedExtra = currentTotal * 0.2 // 20% more
  const impact = calculateExtraPaymentImpact(debts, 0, suggestedExtra, comparison.recommended)

  if (impact.impact.monthsSaved > 6) {
    recommendations.push({
      priority: 'medium',
      title: 'Consider extra payments',
      description: `Adding Rp ${suggestedExtra.toLocaleString('id-ID')}/month could save you ${impact.impact.monthsSaved} months and Rp ${impact.impact.interestSaved.toLocaleString('id-ID')} in interest`,
      estimatedSavings: impact.impact.interestSaved,
    })
  }

  // Debt consolidation check
  if (debts.length >= 3 && highInterestDebts.length >= 2) {
    recommendations.push({
      priority: 'medium',
      title: 'Consider debt consolidation',
      description: 'Multiple high-interest debts could be consolidated into one lower-rate loan',
    })
  }

  return recommendations
}
