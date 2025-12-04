import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { netWorthGoalService } from '@/lib/net-worth/goal-service'
import { netWorthCalculator } from '@/lib/net-worth/calculator'
import type { NetWorthGoalResponse } from '@/app/types/net-worth'

interface RouteParams {
  params: Promise<{ goalId: string }>
}

/**
 * GET /api/net-worth/goals/[goalId]
 * Returns a single net worth goal with progress
 * 
 * Requirements: 4.1, 4.2
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { goalId } = await params
    const userId = session.user.id

    // Get goal
    const goal = await netWorthGoalService.getGoal(goalId)

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Verify ownership
    if (goal.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Calculate current net worth for progress
    const [wallets, debts] = await Promise.all([
      prisma.wallet.findMany({
        where: { userId },
        select: { id: true, name: true, balance: true, type: true },
      }),
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
    const progress = netWorthGoalService.calculateProgress(goal, calculation.netWorth)
    const milestone = netWorthGoalService.checkMilestone(progress.progressPercentage)

    const response: NetWorthGoalResponse = {
      goal,
      progress,
      milestone,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching net worth goal:', error)
    return NextResponse.json(
      { error: 'Failed to fetch net worth goal' },
      { status: 500 }
    )
  }
}


/**
 * PUT /api/net-worth/goals/[goalId]
 * Updates an existing net worth goal
 * 
 * Body (all optional):
 * - targetAmount: number (must be positive if provided)
 * - targetDate: ISO date string (must be in future if provided)
 * - isActive: boolean
 * 
 * Requirements: 4.5
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { goalId } = await params
    const userId = session.user.id

    // Verify goal exists and belongs to user
    const existingGoal = await netWorthGoalService.getGoal(goalId)

    if (!existingGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    if (existingGoal.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()

    // Validate targetAmount if provided
    let targetAmount: number | undefined
    if (body.targetAmount !== undefined) {
      targetAmount = parseFloat(body.targetAmount)
      if (isNaN(targetAmount) || targetAmount <= 0) {
        return NextResponse.json(
          { error: 'Target amount must be a positive number' },
          { status: 400 }
        )
      }
    }

    // Validate targetDate if provided
    let targetDate: Date | undefined
    if (body.targetDate !== undefined) {
      targetDate = new Date(body.targetDate)
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
    }

    // Update goal (Requirement: 4.5)
    const updatedGoal = await netWorthGoalService.updateGoal(goalId, {
      targetAmount,
      targetDate,
      isActive: body.isActive,
    })

    // Calculate progress for response
    const [wallets, debts] = await Promise.all([
      prisma.wallet.findMany({
        where: { userId },
        select: { id: true, name: true, balance: true, type: true },
      }),
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
    const progress = netWorthGoalService.calculateProgress(updatedGoal, calculation.netWorth)
    const milestone = netWorthGoalService.checkMilestone(progress.progressPercentage)

    const response: NetWorthGoalResponse = {
      goal: updatedGoal,
      progress,
      milestone,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error updating net worth goal:', error)

    // Handle validation errors from service
    if (error instanceof Error) {
      if (error.message.includes('Target date must be in the future') ||
          error.message.includes('Target amount must be positive')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to update net worth goal' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/net-worth/goals/[goalId]
 * Deletes a net worth goal
 * 
 * Requirements: 4.5
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { goalId } = await params
    const userId = session.user.id

    // Verify goal exists and belongs to user
    const existingGoal = await netWorthGoalService.getGoal(goalId)

    if (!existingGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    if (existingGoal.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete goal (Requirement: 4.5)
    await netWorthGoalService.deleteGoal(goalId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting net worth goal:', error)
    return NextResponse.json(
      { error: 'Failed to delete net worth goal' },
      { status: 500 }
    )
  }
}
