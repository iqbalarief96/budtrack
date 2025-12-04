import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateRecommendations, identifyReducibleCategories } from '@/lib/goals-timeline/recommendation-service'
import { Recommendation } from '@/app/types/goals-timeline'

/**
 * GET /api/goals/recommendations
 * Returns recommendations to optimize goal timeline
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get type filter from query params
    const { searchParams } = new URL(request.url)
    const typeFilter = searchParams.get('type')

    // Generate recommendations
    let recommendations = await generateRecommendations(userId)

    // Filter by type if specified
    if (typeFilter) {
      recommendations = recommendations.filter((r) => r.type === typeFilter)
    }

    // Get reducible categories for additional context
    const reducibleCategories = await identifyReducibleCategories(userId)

    return NextResponse.json({
      recommendations,
      reducibleCategories,
      generatedAt: new Date(),
    })
  } catch (error) {
    console.error('Error generating recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}
