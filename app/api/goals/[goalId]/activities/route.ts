import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

// Schema for activity creation
const createActivitySchema = z.object({
  amount: z.number(),
  description: z.string().optional(),
  date: z.string().refine(
    (date) => !isNaN(Date.parse(date)),
    { message: 'Invalid date format' }
  ),
})

// GET /api/goals/[goalId]/activities
export async function GET(
  req: Request,
  { params }: { params: { goalId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const goalId = params.goalId
    
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

    // Get all activities for the goal
    const activities = await prisma.goalActivity.findMany({
      where: {
        goalId,
      },
      orderBy: {
        date: 'desc',
      },
    })

    return NextResponse.json({ activities })
  } catch (error) {
    console.error('Error fetching goal activities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch goal activities' },
      { status: 500 }
    )
  }
}

// POST /api/goals/[goalId]/activities
export async function POST(
  req: Request,
  { params }: { params: { goalId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const goalId = params.goalId
    
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

    // Validate request body
    const body = await req.json()
    const result = createActivitySchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.format() },
        { status: 400 }
      )
    }
    
    const { amount, description, date } = result.data

    // Create new activity
    const activity = await prisma.goalActivity.create({
      data: {
        goalId,
        amount,
        description,
        date: new Date(date),
      },
    })

    // Update goal progress
    await prisma.goal.update({
      where: {
        id: goalId,
      },
      data: {
        current: {
          increment: amount,
        },
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ 
      activity,
      message: 'Activity added successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating goal activity:', error)
    return NextResponse.json(
      { error: 'Failed to create goal activity' },
      { status: 500 }
    )
  }
} 