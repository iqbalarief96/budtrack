import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'

// GET /api/groups/[groupId]/wallets/[walletId]/transactions
export async function GET(
  request: Request,
  { params }: { params: { groupId: string; walletId: string } }
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

    // Get transactions for this wallet
    const transactions = await prisma.groupTransaction.findMany({
      where: {
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
      orderBy: {
        date: 'desc',
      },
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/groups/[groupId]/wallets/[walletId]/transactions
export async function POST(
  request: Request,
  { params }: { params: { groupId: string; walletId: string } }
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

    // Get the wallet to make sure it exists
    const wallet = await prisma.groupWallet.findUnique({
      where: {
        id: params.walletId,
        groupId: params.groupId,
      },
    })

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { amount, type, description, date, categoryId, splits } = body

    // Create transaction in DB
    const transaction = await prisma.groupTransaction.create({
      data: {
        groupWalletId: params.walletId,
        amount: parseFloat(amount),
        type,
        date: new Date(date),
        description,
        categoryId: categoryId || null,
        createdById: session.user.id,
        // Create splits if provided
        splits: splits && splits.length > 0
          ? {
              create: splits.map((split: any) => ({
                userId: split.userId,
                amount: parseFloat(split.amount),
                isPaid: split.isPaid || false,
              })),
            }
          : undefined,
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

    // Update wallet balance
    await prisma.groupWallet.update({
      where: {
        id: params.walletId,
      },
      data: {
        balance: {
          [type === 'INCOME' ? 'increment' : 'decrement']: parseFloat(amount),
        },
      },
    })

    // For each PAID split, create a personal transaction record in the user's account
    if (splits && splits.length > 0) {
      const groupWallet = await prisma.groupWallet.findUnique({
        where: { id: params.walletId },
        select: { name: true }
      });

      // Find default wallet for each user who paid
      const paidSplits = splits.filter((split: any) => split.isPaid);
      
      for (const split of paidSplits) {
        // Get user's default wallet
        const userWallet = await prisma.wallet.findFirst({
          where: { 
            userId: split.userId,
            isDefault: true
          }
        });
        
        if (userWallet) {
          // Create personal expense transaction
          await prisma.transaction.create({
            data: {
              amount: parseFloat(split.amount),
              description: `${description} (Group: ${groupWallet?.name || 'Group Expense'})`,
              date: new Date(date),
              type: 'EXPENSE',
              userId: split.userId,
              walletId: userWallet.id,
              categoryId: categoryId || null,
            }
          });
          
          // Update user wallet balance
          await prisma.wallet.update({
            where: { id: userWallet.id },
            data: {
              balance: {
                decrement: parseFloat(split.amount)
              }
            }
          });
        }
      }
    }

    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 