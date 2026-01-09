import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  createGroup,
  getGroups,
  WalletGroupError,
  CreateWalletGroupInput,
} from '@/lib/wallet-group/wallet-group-service'
import {
  successResponse,
  unauthorizedResponse,
  createdResponse,
  badRequestResponse,
  internalErrorResponse,
} from '@/lib/api-response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/wallet-groups
 * List all wallet groups for the authenticated user
 * Requirements: 1.1
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return unauthorizedResponse()
    }

    const groups = await getGroups(session.user.id)

    return successResponse(groups)
  } catch (error) {
    console.error('Error fetching wallet groups:', error)
    return internalErrorResponse('Failed to fetch wallet groups', error)
  }
}

/**
 * POST /api/wallet-groups
 * Create a new wallet group
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return unauthorizedResponse()
    }

    const body = await request.json()

    const input: CreateWalletGroupInput = {
      name: body.name,
      description: body.description,
      icon: body.icon,
      color: body.color,
      walletIds: body.walletIds,
    }

    const group = await createGroup(session.user.id, input)

    return createdResponse(group, 'Wallet group created successfully')
  } catch (error) {
    if (error instanceof WalletGroupError) {
      return badRequestResponse(error.message, { code: error.code })
    }
    console.error('Error creating wallet group:', error)
    return internalErrorResponse('Failed to create wallet group', error)
  }
}
