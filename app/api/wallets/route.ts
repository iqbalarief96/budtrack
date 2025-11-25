import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { WalletSchema } from '@/lib/validators'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// GET /api/wallets?type=SAVINGS
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // MAIN, SAVINGS, INVESTMENT

    // Fetch wallets with aggregated balance from transactions
    const wallets = await prisma.wallet.findMany({
      where: {
        userId: session.user.id,
        ...(type && { type }), // Filter by type if provided
      },
      orderBy: {
        name: 'asc'
      }
    })
    
    // Calculate balance for each wallet using aggregation (much faster than fetching all transactions)
    const walletsWithBalance = await Promise.all(
      wallets.map(async (wallet) => {
        // Use aggregation to calculate balance - this is much faster than fetching all transactions
        const incomeSum = await prisma.transaction.aggregate({
          where: {
            walletId: wallet.id,
            type: 'INCOME'
          },
          _sum: {
            amount: true
          }
        })

        const expenseSum = await prisma.transaction.aggregate({
          where: {
            walletId: wallet.id,
            type: 'EXPENSE'
          },
          _sum: {
            amount: true
          }
        })

        const calculatedBalance = (incomeSum._sum.amount || 0) - (expenseSum._sum.amount || 0)

        return {
          ...wallet,
          balance: calculatedBalance
        }
      })
    )

    return NextResponse.json(walletsWithBalance)
  } catch (error) {
    console.error('Error fetching wallets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wallets' },
      { status: 500 }
    )
  }
}

// POST /api/wallets
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate input with Zod
    const { name, color, icon, balance } = WalletSchema.parse(body)

    // First check if user exists
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if wallet with same name exists
    const existingWallet = await prisma.wallet.findFirst({
      where: {
        name,
        userId: session.user.id
      }
    })

    if (existingWallet) {
      return NextResponse.json(
        { error: 'Wallet with this name already exists' },
        { status: 400 }
      )
    }

    const wallet = await prisma.wallet.create({
      data: {
        name,
        balance: parseFloat(balance.toString()),
        userId: session.user.id,
        color,
        icon
      }
    })

    return NextResponse.json(wallet)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating wallet:', error)
    return NextResponse.json(
      { error: 'Failed to create wallet' },
      { status: 500 }
    )
  }
}

// PUT /api/wallets/:id
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updateFields } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Wallet ID is required' },
        { status: 400 }
      )
    }

    // Validate input with Zod (partial allows optional fields for updates)
    const { name, color, icon, isDefault } = WalletSchema.partial().parse(updateFields)

    // Check if wallet exists and belongs to user
    const wallet = await prisma.wallet.findUnique({
      where: { id }
    })

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      )
    }

    if (wallet.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if wallet with same name exists
    const existingWallet = await prisma.wallet.findFirst({
      where: {
        name,
        userId: session.user.id,
        NOT: {
          id
        }
      }
    })

    if (existingWallet) {
      return NextResponse.json(
        { error: 'Wallet with this name already exists' },
        { status: 400 }
      )
    }

    // If setting as default, unset other default wallets
    if (isDefault) {
      await prisma.wallet.updateMany({
        where: {
          userId: session.user.id,
          isDefault: true,
          NOT: {
            id
          }
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
        isDefault: isDefault ?? wallet.isDefault // Keep existing value if not provided
      }
    })

    return NextResponse.json(updatedWallet)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating wallet:', error)
    return NextResponse.json(
      { error: 'Failed to update wallet' },
      { status: 500 }
    )
  }
}

// DELETE /api/wallets/:id
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Wallet ID is required' },
        { status: 400 }
      )
    }

    // Check if wallet exists and belongs to user
    const wallet = await prisma.wallet.findUnique({
      where: { id }
    })

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      )
    }

    if (wallet.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if wallet has transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        walletId: id
      }
    })

    if (transactions.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete wallet that has transactions' },
        { status: 400 }
      )
    }

    await prisma.wallet.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting wallet:', error)
    return NextResponse.json(
      { error: 'Failed to delete wallet' },
      { status: 500 }
    )
  }
} 