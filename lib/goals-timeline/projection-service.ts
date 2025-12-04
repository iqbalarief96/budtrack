import {
  GoalProjection,
  SavingRateAnalysis,
  ConfidenceLevel,
} from '@/app/types/goals-timeline'

/**
 * ProjectionService - Handles goal projection calculations
 * Requirements: 1.2, 1.3, 1.4, 1.5, 2.4, 2.5
 */

/**
 * Goal interface for projection calculations
 */
export interface GoalForProjection {
  id: string
  name: string
  target: number
  current: number
  deadline?: Date | null
  status: string
}

/**
 * Calculate projected completion date for a goal
 * Property 4: Projected Date Calculation
 * For any goal with current amount, target amount, and monthly savings,
 * projected date SHALL be calculated as current date plus
 * (targetAmount - currentAmount) / monthlySavings months.
 * Validates: Requirements 1.2
 */
export function calculateProjectedDate(
  currentAmount: number,
  targetAmount: number,
  monthlySavings: number,
  fromDate: Date = new Date()
): Date | null {
  // If already achieved
  if (currentAmount >= targetAmount) {
    return fromDate
  }

  // If no savings or negative savings, cannot project
  if (monthlySavings <= 0) {
    return null
  }

  const remainingAmount = targetAmount - currentAmount
  const monthsNeeded = remainingAmount / monthlySavings

  // Calculate projected date
  const projectedDate = new Date(fromDate)
  const wholeMonths = Math.floor(monthsNeeded)
  const fractionalMonth = monthsNeeded - wholeMonths

  projectedDate.setMonth(projectedDate.getMonth() + wholeMonths)
  projectedDate.setDate(projectedDate.getDate() + Math.round(fractionalMonth * 30))

  return projectedDate
}


/**
 * Calculate progress percentage for a goal
 * Property 5: Progress Calculation
 * For any goal with current amount and target amount,
 * progress percentage SHALL equal (currentAmount / targetAmount) * 100.
 * Validates: Requirements 1.3
 */
export function calculateProgress(currentAmount: number, targetAmount: number): number {
  if (targetAmount <= 0) {
    return 0
  }
  const progress = (currentAmount / targetAmount) * 100
  // Clamp to 0-100 range
  return Math.max(0, Math.min(100, progress))
}

/**
 * Check if a goal is on track (projected date <= target date)
 * Property 6: Behind Schedule Detection
 * For any projected date and target date, a goal SHALL be marked behind schedule
 * if and only if projectedDate > targetDate.
 * Validates: Requirements 1.4
 */
export function isGoalOnTrack(
  projectedDate: Date | null,
  targetDate: Date | null | undefined
): boolean {
  // If no target date, consider on track (no deadline)
  if (!targetDate) {
    return true
  }

  // If no projected date (can't project), consider not on track
  if (!projectedDate) {
    return false
  }

  // Compare dates (on track if projected <= target)
  return projectedDate.getTime() <= targetDate.getTime()
}

/**
 * Calculate confidence level based on saving rate consistency
 * Property 7: Confidence Level Assignment
 * For any saving rate consistency score, confidence SHALL be 'high' if consistency > 0.8,
 * 'medium' if > 0.5, otherwise 'low'.
 * Validates: Requirements 1.5
 */
export function calculateConfidenceLevel(consistency: number): ConfidenceLevel {
  if (consistency > 0.8) {
    return 'high'
  }
  if (consistency > 0.5) {
    return 'medium'
  }
  return 'low'
}

/**
 * Calculate required monthly saving rate to achieve goal by deadline
 * Property 8: Required Saving Rate Calculation
 * For any goal with remaining amount and months remaining,
 * required saving rate SHALL equal remainingAmount / monthsRemaining.
 * Validates: Requirements 2.4, 2.5
 */
export function calculateRequiredSavingRate(
  currentAmount: number,
  targetAmount: number,
  deadline: Date | null | undefined,
  fromDate: Date = new Date()
): number {
  // If already achieved
  if (currentAmount >= targetAmount) {
    return 0
  }

  // If no deadline, return 0 (no required rate)
  if (!deadline) {
    return 0
  }

  const remainingAmount = targetAmount - currentAmount
  const monthsRemaining = calculateMonthsRemaining(fromDate, deadline)

  // If deadline passed or no time left
  if (monthsRemaining <= 0) {
    return Infinity
  }

  return remainingAmount / monthsRemaining
}

/**
 * Calculate the gap between current and required saving rate
 * Validates: Requirements 2.5
 */
export function calculateGap(currentRate: number, requiredRate: number): number {
  return requiredRate - currentRate
}

/**
 * Calculate months remaining until a deadline
 */
export function calculateMonthsRemaining(fromDate: Date, deadline: Date): number {
  const diffTime = deadline.getTime() - fromDate.getTime()
  const diffDays = diffTime / (1000 * 60 * 60 * 24)
  return diffDays / 30 // Approximate months
}


/**
 * Calculate full projection for a goal
 * Combines all projection calculations into a single GoalProjection object
 * Validates: Requirements 1.2, 1.3, 1.4, 1.5
 */
export function calculateProjection(
  goal: GoalForProjection,
  savingRateAnalysis: SavingRateAnalysis,
  averageMonthlyIncome: number
): GoalProjection {
  // Calculate monthly savings based on average saving rate and income
  let monthlySavings = (savingRateAnalysis.average3Month / 100) * averageMonthlyIncome

  // If no savings data, estimate based on required rate to meet deadline
  // or use a default assumption of 10% of remaining amount per month
  if (monthlySavings <= 0 && goal.deadline) {
    const deadline = new Date(goal.deadline)
    const monthsToDeadline = calculateMonthsRemaining(new Date(), deadline)
    if (monthsToDeadline > 0) {
      // Use required rate as estimate
      monthlySavings = (goal.target - goal.current) / monthsToDeadline
    }
  }

  // Calculate projected date
  let projectedDate = calculateProjectedDate(
    goal.current,
    goal.target,
    monthlySavings
  )

  // If still can't project but has deadline, use deadline as reference
  if (!projectedDate && goal.deadline) {
    projectedDate = new Date(goal.deadline)
  }

  // Calculate progress
  const currentProgress = calculateProgress(goal.current, goal.target)

  // Calculate confidence level - lower if no savings data
  let confidenceLevel = calculateConfidenceLevel(savingRateAnalysis.consistency)
  if (averageMonthlyIncome <= 0 || savingRateAnalysis.average3Month <= 0) {
    confidenceLevel = 'low' // Low confidence when no income/savings data
  }

  // Calculate required saving rate
  const requiredSavingRate = calculateRequiredSavingRate(
    goal.current,
    goal.target,
    goal.deadline ? new Date(goal.deadline) : null
  )

  // Check if on track
  const onTrack = isGoalOnTrack(
    projectedDate,
    goal.deadline ? new Date(goal.deadline) : null
  )

  // Calculate months remaining
  const monthsRemaining = projectedDate
    ? calculateMonthsRemaining(new Date(), projectedDate)
    : (goal.deadline ? calculateMonthsRemaining(new Date(), new Date(goal.deadline)) : Infinity)

  return {
    goalId: goal.id,
    projectedDate: projectedDate || (goal.deadline ? new Date(goal.deadline) : new Date(9999, 11, 31)),
    confidenceLevel,
    requiredSavingRate,
    currentProgress,
    monthsRemaining: Math.max(0, monthsRemaining),
    isOnTrack: onTrack,
  }
}
