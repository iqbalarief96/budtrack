import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkAndResetBudgets } from '@/lib/budgetReset'

/**
 * POST /api/budgets/reset
 * Check and reset all recurring budgets that have ended
 * This can be called manually or via a cron job
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Optional: Add API key authentication for cron jobs
    const authHeader = request.headers.get('authorization')
    const apiKey = process.env.CRON_API_KEY

    // Allow either session auth or API key auth
    if (!session?.user && (!apiKey || authHeader !== `Bearer ${apiKey}`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = await checkAndResetBudgets()

    return NextResponse.json({
      success: true,
      message: 'Budget reset check completed',
      results,
    })
  } catch (error) {
    console.error('Error in budget reset:', error)
    return NextResponse.json(
      { error: 'Failed to reset budgets', details: error },
      { status: 500 }
    )
  }
}
