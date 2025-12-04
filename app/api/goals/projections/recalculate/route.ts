import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { calculateProjection, GoalForProjection } from '@/lib/goals-timeline/projection-service'
import { getSavingRateHistory, analyzeSavingRate, storeSavingRateHistory } from '@/lib/goals-timeline/saving-rate-service'
import { GoalProjection } from '@/app/types/goals-timeline'

/**
 * POST /api/goals/projections/recalculate
 * Triggers recalculation of all goal projections
 * Requirements: 3.3
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Recalculate and store saving rate history for the last 12 months
    const savingRateHistory = await getSavingRateHistory(userId, 12)
    
    // Store updated saving rate history (ignore errors if table doesn't exist)
    try {
      for (const data of savingRateHistory) {
        await storeSavingRateHistory(userId, data)
      }
    } catch (e) {
      console.warn('Could not store saving rate history:', e)
    }

    const savingRateAnalysis = analyzeSavingRate(savingRateHistory)

    // Calculate average monthly income
    const totalIncome = savingRateHistory.reduce((sum, h) => sum + h.income, 0)
    const averageMonthlyIncome = savingRateHistory.length > 0
      ? totalIncome / savingRateHistory.length
      : 0

    // Get all active goals
    const goals = await prisma.goal.findMany({
      where: {
        userId,
        status: { not: 'COMPLETED' },
        isArchived: false,
      },
    })

    // Recalculate projections for each goal
    const projections: GoalProjection[] = []

    for (const goal of goals) {
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

      projections.push(projection)

      // Store projection in database - delete existing and create new
      try {
        const assumptionsJson = JSON.stringify({
          monthlySavings: (savingRateAnalysis.average3Month / 100) * averageMonthlyIncome,
          savingRateConsistency: savingRateAnalysis.consistency,
          calculatedAt: new Date().toISOString(),
        })

        // Delete existing projection for this goal
        await prisma.goalProjection.deleteMany({
          where: { goalId: goal.id, userId },
        })

        // Create new projection
        await prisma.goalProjection.create({
          data: {
            goalId: goal.id,
            userId,
            projectedDate: projection.projectedDate,
            confidenceLevel: projection.confidenceLevel,
            requiredSavingRate: projection.requiredSavingRate,
            currentProgress: projection.currentProgress,
            assumptions: assumptionsJson,
          },
        })
      } catch (e) {
        console.warn('Could not store projection for goal:', goal.id, e)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Projections recalculated successfully',
      projections,
      recalculatedAt: new Date(),
    })
  } catch (error) {
    console.error('Error recalculating projections:', error)
    return NextResponse.json(
      { error: 'Failed to recalculate projections' },
      { status: 500 }
    )
  }
}
