import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getAggregatedInsights,
} from '@/lib/wallet-group/insights-aggregation-service'
import { DateRange } from '@/lib/wallet-group/aggregation-service'
import { WalletGroupError } from '@/lib/wallet-group/wallet-group-service'
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  badRequestResponse,
  internalErrorResponse,
} from '@/lib/api-response'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/wallet-groups/[id]/insights
 * Get aggregated spending insights for a wallet group
 * Requirements: 8.1, 8.2, 8.3, 8.4
 * 
 * Query parameters:
 * - startDate: ISO date string for filtering
 * - endDate: ISO date string for filtering
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return unauthorizedResponse()
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)

    // Build date range from URL parameters
    const dateRange: DateRange = {}

    const startDate = searchParams.get('startDate')
    if (startDate) {
      dateRange.startDate = new Date(startDate)
    }

    const endDate = searchParams.get('endDate')
    if (endDate) {
      dateRange.endDate = new Date(endDate)
    }

    const insights = await getAggregatedInsights(
      id,
      session.user.id,
      Object.keys(dateRange).length > 0 ? dateRange : undefined
    )

    return successResponse(insights)
  } catch (error) {
    if (error instanceof WalletGroupError) {
      if (error.code === 'GROUP_NOT_FOUND') {
        return notFoundResponse('Wallet group')
      }
      return badRequestResponse(error.message, { code: error.code })
    }
    console.error('Error fetching aggregated insights:', error)
    return internalErrorResponse('Failed to fetch aggregated insights', error)
  }
}
