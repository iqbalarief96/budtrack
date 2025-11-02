import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * POST /api/emergency-fund/migrate
 * Migrate general emergency fund to wallet-specific emergency funds
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with emergency fund data
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        emergencyFund: true,
        wallets: {
          orderBy: { isDefault: 'desc' },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has general emergency fund
    if (!user.emergencyFund || user.emergencyFund.targetAmount <= 0) {
      return NextResponse.json({
        message: 'No general emergency fund to migrate',
        migrated: false,
      })
    }

    // Check if wallet emergency funds already exist
    const existingWalletFunds = await prisma.walletEmergencyFund.findMany({
      where: { userId: user.id },
    })

    if (existingWalletFunds.length > 0) {
      return NextResponse.json({
        message: 'Wallet emergency funds already exist',
        migrated: false,
        existingFunds: existingWalletFunds.length,
      })
    }

    const generalTarget = user.emergencyFund.targetAmount

    // Migration strategy: Set target to default wallet (or first wallet if no default)
    const defaultWallet = user.wallets.find((w) => w.isDefault) || user.wallets[0]

    if (!defaultWallet) {
      return NextResponse.json({
        error: 'No wallets found for migration',
      }, { status: 400 })
    }

    // Create wallet emergency fund for default wallet
    const walletEmergencyFund = await prisma.walletEmergencyFund.create({
      data: {
        walletId: defaultWallet.id,
        userId: user.id,
        targetAmount: generalTarget,
        isActive: user.emergencyFund.isActive,
      },
    })

    console.log(`[MIGRATION] Migrated emergency fund target ${generalTarget} to wallet ${defaultWallet.name}`)

    return NextResponse.json({
      message: 'Successfully migrated emergency fund to wallet-specific fund',
      migrated: true,
      walletName: defaultWallet.name,
      targetAmount: generalTarget,
      walletEmergencyFund,
    })
  } catch (error) {
    console.error('Error migrating emergency fund:', error)
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
