import prisma from '@/lib/prisma'
import {
  Recommendation,
  RecommendationImpact,
  CategoryReduction,
  TimelineGoal,
} from '@/app/types/goals-timeline'
import { getTimeline } from './timeline-service'
import { getSavingRateHistory, analyzeSavingRate } from './saving-rate-service'
import { calculateProjectedDate, calculateMonthsRemaining } from './projection-service'

/**
 * RecommendationService - Generates recommendations to optimize goal timeline
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

/**
 * Calculate additional monthly savings needed to accelerate a goal by N months
 * Property 13: Acceleration Savings Calculation
 * For any goal and desired months to save, additional monthly savings SHALL equal
 * (remainingAmount / newMonths) - currentMonthlySavings.
 * Validates: Requirements 6.1
 */
export function calculateAccelerationSavings(
  remainingAmount: number,
  currentMonthsRemaining: number,
  monthsToSave: number,
  currentMonthlySavings: number
): number {
  // If goal already achieved or no time remaining
  if (remainingAmount <= 0 || currentMonthsRemaining <= 0) {
    return 0
  }

  // Calculate new target months
  const newMonths = currentMonthsRemaining - monthsToSave

  // If trying to save more months than remaining, return Infinity
  if (newMonths <= 0) {
    return Infinity
  }

  // Calculate required monthly savings for new timeline
  const requiredMonthlySavings = remainingAmount / newMonths

  // Calculate additional savings needed
  const additionalSavings = requiredMonthlySavings - currentMonthlySavings

  // Return 0 if no additional savings needed
  return Math.max(0, additionalSavings)
}

/**
 * Suggest optimal ordering of goals to minimize total time
 * Requirements: 6.2
 */
export function suggestOptimalOrdering(goals: TimelineGoal[]): TimelineGoal[] {
  // Strategy: Prioritize goals by remaining amount (smallest first - "debt snowball" approach)
  // This provides quicker wins and motivation
  return [...goals].sort((a, b) => {
    const remainingA = a.goal.target - a.goal.current
    const remainingB = b.goal.target - b.goal.current
    return remainingA - remainingB
  })
}


/**
 * Identify spending categories that could be reduced to increase savings
 * Requirements: 6.4
 */
export async function identifyReducibleCategories(
  userId: string,
  months: number = 3
): Promise<CategoryReduction[]> {
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1)

  // Get expense transactions grouped by category
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: { in: ['expense', 'EXPENSE'] },
      date: { gte: startDate },
    },
    include: {
      category: true,
    },
  })

  // Group by category and calculate totals
  const categorySpending = new Map<string, { id: string; name: string; total: number }>()

  for (const tx of transactions) {
    if (!tx.category) continue
    
    const existing = categorySpending.get(tx.categoryId)
    if (existing) {
      existing.total += tx.amount
    } else {
      categorySpending.set(tx.categoryId, {
        id: tx.categoryId,
        name: tx.category.name,
        total: tx.amount,
      })
    }
  }

  // Calculate monthly average and suggest reductions
  const reductions: CategoryReduction[] = []
  const monthlyDivisor = Math.max(1, months)

  for (const [categoryId, data] of categorySpending) {
    const monthlyAverage = data.total / monthlyDivisor
    
    // Suggest 10-20% reduction for discretionary categories
    // Skip essential categories (could be enhanced with category type detection)
    const suggestedReduction = monthlyAverage * 0.15 // 15% reduction
    
    if (suggestedReduction > 0) {
      reductions.push({
        categoryId,
        categoryName: data.name,
        currentSpending: monthlyAverage,
        suggestedReduction,
        potentialSavings: suggestedReduction,
      })
    }
  }

  // Sort by potential savings (highest first)
  return reductions.sort((a, b) => b.potentialSavings - a.potentialSavings)
}

/**
 * Calculate the impact of a recommendation on goals
 * Requirements: 6.5
 */
export function calculateRecommendationImpact(
  goals: TimelineGoal[],
  additionalMonthlySavings: number,
  currentMonthlySavings: number
): RecommendationImpact {
  const affectedGoals: string[] = []
  let totalMonthsSaved = 0

  for (const goal of goals) {
    const remainingAmount = goal.goal.target - goal.goal.current
    if (remainingAmount <= 0) continue

    // Calculate current months remaining
    const currentMonths = currentMonthlySavings > 0 
      ? remainingAmount / currentMonthlySavings 
      : Infinity

    // Calculate new months with additional savings
    const newMonthlySavings = currentMonthlySavings + additionalMonthlySavings
    const newMonths = newMonthlySavings > 0 
      ? remainingAmount / newMonthlySavings 
      : Infinity

    // Calculate months saved
    if (Number.isFinite(currentMonths) && Number.isFinite(newMonths)) {
      const monthsSaved = currentMonths - newMonths
      if (monthsSaved > 0) {
        affectedGoals.push(goal.goal.id)
        totalMonthsSaved += monthsSaved
      }
    }
  }

  return {
    affectedGoals,
    timelineSavings: Math.round(totalMonthsSaved * 10) / 10,
    additionalSavingsNeeded: additionalMonthlySavings,
  }
}


