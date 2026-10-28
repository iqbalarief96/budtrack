import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { withComputedBalances } from '@/lib/walletBalance'
import { WalletSchema } from '@/lib/validators'
import { z } from 'zod'
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  conflictResponse,
  createdResponse,
  badRequestResponse,
  internalErrorResponse,
  handleZodError
} from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET /api/wallets?type=SAVINGS
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return unauthorizedResponse()
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // MAIN, SAVINGS, INVESTMENT

    // Fetch wallets; balances are computed from transactions below
    const wallets = await prisma.wallet.findMany({
      where: {
        userId: session.user.id,
        ...(type && { type }), // Filter by type if provided
      },
      orderBy: {
        name: 'asc'
      }
    })
    
    // Balance = income − expense from transactions (one grouped query for all
    // wallets). The Wallet.balance column is a drifting legacy cache.
    const walletsWithBalance = await withComputedBalances(wallets)

    return successResponse(walletsWithBalance)
  } catch (error) {
    console.error('Error fetching wallets:', error)
    return internalErrorResponse('Failed to fetch wallets', error)
  }
}

// POST /api/wallets
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return unauthorizedResponse()
    }

    const body = await request.json()

    // Validate input with Zod
    const { name, color, icon, balance, type } = WalletSchema.parse(body) as any

    // First check if user exists
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id
      }
    })

    if (!user) {
      return notFoundResponse('User')
    }

    // Check if wallet with same name exists
    const existingWallet = await prisma.wallet.findFirst({
      where: {
        name,
        userId: session.user.id
      }
    })

    if (existingWallet) {
      return conflictResponse('Wallet with this name already exists')
    }

    // Balances are derived from transactions, so a starting balance must be a
    // transaction too ("Saldo awal"); a column-only value would be invisible.
    const parsedOpening = parseFloat(String(balance ?? 0))
    const opening = Number.isFinite(parsedOpening) ? parsedOpening : 0
    const wallet = await prisma.wallet.create({
      data: {
        name,
        balance: opening,
        userId: session.user.id,
        color,
        icon,
        type: type || 'MAIN',
        ...(opening !== 0 && {
          transactions: {
            create: {
              userId: session.user.id,
              type: opening > 0 ? 'INCOME' : 'EXPENSE',
              amount: Math.abs(opening),
              description: 'Saldo awal',
              date: new Date(),
            },
          },
        }),
      }
    })

    return createdResponse(wallet, 'Wallet created successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleZodError(error)
    }
    console.error('Error creating wallet:', error)
    return internalErrorResponse('Failed to create wallet', error)
  }
}

// PUT /api/wallets/:id
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const { id, ...updateFields } = body

    if (!id) {
      return badRequestResponse('Wallet ID is required')
    }

    // Validate input with Zod (partial allows optional fields for updates)
    const { name, color, icon, isDefault, type } = WalletSchema.partial().parse(updateFields) as any

    // Check if wallet exists and belongs to user
    const wallet = await prisma.wallet.findUnique({
      where: { id }
    })

    if (!wallet) {
      return notFoundResponse('Wallet')
    }

    if (wallet.userId !== session.user.id) {
      return unauthorizedResponse()
    }

    // Check if wallet with same name exists
    if (name) {
      const existingWallet = await prisma.wallet.findFirst({
        where: {
          name,
          userId: session.user.id,
          NOT: { id }
        }
      })

      if (existingWallet) {
        return conflictResponse('Wallet with this name already exists')
      }
    }

    // If setting as default, unset other default wallets
    if (isDefault) {
      await prisma.wallet.updateMany({
        where: {
          userId: session.user.id,
          isDefault: true,
          NOT: { id }
        },
        data: {
          isDefault: false
        }
      })
    }

    // Update the wallet
    const updatedWallet = await prisma.wallet.update({
      where: { id },
      data: {
        name,
        color,
        icon,
        type: type ?? wallet.type,
        isDefault: isDefault ?? wallet.isDefault
      }
    })

    return successResponse(updatedWallet, 'Wallet updated successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleZodError(error)
    }
    console.error('Error updating wallet:', error)
    return internalErrorResponse('Failed to update wallet', error)
  }
}

// DELETE /api/wallets/:id?force=true
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const force = searchParams.get('force') === 'true'

    if (!id) {
      return badRequestResponse('Wallet ID is required')
    }

    // Check if wallet exists and belongs to user
    const wallet = await prisma.wallet.findUnique({
      where: { id }
    })

    if (!wallet) {
      return notFoundResponse('Wallet')
    }

    if (wallet.userId !== session.user.id) {
      return unauthorizedResponse()
    }

    // Check if wallet has transactions
    const transactionCount = await prisma.transaction.count({
      where: { walletId: id }
    })

    if (transactionCount > 0 && !force) {
      return badRequestResponse(
        'Cannot delete wallet that has transactions',
        {
          transactionCount,
          message: `Wallet has ${transactionCount} transaction(s). Please delete or move them first, or use force=true to delete all.`
        }
      )
    }

    // If force=true, delete all transactions first
    if (force && transactionCount > 0) {
      await prisma.transaction.deleteMany({
        where: { walletId: id }
      })
      console.log(`Force deleted ${transactionCount} transactions from wallet ${id}`)
    }

    await prisma.wallet.delete({
      where: { id }
    })

    return successResponse(
      {
        id,
        deletedTransactions: force ? transactionCount : 0
      },
      'Wallet deleted successfully'
    )
  } catch (error) {
    console.error('Error deleting wallet:', error)
    return internalErrorResponse('Failed to delete wallet', error)
  }
} 