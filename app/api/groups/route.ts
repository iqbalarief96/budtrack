import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { randomBytes } from 'crypto'

// Feature flag to control whether group budgeting is enabled
const GROUP_FEATURE_ENABLED = true;

// Validation schema for creating a group
const createGroupSchema = z.object({
  name: z.string().min(1, 'Nama grup harus diisi').max(100),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
})

// GET /api/groups - Get all groups for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get URL search params
    const { searchParams } = new URL(request.url)
    const includeMembers = searchParams.get('includeMembers') === 'true'
    
    if (GROUP_FEATURE_ENABLED) {
      // Query database for groups where user is owner or member
      const userGroups = await prisma.group.findMany({
        where: {
          OR: [
            { ownerId: session.user.id },
            { members: { some: { userId: session.user.id } } }
          ]
        },
        include: {
          members: includeMembers ? {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true
                }
              }
            }
          } : false,
          _count: {
            select: {
              members: true,
              wallets: true
            }
          }
        }
      });
      
      return NextResponse.json(userGroups)
    } else {
      return NextResponse.json([]) // Empty array when feature is disabled
    }
    
  } catch (error) {
    console.error('Error getting groups:', error)
    return NextResponse.json({ error: 'Failed to get groups' }, { status: 500 })
  }
}

// POST /api/groups - Create a new group
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!GROUP_FEATURE_ENABLED) {
      return NextResponse.json({ error: 'Fitur ini belum tersedia' }, { status: 403 })
    }
    
    const body = await request.json()
    
    // Validate input
    const validationResult = createGroupSchema.safeParse(body)
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors.map((e: any) => `${e.path}: ${e.message}`).join(', ')
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }
    
    const { name, description, icon, color } = validationResult.data
    
    // Check if the user exists first to prevent foreign key constraint violation
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id }
    });
    
    if (!userExists) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }
    
    // Use Prisma transaction to create group, membership, wallet and invite
    const result = await prisma.$transaction(async (tx) => {
      // Generate a unique invite code
      const inviteCode = generateInviteCode();
      
      // Create the group first
      const group = await tx.group.create({
        data: {
          name,
          description: description || null,
          icon: icon || null,
          color: color || '#6366f1',
          ownerId: session.user.id,
        }
      });
      
      // Then create related models separately to avoid potential issues
      const membership = await tx.userGroup.create({
        data: {
          userId: session.user.id,
          groupId: group.id,
          role: 'OWNER'
        }
      });
      
      const wallet = await tx.groupWallet.create({
        data: {
          groupId: group.id,
          name: 'Dompet Utama',
          balance: 0,
          currencyCode: 'IDR',
          color: '#6366f1'
        }
      });
      
      const invite = await tx.groupInvite.create({
        data: {
          groupId: group.id,
          code: inviteCode,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          createdBy: session.user.id
        }
      });
      
      // Return complete group with relations
      return await tx.group.findUnique({
        where: { id: group.id },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true
                }
              }
            }
          },
          wallets: true,
          invites: true
        }
      });
    });
    
    return NextResponse.json(result, { status: 201 })
    
  } catch (error) {
    console.error('Error creating group:', error)
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 })
  }
}

// Helper function to generate a unique invite code
function generateInviteCode(length = 10) {
  return randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
} 