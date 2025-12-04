// Spending Insights & Anomaly Alerts Types

// ============ Enums and Type Aliases ============

export type TrendDirection = 'increasing' | 'decreasing' | 'stable'

export type AnomalyType = 'spike' | 'large_transaction' | 'frequency_change'

export type Severity = 'low' | 'medium' | 'high'

export type InsightType = 
  | 'spending_increase' 
  | 'spending_decrease' 
  | 'absence' 
  | 'transaction_size' 
  | 'weekend_pattern'

export type AlertType = 'category_limit' | 'daily_limit' | 'anomaly'

export type ThresholdStatus = 'normal' | 'warning' | 'exceeded'

export type StatsPeriod = 'daily' | 'weekly' | 'monthly'

// ============ Pattern Analysis Types ============

export interface MonthlySpending {
  month: Date | string
  amount: number
  transactionCount: number
}

export interface SpendingPattern {
  categoryId: string
  categoryName: string
  averageAmount: number
  trend: TrendDirection
  trendPercentage: number
  monthlyData: MonthlySpending[]
}

export interface DayOfWeekPattern {
  dayOfWeek: number // 0-6 (Sunday-Saturday)
  averageAmount: number
  transactionCount: number
}

export interface TrendResult {
  direction: TrendDirection
  percentage: number
}

export interface ComparisonResult {
  difference: number
  percentageChange: number
}

// ============ Anomaly Detection Types ============

export interface Anomaly {
  id: string
  type: AnomalyType
  categoryId: string | null
  severity: Severity
  deviation: number
  currentValue: number
  baselineValue: number
  detectedAt: Date | string
  transactionId?: string
  // Relations
  category?: {
    id: string
    name: string
    icon: string | null
    color: string | null
  } | null
}


export interface AnomalyDetectionConfig {
  spikeThreshold: number      // default: 0.5 (50%)
  largeTransactionMultiplier: number  // default: 3
  frequencyChangeThreshold: number    // default: 0.4 (40%)
}

export interface BaselineData {
  categoryAverages: Map<string, number> | Record<string, number>
  transactionSizeAverages: Map<string, number> | Record<string, number>
  frequencyByCategory: Map<string, number> | Record<string, number>
}

// ============ Insight Types ============

export interface SpendingInsight {
  id: string
  userId: string
  type: InsightType
  categoryId: string | null
  title: string
  description: string
  severity: Severity
  data: Record<string, unknown>
  isRead: boolean
  isDismissed: boolean
  createdAt: Date | string
  // Relations
  category?: {
    id: string
    name: string
    icon: string | null
    color: string | null
  } | null
}

export interface CreateInsightInput {
  type: InsightType
  categoryId?: string
  title: string
  description: string
  severity: Severity
  data?: Record<string, unknown>
}

// ============ Alert Types ============

export interface SpendingAlert {
  id: string
  userId: string
  type: AlertType
  categoryId: string | null
  threshold: number
  isActive: boolean
  createdAt: Date | string
  updatedAt: Date | string
  // Relations
  category?: {
    id: string
    name: string
    icon: string | null
    color: string | null
  } | null
}

export interface CreateAlertInput {
  type: AlertType
  categoryId?: string
  threshold: number
  isActive?: boolean
}

export interface UpdateAlertInput {
  type?: AlertType
  categoryId?: string
  threshold?: number
  isActive?: boolean
}

export interface AlertNotification {
  alertId: string
  type: 'warning' | 'exceeded'
  currentAmount: number
  threshold: number
  percentage: number
  // Additional context
  alert?: SpendingAlert
}

// ============ Stats Types ============

export interface SpendingStats {
  id: string
  userId: string
  categoryId: string | null
  period: StatsPeriod
  date: Date | string
  amount: number
  count: number
  avgAmount: number
  createdAt: Date | string
  // Relations
  category?: {
    id: string
    name: string
    icon: string | null
    color: string | null
  } | null
}

// ============ API Response Types ============

export interface SpendingPatternsResponse {
  patterns: SpendingPattern[]
  topCategories: SpendingPattern[]
  dayOfWeekPatterns: DayOfWeekPattern[]
}

export interface AnomaliesResponse {
  anomalies: Anomaly[]
  total: number
}

export interface InsightsResponse {
  insights: SpendingInsight[]
  unreadCount: number
}

export interface AlertsResponse {
  alerts: SpendingAlert[]
  notifications: AlertNotification[]
}

// ============ Dashboard Widget Types ============

export interface SpendingInsightsWidgetData {
  insights: SpendingInsight[]
  anomalyCount: number
  hasUnread: boolean
}

// ============ Constants ============

export const DEFAULT_ANOMALY_CONFIG: AnomalyDetectionConfig = {
  spikeThreshold: 0.5,           // 50%
  largeTransactionMultiplier: 3, // 3x average
  frequencyChangeThreshold: 0.4, // 40%
}

export const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Low', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  medium: { label: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  high: { label: 'High', color: 'text-red-600', bgColor: 'bg-red-100' },
}

export const INSIGHT_TYPE_CONFIG: Record<InsightType, { label: string; icon: string }> = {
  spending_increase: { label: 'Spending Increase', icon: 'TrendingUp' },
  spending_decrease: { label: 'Spending Decrease', icon: 'TrendingDown' },
  absence: { label: 'Spending Absence', icon: 'AlertCircle' },
  transaction_size: { label: 'Transaction Size Change', icon: 'DollarSign' },
  weekend_pattern: { label: 'Weekend Pattern', icon: 'Calendar' },
}

export const ANOMALY_TYPE_CONFIG: Record<AnomalyType, { label: string; description: string }> = {
  spike: { 
    label: 'Spending Spike', 
    description: 'Spending exceeded 50% above average' 
  },
  large_transaction: { 
    label: 'Large Transaction', 
    description: 'Transaction exceeded 3x category average' 
  },
  frequency_change: { 
    label: 'Frequency Change', 
    description: 'Transaction frequency changed by more than 40%' 
  },
}

export const ALERT_TYPE_OPTIONS: { value: AlertType; label: string }[] = [
  { value: 'category_limit', label: 'Category Limit' },
  { value: 'daily_limit', label: 'Daily Limit' },
  { value: 'anomaly', label: 'Anomaly Alert' },
]

// Severity thresholds for deviation percentage
export const SEVERITY_THRESHOLDS = {
  low: { min: 10, max: 30 },
  medium: { min: 30, max: 60 },
  high: { min: 60, max: Infinity },
}
