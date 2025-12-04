import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createScenario, getScenarios, compareScenarios } from '@/lib/goals-timeline/scenario-service'
import { ScenarioParams, ScenarioResponse } from '@/app/types/goals-timeline'

/**
 * GET /api/goals/scenarios
 * Returns all scenarios for the user with optional comparison
 * Requirements: 4.1, 4.4
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get compare parameter
    const { searchParams } = new URL(request.url)
    const shouldCompare = searchParams.get('compare') === 'true'

    // Get all scenarios
    const scenarios = await getScenarios(userId)

    const response: ScenarioResponse = {
      scenarios,
    }

    // Add comparison if requested and there are multiple scenarios
    if (shouldCompare && scenarios.length > 1) {
      response.comparison = compareScenarios(scenarios)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching scenarios:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scenarios' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/goals/scenarios
 * Creates a new scenario
 * Requirements: 4.1, 4.2, 4.3
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const data = await request.json()

    // Validate required fields
    if (!data.name) {
      return NextResponse.json(
        { error: 'Scenario name is required' },
        { status: 400 }
      )
    }

    if (typeof data.monthlySavingsAdjustment !== 'number') {
      return NextResponse.json(
        { error: 'monthlySavingsAdjustment must be a number' },
        { status: 400 }
      )
    }

    // Validate goal adjustments if provided
    if (data.goalAdjustments && !Array.isArray(data.goalAdjustments)) {
      return NextResponse.json(
        { error: 'goalAdjustments must be an array' },
        { status: 400 }
      )
    }

    const params: ScenarioParams = {
      name: data.name,
      description: data.description,
      monthlySavingsAdjustment: data.monthlySavingsAdjustment,
      goalAdjustments: data.goalAdjustments || [],
    }

    const scenario = await createScenario(userId, params)

    return NextResponse.json({
      success: true,
      message: 'Scenario created successfully',
      scenario,
    })
  } catch (error) {
    console.error('Error creating scenario:', error)
    
    // Handle specific errors
    if (error instanceof Error && error.message.includes('Maximum')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create scenario' },
      { status: 500 }
    )
  }
}
