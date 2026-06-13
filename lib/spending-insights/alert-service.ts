import {
  SpendingAlert,
  AlertType,
  ThresholdStatus,
  AlertNotification,
  CreateAlertInput,
  UpdateAlertInput,
} from '@/app/types/spending-insights'

/**
 * AlertService - Manages spending alerts and threshold checking
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

// ============ Threshold Constants ============

/**
 * Warning threshold percentage (80%)
 * Validates: Requirements 4.2
 */
export const WARNING_THRESHOLD_PERCENT = 0.80 // 80%

/**
 * Exceeded threshold percentage (100%)
 * Validates: Requirements 4.3
 */
export const EXCEEDED_THRESHOLD_PERCENT = 1.00 // 100%


// ============ Threshold Checking Functions ============

/**
 * Check threshold status based on current spending vs alert threshold
 * Property 10: Alert Threshold Detection
 * For any spending amount and alert threshold, warning status SHALL be returned
 * at 80% and exceeded status at 100%.
 * Validates: Requirements 4.2, 4.3
 *
 * @param currentAmount - Current spending amount
 * @param threshold - Alert threshold amount
 * @returns ThresholdStatus ('normal', 'warning', 'exceeded')
 */
export function checkThreshold(
  currentAmount: number,
  threshold: number
): ThresholdStatus {
  // Handle edge cases
  if (threshold <= 0) {
    // If threshold is 0 or negative, any positive spending is exceeded
    return currentAmount > 0 ? 'exceeded' : 'normal'
  }

  const percentage = currentAmount / threshold
  const epsilon = Number.EPSILON

  // Check exceeded first (>= 100%)
  if (percentage + epsilon >= EXCEEDED_THRESHOLD_PERCENT) {
    return 'exceeded'
  }

  // Check warning (>= 80%)
  if (percentage + epsilon >= WARNING_THRESHOLD_PERCENT) {
    return 'warning'
  }

  return 'normal'
}


/**
 * Calculate the percentage of threshold reached
 *
 * @param currentAmount - Current spending amount
 * @param threshold - Alert threshold amount
 * @returns Percentage (0-100+ scale)
 */
export function calculateThresholdPercentage(
  currentAmount: number,
  threshold: number
): number {
  if (threshold <= 0) {
    return currentAmount > 0 ? 100 : 0
  }
  return (currentAmount / threshold) * 100
}


// ============ Alert CRUD Functions ============

/**
 * Generate unique ID for alert
 */
