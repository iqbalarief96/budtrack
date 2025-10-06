import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
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
      membershipId: member.id, // Include the membership ID for updates
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

// PUT /api/groups/[groupId]/members
// Update member role
export async function PUT(
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

    // Check if user is admin or owner
    const requesterMembership = await prisma.userGroup.findFirst({
      where: {
        userId: session.user.id,
        groupId: params.groupId,
        role: { in: ['ADMIN', 'OWNER'] },
      },
    })

    if (!requesterMembership) {
      return NextResponse.json(
        { error: 'Only admins and owners can update member roles' },
        { status: 403 }
      )
    }

    // Get request body
    const { memberId, role } = await request.json()

    if (!memberId || !role) {
      return NextResponse.json(
        { error: 'Member ID and role are required' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['MEMBER', 'ADMIN'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Role must be either MEMBER or ADMIN' },
        { status: 400 }
      )
    }

    // Check if the target member exists
    const targetMembership = await prisma.userGroup.findFirst({
      where: {
        userId: memberId,
        groupId: params.groupId,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!targetMembership) {
      return NextResponse.json(
        { error: 'Member not found in this group' },
        { status: 404 }
      )
    }

    // Prevent changing owner's role
    if (targetMembership.role === 'OWNER') {
      return NextResponse.json(
        { error: 'Cannot change the role of the group owner' },
        { status: 403 }
      )
    }

    // If user is admin, they can't change other admins
    if (requesterMembership.role === 'ADMIN' && targetMembership.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Admins cannot change the role of other admins' },
        { status: 403 }
      )
    }

    // Update the member's role
    const updatedMembership = await prisma.userGroup.update({
      where: {
        id: targetMembership.id,
      },
      data: {
        role,
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
    })

    return NextResponse.json({
      id: updatedMembership.userId,
      name: updatedMembership.user.name,
      email: updatedMembership.user.email,
      image: updatedMembership.user.image,
      role: updatedMembership.role,
      membershipId: updatedMembership.id,
    })
  } catch (error) {
    console.error('Error updating member role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/groups/[groupId]/members
// Remove a member from the group
export async function DELETE(
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

    // Check if user is admin or owner
    const requesterMembership = await prisma.userGroup.findFirst({
      where: {
        userId: session.user.id,
        groupId: params.groupId,
        role: { in: ['ADMIN', 'OWNER'] },
      },
    })

    if (!requesterMembership) {
      return NextResponse.json(
        { error: 'Only admins and owners can remove members' },
        { status: 403 }
      )
    }

    // Get member ID from URL
    const url = new URL(request.url)
    const memberId = url.searchParams.get('memberId')

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      )
    }

    // Check if the target member exists
    const targetMembership = await prisma.userGroup.findFirst({
      where: {
        userId: memberId,
        groupId: params.groupId,
      },
    })

    if (!targetMembership) {
      return NextResponse.json(
        { error: 'Member not found in this group' },
        { status: 404 }
      )
    }

    // Prevent removing the owner
    if (targetMembership.role === 'OWNER') {
      return NextResponse.json(
        { error: 'Cannot remove the group owner' },
        { status: 403 }
      )
    }

    // If user is admin, they can't remove other admins
    if (requesterMembership.role === 'ADMIN' && targetMembership.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Admins cannot remove other admins' },
        { status: 403 }
      )
    }

    // Delete the membership
    await prisma.userGroup.delete({
      where: {
        id: targetMembership.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing member:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 