/**
 * Application-wide constants
 * Centralized configuration for magic numbers and thresholds
 */

// Transaction Thresholds
export const TRANSACTION_THRESHOLDS = {
  LARGE_EXPENSE: 1_000_000, // IDR - triggers alert
  UNUSUAL_AMOUNT_MULTIPLIER: 3, // 3x average triggers anomaly detection
} as const

// Budget Alert Thresholds
export const BUDGET_ALERT_THRESHOLDS = {
  WARNING: 80, // 80% of budget
  CRITICAL: 100, // 100% of budget
  EXCEEDED: 120, // 120% of budget
} as const

// Pagination Defaults
export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 1000,
  DEFAULT_OFFSET: 0,
} as const

// Emergency Fund Settings
export const EMERGENCY_FUND = {
  MIN_MONTHS: 3,
  RECOMMENDED_MONTHS: 6,
  MAX_MONTHS: 12,
} as const

// Date Range Presets (in days)
export const DATE_RANGES = {
  DAILY: 1,
  WEEKLY: 7,
  MONTHLY: 30,
  QUARTERLY: 90,
  YEARLY: 365,
} as const

// File Upload Limits
export const FILE_LIMITS = {
  MAX_CSV_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_RECEIPT_SIZE: 5 * 1024 * 1024, // 5MB
} as const

// Rate Limiting
export const RATE_LIMITS = {
  AI_REQUESTS_PER_HOUR: 20,
  API_REQUESTS_PER_MINUTE: 60,
  EMAIL_PER_HOUR: 10,
} as const

// Cache TTL (Time To Live) in seconds
export const CACHE_TTL = {
  WALLET_BALANCE: 60, // 1 minute
  BUDGET_SUMMARY: 300, // 5 minutes
  CATEGORY_LIST: 3600, // 1 hour
  USER_SETTINGS: 1800, // 30 minutes
  INSIGHTS: 7200, // 2 hours
} as const

// Transaction Types
export const TRANSACTION_TYPES = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
  TRANSFER: 'TRANSFER',
} as const

// Wallet Types
export const WALLET_TYPES = {
  MAIN: 'MAIN',
  SAVINGS: 'SAVINGS',
  INVESTMENT: 'INVESTMENT',
} as const

// Budget Period Types
export const BUDGET_PERIODS = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  YEARLY: 'YEARLY',
} as const

// Alert Types
export const ALERT_TYPES = {
  BUDGET_WARNING: 'BUDGET_WARNING',
  BUDGET_CRITICAL: 'BUDGET_CRITICAL',
  BUDGET_EXCEEDED: 'BUDGET_EXCEEDED',
  TRANSACTION_LARGE: 'TRANSACTION_LARGE',
  ANOMALY_DETECTED: 'ANOMALY_DETECTED',
  GOAL_ACHIEVED: 'GOAL_ACHIEVED',
  RECURRING_DUE: 'RECURRING_DUE',
} as const

// Response Messages
export const MESSAGES = {
  UNAUTHORIZED: 'Unauthorized - Please login to continue',
  NOT_FOUND: 'Resource not found',
  BAD_REQUEST: 'Invalid request data',
  INTERNAL_ERROR: 'Internal server error',
  SUCCESS: 'Operation completed successfully',
} as const

// HTTP Status Codes (for clarity)
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
} as const
