import {
  Anomaly,
  Severity,
  AnomalyDetectionConfig,
  BaselineData,
  DEFAULT_ANOMALY_CONFIG,
  SEVERITY_THRESHOLDS,
} from '@/app/types/spending-insights'

/**
 * AnomalyDetectionService - Handles anomaly detection for spending patterns
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

/**
 * Transaction interface for anomaly detection
 */
export interface TransactionForAnomaly {
  id: string
  amount: number
  date: Date | string
  categoryId: string | null
  category?: {
    id: string
    name: string
    icon: string | null
    color: string | null
  } | null
}

/**
 * Detect spending spike anomaly
 * Property 5: Spending Spike Detection
 * For any current spending and baseline, a spike anomaly SHALL be generated
 * if and only if current > baseline * 1.5.
 * Validates: Requirements 2.1
 *
 * @param current - Current spending amount
 * @param baseline - Baseline (average) spending amount
 * @param threshold - Threshold percentage (default: 0.5 for 50%)
 * @returns true if spike detected, false otherwise
 */
export function detectSpendingSpike(
  current: number,
  baseline: number,
  threshold: number = DEFAULT_ANOMALY_CONFIG.spikeThreshold
): boolean {
  // Handle edge cases
  if (baseline <= 0) {
    // If baseline is 0 or negative, any positive current is a spike
    return current > 0
  }
  
  // Spike detected if current > baseline * (1 + threshold)
  // For 50% threshold: current > baseline * 1.5
  return current > baseline * (1 + threshold)
}

/**
 * Detect large transaction anomaly
 * Property 6: Large Transaction Detection
 * For any transaction amount and category average, a large transaction anomaly
 * SHALL be generated if and only if amount > categoryAverage * 3.
 * Validates: Requirements 2.2
 *
 * @param amount - Transaction amount
 * @param categoryAverage - Average transaction size for the category
 * @param multiplier - Multiplier threshold (default: 3)
 * @returns true if large transaction detected, false otherwise
 */
export function detectLargeTransaction(
  amount: number,
  categoryAverage: number,
  multiplier: number = DEFAULT_ANOMALY_CONFIG.largeTransactionMultiplier
): boolean {
  // Handle edge cases
  if (categoryAverage <= 0) {
    // If no baseline, any positive amount is considered large
    return amount > 0
  }
  
  // Large transaction if amount > categoryAverage * multiplier
  return Math.abs(amount) > categoryAverage * multiplier
}

/**
 * Detect frequency change anomaly
 * Property 7: Frequency Change Detection
 * For any current and baseline frequency values, a frequency change anomaly
 * SHALL be generated if and only if |current - baseline| / baseline > 0.4.
 * Validates: Requirements 2.3
 *
 * @param currentFrequency - Current transaction frequency
 * @param baselineFrequency - Baseline transaction frequency
 * @param threshold - Threshold percentage (default: 0.4 for 40%)
 * @returns true if frequency change detected, false otherwise
 */
export function detectFrequencyChange(
  currentFrequency: number,
  baselineFrequency: number,
  threshold: number = DEFAULT_ANOMALY_CONFIG.frequencyChangeThreshold
): boolean {
  // Handle edge cases
  if (baselineFrequency <= 0) {
    // If baseline is 0, any positive frequency is a change
    return currentFrequency > 0
  }
  
  // Calculate percentage change
  const change = Math.abs(currentFrequency - baselineFrequency) / baselineFrequency
  
  // Frequency change detected if change > threshold
  return change > threshold
}

/**
 * Calculate severity based on deviation percentage
 * Property 8: Severity Assignment Consistency
 * For any deviation percentage, severity SHALL be assigned as:
 * - low: 10-30%
 * - medium: 30-60%
 * - high: >60%
 * Validates: Requirements 2.4
 *
 * @param deviation - Deviation percentage (0-100+ scale)
 * @returns Severity level
 */
export function calculateSeverity(deviation: number): Severity {
  const absDeviation = Math.abs(deviation)
  
  if (absDeviation >= SEVERITY_THRESHOLDS.high.min) {
    return 'high'
  }
  if (absDeviation >= SEVERITY_THRESHOLDS.medium.min) {
    return 'medium'
  }
  // Default to low for deviations >= 10% (or any deviation)
  return 'low'
}


/**
 * Calculate baseline data from historical transactions
 * Validates: Requirements 2.1, 2.2, 2.3
 *
 * @param transactions - Array of transactions
 * @param months - Number of months to consider for baseline
 * @returns BaselineData with category averages, transaction size averages, and frequency
 */
