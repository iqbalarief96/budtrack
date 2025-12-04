import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { calculateProjection, GoalForProjection } from '@/lib/goals-timeline/projection-service'
import { getSavingRateHistory, analyzeSavingRate } from '@/lib/goals-timeline/saving-rate-service'
import { ProjectionResponse, GoalProjection } from '@/app/types/goals-timeline'

/**
 * GET /api/goals/projections
 * Returns goal projections for all active goals
 * Requirements: 1.2, 1.5
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get all active goals
    const goals = await prisma.goal.findMany({
      where: {
        userId,
        status: { not: 'COMPLETED' },
        isArchived: false,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // Get saving rate analysis
    const savingRateHistory = await getSavingRateHistory(userId, 12)
    const savingRateAnalysis = analyzeSavingRate(savingRateHistory)

    // Calculate average monthly income
    const totalIncome = savingRateHistory.reduce((sum, h) => sum + h.income, 0)
    const averageMonthlyIncome = savingRateHistory.length > 0
      ? totalIncome / savingRateHistory.length
      : 0

    // Calculate projections for each goal
    const projections: GoalProjection[] = goals.map((goal) => {
      const goalForProjection: GoalForProjection = {
        id: goal.id,
        name: goal.name,
        target: goal.target,
        current: goal.current,
        deadline: goal.deadline,
        status: goal.status,
      }

      return calculateProjection(
        goalForProjection,
        savingRateAnalysis,
        averageMonthlyIncome
      )
    })

    const response: ProjectionResponse = {
      projections,
      lastCalculated: new Date(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching goal projections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch goal projections' },
      { status: 500 }
    )
  }
}
