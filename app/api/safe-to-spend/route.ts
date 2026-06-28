import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { calculateAllWalletsSafeToSpend } from '@/lib/safeToSpend'

/**
 * GET /api/safe-to-spend
 * Calculate safe-to-spend across all wallets for the current user
 *
 * Returns:
 * - Per-wallet calculations
 * - Aggregated totals across all wallets
 * - Primary currency code
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Optional: scope to a personal Wallet Group (Wallet Linking). When present,
    // aggregates safe-to-spend only across wallets linked in that group.
    const walletGroupId = req.nextUrl.searchParams.get('walletGroupId') || undefined

    const allWalletsData = await calculateAllWalletsSafeToSpend(userId, walletGroupId)

    return NextResponse.json(allWalletsData)
  } catch (error: any) {
    console.error('Error calculating safe-to-spend for all wallets:', error)
    const isNotFound = error?.message === 'Wallet group not found'
    return NextResponse.json(
      { error: error.message || 'Failed to calculate safe-to-spend' },
      { status: isNotFound ? 404 : 500 }
    )
  }
}