/**
 * Generate recommendations for a user to optimize their goal timeline
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
export async function generateRecommendations(userId: string): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = []

  // Get user's timeline and goals
  const timeline = await getTimeline(userId)
  
  if (timeline.length === 0) {
    return recommendations
  }

  // Get saving rate analysis
  const savingRateHistory = await getSavingRateHistory(userId, 3)
  const savingRateAnalysis = analyzeSavingRate(savingRateHistory)

  // Calculate current monthly savings
  const totalIncome = savingRateHistory.reduce((sum, h) => sum + h.income, 0)
  const averageMonthlyIncome = savingRateHistory.length > 0 
    ? totalIncome / savingRateHistory.length 
    : 0
  const currentMonthlySavings = (savingRateAnalysis.average3Month / 100) * averageMonthlyIncome

  // 1. Recommendation: Increase savings to accelerate goals (Requirement 6.1)
  for (const goal of timeline) {
    const remainingAmount = goal.goal.target - goal.goal.current
    if (remainingAmount <= 0) continue

    // Calculate how much additional savings would save 3 months
    const monthsToSave = 3
    const additionalSavings = calculateAccelerationSavings(
      remainingAmount,
      goal.projection.monthsRemaining,
      monthsToSave,
      currentMonthlySavings
    )

    if (Number.isFinite(additionalSavings) && additionalSavings > 0) {
      const impact = calculateRecommendationImpact(
        [goal],
        additionalSavings,
        currentMonthlySavings
      )

      recommendations.push({
        type: 'increase_savings',
        title: `Accelerate "${goal.goal.name}"`,
        description: `Increase monthly savings by ${formatCurrency(additionalSavings)} to reach this goal ${monthsToSave} months earlier.`,
        impact,
      })
    }
  }

  // 2. Recommendation: Optimal goal ordering (Requirement 6.2)
  if (timeline.length > 1) {
    const optimalOrder = suggestOptimalOrdering(timeline)
    const currentOrder = timeline.map(g => g.goal.id)
    const suggestedOrder = optimalOrder.map(g => g.goal.id)

    // Check if reordering would help
    if (JSON.stringify(currentOrder) !== JSON.stringify(suggestedOrder)) {
      recommendations.push({
        type: 'reorder_goals',
        title: 'Optimize Goal Order',
        description: 'Focus on smaller goals first to achieve quicker wins and build momentum.',
        impact: {
          affectedGoals: suggestedOrder,
          timelineSavings: 0, // Reordering doesn't save time, but improves motivation
        },
      })
    }
  }

  // 3. Recommendation: Adjust unrealistic targets (Requirement 6.3)
  for (const goal of timeline) {
    if (!goal.projection.isOnTrack && goal.goal.deadline) {
      const deadline = new Date(goal.goal.deadline)
      const monthsUntilDeadline = calculateMonthsRemaining(new Date(), deadline)
      
      if (monthsUntilDeadline > 0 && currentMonthlySavings > 0) {
        // Calculate achievable amount by deadline
        const achievableAmount = goal.goal.current + (currentMonthlySavings * monthsUntilDeadline)
        
        if (achievableAmount < goal.goal.target * 0.9) { // More than 10% gap
          recommendations.push({
            type: 'adjust_target',
            title: `Adjust "${goal.goal.name}" Target`,
            description: `Current target may be unrealistic. Consider reducing to ${formatCurrency(achievableAmount)} to meet your deadline.`,
            impact: {
              affectedGoals: [goal.goal.id],
              timelineSavings: 0,
            },
          })
        }
      }
    }
  }

  // 4. Recommendation: Reduce spending in categories (Requirement 6.4)
  const reducibleCategories = await identifyReducibleCategories(userId)
  
  // Take top 3 categories with highest potential savings
  const topCategories = reducibleCategories.slice(0, 3)
  
  for (const category of topCategories) {
    if (category.potentialSavings > 0) {
      const impact = calculateRecommendationImpact(
        timeline,
        category.potentialSavings,
        currentMonthlySavings
      )

      recommendations.push({
        type: 'reduce_spending',
        title: `Reduce ${category.categoryName} Spending`,
        description: `Reducing spending by ${formatCurrency(category.suggestedReduction)}/month could accelerate your goals.`,
        impact,
        category: category.categoryName,
      })
    }
  }

  return recommendations
}

// Helper function
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}
