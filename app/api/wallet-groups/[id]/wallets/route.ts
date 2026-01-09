import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  addWalletToGroup,
  getGroupWallets,
  WalletGroupError,
} from '@/lib/wallet-group/wallet-group-service'
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  badRequestResponse,
  createdResponse,
  internalErrorResponse,
} from '@/lib/api-response'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/wallet-groups/[id]/wallets
 * Get all wallets in a group
 * Requirements: 2.1
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return unauthorizedResponse()
    }

    const { id } = await params

    const wallets = await getGroupWallets(id, session.user.id)

    return successResponse(wallets)
  } catch (error) {
    if (error instanceof WalletGroupError) {
      if (error.code === 'GROUP_NOT_FOUND') {
        return notFoundResponse('Wallet group')
      }
      return badRequestResponse(error.message, { code: error.code })
    }
    console.error('Error fetching group wallets:', error)
    return internalErrorResponse('Failed to fetch group wallets', error)
  }
}

/**
 * POST /api/wallet-groups/[id]/wallets
 * Add a wallet to a group
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return unauthorizedResponse()
    }

    const { id } = await params
    const body = await request.json()

    if (!body.walletId) {
      return badRequestResponse('walletId is required')
    }

    const member = await addWalletToGroup(id, body.walletId, session.user.id)

    return createdResponse(member, 'Wallet added to group successfully')
  } catch (error) {
    if (error instanceof WalletGroupError) {
      if (error.code === 'GROUP_NOT_FOUND') {
        return notFoundResponse('Wallet group')
      }
      if (error.code === 'WALLET_NOT_FOUND') {
        return notFoundResponse('Wallet')
      }
      return badRequestResponse(error.message, { code: error.code })
    }
    console.error('Error adding wallet to group:', error)
    return internalErrorResponse('Failed to add wallet to group', error)
  }
}
