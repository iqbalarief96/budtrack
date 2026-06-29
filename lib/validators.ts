/**
 * Zod Validation Schemas
 * Input validation for critical API routes
 */

import { z } from 'zod'

/**
 * Transaction validation schema
 */
export const TransactionSchema = z.object({
  amount: z.union([
    z.number().positive('Amount must be positive'),
    z.string().transform((val) => parseFloat(val))
  ]),
  type: z.enum(['INCOME', 'EXPENSE'], {
    errorMap: () => ({ message: 'Type must be INCOME or EXPENSE' })
  }),
  description: z.string().optional(),
  walletId: z.string().min(1, 'Wallet ID is required'),
  categoryId: z.string().optional(),
  date: z.union([z.string(), z.date().transform((d) => d.toISOString())]),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  goalId: z.string().optional(),
  receiptAttachment: z.object({
    fileName: z.string().min(1, 'Receipt file name is required'),
    mimeType: z.string().min(1, 'Receipt MIME type is required'),
    size: z.number().int().nonnegative('Receipt file size must be non-negative'),
    source: z.string().optional(),
    storageUrl: z.string().url().optional(),
    extractedText: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  }).optional(),
})

export type TransactionInput = z.infer<typeof TransactionSchema>

/**
 * Budget validation schema
 */
export const BudgetSchema = z.object({
  amount: z.union([
    z.number().positive('Budget amount must be positive'),
    z.string().transform((val) => parseFloat(val))
  ]),
  target: z.union([
    z.number().positive('Target amount must be positive'),
    z.string().transform((val) => parseFloat(val))
  ]).optional(),
  periodType: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'], {
    errorMap: () => ({ message: 'Invalid budget period' })
  }).optional(),
  timeframe: z.enum(['month', 'quarter', 'year']).optional(),
  startDate: z.union([z.string().datetime(), z.date().transform((d) => d.toISOString())]).optional(),
  endDate: z.union([z.string().datetime(), z.date().transform((d) => d.toISOString())]).optional(),
  deadline: z.union([z.string().datetime(), z.date().transform((d) => d.toISOString())]).optional(),
  walletId: z.string().optional(),
  categoryId: z.string().optional(),
  isRecurring: z.boolean().optional(),
  notificationThresholds: z.string().optional(),
})

export type BudgetInput = z.infer<typeof BudgetSchema>

/**
 * Wallet validation schema
 */
export const WalletSchema = z.object({
  name: z.string().min(1, 'Wallet name is required'),
  type: z.enum(['MAIN', 'SAVINGS', 'INVESTMENT'], {
    errorMap: () => ({ message: 'Invalid wallet type' })
  }).optional(),
  balance: z.union([
    z.number(),
    z.string().transform((val) => parseFloat(val))
  ]).default(0),
  currency: z.string().min(1).default('IDR'),
  icon: z.string().optional(),
  color: z.string().optional(),
  description: z.string().optional(),
  emergencyFundTarget: z.number().optional(),
  isDefault: z.boolean().optional(),
})

export type WalletInput = z.infer<typeof WalletSchema>

/**
 * Goal validation schema
 */
export const GoalSchema = z.object({
  name: z.string().min(1, 'Goal name is required'),
  description: z.string().optional(),
  targetAmount: z.number().positive('Target amount must be positive'),
  deadline: z.string().datetime().optional(),
  categoryId: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
})

export type GoalInput = z.infer<typeof GoalSchema>

/**
 * Category validation schema
 */
export const CategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  type: z.enum(['INCOME', 'EXPENSE'], {
    errorMap: () => ({ message: 'Type must be INCOME or EXPENSE' })
  }),
  icon: z.string().optional(),
  color: z.string().optional(),
  description: z.string().optional(),
  sortOrder: z.number().optional(),
})

export type CategoryInput = z.infer<typeof CategorySchema>

/**
 * Validate request body with Zod schema
 * Returns validated data or throws error
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  return schema.parse(data)
}

/**
 * Safe validation that returns success/error
 */
export function safeValidateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}
