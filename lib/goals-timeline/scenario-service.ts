import prisma from '@/lib/prisma'
import {
  Scenario,
  ScenarioParams,
  ScenarioProjection,
  ScenarioComparison,
  GoalAdjustment,
} from '@/app/types/goals-timeline'
import { calculateProjectedDate } from './projection-service'
import { getSavingRateHistory, analyzeSavingRate } from './saving-rate-service'

/**
 * ScenarioService - Handles scenario planning for financial goals
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

const MAX_SCENARIOS = 10

/**
 * Goal interface for scenario calculations
 */
export interface GoalForScenario {
  id: string
  name: string
  target: number
  current: number
  deadline?: Date | null
}

/**
 * Calculate scenario impact on goal projections
 * Property 12: Scenario Impact Calculation
 * For any scenario with adjusted monthly savings, new projected dates
 * SHALL be recalculated using the adjusted values.
 * Validates: Requirements 4.3, 4.5
 */
export function calculateScenarioImpact(
  goals: GoalForScenario[],
  baseMonthlySavings: number,
  monthlySavingsAdjustment: number,
  goalAdjustments: GoalAdjustment[] = [],
  fromDate: Date = new Date()
): ScenarioProjection[] {
  const projections: ScenarioProjection[] = []
  const adjustedMonthlySavings = baseMonthlySavings + monthlySavingsAdjustment

  for (const goal of goals) {
    // Find any goal-specific adjustments
    const adjustment = goalAdjustments.find(a => a.goalId === goal.id)
    
    // Apply goal adjustments if any
    const targetAmount = adjustment?.newTargetAmount ?? goal.target
    const targetDate = adjustment?.newTargetDate ?? goal.deadline

    // Calculate original projected date with base savings
    const originalDate = calculateProjectedDate(
      goal.current,
      goal.target,
      baseMonthlySavings,
      fromDate
    )

    // Calculate new projected date with adjusted savings and target
    const newDate = calculateProjectedDate(
      goal.current,
      targetAmount,
      adjustedMonthlySavings,
      fromDate
    )

    // Calculate impact in months
    let impactMonths = 0
    if (originalDate && newDate) {
      const diffMs = originalDate.getTime() - newDate.getTime()
      impactMonths = diffMs / (1000 * 60 * 60 * 24 * 30) // Approximate months
    } else if (originalDate && !newDate) {
      // New scenario makes goal unachievable
      impactMonths = -Infinity
    } else if (!originalDate && newDate) {
      // New scenario makes goal achievable
      impactMonths = Infinity
    }

    projections.push({
      goalId: goal.id,
      originalDate: originalDate || new Date(9999, 11, 31),
      newDate: newDate || new Date(9999, 11, 31),
      impactMonths: Number.isFinite(impactMonths) ? Math.round(impactMonths * 10) / 10 : impactMonths,
    })
  }

  return projections
}

/**
 * Compare multiple scenarios and determine the best one
 * Requirements: 4.4
 */
export function compareScenarios(scenarios: Scenario[]): ScenarioComparison {
  if (scenarios.length === 0) {
    return {
      scenarios: [],
      bestScenario: '',
      summary: 'No scenarios to compare',
    }
  }

  if (scenarios.length === 1) {
    return {
      scenarios,
      bestScenario: scenarios[0].id,
      summary: `Only one scenario: ${scenarios[0].name}`,
    }
  }

  // Calculate total impact for each scenario (positive = months saved)
  const scenarioScores = scenarios.map(scenario => {
    const totalImpact = scenario.projections.reduce((sum, proj) => {
      if (Number.isFinite(proj.impactMonths)) {
        return sum + proj.impactMonths
      }
      return sum
    }, 0)
    return { scenario, totalImpact }
  })

  // Sort by total impact (higher is better - more months saved)
  scenarioScores.sort((a, b) => b.totalImpact - a.totalImpact)

  const best = scenarioScores[0]
  const bestScenario = best.scenario.id

  // Generate summary
  const summaryParts: string[] = []
  for (const { scenario, totalImpact } of scenarioScores) {
    if (totalImpact > 0) {
      summaryParts.push(`${scenario.name}: saves ${totalImpact.toFixed(1)} months`)
    } else if (totalImpact < 0) {
      summaryParts.push(`${scenario.name}: adds ${Math.abs(totalImpact).toFixed(1)} months`)
    } else {
      summaryParts.push(`${scenario.name}: no change`)
    }
  }

  return {
    scenarios,
    bestScenario,
    summary: summaryParts.join('; '),
  }
}


