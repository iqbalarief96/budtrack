import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getAggregatedGoals,
} from '@/lib/wallet-group/goal-aggregation-service'
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
 * GET /api/wallet-groups/[id]/goals
 * Get aggregated goals for a wallet group
 * Requirements: 12.1, 12.2, 12.3, 12.4
 * 
 * Returns all goals linked to wallets in the group with:
 * - Wallet contributions for each goal
 * - Total goal progress across all wallets
 * - Combined savings rate
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return unauthorizedResponse()
    }

    const { id } = await params

    const goals = await getAggregatedGoals(
      id,
      session.user.id
    )

    return successResponse(goals)
  } catch (error) {
    if (error instanceof WalletGroupError) {
      if (error.code === 'GROUP_NOT_FOUND') {
        return notFoundResponse('Wallet group')
      }
      return badRequestResponse(error.message, { code: error.code })
    }
    console.error('Error fetching aggregated goals:', error)
    return internalErrorResponse('Failed to fetch aggregated goals', error)
  }
}
