import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'

// GET /api/groups/[groupId]/members
export async function GET(
  request: Request,
  { params }: { params: { groupId: string } }
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

    // Get all members of the group
    const members = await prisma.userGroup.findMany({
      where: {
        groupId: params.groupId,
      },
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
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    })

    // Convert to a simpler format
    const simplifiedMembers = members.map(member => ({
      id: member.userId,
      name: member.user.name,
      email: member.user.email,
      image: member.user.image,
      role: member.role,
    }))

    return NextResponse.json(simplifiedMembers)
  } catch (error) {
    console.error('Error fetching group members:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 