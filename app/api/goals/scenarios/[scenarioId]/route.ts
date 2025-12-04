import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { deleteScenario, getScenarioById } from '@/lib/goals-timeline/scenario-service'
import prisma from '@/lib/prisma'

/**
 * GET /api/goals/scenarios/[scenarioId]
 * Returns a single scenario by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { scenarioId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { scenarioId } = params

    // Get scenario
    const scenario = await getScenarioById(scenarioId)

    if (!scenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    const dbScenario = await (prisma as any).timelineScenario.findUnique({
      where: { id: scenarioId },
      select: { userId: true },
    })

    if (!dbScenario || dbScenario.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ scenario })
  } catch (error) {
    console.error('Error fetching scenario:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scenario' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/goals/scenarios/[scenarioId]
 * Deletes a scenario
 * Requirements: 4.1
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { scenarioId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { scenarioId } = params

    // Verify scenario exists and belongs to user
    const scenario = await (prisma as any).timelineScenario.findUnique({
      where: { id: scenarioId },
      select: { userId: true },
    })

    if (!scenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      )
    }

    if (scenario.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Delete scenario
    await deleteScenario(scenarioId)

    return NextResponse.json({
      success: true,
      message: 'Scenario deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting scenario:', error)
    return NextResponse.json(
      { error: 'Failed to delete scenario' },
      { status: 500 }
    )
  }
}
