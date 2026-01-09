import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getAggregatedRecurring,
} from '@/lib/wallet-group/recurring-aggregation-service'
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
 * GET /api/wallet-groups/[id]/recurring
 * Get aggregated recurring transactions for a wallet group
 * Requirements: 13.1, 13.2, 13.3, 13.4
 * 
 * Returns all recurring transactions from all wallets in the group with:
 * - Wallet attribution for each recurring transaction
 * - Total recurring income and expense amounts
 * - Upcoming recurring transactions (next 30 days)
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return unauthorizedResponse()
    }

    const { id } = await params

    const recurring = await getAggregatedRecurring(
      id,
      session.user.id
    )

    return successResponse(recurring)
  } catch (error) {
    if (error instanceof WalletGroupError) {
      if (error.code === 'GROUP_NOT_FOUND') {
        return notFoundResponse('Wallet group')
      }
      return badRequestResponse(error.message, { code: error.code })
    }
    console.error('Error fetching aggregated recurring:', error)
    return internalErrorResponse('Failed to fetch aggregated recurring transactions', error)
  }
}
