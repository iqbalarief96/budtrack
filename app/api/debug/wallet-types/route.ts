import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all wallets with their transactions
    const wallets = await prisma.wallet.findMany({
      where: { userId: session.user.id },
      include: {
        transactions: {
          include: {
            category: true
          },
          where: {
            type: 'EXPENSE',
            category: {
              name: {
                equals: 'Savings',
                mode: 'insensitive'
              }
            }
          }
        }
      }
    })

    const debug = wallets.map(wallet => ({
      id: wallet.id,
      name: wallet.name,
      type: wallet.type,
      isDefault: wallet.isDefault,
      savingsTransactionsCount: wallet.transactions.length,
      savingsTransactions: wallet.transactions.map(tx => ({
        description: tx.description,
        amount: tx.amount,
        category: tx.category?.name
      }))
    }))

    return NextResponse.json(debug)
  } catch (error) {
    console.error('Error debugging wallet types:', error)
    return NextResponse.json(
      { error: 'Failed to debug wallet types' },
      { status: 500 }
    )
  }
}
