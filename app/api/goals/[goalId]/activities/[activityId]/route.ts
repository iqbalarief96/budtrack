import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// DELETE /api/goals/[goalId]/activities/[activityId]
export async function DELETE(
  req: Request,
  { params }: { params: { goalId: string, activityId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { goalId, activityId } = params
    
    console.log('Deleting activity with ID:', {
      goalId,
      activityId
    })
    
    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 })
    }
    
    // Check if goal exists and belongs to user
    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId: session.user.id,
      },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Get the activity to be deleted
    const activity = await prisma.goalActivity.findUnique({
      where: {
        id: activityId,
      },
    })

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    // Verify that activity belongs to this goal
    if (activity.goalId !== goalId) {
      return NextResponse.json(
        { error: 'Activity does not belong to this goal' },
        { status: 403 }
      )
    }

    console.log('Found activity to delete:', {
      activityId: activity.id,
      amount: activity.amount,
      description: activity.description
    })

    // Delete the activity
    await prisma.goalActivity.delete({
      where: {
        id: activityId,
      },
    })

    // Update goal progress by subtracting the deleted activity amount
    await prisma.goal.update({
      where: {
        id: goalId,
      },
      data: {
        current: {
          decrement: activity.amount,
        },
        updatedAt: new Date(),
      },
    })

    console.log('Activity deleted successfully, goal progress updated')

    return NextResponse.json({ 
      message: 'Activity deleted successfully',
      activityId,
      amount: activity.amount
    })
  } catch (error) {
    console.error('Error deleting goal activity:', error)
    return NextResponse.json(
      { error: 'Failed to delete goal activity' },
      { status: 500 }
    )
  }
} 