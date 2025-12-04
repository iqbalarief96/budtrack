import prisma from '@/lib/prisma'
import {
  TimelineGoal,
  Milestone,
  Adjustment,
  GoalProjection,
  SavingRateAnalysis,
} from '@/app/types/goals-timeline'
import {
  calculateProjection,
  calculateProgress,
  GoalForProjection,
} from './projection-service'
import { getSavingRateHistory, analyzeSavingRate } from './saving-rate-service'

/**
 * TimelineService - Manages timeline and priorities for financial goals
 * Requirements: 3.1, 3.2, 5.1, 5.3, 5.5
 */

// Milestone thresholds
const MILESTONE_THRESHOLDS = [25, 50, 75, 100]

/**
 * Get timeline for all user goals with projections and priorities
 * Requirements: 3.1, 3.2
 */
export async function getTimeline(userId: string): Promise<TimelineGoal[]> {
  // Get all active goals for user
  const goals = await prisma.goal.findMany({
    where: {
      userId,
      status: { not: 'COMPLETED' },
      isArchived: false,
    },
    include: {
      priority: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  // Get saving rate analysis
  const savingRateHistory = await getSavingRateHistory(userId, 12)
  const savingRateAnalysis = analyzeSavingRate(savingRateHistory)

  // Calculate average monthly income from history
  const totalIncome = savingRateHistory.reduce((sum, h) => sum + h.income, 0)
  const averageMonthlyIncome = savingRateHistory.length > 0 
    ? totalIncome / savingRateHistory.length 
    : 0

  // Build timeline goals
  const timelineGoals: TimelineGoal[] = goals.map((goal) => {
    const goalForProjection: GoalForProjection = {
      id: goal.id,
      name: goal.name,
      target: goal.target,
      current: goal.current,
      deadline: goal.deadline,
      status: goal.status,
    }

    const projection = calculateProjection(
      goalForProjection,
      savingRateAnalysis,
      averageMonthlyIncome
    )

    const milestones = generateMilestones(goal.current, goal.target, projection.projectedDate)
    const priority = goal.priority?.priority ?? 999 // Default to low priority if not set

    return {
      goal: {
        id: goal.id,
        name: goal.name,
        target: goal.target,
        current: goal.current,
        deadline: goal.deadline ?? undefined,
        status: goal.status,
      },
      projection,
      priority,
      milestones,
    }
  })

  // Sort by priority (ascending - 1 is highest)
  return sortByPriority(timelineGoals)
}

/**
 * Set priority for a goal
 * Property 9: Priority Ordering
 * For any set of goals with priorities, goals SHALL be returned in ascending priority order (1 = highest).
 * Requirements: 3.1, 3.2
 */
export async function setGoalPriority(
  userId: string,
  goalId: string,
  priority: number
): Promise<void> {
  // Validate priority is positive
  if (priority < 1) {
    throw new Error('Priority must be a positive integer (1 = highest)')
  }

  await (prisma as any).goalPriority.upsert({
    where: {
      userId_goalId: {
        userId,
        goalId,
      },
    },
    update: {
      priority,
    },
    create: {
      userId,
      goalId,
      priority,
    },
  })
}

/**
 * Get goals sorted by priority
 * Property 9: Priority Ordering
 * Requirements: 3.1, 3.2
 */
export async function getGoalsByPriority(userId: string): Promise<TimelineGoal[]> {
  return getTimeline(userId)
}

/**
 * Sort timeline goals by priority (ascending - 1 is highest)
 * Property 9: Priority Ordering
 */
export function sortByPriority(goals: TimelineGoal[]): TimelineGoal[] {
  return [...goals].sort((a, b) => a.priority - b.priority)
}


/**
 * Generate milestones for a goal
 * Requirements: 5.1
 */
function generateMilestones(
  currentAmount: number,
  targetAmount: number,
  projectedDate: Date
): Milestone[] {
  const progress = calculateProgress(currentAmount, targetAmount)
  const now = new Date()
  const totalDays = Math.max(1, (projectedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  return MILESTONE_THRESHOLDS.map((threshold) => {
    const isAchieved = progress >= threshold
    
    // Calculate target date for this milestone
    // Proportional to the threshold percentage
    const daysToMilestone = (threshold / 100) * totalDays
    const targetDate = new Date(now)
    targetDate.setDate(targetDate.getDate() + Math.round(daysToMilestone))

    return {
      percentage: threshold,
      targetDate,
      achievedDate: isAchieved ? now : undefined,
      isAchieved,
    }
  })
}

/**
 * Detect which milestone a progress percentage has reached
 * Property 10: Milestone Detection
 * For any progress percentage, milestone detection SHALL correctly identify
 * when progress crosses 25%, 50%, 75%, or 100% thresholds.
 * Requirements: 5.1
 */
export function detectMilestone(progress: number): number | null {
  // Find the highest milestone threshold that progress has crossed
  for (let i = MILESTONE_THRESHOLDS.length - 1; i >= 0; i--) {
    if (progress >= MILESTONE_THRESHOLDS[i]) {
      return MILESTONE_THRESHOLDS[i]
    }
  }
  return null
}

/**
 * Detect newly achieved milestone by comparing previous and current progress
 * Returns the milestone if it was just crossed, null otherwise
 */
export function detectNewMilestone(
  previousProgress: number,
  currentProgress: number
): number | null {
  for (const threshold of MILESTONE_THRESHOLDS) {
    // Check if we just crossed this threshold
    if (previousProgress < threshold && currentProgress >= threshold) {
      return threshold
    }
  }
  return null
}

/**
 * Record milestone achievement for a goal
 * Requirements: 5.1
 */
export async function recordMilestoneAchievement(
  goalId: string,
  milestone: number,
  achievedDate: Date = new Date()
): Promise<void> {
  // Store milestone achievement in goal activity
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    select: { userId: true, name: true },
  })

  if (!goal) {
    throw new Error('Goal not found')
  }

  // Create activity record for milestone
  await prisma.goalActivity.create({
    data: {
      goalId,
      userId: goal.userId,
      amount: 0, // Milestone doesn't change amount
      date: achievedDate,
      description: `Reached ${milestone}% milestone`,
    },
  })
}

/**
 * Check if actual progress is behind projected progress
 * Property 11: Behind Schedule Alert
 * For any actual and projected progress values, an alert SHALL be generated
 * if and only if (projected - actual) / projected > 0.1.
 * Requirements: 5.3
 */
export function checkBehindSchedule(
  actualProgress: number,
  projectedProgress: number
): boolean {
  // If projected is 0 or negative, can't be behind
  if (projectedProgress <= 0) {
    return false
  }

  const gap = (projectedProgress - actualProgress) / projectedProgress
  return gap > 0.1 // More than 10% behind
}

/**
 * Calculate projected progress at current date based on start and projected end
 */
export function calculateProjectedProgress(
  startDate: Date,
  projectedEndDate: Date,
  currentDate: Date = new Date()
): number {
  const totalDuration = projectedEndDate.getTime() - startDate.getTime()
  const elapsedDuration = currentDate.getTime() - startDate.getTime()

  if (totalDuration <= 0) {
    return 100 // Already past projected end
  }

  const progress = (elapsedDuration / totalDuration) * 100
  return Math.max(0, Math.min(100, progress))
}

/**
 * Suggest adjustments for a goal that is behind schedule
 * Requirements: 5.5
 */
export function suggestAdjustments(
  goal: TimelineGoal,
  currentMonthlySavings: number
): Adjustment[] {
  const adjustments: Adjustment[] = []
  const { projection } = goal
  const remainingAmount = goal.goal.target - goal.goal.current

  if (remainingAmount <= 0) {
    return adjustments // Goal already achieved
  }

  // 1. Suggest increasing savings
  const monthsRemaining = projection.monthsRemaining
  if (monthsRemaining > 0 && goal.goal.deadline) {
    const deadlineMonths = Math.max(
      1,
      (new Date(goal.goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
    )
    const requiredMonthlySavings = remainingAmount / deadlineMonths
    const additionalNeeded = requiredMonthlySavings - currentMonthlySavings

    if (additionalNeeded > 0) {
      adjustments.push({
        type: 'increase_savings',
        description: `Increase monthly savings by ${formatCurrency(additionalNeeded)}`,
        impact: `Reach goal by deadline`,
        newProjectedDate: goal.goal.deadline ? new Date(goal.goal.deadline) : undefined,
      })
    }
  }

  // 2. Suggest extending deadline
  if (currentMonthlySavings > 0) {
    const monthsNeeded = remainingAmount / currentMonthlySavings
    const newDeadline = new Date()
    newDeadline.setMonth(newDeadline.getMonth() + Math.ceil(monthsNeeded))

    adjustments.push({
      type: 'extend_deadline',
      description: `Extend deadline to ${formatDate(newDeadline)}`,
      impact: `Achieve goal with current savings rate`,
      newProjectedDate: newDeadline,
    })
  }

  // 3. Suggest reducing target
  if (goal.goal.deadline && currentMonthlySavings > 0) {
    const deadlineMonths = Math.max(
      1,
      (new Date(goal.goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
    )
    const achievableAmount = goal.goal.current + (currentMonthlySavings * deadlineMonths)

    if (achievableAmount < goal.goal.target) {
      adjustments.push({
        type: 'reduce_target',
        description: `Reduce target to ${formatCurrency(achievableAmount)}`,
        impact: `Achieve reduced goal by deadline`,
        newProjectedDate: goal.goal.deadline ? new Date(goal.goal.deadline) : undefined,
      })
    }
  }

  return adjustments
}

// Helper functions
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}
