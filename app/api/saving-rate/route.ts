import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getSavingRateHistory, analyzeSavingRate } from '@/lib/goals-timeline/saving-rate-service'
import { calculateRequiredSavingRate, calculateGap } from '@/lib/goals-timeline/projection-service'
import { SavingRateResponse } from '@/app/types/goals-timeline'

/**
 * GET /api/saving-rate
 * Returns saving rate analysis with history and required rates for goals
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get months parameter (default 12)
    const { searchParams } = new URL(request.url)
    const months = parseInt(searchParams.get('months') || '12', 10)

    // Get saving rate history
    const history = await getSavingRateHistory(userId, months)

    // Analyze saving rate
    const analysis = analyzeSavingRate(history)

    // Calculate average monthly income for required rate calculations
    const totalIncome = history.reduce((sum, h) => sum + h.income, 0)
    const averageMonthlyIncome = history.length > 0
      ? totalIncome / history.length
      : 0

    // Calculate current monthly savings
    const currentMonthlySavings = (analysis.average3Month / 100) * averageMonthlyIncome

    // Get all active goals and calculate required rates
    const goals = await prisma.goal.findMany({
      where: {
        userId,
        status: { not: 'COMPLETED' },
        isArchived: false,
      },
      select: {
        id: true,
        name: true,
        target: true,
        current: true,
        deadline: true,
      },
    })

    const requiredRates = goals.map((goal) => {
      const requiredRate = calculateRequiredSavingRate(
        goal.current,
        goal.target,
        goal.deadline
      )
      const gap = calculateGap(currentMonthlySavings, requiredRate)

      return {
        goalId: goal.id,
        goalName: goal.name,
        requiredRate,
        gap,
        currentRate: currentMonthlySavings,
        isSufficient: gap <= 0,
      }
    })

    const response: SavingRateResponse = {
      analysis,
      history,
      requiredRates,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching saving rate:', error)
    return NextResponse.json(
      { error: 'Failed to fetch saving rate' },
      { status: 500 }
    )
  }
}
