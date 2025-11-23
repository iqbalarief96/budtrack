import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { calculateCashFlowForecast } from '@/lib/cashFlowForecast'

/**
 * GET /api/wallets/[walletId]/forecast
 * Get cash flow forecast for a specific wallet
 *
 * Query params:
 * - months: number of months to forecast (default: 6, max: 12)
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

    const forecast = await calculateCashFlowForecast(
      params.walletId,
      userId,
      months
    )

    return NextResponse.json(forecast)
  } catch (error: any) {
    console.error('Error calculating cash flow forecast:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to calculate forecast' },
      { status: 500 }
    )
  }
}
