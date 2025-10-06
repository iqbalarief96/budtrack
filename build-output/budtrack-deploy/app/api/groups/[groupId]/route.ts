import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// PATCH - Update group
export async function PATCH(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const groupId = params.groupId
    
    // Check if group exists and user is the owner
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true }
    })
    
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }
    
    // Check if user is the owner of the group
    const userMember = group.members.find(member => 
      member.userId === session.user.id
    )
    
    if (!userMember || userMember.role !== 'OWNER') {
      return NextResponse.json({ error: 'You must be the owner to update this group' }, { status: 403 })
    }
    
    // Get update data from request
    const requestData = await request.json()
    
    // Update the group
    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: {
        name: requestData.name,
        // Add other fields that can be updated
      }
    })
    
    return NextResponse.json(updatedGroup)
  } catch (error) {
    console.error('Error updating group:', error)
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 })
  }
}

// DELETE - Delete group
export async function DELETE(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const groupId = params.groupId
    
    // Check if group exists and user is the owner
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true }
    })
    
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }
    
    // Check if user is the owner of the group
    const userMember = group.members.find(member => 
      member.userId === session.user.id
    )
    
    if (!userMember || userMember.role !== 'OWNER') {
      return NextResponse.json({ error: 'You must be the owner to delete this group' }, { status: 403 })
    }
    
    // Delete the group
    await prisma.group.delete({
      where: { id: groupId }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting group:', error)
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 })
  }
} 