import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { calculateAllWalletsForecast } from '@/lib/cashFlowForecast'

/**
 * GET /api/forecast/cashflow
 * Get cash flow forecast across all wallets for the current user
 *
 * Query params:
 * - months: number of months to forecast (default: 6, max: 12)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(req.url)
    const monthsParam = searchParams.get('months')

    // Parse and validate months parameter
    let months = 6 // default
    if (monthsParam) {
      const parsedMonths = parseInt(monthsParam, 10)
      if (!isNaN(parsedMonths) && parsedMonths > 0 && parsedMonths <= 12) {
        months = parsedMonths
      }
    }

    const forecast = await calculateAllWalletsForecast(userId, months)

    return NextResponse.json(forecast)
  } catch (error: any) {
    console.error('Error calculating all wallets forecast:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to calculate forecast' },
      { status: 500 }
    )
  }
}
