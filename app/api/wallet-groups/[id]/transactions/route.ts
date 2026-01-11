import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getAggregatedTransactions,
  TransactionQueryOptions,
} from '@/lib/wallet-group/aggregation-service'
import { WalletGroupError } from '@/lib/wallet-group/wallet-group-service'
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  badRequestResponse,
  internalErrorResponse,
} from '@/lib/api-response'
import { startOfWeek, startOfMonth, startOfYear, endOfWeek, endOfMonth, endOfYear } from 'date-fns'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Calculate date range based on period
 */
function getDateRangeFromPeriod(period: string): { startDate: Date; endDate: Date } {
  const now = new Date()
  
  switch (period) {
    case 'weekly':
      return {
        startDate: startOfWeek(now, { weekStartsOn: 1 }),
        endDate: endOfWeek(now, { weekStartsOn: 1 })
      }
    case 'monthly':
      return {
        startDate: startOfMonth(now),
        endDate: endOfMonth(now)
      }
    case 'yearly':
      return {
        startDate: startOfYear(now),
        endDate: endOfYear(now)
      }
    case 'all':
    default:
      // Return a very wide range for 'all'
      return {
        startDate: new Date(2000, 0, 1),
        endDate: new Date(2100, 11, 31)
      }
  }
}

/**
 * GET /api/wallet-groups/[id]/transactions
 * Get aggregated transactions from all wallets in a group
 * Requirements: 3.1, 3.2, 3.3
 * 
 * Query parameters:
 * - startDate: ISO date string for filtering
 * - endDate: ISO date string for filtering
 * - period: 'weekly' | 'monthly' | 'yearly' | 'all' (alternative to startDate/endDate)
 * - type: 'income' | 'expense'
 * - categoryId: filter by category
 * - limit: number of results
 * - offset: pagination offset
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return unauthorizedResponse()
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)

    // Build query options from URL parameters
    const options: TransactionQueryOptions = {}

    // Check for period parameter first (takes precedence if no explicit dates)
    const period = searchParams.get('period')
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    if (startDateParam) {
      options.startDate = new Date(startDateParam)
    }

    if (endDateParam) {
      options.endDate = new Date(endDateParam)
    }

    // If period is specified and no explicit dates, calculate from period
    if (period && !startDateParam && !endDateParam) {
      const dateRange = getDateRangeFromPeriod(period)
      options.startDate = dateRange.startDate
      options.endDate = dateRange.endDate
      console.log('[GROUP-TX] Period:', period, 'Start:', dateRange.startDate.toISOString(), 'End:', dateRange.endDate.toISOString())
    }

    const type = searchParams.get('type')
    if (type === 'income' || type === 'expense') {
      options.type = type
    }

    const categoryId = searchParams.get('categoryId')
    if (categoryId) {
      options.categoryId = categoryId
    }

    const limit = searchParams.get('limit')
    if (limit) {
      const parsedLimit = parseInt(limit, 10)
      // -1 means "all" - don't set limit (Prisma will return all)
      if (parsedLimit > 0) {
        options.limit = parsedLimit
      }
      // If parsedLimit is -1 or 0, don't set options.limit so Prisma returns all
    }

    const offset = searchParams.get('offset')
    if (offset) {
      options.offset = parseInt(offset, 10)
    }

    console.log('[GROUP-TX] Options:', JSON.stringify(options, null, 2))

    const transactions = await getAggregatedTransactions(
      id,
      session.user.id,
      options
    )

    return successResponse(transactions)
  } catch (error) {
    if (error instanceof WalletGroupError) {
      if (error.code === 'GROUP_NOT_FOUND') {
        return notFoundResponse('Wallet group')
      }
      return badRequestResponse(error.message, { code: error.code })
    }
    console.error('Error fetching aggregated transactions:', error)
    return internalErrorResponse('Failed to fetch aggregated transactions', error)
  }
}
