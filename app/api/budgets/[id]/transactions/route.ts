import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * GET /api/budgets/[id]/transactions
 * Get all transactions that contribute to a specific budget
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const budgetId = params.id

    // Verify budget ownership
    const budget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId: session.user.id,
      },
      include: {
        category: true,
        wallet: true,
      },
    })

    if (!budget) {
      return NextResponse.json(
        { error: 'Budget not found or not authorized' },
        { status: 404 }
      )
    }

    // Get transactions within budget period
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        walletId: budget.walletId,
        categoryId: budget.categoryId,
        type: 'EXPENSE',
        date: {
          gte: budget.startDate,
          lte: budget.endDate,
        },
      },
      include: {
        category: true,
        wallet: true,
      },
      orderBy: {
        date: 'desc',
      },
    })

    // Calculate total spent from these transactions
    const totalSpent = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)

    return NextResponse.json({
      budget: {
        id: budget.id,
        amount: budget.amount,
        category: budget.category.name,
        wallet: budget.wallet.name,
        startDate: budget.startDate,
        endDate: budget.endDate,
      },
      transactions,
      summary: {
        count: transactions.length,
        totalSpent,
        remaining: budget.amount - totalSpent,
        percentage: Math.round((totalSpent / budget.amount) * 100),
      },
    })
  } catch (error) {
    console.error('Error fetching budget transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}
