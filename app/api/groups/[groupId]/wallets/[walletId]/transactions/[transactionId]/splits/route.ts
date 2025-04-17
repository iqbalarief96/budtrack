import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
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

    // Get user's default wallet
    const userWallet = await prisma.wallet.findFirst({
      where: { 
        userId: split.userId,
        isDefault: true
      }
    })
    
    if (userWallet) {
      const walletName = split.transaction.groupWallet.name || 'Group Wallet'
      const transactionDescription = `${split.transaction.description} (Group: ${walletName})`
      
      // If being marked as paid, add a personal transaction record (if it doesn't exist yet)
      if (isPaid && !split.isPaid) {
        // Cek apakah transaksi sudah ada untuk mencegah duplikasi
        const existingTransaction = await prisma.transaction.findFirst({
          where: {
            userId: split.userId,
            description: transactionDescription,
            walletId: userWallet.id,
            type: 'EXPENSE'
          }
        })
        
        // Hanya buat transaksi baru jika belum ada
        if (!existingTransaction) {
          // Create personal expense transaction
          await prisma.transaction.create({
            data: {
              amount: split.amount,
              description: transactionDescription,
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
      // If being marked as unpaid, remove the personal transaction record
      else if (!isPaid && split.isPaid) {
        // Cari transaksi yang perlu dihapus
        const existingTransaction = await prisma.transaction.findFirst({
          where: {
            userId: split.userId,
            description: transactionDescription,
            walletId: userWallet.id,
            type: 'EXPENSE'
          }
        })
        
        // Hapus transaksi jika ada
        if (existingTransaction) {
          // Kembalikan balance wallet user
          await prisma.wallet.update({
            where: { id: userWallet.id },
            data: {
              balance: {
                increment: split.amount
              }
            }
          })
          
          // Hapus transaksi
          await prisma.transaction.delete({
            where: { id: existingTransaction.id }
          })
        }
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