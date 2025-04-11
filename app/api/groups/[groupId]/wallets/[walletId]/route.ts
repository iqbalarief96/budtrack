import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'

// GET /api/groups/[groupId]/wallets/[walletId]
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

    // Check if user is member of the group
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

    // Get wallet details
    const wallet = await prisma.groupWallet.findUnique({
      where: {
        id: params.walletId,
        groupId: params.groupId,
      },
      include: {
        transactions: {
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
        },
      },
    })

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(wallet)
  } catch (error) {
    console.error('Error fetching wallet details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/groups/[groupId]/wallets/[walletId]
export async function PUT(
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

    // Check if user is admin or owner
    const membership = await prisma.userGroup.findFirst({
      where: {
        userId: session.user.id,
        groupId: params.groupId,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'You do not have permission to update this wallet' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, currencyCode, color, icon } = body

    const updatedWallet = await prisma.groupWallet.update({
      where: {
        id: params.walletId,
        groupId: params.groupId,
      },
      data: {
        name,
        currencyCode,
        color,
        icon,
      },
    })

    return NextResponse.json(updatedWallet)
  } catch (error) {
    console.error('Error updating wallet:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/groups/[groupId]/wallets/[walletId]
export async function DELETE(
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

    // Check if user is admin or owner
    const membership = await prisma.userGroup.findFirst({
      where: {
        userId: session.user.id,
        groupId: params.groupId,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this wallet' },
        { status: 403 }
      )
    }

    await prisma.groupWallet.delete({
      where: {
        id: params.walletId,
        groupId: params.groupId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting wallet:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 