import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { setGoalPriority, getGoalsByPriority } from '@/lib/goals-timeline/timeline-service'

/**
 * GET /api/goals/priorities
 * Returns all goals with their priorities
 * Requirements: 3.1, 3.2
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get goals sorted by priority
    const goals = await getGoalsByPriority(userId)

    // Return simplified priority list
    const priorities = goals.map((g) => ({
      goalId: g.goal.id,
      goalName: g.goal.name,
      priority: g.priority,
      target: g.goal.target,
      current: g.goal.current,
      projectedDate: g.projection.projectedDate,
      isOnTrack: g.projection.isOnTrack,
    }))

    return NextResponse.json({ priorities })
  } catch (error) {
    console.error('Error fetching goal priorities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch goal priorities' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/goals/priorities
 * Updates goal priorities
 * Requirements: 3.1, 3.2
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const data = await request.json()

    // Validate request body
    if (!data.priorities || !Array.isArray(data.priorities)) {
      return NextResponse.json(
        { error: 'priorities array is required' },
        { status: 400 }
      )
    }

    // Validate each priority entry
    for (const entry of data.priorities) {
      if (!entry.goalId || typeof entry.priority !== 'number') {
        return NextResponse.json(
          { error: 'Each priority entry must have goalId and priority' },
          { status: 400 }
        )
      }

      if (entry.priority < 1) {
        return NextResponse.json(
          { error: 'Priority must be a positive integer (1 = highest)' },
          { status: 400 }
        )
      }

      // Verify goal belongs to user
      const goal = await prisma.goal.findFirst({
        where: {
          id: entry.goalId,
          userId,
        },
      })

      if (!goal) {
        return NextResponse.json(
          { error: `Goal ${entry.goalId} not found` },
          { status: 404 }
        )
      }
    }

    // Update priorities
    for (const entry of data.priorities) {
      await setGoalPriority(userId, entry.goalId, entry.priority)
    }

    // Return updated priorities
    const goals = await getGoalsByPriority(userId)
    const priorities = goals.map((g) => ({
      goalId: g.goal.id,
      goalName: g.goal.name,
      priority: g.priority,
    }))

    return NextResponse.json({
      success: true,
      message: 'Priorities updated successfully',
      priorities,
    })
  } catch (error) {
    console.error('Error updating goal priorities:', error)
    return NextResponse.json(
      { error: 'Failed to update goal priorities' },
      { status: 500 }
    )
  }
}
