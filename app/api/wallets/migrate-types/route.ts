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
    const debugInfo = []

    for (const wallet of wallets) {
      const info: any = {
        name: wallet.name,
        type: wallet.type,
        isDefault: wallet.isDefault,
        savingsCount: 0,
        skipped: false,
        reason: ''
      }

      // Skip if already has non-MAIN type
      if (wallet.type && wallet.type !== 'MAIN') {
        info.skipped = true
        info.reason = 'Already non-MAIN type'
        debugInfo.push(info)
        continue
      }

      // Skip default wallet or wallets with "utama" in name
      if (wallet.isDefault || wallet.name.toLowerCase().includes('utama')) {
        info.skipped = true
        info.reason = wallet.isDefault ? 'Is default wallet' : 'Name contains "utama"'
        debugInfo.push(info)
        continue
      }

      // Check if wallet has savings transactions (EXPENSE with Savings/Tabungan category)
      const savingsTransactions = wallet.transactions.filter(
        (tx) => {
          const categoryName = tx.category?.name?.toLowerCase() || ''
          return tx.type === 'EXPENSE' && (
            categoryName === 'savings' ||
            categoryName === 'tabungan' ||
            categoryName === 'saving' ||
            categoryName.includes('tabung') ||
            categoryName.includes('saving')
          )
        }
      )
      
      info.savingsCount = savingsTransactions.length

      if (savingsTransactions.length > 0) {
        // Update wallet type to SAVINGS
        updates.push(
          prisma.wallet.update({
            where: { id: wallet.id },
            data: { type: 'SAVINGS' }
          })
        )
        migratedCount++
        info.reason = 'Migrated to SAVINGS'
      } else {
        info.skipped = true
        info.reason = 'No savings transactions'
      }
      
      debugInfo.push(info)
    }

    console.log('[MIGRATION DEBUG]', JSON.stringify(debugInfo, null, 2))

    // Execute all updates
    if (updates.length > 0) {
      await prisma.$transaction(updates)
    }

    return NextResponse.json({
      success: true,
      migratedCount,
      message: `Successfully migrated ${migratedCount} wallet(s) to SAVINGS type`,
      debug: debugInfo
    })
  } catch (error) {
    console.error('Error migrating wallet types:', error)
    return NextResponse.json(
      { error: 'Failed to migrate wallet types' },
      { status: 500 }
    )
  }
}