/**
 * Create a new scenario for a user
 * Requirements: 4.1, 4.2
 */
export async function createScenario(
  userId: string,
  params: ScenarioParams
): Promise<Scenario> {
  // Check scenario limit
  const existingCount = await (prisma as any).timelineScenario.count({
    where: { userId },
  })

  if (existingCount >= MAX_SCENARIOS) {
    throw new Error(`Maximum of ${MAX_SCENARIOS} scenarios allowed`)
  }

  // Get user's goals
  const goals = await prisma.goal.findMany({
    where: {
      userId,
      status: { not: 'COMPLETED' },
      isArchived: false,
    },
    select: {
      id: true,
      name: true,
      target: true,
      current: true,
      deadline: true,
    },
  })

  // Get saving rate to calculate base monthly savings
  const savingRateHistory = await getSavingRateHistory(userId, 3)
  const savingRateAnalysis = analyzeSavingRate(savingRateHistory)
  
  // Calculate average monthly income
  const totalIncome = savingRateHistory.reduce((sum, h) => sum + h.income, 0)
  const averageMonthlyIncome = savingRateHistory.length > 0 
    ? totalIncome / savingRateHistory.length 
    : 0
  
  // Calculate base monthly savings
  const baseMonthlySavings = (savingRateAnalysis.average3Month / 100) * averageMonthlyIncome

  // Calculate projections for this scenario
  const goalsForScenario: GoalForScenario[] = goals.map(g => ({
    id: g.id,
    name: g.name,
    target: g.target,
    current: g.current,
    deadline: g.deadline,
  }))

  const projections = calculateScenarioImpact(
    goalsForScenario,
    baseMonthlySavings,
    params.monthlySavingsAdjustment,
    params.goalAdjustments || []
  )

  // Store scenario in database
  const scenario = await (prisma as any).timelineScenario.create({
    data: {
      userId,
      name: params.name,
      description: params.description || null,
      assumptions: {
        monthlySavingsAdjustment: params.monthlySavingsAdjustment,
        goalAdjustments: params.goalAdjustments || [],
        baseMonthlySavings,
      },
      projections: projections.map(p => ({
        goalId: p.goalId,
        originalDate: p.originalDate.toISOString(),
        newDate: p.newDate.toISOString(),
        impactMonths: p.impactMonths,
      })),
      isActive: false,
    },
  })

  return {
    id: scenario.id,
    name: scenario.name,
    description: scenario.description || undefined,
    monthlySavingsAdjustment: params.monthlySavingsAdjustment,
    goalAdjustments: params.goalAdjustments || [],
    projections,
  }
}

/**
 * Get all scenarios for a user
 * Requirements: 4.4
 */
export async function getScenarios(userId: string): Promise<Scenario[]> {
  const scenarios = await (prisma as any).timelineScenario.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  return scenarios.map((s: any) => ({
    id: s.id,
    name: s.name,
    description: s.description || undefined,
    monthlySavingsAdjustment: s.assumptions?.monthlySavingsAdjustment || 0,
    goalAdjustments: s.assumptions?.goalAdjustments || [],
    projections: (s.projections || []).map((p: any) => ({
      goalId: p.goalId,
      originalDate: new Date(p.originalDate),
      newDate: new Date(p.newDate),
      impactMonths: p.impactMonths,
    })),
  }))
}

/**
 * Delete a scenario
 */
export async function deleteScenario(scenarioId: string): Promise<void> {
  await (prisma as any).timelineScenario.delete({
    where: { id: scenarioId },
  })
}

/**
 * Get a single scenario by ID
 */
export async function getScenarioById(scenarioId: string): Promise<Scenario | null> {
  const scenario = await (prisma as any).timelineScenario.findUnique({
    where: { id: scenarioId },
  })

  if (!scenario) {
    return null
  }

  return {
    id: scenario.id,
    name: scenario.name,
    description: scenario.description || undefined,
    monthlySavingsAdjustment: scenario.assumptions?.monthlySavingsAdjustment || 0,
    goalAdjustments: scenario.assumptions?.goalAdjustments || [],
    projections: (scenario.projections || []).map((p: any) => ({
      goalId: p.goalId,
      originalDate: new Date(p.originalDate),
      newDate: new Date(p.newDate),
      impactMonths: p.impactMonths,
    })),
  }
}
