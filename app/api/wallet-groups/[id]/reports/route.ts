import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getAggregatedReport,
  ReportOptions,
} from '@/lib/wallet-group/report-aggregation-service'
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
 * GET /api/wallet-groups/[id]/reports
 * Get aggregated report data for a wallet group
 * Requirements: 10.1, 10.2, 10.3, 10.4
 * 
 * Query parameters:
 * - startDate: ISO date string (required) - start of report period
 * - endDate: ISO date string (required) - end of report period
 * - includeCategories: boolean - include category breakdown
 * - includeWalletBreakdown: boolean - include per-wallet breakdown
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return unauthorizedResponse()
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)

    // Get date range (required for reports)
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')

    // Default to current month if no dates provided
    const now = new Date()
    const startDate = startDateStr 
      ? new Date(startDateStr) 
      : new Date(now.getFullYear(), now.getMonth(), 1)
    const endDate = endDateStr 
      ? new Date(endDateStr) 
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    // Build report options
    const options: ReportOptions = {
      dateRange: {
        startDate,
        endDate,
      },
      includeCategories: searchParams.get('includeCategories') !== 'false',
      includeWalletBreakdown: searchParams.get('includeWalletBreakdown') !== 'false',
    }

    const report = await getAggregatedReport(
      id,
      session.user.id,
      options
    )

    return successResponse(report)
  } catch (error) {
    if (error instanceof WalletGroupError) {
      if (error.code === 'GROUP_NOT_FOUND') {
        return notFoundResponse('Wallet group')
      }
      return badRequestResponse(error.message, { code: error.code })
    }
    console.error('Error fetching aggregated report:', error)
    return internalErrorResponse('Failed to fetch aggregated report', error)
  }
}
