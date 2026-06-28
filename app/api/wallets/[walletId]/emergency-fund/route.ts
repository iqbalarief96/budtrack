import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getWalletEmergencyFund,
  setWalletEmergencyFundTarget,
} from '@/lib/walletEmergencyFund'

/**
 * GET /api/wallets/[walletId]/emergency-fund
 * Get emergency fund data for a specific wallet
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { walletId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    const emergencyFund = await getWalletEmergencyFund(params.walletId, userId)

    return NextResponse.json(emergencyFund)
  } catch (error: any) {
    console.error('Error fetching wallet emergency fund:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch emergency fund' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/wallets/[walletId]/emergency-fund
 * Set or update emergency fund target for a wallet
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { walletId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await req.json()
    const { targetAmount } = body

    // Validate input
    if (typeof targetAmount !== 'number') {
      return NextResponse.json(
        { error: 'Target amount must be a number' },
        { status: 400 }
      )
    }

    if (targetAmount < 0) {
      return NextResponse.json(
        { error: 'Target amount must be positive' },
        { status: 400 }
      )
    }

    const emergencyFund = await setWalletEmergencyFundTarget(
      params.walletId,
      userId,
      targetAmount
    )

    // Get updated data with progress
    const updatedData = await getWalletEmergencyFund(params.walletId, userId)

    return NextResponse.json(updatedData)
  } catch (error: any) {
    console.error('Error setting wallet emergency fund target:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to set emergency fund target' },
      { status: 500 }
    )
  }
}
