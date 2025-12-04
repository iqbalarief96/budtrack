import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTimeline } from '@/lib/goals-timeline/timeline-service'
import { getSavingRateHistory, analyzeSavingRate } from '@/lib/goals-timeline/saving-rate-service'
import { generateRecommendations } from '@/lib/goals-timeline/recommendation-service'
import { TimelineResponse } from '@/app/types/goals-timeline'

/**
 * GET /api/goals/timeline
 * Returns goals timeline with projections, saving rate analysis, and recommendations
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get timeline with goals and projections
    const goals = await getTimeline(userId)

    // Get saving rate analysis
    const savingRateHistory = await getSavingRateHistory(userId, 12)
    const savingRate = analyzeSavingRate(savingRateHistory)

    // Get recommendations
    const recommendations = await generateRecommendations(userId)

    const response: TimelineResponse = {
      goals,
      savingRate,
      recommendations,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching goals timeline:', error)
    return NextResponse.json(
      { error: 'Failed to fetch goals timeline' },
      { status: 500 }
    )
  }
}
