// Net Worth Tracker Types
// Requirements: 1.1, 1.2, 2.1, 4.1

// ============ Core Calculation Types ============

export interface BreakdownItem {
  id: string
  name: string
  amount: number
}

export interface CategoryBreakdown {
  category: string
  amount: number
  percentage: number
  items: BreakdownItem[]
}

export interface NetWorthCalculation {
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  assetBreakdown: CategoryBreakdown[]
  liabilityBreakdown: CategoryBreakdown[]
  calculatedAt: Date
}

// ============ Snapshot Types ============

export interface NetWorthSnapshot {
  id: string
  userId: string
  date: Date
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  breakdown: {
    assets: CategoryBreakdown[]
    liabilities: CategoryBreakdown[]
  }
  createdAt: Date
}

export type TimePeriod = '3M' | '6M' | '1Y' | 'ALL'

export interface TimeFilter {
  period: TimePeriod
  startDate?: Date
  endDate?: Date
}

export type ChangeDirection = 'up' | 'down' | 'stable'

export interface PercentageChange {
  value: number
  direction: ChangeDirection
}

// ============ Goal Types ============

export interface NetWorthGoal {
  id: string
  userId: string
  targetAmount: number
  targetDate: Date
  isActive: boolean
  createdAt: Date
  updatedAt?: Date
}

export interface CreateGoalInput {
  targetAmount: number
  targetDate: Date
}

export interface UpdateGoalInput {
  targetAmount?: number
  targetDate?: Date
  isActive?: boolean
}

export interface GoalProgress {
  currentNetWorth: number
  targetAmount: number
  progressPercentage: number
  remainingAmount: number
  requiredMonthlyGrowth: number
  monthsRemaining: number
  isOnTrack: boolean
}

export type Milestone = 25 | 50 | 75 | 100

// ============ API Response Types ============

export interface NetWorthResponse {
  calculation: NetWorthCalculation
  change: PercentageChange | null
  previousNetWorth: number | null
}

export interface NetWorthHistoryResponse {
  snapshots: NetWorthSnapshot[]
  period: TimePeriod
}

export interface NetWorthGoalResponse {
  goal: NetWorthGoal
  progress: GoalProgress
  milestone: Milestone | null
}

export interface NetWorthGoalsResponse {
  goals: NetWorthGoalResponse[]
}

// ============ Widget Types ============

export interface NetWorthWidgetData {
  currentNetWorth: number
  change: PercentageChange | null
  miniChartData: { date: Date; value: number }[]
}
