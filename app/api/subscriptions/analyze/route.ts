import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { analyzeSubscriptions } from '@/lib/subscriptionIntelligence'

/**
 * GET /api/subscriptions/analyze
 * Analyze all subscriptions for the current user
 *
 * Returns:
 * - Detected subscriptions from recurring transactions
 * - Duplicate subscriptions by category
 * - Price change detection
 * - Smart insights and recommendations
 * - Spending breakdown by category
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    const analysis = await analyzeSubscriptions(userId)

    return NextResponse.json(analysis)
  } catch (error: any) {
    console.error('Error analyzing subscriptions:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to analyze subscriptions' },
      { status: 500 }
    )
  }
}
