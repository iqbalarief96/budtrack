import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getBudgetHistory } from '@/lib/budgetReset'

/**
 * GET /api/budgets/[id]/history
 * Get budget history for analytics and comparison
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
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '12')

    const history = await getBudgetHistory(budgetId, session.user.id, limit)

    // Calculate statistics
    const stats = {
      totalPeriods: history.length,
      averageSpent: 0,
      averagePercentage: 0,
      maxSpent: 0,
      minSpent: Infinity,
      periodsOverBudget: 0,
    }

    if (history.length > 0) {
      const totalSpent = history.reduce((sum, h) => sum + h.spent, 0)
      stats.averageSpent = totalSpent / history.length
      stats.maxSpent = Math.max(...history.map((h) => h.spent))
      stats.minSpent = Math.min(...history.map((h) => h.spent))
      stats.periodsOverBudget = history.filter((h) => h.spent > h.amount).length
      stats.averagePercentage = Math.round(
        (stats.averageSpent / (history[0]?.amount || 1)) * 100
      )
    }

    return NextResponse.json({
      history,
      stats,
    })
  } catch (error: any) {
    console.error('Error fetching budget history:', error)

    if (error.message === 'Budget not found or not authorized') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Failed to fetch budget history' },
      { status: 500 }
    )
  }
}
