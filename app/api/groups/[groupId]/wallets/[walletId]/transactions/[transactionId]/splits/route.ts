import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'

// PATCH /api/groups/[groupId]/wallets/[walletId]/transactions/[transactionId]/splits
// This endpoint updates the isPaid status for a specific split
export async function PATCH(
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

    // Get request body
    const body = await request.json()
    const { splitId, isPaid } = body

    if (!splitId) {
      return NextResponse.json(
        { error: 'Missing splitId parameter' },
        { status: 400 }
      )
    }

    // First get the split to get full details
    const split = await prisma.expenseSplit.findUnique({
      where: {
        id: splitId,
      },
      include: {
        transaction: {
          include: {
            groupWallet: true,
            category: true
          }
        }
      }
    })

    if (!split) {
      return NextResponse.json(
        { error: 'Split not found' },
        { status: 404 }
      )
    }

    // Only allow updating own splits, or if user is admin/owner
    if (
      split.userId !== session.user.id &&
      membership.role !== 'ADMIN' &&
      membership.role !== 'OWNER'
    ) {
      return NextResponse.json(
        { error: 'You do not have permission to update this split' },
        { status: 403 }
      )
    }

    // Update the split
    const updatedSplit = await prisma.expenseSplit.update({
      where: {
        id: splitId,
      },
      data: {
        isPaid,
        paidDate: isPaid ? new Date() : null,
      },
    })

    // If being marked as paid, add a personal transaction record
    if (isPaid && !split.isPaid) {
      // Get user's default wallet
      const userWallet = await prisma.wallet.findFirst({
        where: { 
          userId: split.userId,
          isDefault: true
        }
      })
      
      if (userWallet) {
        const walletName = split.transaction.groupWallet.name || 'Group Wallet'
        
        // Create personal expense transaction
        await prisma.transaction.create({
          data: {
            amount: split.amount,
            description: `${split.transaction.description} (Group: ${walletName})`,
            date: new Date(),
            type: 'EXPENSE',
            userId: split.userId,
            walletId: userWallet.id,
            categoryId: split.transaction.categoryId,
          }
        })
        
        // Update user wallet balance
        await prisma.wallet.update({
          where: { id: userWallet.id },
          data: {
            balance: {
              decrement: split.amount
            }
          }
        })
      }
    }

    return NextResponse.json(updatedSplit)
  } catch (error) {
    console.error('Error updating split status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 