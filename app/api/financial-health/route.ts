import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { calculateFinancialHealthScore } from '@/lib/financialHealthScore'

/**
 * GET /api/financial-health
 * Calculate comprehensive financial health score for the current user
 *
 * Returns:
 * - Overall health score (0-100)
 * - Grade (A+, A, B, C, D, F)
 * - Component scores (emergency fund, savings rate, budget adherence, debt ratio, spending consistency)
 * - Achievements and badges
 * - Strengths and improvement areas
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    const healthScore = await calculateFinancialHealthScore(userId)

    return NextResponse.json(healthScore)
  } catch (error: any) {
    console.error('Error calculating financial health score:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to calculate financial health score' },
      { status: 500 }
    )
  }
}
