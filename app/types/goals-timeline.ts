// Financial Goals Timeline Types
// Requirements: 1.1, 2.1, 4.1

// ============ Saving Rate Types ============

export interface SavingRateData {
  month: Date
  income: number
  expenses: number
  savings: number
  savingRate: number // percentage
}

export type TrendDirection = 'improving' | 'declining' | 'stable'

export interface TrendResult {
  direction: TrendDirection
  percentage: number
}

export interface SavingRateAnalysis {
  current: number
  average3Month: number
  average6Month: number
  average12Month: number
  trend: TrendDirection
  trendPercentage: number
  consistency: number // 0-1 score
}

// ============ Projection Types ============

export type ConfidenceLevel = 'low' | 'medium' | 'high'

export interface GoalProjection {
  goalId: string
  projectedDate: Date
  confidenceLevel: ConfidenceLevel
  requiredSavingRate: number
  currentProgress: number
  monthsRemaining: number
  isOnTrack: boolean
}

export interface ProjectionAssumptions {
  monthlySavings: number
  savingRateConsistency: number
  calculatedAt: Date
}

// ============ Timeline Types ============

export interface Milestone {
  percentage: number // 25, 50, 75, 100
  targetDate: Date
  achievedDate?: Date
  isAchieved: boolean
}

export interface TimelineGoal {
  goal: {
    id: string
    name: string
    target: number
    current: number
    deadline?: Date
    status: string
  }
  projection: GoalProjection
  priority: number
  milestones: Milestone[]
}

export interface Adjustment {
  type: 'increase_savings' | 'extend_deadline' | 'reduce_target'
  description: string
  impact: string
  newProjectedDate?: Date
}

// ============ Scenario Types ============

export interface GoalAdjustment {
  goalId: string
  newTargetAmount?: number
  newTargetDate?: Date
}

export interface ScenarioParams {
  name: string
  description?: string
  monthlySavingsAdjustment: number
  goalAdjustments?: GoalAdjustment[]
}

export interface ScenarioProjection {
  goalId: string
  originalDate: Date
  newDate: Date
  impactMonths: number
}

export interface Scenario {
  id: string
  name: string
  description?: string
  monthlySavingsAdjustment: number
  goalAdjustments: GoalAdjustment[]
  projections: ScenarioProjection[]
}

export interface ScenarioComparison {
  scenarios: Scenario[]
  bestScenario: string
  summary: string
}

// ============ Recommendation Types ============

export type RecommendationType = 
  | 'increase_savings' 
  | 'reorder_goals' 
  | 'adjust_target' 
  | 'reduce_spending'

export interface RecommendationImpact {
  affectedGoals: string[]
  timelineSavings: number // months saved
  additionalSavingsNeeded?: number
}

export interface Recommendation {
  type: RecommendationType
  title: string
  description: string
  impact: RecommendationImpact
  category?: string
}

export interface CategoryReduction {
  categoryId: string
  categoryName: string
  currentSpending: number
  suggestedReduction: number
  potentialSavings: number
}

// ============ API Response Types ============

export interface TimelineResponse {
  goals: TimelineGoal[]
  savingRate: SavingRateAnalysis
  recommendations: Recommendation[]
}

export interface ProjectionResponse {
  projections: GoalProjection[]
  lastCalculated: Date
}

export interface SavingRateResponse {
  analysis: SavingRateAnalysis
  history: SavingRateData[]
  requiredRates: { goalId: string; requiredRate: number; gap: number }[]
}

export interface ScenarioResponse {
  scenarios: Scenario[]
  comparison?: ScenarioComparison
}
