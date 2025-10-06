import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

// Feature flag to control whether group budgeting is enabled
const GROUP_FEATURE_ENABLED = true;

// Validation schema for joining a group
const joinGroupSchema = z.object({
  inviteCode: z.string().min(1, 'Invite code is required'),
})

// POST /api/groups/join - Join a group with an invite code
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!GROUP_FEATURE_ENABLED) {
      return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 })
    }
    
    const body = await request.json()
    
    // Validate input
    const validationResult = joinGroupSchema.safeParse(body)
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors.map((e: any) => `${e.path}: ${e.message}`).join(', ')
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }
    
    const { inviteCode } = validationResult.data
    
    // Find the invite by code
    const invite = await prisma.groupInvite.findUnique({
      where: { 
        code: inviteCode,
        isUsed: false
      }
    });
    
    if (!invite) {
      return NextResponse.json({ error: 'Invalid or expired invite code' }, { status: 404 })
    }
    
    // Check if invite is expired
    if (new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Invite code has expired' }, { status: 400 })
    }
    
    // Find the group
    const group = await prisma.group.findUnique({
      where: { id: invite.groupId }
    });
    
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }
    
    // Check if user is already a member of the group
    const existingMembership = await prisma.userGroup.findFirst({
      where: {
        groupId: group.id,
        userId: session.user.id
      }
    });
    
    if (existingMembership) {
      return NextResponse.json({ 
        error: 'You are already a member of this group',
        group
      }, { status: 409 }) // 409 Conflict
    }
    
    // Use transaction to create membership and update invite
    const result = await prisma.$transaction(async (tx) => {
      // Create membership
      const membership = await tx.userGroup.create({
        data: {
          userId: session.user.id,
          groupId: group.id,
          role: 'MEMBER'
        }
      });
      
      // Update invite
      await tx.groupInvite.update({
        where: { id: invite.id },
        data: {
          isUsed: true,
          usedAt: new Date(),
          usedById: session.user.id
        }
      });
      
      return { membership, group };
    });
    
    // Return success response
    const response = {
      success: true,
      message: `You have joined "${group.name}"`,
      group,
      membership: result.membership
    }
    
    return NextResponse.json(response, { status: 200 })
    
  } catch (error) {
    console.error('Error joining group:', error)
    return NextResponse.json({ error: 'Failed to join group' }, { status: 500 })
  }
} 