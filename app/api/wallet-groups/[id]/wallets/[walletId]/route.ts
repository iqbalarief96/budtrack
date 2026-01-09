import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  removeWalletFromGroup,
  WalletGroupError,
} from '@/lib/wallet-group/wallet-group-service'
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  badRequestResponse,
  internalErrorResponse,
} from '@/lib/api-response'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string; walletId: string }>
}

/**
 * DELETE /api/wallet-groups/[id]/wallets/[walletId]
 * Remove a wallet from a group
 * Requirements: 5.1 - Wallet data is preserved after removal
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return unauthorizedResponse()
    }

    const { id, walletId } = await params

    await removeWalletFromGroup(id, walletId, session.user.id)

    return successResponse(
      { groupId: id, walletId },
      'Wallet removed from group successfully'
    )
  } catch (error) {
    if (error instanceof WalletGroupError) {
      if (error.code === 'GROUP_NOT_FOUND') {
        return notFoundResponse('Wallet group')
      }
      if (error.code === 'WALLET_NOT_IN_GROUP') {
        return notFoundResponse('Wallet membership')
      }
      return badRequestResponse(error.message, { code: error.code })
    }
    console.error('Error removing wallet from group:', error)
    return internalErrorResponse('Failed to remove wallet from group', error)
  }
}