export function calculateBaseline(
  transactions: TransactionForAnomaly[],
  months: number = 3
): BaselineData {
  const categoryAverages = new Map<string, number>()
  const transactionSizeAverages = new Map<string, number>()
  const frequencyByCategory = new Map<string, number>()

  // Group transactions by category
  const byCategory = new Map<string, TransactionForAnomaly[]>()
  
  for (const tx of transactions) {
    const categoryId = tx.categoryId || 'uncategorized'
    const existing = byCategory.get(categoryId) || []
    existing.push(tx)
    byCategory.set(categoryId, existing)
  }

  // Calculate averages for each category
  for (const [categoryId, txs] of byCategory) {
    // Total spending in category
    const totalAmount = txs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
    
    // Average monthly spending
    const monthlyAverage = months > 0 ? totalAmount / months : 0
    categoryAverages.set(categoryId, monthlyAverage)
    
    // Average transaction size
    const avgTransactionSize = txs.length > 0 ? totalAmount / txs.length : 0
    transactionSizeAverages.set(categoryId, avgTransactionSize)
    
    // Monthly frequency (transactions per month)
    const monthlyFrequency = months > 0 ? txs.length / months : 0
    frequencyByCategory.set(categoryId, monthlyFrequency)
  }

  return {
    categoryAverages,
    transactionSizeAverages,
    frequencyByCategory,
  }
}

/**
 * Calculate deviation percentage between current and baseline
 */
export function calculateDeviation(current: number, baseline: number): number {
  if (baseline === 0) {
    return current > 0 ? 100 : 0
  }
  return ((current - baseline) / Math.abs(baseline)) * 100
}

/**
 * Generate unique ID for anomaly
 */
function generateAnomalyId(): string {
  return `anomaly-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Detect all anomalies for a user's transactions
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 *
 * @param currentTransactions - Current period transactions
 * @param baseline - Baseline data from historical transactions
 * @param config - Anomaly detection configuration
 * @returns Array of detected anomalies
 */
export function detectAnomalies(
  currentTransactions: TransactionForAnomaly[],
  baseline: BaselineData,
  config: AnomalyDetectionConfig = DEFAULT_ANOMALY_CONFIG
): Anomaly[] {
  const anomalies: Anomaly[] = []
  const now = new Date()

  // Convert baseline Maps to usable format
  const categoryAverages = baseline.categoryAverages instanceof Map
    ? baseline.categoryAverages
    : new Map(Object.entries(baseline.categoryAverages))
  
  const transactionSizeAverages = baseline.transactionSizeAverages instanceof Map
    ? baseline.transactionSizeAverages
    : new Map(Object.entries(baseline.transactionSizeAverages))
  
  const frequencyByCategory = baseline.frequencyByCategory instanceof Map
    ? baseline.frequencyByCategory
    : new Map(Object.entries(baseline.frequencyByCategory))

  // Group current transactions by category
  const currentByCategory = new Map<string, TransactionForAnomaly[]>()
  for (const tx of currentTransactions) {
    const categoryId = tx.categoryId || 'uncategorized'
    const existing = currentByCategory.get(categoryId) || []
    existing.push(tx)
    currentByCategory.set(categoryId, existing)
  }

  // Check for spending spikes per category
  for (const [categoryId, txs] of currentByCategory) {
    const currentTotal = txs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
    const baselineAvg = categoryAverages.get(categoryId) || 0

    if (detectSpendingSpike(currentTotal, baselineAvg, config.spikeThreshold)) {
      const deviation = calculateDeviation(currentTotal, baselineAvg)
      anomalies.push({
        id: generateAnomalyId(),
        type: 'spike',
        categoryId,
        severity: calculateSeverity(deviation),
        deviation,
        currentValue: currentTotal,
        baselineValue: baselineAvg,
        detectedAt: now,
      })
    }

    // Check for large transactions
    const avgTransactionSize = transactionSizeAverages.get(categoryId) || 0
    for (const tx of txs) {
      if (detectLargeTransaction(tx.amount, avgTransactionSize, config.largeTransactionMultiplier)) {
        const deviation = calculateDeviation(Math.abs(tx.amount), avgTransactionSize)
        anomalies.push({
          id: generateAnomalyId(),
          type: 'large_transaction',
          categoryId,
          severity: calculateSeverity(deviation),
          deviation,
          currentValue: Math.abs(tx.amount),
          baselineValue: avgTransactionSize,
          detectedAt: now,
          transactionId: tx.id,
        })
      }
    }

    // Check for frequency changes
    const baselineFreq = frequencyByCategory.get(categoryId) || 0
    const currentFreq = txs.length // Current period frequency
    
    if (detectFrequencyChange(currentFreq, baselineFreq, config.frequencyChangeThreshold)) {
      const deviation = calculateDeviation(currentFreq, baselineFreq)
      anomalies.push({
        id: generateAnomalyId(),
        type: 'frequency_change',
        categoryId,
        severity: calculateSeverity(deviation),
        deviation,
        currentValue: currentFreq,
        baselineValue: baselineFreq,
        detectedAt: now,
      })
    }
  }

  return anomalies
}
