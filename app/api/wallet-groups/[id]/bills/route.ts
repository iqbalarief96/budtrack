import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getAggregatedBills,
} from '@/lib/wallet-group/bill-aggregation-service'
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
 * GET /api/wallet-groups/[id]/bills
 * Get aggregated bills for a wallet group
 * Requirements: 11.1, 11.2, 11.3, 11.4
 * 
 * Returns all bills from all wallets in the group with:
 * - Wallet attribution for each bill
 * - Total upcoming and overdue amounts
 * - Bill payment statistics
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return unauthorizedResponse()
    }

    const { id } = await params

    const bills = await getAggregatedBills(
      id,
      session.user.id
    )

    return successResponse(bills)
  } catch (error) {
    if (error instanceof WalletGroupError) {
      if (error.code === 'GROUP_NOT_FOUND') {
        return notFoundResponse('Wallet group')
      }
      return badRequestResponse(error.message, { code: error.code })
    }
    console.error('Error fetching aggregated bills:', error)
    return internalErrorResponse('Failed to fetch aggregated bills', error)
  }
}
