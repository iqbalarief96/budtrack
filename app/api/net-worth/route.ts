import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { netWorthCalculator } from '@/lib/net-worth/calculator'
import { snapshotService } from '@/lib/net-worth/snapshot-service'
import type { NetWorthResponse } from '@/app/types/net-worth'

/**
 * GET /api/net-worth
 * Returns current net worth with breakdown and change from previous period
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Fetch user's wallets and debts
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

    // Calculate current net worth (Requirements: 1.1, 1.3, 1.4)
    const calculation = netWorthCalculator.calculate(wallets, debts)

    // Get previous snapshot for change calculation (Requirement: 1.5)
    const latestSnapshot = await snapshotService.getLatestSnapshot(userId)
    
    let change = null
    let previousNetWorth = null

    if (latestSnapshot) {
      previousNetWorth = latestSnapshot.netWorth
      change = netWorthCalculator.calculateChange(
        calculation.netWorth,
        previousNetWorth
      )
    }

    const response: NetWorthResponse = {
      calculation,
      change,
      previousNetWorth,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching net worth:', error)
    return NextResponse.json(
      { error: 'Failed to fetch net worth' },
      { status: 500 }
    )
  }
}
