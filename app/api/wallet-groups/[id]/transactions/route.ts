import { NextResponse } from 'next/server'
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

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/wallet-groups/[id]/transactions
 * Get aggregated transactions from all wallets in a group
 * Requirements: 3.1, 3.2, 3.3
 * 
 * Query parameters:
 * - startDate: ISO date string for filtering
 * - endDate: ISO date string for filtering
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

    const startDate = searchParams.get('startDate')
    if (startDate) {
      options.startDate = new Date(startDate)
    }

    const endDate = searchParams.get('endDate')
    if (endDate) {
      options.endDate = new Date(endDate)
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
      options.limit = parseInt(limit, 10)
    }

    const offset = searchParams.get('offset')
    if (offset) {
      options.offset = parseInt(offset, 10)
    }

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
