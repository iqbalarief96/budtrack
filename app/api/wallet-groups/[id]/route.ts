import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getGroupById,
  updateGroup,
  deleteGroup,
  WalletGroupError,
  UpdateWalletGroupInput,
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
  params: Promise<{ id: string }>
}

/**
 * GET /api/wallet-groups/[id]
 * Get a single wallet group by ID
 * Requirements: 1.1
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return unauthorizedResponse()
    }

    const { id } = await params

    const group = await getGroupById(id, session.user.id)

    if (!group) {
      return notFoundResponse('Wallet group')
    }

    return successResponse(group)
  } catch (error) {
    console.error('Error fetching wallet group:', error)
    return internalErrorResponse('Failed to fetch wallet group', error)
  }
}

/**
 * PATCH /api/wallet-groups/[id]
 * Update a wallet group
 * Requirements: 5.2
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return unauthorizedResponse()
    }

    const { id } = await params
    const body = await request.json()

    const input: UpdateWalletGroupInput = {}
    if (body.name !== undefined) input.name = body.name
    if (body.description !== undefined) input.description = body.description
    if (body.icon !== undefined) input.icon = body.icon
    if (body.color !== undefined) input.color = body.color
    
    // Handle wallet updates if walletIds provided
    if (body.walletIds !== undefined) {
      input.walletIds = body.walletIds
    }

    const group = await updateGroup(id, session.user.id, input)

    return successResponse(group, 'Wallet group updated successfully')
  } catch (error) {
    if (error instanceof WalletGroupError) {
      if (error.code === 'GROUP_NOT_FOUND') {
        return notFoundResponse('Wallet group')
      }
      return badRequestResponse(error.message, { code: error.code })
    }
    console.error('Error updating wallet group:', error)
    return internalErrorResponse('Failed to update wallet group', error)
  }
}

/**
 * PUT /api/wallet-groups/[id]
 * Update a wallet group (alias for PATCH)
 * Requirements: 5.2
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return unauthorizedResponse()
    }

    const { id } = await params
    const body = await request.json()

    const input: UpdateWalletGroupInput = {}
    if (body.name !== undefined) input.name = body.name
    if (body.description !== undefined) input.description = body.description
    if (body.icon !== undefined) input.icon = body.icon
    if (body.color !== undefined) input.color = body.color
    
    // Handle wallet updates if walletIds provided
    if (body.walletIds !== undefined) {
      input.walletIds = body.walletIds
    }

    const group = await updateGroup(id, session.user.id, input)

    return successResponse(group, 'Wallet group updated successfully')
  } catch (error) {
    if (error instanceof WalletGroupError) {
      if (error.code === 'GROUP_NOT_FOUND') {
        return notFoundResponse('Wallet group')
      }
      return badRequestResponse(error.message, { code: error.code })
    }
    console.error('Error updating wallet group:', error)
    return internalErrorResponse('Failed to update wallet group', error)
  }
}

/**
 * DELETE /api/wallet-groups/[id]
 * Delete a wallet group
 * Requirements: 5.3 - Deleting a group does not affect individual wallets
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return unauthorizedResponse()
    }

    const { id } = await params

    await deleteGroup(id, session.user.id)

    return successResponse({ id }, 'Wallet group deleted successfully')
  } catch (error) {
    if (error instanceof WalletGroupError) {
      if (error.code === 'GROUP_NOT_FOUND') {
        return notFoundResponse('Wallet group')
      }
      return badRequestResponse(error.message, { code: error.code })
    }
    console.error('Error deleting wallet group:', error)
    return internalErrorResponse('Failed to delete wallet group', error)
  }
}
