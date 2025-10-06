import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/wallets
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch wallets first
    const wallets = await prisma.wallet.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        name: 'asc'
      }
    })
    
    // Fetch all transactions for this user
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id
      },
      select: {
        walletId: true,
        type: true,
        amount: true
      }
    })
    
    // Calculate correct balance for each wallet based on transactions
    const walletsWithCorrectBalance = wallets.map(wallet => {
      // Filter transactions for this wallet
      const walletTransactions = transactions.filter(tx => tx.walletId === wallet.id)
      
      // Calculate balance from transactions
      let calculatedBalance = 0
      walletTransactions.forEach(tx => {
        if (tx.type === 'INCOME') {
          calculatedBalance += tx.amount
        } else if (tx.type === 'EXPENSE') {
          calculatedBalance -= tx.amount
        }
      })
      
      // Return wallet with correct balance
      return {
        ...wallet,
        balance: calculatedBalance
      }
    })

    return NextResponse.json(walletsWithCorrectBalance)
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

    const { name, color, icon, balance = 0 } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

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

    const { id, name, color, icon, isDefault } = await request.json()

    if (!id || !name) {
      return NextResponse.json(
        { error: 'ID and name are required' },
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