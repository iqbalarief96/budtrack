import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all user's wallets
    const wallets = await prisma.wallet.findMany({
      where: { userId: session.user.id },
      include: {
        transactions: {
          include: {
            category: true
          }
        }
      }
    })

    let migratedCount = 0
    const updates = []

    for (const wallet of wallets) {
      // Skip if already has non-MAIN type
      if (wallet.type && wallet.type !== 'MAIN') {
        continue
      }

      // Check if wallet has savings transactions (EXPENSE with Savings category)
      const hasSavingsTransactions = wallet.transactions.some(
        (tx) => 
          tx.type === 'EXPENSE' && 
          tx.category?.name?.toLowerCase() === 'savings'
      )

      if (hasSavingsTransactions) {
        // Update wallet type to SAVINGS
        updates.push(
          prisma.wallet.update({
            where: { id: wallet.id },
            data: { type: 'SAVINGS' }
          })
        )
        migratedCount++
      }
    }

    // Execute all updates
    if (updates.length > 0) {
      await prisma.$transaction(updates)
    }

    return NextResponse.json({
      success: true,
      migratedCount,
      message: `Successfully migrated ${migratedCount} wallet(s) to SAVINGS type`
    })
  } catch (error) {
    console.error('Error migrating wallet types:', error)
    return NextResponse.json(
      { error: 'Failed to migrate wallet types' },
      { status: 500 }
    )
  }
}
