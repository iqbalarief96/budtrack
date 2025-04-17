import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { randomBytes } from 'crypto'
import { z } from 'zod'

// Feature flag to control whether group budgeting is enabled
const GROUP_FEATURE_ENABLED = true;

// Validation schema for creating an invite
const createInviteSchema = z.object({
  email: z.string().email('Email harus valid').optional(),
  expiresInDays: z.number().min(1).max(90).default(30), // 1 to 90 days
})

// GET /api/groups/[groupId]/invites - Get all invites for a group
export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { groupId } = params
    
    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 })
    }
    
    if (GROUP_FEATURE_ENABLED) {
      // Check if user is a member of the group
      const membership = await prisma.userGroup.findFirst({
        where: {
          groupId,
          userId: session.user.id
        }
      });
      
      const group = await prisma.group.findUnique({
        where: { id: groupId }
      });
      
      if (!group) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 })
      }
      
      const isMember = group.ownerId === session.user.id || membership !== null;
      
      if (!isMember) {
        return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 })
      }
      
      // Get all invites for the group
      const invites = await prisma.groupInvite.findMany({
        where: { groupId }
      });
      
      return NextResponse.json(invites)
    } else {
      return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 })
    }
    
  } catch (error) {
    console.error('Error getting invites:', error)
    return NextResponse.json({ error: 'Failed to get invites' }, { status: 500 })
  }
}

// POST /api/groups/[groupId]/invites - Create a new invite for a group
export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { groupId } = params
    
    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 })
    }
    
    if (!GROUP_FEATURE_ENABLED) {
      return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 })
    }
    
    // Check if user is an admin or owner of the group
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    });
    
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }
    
    const userMembership = await prisma.userGroup.findFirst({
      where: {
        groupId,
        userId: session.user.id
      }
    });
    
    const isOwnerOrAdmin = group.ownerId === session.user.id || 
                         (userMembership && ['OWNER', 'ADMIN'].includes(userMembership.role));
    
    if (!isOwnerOrAdmin) {
      return NextResponse.json({ 
        error: 'Only group owners and admins can create invites' 
      }, { status: 403 })
    }
    
    const body = await request.json()
    
    // Validate input
    const validationResult = createInviteSchema.safeParse(body)
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors.map((e: any) => `${e.path}: ${e.message}`).join(', ')
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }
    
    const { email, expiresInDays } = validationResult.data
    
    // Create a new invite
    const inviteCode = randomBytes(5).toString('hex');
    
    const newInvite = await prisma.groupInvite.create({
      data: {
        groupId,
        email: email || null,
        code: inviteCode,
        expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
        createdBy: session.user.id
      }
    });
    
    return NextResponse.json(newInvite, { status: 201 })
    
  } catch (error) {
    console.error('Error creating invite:', error)
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
  }
} 