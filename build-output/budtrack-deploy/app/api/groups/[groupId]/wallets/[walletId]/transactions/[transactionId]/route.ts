import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/groups/[groupId]/wallets/[walletId]/transactions/[transactionId]
export async function GET(
  request: Request,
  { params }: { params: { groupId: string; walletId: string; transactionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check user membership
    const membership = await prisma.userGroup.findFirst({
      where: {
        userId: session.user.id,
        groupId: params.groupId,
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this group' },
        { status: 403 }
      )
    }

    // Get transaction details
    const transaction = await prisma.groupTransaction.findUnique({
      where: {
        id: params.transactionId,
        groupWalletId: params.walletId,
      },
      include: {
        category: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        splits: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Error fetching transaction:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/groups/[groupId]/wallets/[walletId]/transactions/[transactionId]
export async function PUT(
  request: Request,
  { params }: { params: { groupId: string; walletId: string; transactionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check user membership
    const membership = await prisma.userGroup.findFirst({
      where: {
        userId: session.user.id,
        groupId: params.groupId,
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this group' },
        { status: 403 }
      )
    }

    // Get existing transaction 
    const existingTransaction = await prisma.groupTransaction.findUnique({
      where: {
        id: params.transactionId,
        groupWalletId: params.walletId,
      },
      include: {
        splits: true
      }
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Only allow creator, admin or owner to edit
    if (
      existingTransaction.createdById !== session.user.id &&
      membership.role !== 'ADMIN' &&
      membership.role !== 'OWNER'
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this transaction' },
        { status: 403 }
      )
    }

    // Get request body
    const body = await request.json()
    const { amount, type, description, date, categoryId, splits } = body

    // 1. First, update transaction
    let updatedTransaction = await prisma.groupTransaction.update({
      where: {
        id: params.transactionId,
      },
      data: {
        amount: parseFloat(amount),
        type,
        description,
        date: new Date(date),
        categoryId: categoryId || null,
      },
      include: {
        category: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        splits: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    })

    // 2. Update wallet balance (adjust for difference in amount)
    const amountDifference = parseFloat(amount) - existingTransaction.amount
    if (amountDifference !== 0) {
      await prisma.groupWallet.update({
        where: {
          id: params.walletId,
        },
        data: {
          balance: {
            [type === 'INCOME' ? 'increment' : 'decrement']: Math.abs(amountDifference),
          },
        },
      })
    }

    // 3. Handle splits if provided
    if (splits) {
      // Delete existing splits
      await prisma.expenseSplit.deleteMany({
        where: {
          groupTransactionId: params.transactionId,
        },
      })

      // Create new splits
      for (const split of splits) {
        await prisma.expenseSplit.create({
          data: {
            groupTransactionId: params.transactionId,
            userId: split.userId,
            amount: parseFloat(split.amount),
            isPaid: split.isPaid,
            paidDate: split.isPaid ? new Date() : null,
          },
        })
      }

      // Fetch updated transaction with new splits
      const refreshedTransaction = await prisma.groupTransaction.findUnique({
        where: {
          id: params.transactionId,
        },
        include: {
          category: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          splits: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
      });
      
      if (refreshedTransaction) {
        updatedTransaction = refreshedTransaction;
      }
    }

    return NextResponse.json(updatedTransaction)
  } catch (error) {
    console.error('Error updating transaction:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/groups/[groupId]/wallets/[walletId]/transactions/[transactionId]
export async function DELETE(
  request: Request,
  { params }: { params: { groupId: string; walletId: string; transactionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check user membership and permissions
    const membership = await prisma.userGroup.findFirst({
      where: {
        userId: session.user.id,
        groupId: params.groupId,
        role: { in: ['OWNER', 'ADMIN'] }
      },
    })

    const transaction = await prisma.groupTransaction.findUnique({
      where: {
        id: params.transactionId,
        groupWalletId: params.walletId,
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Only allow creator, admin or owner to delete
    if (
      transaction.createdById !== session.user.id && 
      !membership
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this transaction' },
        { status: 403 }
      )
    }

    // Get any related personal transactions for paid splits
    const splits = await prisma.expenseSplit.findMany({
      where: {
        groupTransactionId: params.transactionId,
        isPaid: true
      }
    })

    // First, update the wallet balance
    await prisma.groupWallet.update({
      where: {
        id: params.walletId,
      },
      data: {
        balance: {
          [transaction.type === 'INCOME' ? 'decrement' : 'increment']: transaction.amount,
        },
      },
    })

    // Now delete the transaction (cascades to splits)
    await prisma.groupTransaction.delete({
      where: {
        id: params.transactionId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 