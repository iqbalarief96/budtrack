import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

// Import feature flag
import { GROUP_FEATURE_ENABLED } from '../../route'

// Validation schema for creating a wallet
const createWalletSchema = z.object({
  name: z.string().min(1, 'Nama dompet harus diisi').max(50),
  currencyCode: z.string().default('IDR'),
  icon: z.string().optional(),
  color: z.string().optional(),
})

// GET /api/groups/[groupId]/wallets - Get all wallets for a group
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
      const group = await prisma.group.findUnique({
        where: { id: groupId }
      });
      
      if (!group) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 })
      }
      
      const membership = await prisma.userGroup.findFirst({
        where: {
          groupId,
          userId: session.user.id
        }
      });
      
      const isMember = group.ownerId === session.user.id || membership !== null;
      
      if (!isMember) {
        return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 })
      }
      
      // Get all wallets for the group
      const wallets = await prisma.groupWallet.findMany({
        where: { groupId }
      });
      
      return NextResponse.json(wallets)
    } else {
      return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 })
    }
    
  } catch (error) {
    console.error('Error getting group wallets:', error)
    return NextResponse.json({ error: 'Failed to get group wallets' }, { status: 500 })
  }
}

// POST /api/groups/[groupId]/wallets - Create a new wallet for a group
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
        error: 'Only group owners and admins can create wallets' 
      }, { status: 403 })
    }
    
    const body = await request.json()
    
    // Validate input
    const validationResult = createWalletSchema.safeParse(body)
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors.map((e: any) => `${e.path}: ${e.message}`).join(', ')
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }
    
    const { name, currencyCode, icon, color } = validationResult.data
    
    // Create a new wallet
    const newWallet = await prisma.groupWallet.create({
      data: {
        groupId,
        name, 
        balance: 0,
        currencyCode: currencyCode || 'IDR',
        icon: icon || null,
        color: color || '#6366f1'
      }
    });
    
    return NextResponse.json(newWallet, { status: 201 })
    
  } catch (error) {
    console.error('Error creating group wallet:', error)
    return NextResponse.json({ error: 'Failed to create group wallet' }, { status: 500 })
  }
} 