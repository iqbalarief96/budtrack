import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/transactions/[id] - Get single transaction
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const transactionId = params.id

    // Fetch transaction with relations
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: session.user.id
      },
      include: {
        wallet: true,
        category: true,
        goal: true,
        items: {
          orderBy: { order: 'asc' }
        }
      }
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ transaction })
  } catch (error) {
    console.error('Error fetching transaction:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/transactions/[id] - Update transaction
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const transactionId = params.id
    const body = await req.json()

    // Verify transaction belongs to user
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: session.user.id
      }
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Update transaction
    const updatedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        description: body.description,
        amount: body.amount,
        date: body.date ? new Date(body.date) : undefined,
        categoryId: body.categoryId,
        walletId: body.walletId,
        goalId: body.goalId
      },
      include: {
        wallet: true,
        category: true,
        goal: true,
        items: true
      }
    })

    return NextResponse.json({ transaction: updatedTransaction })
  } catch (error) {
    console.error('Error updating transaction:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/transactions/[id] - Delete transaction
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const transactionId = params.id

    // Verify transaction belongs to user
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: session.user.id
      }
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Delete transaction (items will be cascade deleted)
    await prisma.transaction.delete({
      where: { id: transactionId }
    })

    return NextResponse.json({ message: 'Transaction deleted successfully' })
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
