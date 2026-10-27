import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { withComputedBalances } from '@/lib/walletBalance'
import { netWorthGoalService } from '@/lib/net-worth/goal-service'
import { netWorthCalculator } from '@/lib/net-worth/calculator'
import type { NetWorthGoalsResponse, NetWorthGoalResponse } from '@/app/types/net-worth'

/**
 * GET /api/net-worth/goals
 * Returns all net worth goals for the user with progress
 * 
 * Requirements: 4.1, 4.2
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get all goals
    const goals = await netWorthGoalService.getGoals(userId)

    // Calculate current net worth for progress calculation
    const [wallets, debts] = await Promise.all([
      prisma.wallet.findMany({ where: { userId }, select: { id: true, name: true, type: true } }).then(withComputedBalances),
      prisma.debt.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          currentBalance: true,
          type: true,
          isActive: true,
        },
      }),
    ])

    const calculation = netWorthCalculator.calculate(wallets, debts)
    const currentNetWorth = calculation.netWorth

    // Build response with progress for each goal
    const goalsWithProgress: NetWorthGoalResponse[] = goals.map((goal) => {
      const progress = netWorthGoalService.calculateProgress(goal, currentNetWorth)
      const milestone = netWorthGoalService.checkMilestone(progress.progressPercentage)

      return {
        goal,
        progress,
        milestone,
      }
    })

    const response: NetWorthGoalsResponse = {
      goals: goalsWithProgress,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching net worth goals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch net worth goals' },
      { status: 500 }
    )
  }
}


/**
 * POST /api/net-worth/goals
 * Creates a new net worth goal
 * 
 * Body:
 * - targetAmount: number (required, must be positive)
 * - targetDate: ISO date string (required, must be in future)
 * 
 * Requirements: 4.1
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate required fields
    if (body.targetAmount === undefined || !body.targetDate) {
      return NextResponse.json(
        { error: 'Missing required fields: targetAmount, targetDate' },
        { status: 400 }
      )
    }

    // Validate targetAmount
    const targetAmount = parseFloat(body.targetAmount)
    if (isNaN(targetAmount) || targetAmount <= 0) {
      return NextResponse.json(
        { error: 'Target amount must be a positive number' },
        { status: 400 }
      )
    }

    // Validate targetDate
    const targetDate = new Date(body.targetDate)
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid target date format' },
        { status: 400 }
      )
    }

    if (targetDate <= new Date()) {
      return NextResponse.json(
        { error: 'Target date must be in the future' },
        { status: 400 }
      )
    }

    // Create goal (Requirement: 4.1)
    const goal = await netWorthGoalService.createGoal(session.user.id, {
      targetAmount,
      targetDate,
    })

    // Calculate initial progress
    const [wallets, debts] = await Promise.all([
      prisma.wallet.findMany({ where: { userId: session.user.id }, select: { id: true, name: true, type: true } }).then(withComputedBalances),
      prisma.debt.findMany({
        where: { userId: session.user.id },
        select: {
          id: true,
          name: true,
          currentBalance: true,
          type: true,
          isActive: true,
        },
      }),
    ])

    const calculation = netWorthCalculator.calculate(wallets, debts)
    const progress = netWorthGoalService.calculateProgress(goal, calculation.netWorth)
    const milestone = netWorthGoalService.checkMilestone(progress.progressPercentage)

    const response: NetWorthGoalResponse = {
      goal,
      progress,
      milestone,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error creating net worth goal:', error)
    
    // Handle validation errors from service
    if (error instanceof Error) {
      if (error.message.includes('Target date must be in the future') ||
          error.message.includes('Target amount must be positive')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to create net worth goal' },
      { status: 500 }
    )
  }
}