function generateAlertId(): string {
  return `alert-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Create a new spending alert
 * Property 11: Alert Data Round-Trip
 * For any valid alert data, creating an alert and then retrieving it
 * SHALL return equivalent values.
 * Validates: Requirements 4.1
 *
 * @param userId - User ID
 * @param input - Alert creation input
 * @returns Created SpendingAlert
 */
export function createAlert(
  userId: string,
  input: CreateAlertInput
): SpendingAlert {
  const now = new Date()

  // Validate input
  if (!input.type) {
    throw new Error('Alert type is required')
  }
  if (input.threshold === undefined || input.threshold < 0) {
    throw new Error('Valid threshold is required')
  }

  return {
    id: generateAlertId(),
    userId,
    type: input.type,
    categoryId: input.categoryId || null,
    threshold: input.threshold,
    isActive: input.isActive !== undefined ? input.isActive : true,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Update an existing spending alert
 * Validates: Requirements 4.4
 *
 * @param alert - Existing alert to update
 * @param input - Update input
 * @returns Updated SpendingAlert
 */
export function updateAlert(
  alert: SpendingAlert,
  input: UpdateAlertInput
): SpendingAlert {
  return {
    ...alert,
    type: input.type !== undefined ? input.type : alert.type,
    categoryId: input.categoryId !== undefined ? input.categoryId : alert.categoryId,
    threshold: input.threshold !== undefined ? input.threshold : alert.threshold,
    isActive: input.isActive !== undefined ? input.isActive : alert.isActive,
    updatedAt: new Date(),
  }
}

/**
 * Toggle alert active status
 * Validates: Requirements 4.5
 *
 * @param alert - Alert to toggle
 * @returns Updated SpendingAlert with toggled isActive
 */
export function toggleAlertActive(alert: SpendingAlert): SpendingAlert {
  return {
    ...alert,
    isActive: !alert.isActive,
    updatedAt: new Date(),
  }
}

/**
 * Filter alerts by active status
 *
 * @param alerts - Array of alerts
 * @param activeOnly - If true, return only active alerts
 * @returns Filtered alerts
 */
export function filterAlerts(
  alerts: SpendingAlert[],
  activeOnly: boolean = true
): SpendingAlert[] {
  if (!activeOnly) {
    return alerts
  }
  return alerts.filter(alert => alert.isActive)
}

/**
 * Filter alerts by category
 *
 * @param alerts - Array of alerts
 * @param categoryId - Category ID to filter by (null for uncategorized)
 * @returns Filtered alerts
 */
export function filterAlertsByCategory(
  alerts: SpendingAlert[],
  categoryId: string | null
): SpendingAlert[] {
  return alerts.filter(alert => alert.categoryId === categoryId)
}

/**
 * Filter alerts by type
 *
 * @param alerts - Array of alerts
 * @param type - Alert type to filter by
 * @returns Filtered alerts
 */
export function filterAlertsByType(
  alerts: SpendingAlert[],
  type: AlertType
): SpendingAlert[] {
  return alerts.filter(alert => alert.type === type)
}


// ============ Alert Checking Functions ============

/**
 * Category spending data for alert checking
 */
export interface CategorySpendingForAlert {
  categoryId: string | null
  currentAmount: number
}

/**
 * Check a single alert against current spending
 * Validates: Requirements 4.2, 4.3
 *
 * @param alert - Alert to check
 * @param currentAmount - Current spending amount for the alert's category
 * @returns AlertNotification or null if no notification needed
 */
export function checkAlert(
  alert: SpendingAlert,
  currentAmount: number
): AlertNotification | null {
  // Skip inactive alerts
  if (!alert.isActive) {
    return null
  }

  const status = checkThreshold(currentAmount, alert.threshold)

  // No notification for normal status
  if (status === 'normal') {
    return null
  }

  const percentage = calculateThresholdPercentage(currentAmount, alert.threshold)

  return {
    alertId: alert.id,
    type: status, // 'warning' or 'exceeded'
    currentAmount,
    threshold: alert.threshold,
    percentage,
    alert,
  }
}

/**
 * Check all alerts against current spending data
 * Validates: Requirements 4.2, 4.3
 *
 * @param alerts - Array of alerts to check
 * @param spendingByCategory - Map of category ID to current spending amount
 * @param totalDailySpending - Total daily spending (for daily_limit alerts)
 * @returns Array of AlertNotifications
 */
export function checkAlerts(
  alerts: SpendingAlert[],
  spendingByCategory: Map<string, number> | Record<string, number>,
  totalDailySpending: number = 0
): AlertNotification[] {
  const notifications: AlertNotification[] = []

  // Convert to Map if needed
  const spendingMap = spendingByCategory instanceof Map
    ? spendingByCategory
    : new Map(Object.entries(spendingByCategory))

  for (const alert of alerts) {
    // Skip inactive alerts
    if (!alert.isActive) {
      continue
    }

    let currentAmount: number

    switch (alert.type) {
      case 'category_limit':
        // Get spending for the specific category
        currentAmount = alert.categoryId
          ? (spendingMap.get(alert.categoryId) || 0)
          : 0
        break

      case 'daily_limit':
        // Use total daily spending
        currentAmount = totalDailySpending
        break

      case 'anomaly':
        // Anomaly alerts are handled separately by AnomalyDetectionService
        continue

      default:
        continue
    }

    const notification = checkAlert(alert, currentAmount)
    if (notification) {
      notifications.push(notification)
    }
  }

  return notifications
}


// ============ Utility Functions ============

/**
 * Sort alerts by threshold (ascending)
 *
 * @param alerts - Array of alerts
 * @returns Sorted alerts
 */
export function sortAlertsByThreshold(alerts: SpendingAlert[]): SpendingAlert[] {
  return [...alerts].sort((a, b) => a.threshold - b.threshold)
}

/**
 * Sort alerts by creation date (newest first)
 *
 * @param alerts - Array of alerts
 * @returns Sorted alerts
 */
export function sortAlertsByDate(alerts: SpendingAlert[]): SpendingAlert[] {
  return [...alerts].sort((a, b) => {
    const dateA = new Date(a.createdAt)
    const dateB = new Date(b.createdAt)
    return dateB.getTime() - dateA.getTime()
  })
}

/**
 * Get alert by ID from array
 *
 * @param alerts - Array of alerts
 * @param alertId - Alert ID to find
 * @returns Alert or undefined
 */
export function getAlertById(
  alerts: SpendingAlert[],
  alertId: string
): SpendingAlert | undefined {
  return alerts.find(alert => alert.id === alertId)
}

/**
 * Remove alert from array (for delete operation)
 *
 * @param alerts - Array of alerts
 * @param alertId - Alert ID to remove
 * @returns New array without the removed alert
 */
export function removeAlert(
  alerts: SpendingAlert[],
  alertId: string
): SpendingAlert[] {
  return alerts.filter(alert => alert.id !== alertId)
}

/**
 * Validate alert input
 *
 * @param input - Alert input to validate
 * @returns Validation result with errors if any
 */
export function validateAlertInput(
  input: CreateAlertInput | UpdateAlertInput
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if ('type' in input && input.type !== undefined) {
    const validTypes: AlertType[] = ['category_limit', 'daily_limit', 'anomaly']
    if (!validTypes.includes(input.type)) {
      errors.push(`Invalid alert type: ${input.type}`)
    }
  }

  if ('threshold' in input && input.threshold !== undefined) {
    if (typeof input.threshold !== 'number' || input.threshold < 0) {
      errors.push('Threshold must be a non-negative number')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Serialize alert for storage (convert dates to ISO strings)
 *
 * @param alert - Alert to serialize
 * @returns Serialized alert
 */
export function serializeAlert(alert: SpendingAlert): Record<string, unknown> {
  return {
    ...alert,
    createdAt: alert.createdAt instanceof Date
      ? alert.createdAt.toISOString()
      : alert.createdAt,
    updatedAt: alert.updatedAt instanceof Date
      ? alert.updatedAt.toISOString()
      : alert.updatedAt,
  }
}

/**
 * Deserialize alert from storage (convert ISO strings to Dates)
 *
 * @param data - Serialized alert data
 * @returns Deserialized SpendingAlert
 */
export function deserializeAlert(data: Record<string, unknown>): SpendingAlert {
  return {
    id: data.id as string,
    userId: data.userId as string,
    type: data.type as AlertType,
    categoryId: data.categoryId as string | null,
    threshold: data.threshold as number,
    isActive: data.isActive as boolean,
    createdAt: new Date(data.createdAt as string),
    updatedAt: new Date(data.updatedAt as string),
  }
}
