import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { calculateFinancialHealthScore } from '@/lib/financialHealthScore'
import prisma from '@/lib/prisma'

/**
 * GET /api/financial-health
 * Calculate comprehensive financial health score for the current user
 *
 * Query Parameters:
 * - walletId (optional): Specific wallet ID to calculate score for
 * - period (optional): Number of months to look back (1, 3, 6, 12). Default: 3
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

    // Get query parameters
    const { searchParams } = new URL(req.url)
    const walletId = searchParams.get('walletId') || undefined
    const walletGroupId = searchParams.get('walletGroupId') || undefined
    const periodStr = searchParams.get('period')
    const period = periodStr ? parseInt(periodStr, 10) : 3

    // Validate period
    if (![1, 3, 6, 12].includes(period)) {
      return NextResponse.json({ error: 'Invalid period. Must be 1, 3, 6, or 12' }, { status: 400 })
    }

    // Optional: scope to a personal Wallet Group (Wallet Linking). Resolve the
    // group's linked wallet IDs and aggregate the score across them.
    let walletIds: string[] | undefined
    if (walletGroupId) {
      const group = await prisma.walletGroup.findFirst({
        where: { id: walletGroupId, userId },
        include: { wallets: { select: { walletId: true } } },
      })
      if (!group) {
        return NextResponse.json({ error: 'Wallet group not found' }, { status: 404 })
      }
      walletIds = group.wallets.map((w) => w.walletId)
    }

    const healthScore = await calculateFinancialHealthScore(userId, walletId, period, walletIds)

    return NextResponse.json(healthScore)
  } catch (error: any) {
    console.error('Error calculating financial health score:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to calculate financial health score' },
      { status: 500 }
    )
  }
}
