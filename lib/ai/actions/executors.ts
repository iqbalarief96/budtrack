import prisma from '@/lib/prisma'
import type {
  AiActionExecutionResult,
  AiActionTool,
  CreateAlertActionPayload,
  CreateBudgetActionPayload,
  CreateGoalActionPayload,
} from './types'

function monthRange(now = new Date()) {
  return {
    startDate: new Date(now.getFullYear(), now.getMonth(), 1),
    endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
  }
}

async function assertWallet(userId: string, walletId: string) {
  const wallet = await prisma.wallet.findFirst({ where: { id: walletId, userId }, select: { id: true } })
  if (!wallet) throw new Error('Wallet not found')
}

async function assertCategory(userId: string, categoryId: string) {
  const category = await prisma.category.findFirst({ where: { id: categoryId, userId }, select: { id: true } })
  if (!category) throw new Error('Category not found')
}

function parseOptionalDate(value?: string) {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('Invalid date')
  return date
}

export async function executeCreateBudgetAction(userId: string, payload: CreateBudgetActionPayload): Promise<AiActionExecutionResult> {
  await assertWallet(userId, payload.walletId)
  if (!payload.categoryId) throw new Error('Category is required')
  await assertCategory(userId, payload.categoryId)

  if (!Number.isFinite(payload.amount) || payload.amount <= 0) throw new Error('Invalid budget amount')

  const fallbackRange = monthRange()
  const startDate = parseOptionalDate(payload.startDate) ?? fallbackRange.startDate
  const endDate = parseOptionalDate(payload.endDate) ?? fallbackRange.endDate

  if (endDate <= startDate) throw new Error('Budget end date must be after start date')

  const budget = await prisma.budget.create({
    data: {
      userId,
      walletId: payload.walletId,
      categoryId: payload.categoryId,
      amount: payload.amount,
      spent: 0,
      startDate,
      endDate,
      periodType: payload.periodType,
      isRecurring: payload.periodType === 'MONTHLY',
    },
  })

  return {
    success: true,
    tool: 'create_budget',
    entityType: 'budget',
    entityId: budget.id,
    viewHref: `/budgets/${budget.id}`,
    message: 'Budget created',
  }
}

export async function executeCreateGoalAction(userId: string, payload: CreateGoalActionPayload): Promise<AiActionExecutionResult> {
  if (!payload.name.trim()) throw new Error('Goal name is required')
  if (!Number.isFinite(payload.target) || payload.target <= 0) throw new Error('Invalid goal target')

  const goal = await prisma.goal.create({
    data: {
      userId,
      name: payload.name.trim(),
      target: payload.target,
      current: payload.current ?? 0,
      deadline: payload.deadline ? parseOptionalDate(payload.deadline) : null,
      category: payload.category ?? null,
      description: payload.description ?? payload.reason,
    },
  })

  return {
    success: true,
    tool: 'create_goal',
    entityType: 'goal',
    entityId: goal.id,
    viewHref: `/goals/${goal.id}`,
    message: 'Goal created',
  }
}

export async function executeCreateAlertAction(userId: string, payload: CreateAlertActionPayload): Promise<AiActionExecutionResult> {
  if (payload.walletId) await assertWallet(userId, payload.walletId)
  if (payload.categoryId) await assertCategory(userId, payload.categoryId)
  if (!payload.title.trim()) throw new Error('Alert title is required')
  if (!payload.message.trim()) throw new Error('Alert message is required')

  const alert = await prisma.alert.create({
    data: {
      userId,
      type: payload.type,
      title: payload.title.trim(),
      message: payload.message.trim(),
      additionalData: JSON.stringify({
        walletId: payload.walletId,
        categoryId: payload.categoryId,
        categoryName: payload.categoryName,
        thresholdAmount: payload.thresholdAmount,
        reason: payload.reason,
      }),
    },
  })

  return {
    success: true,
    tool: 'create_alert',
    entityType: 'alert',
    entityId: alert.id,
    viewHref: '/alerts',
    message: 'Alert created',
  }
}

export async function executeAiAction(userId: string, tool: AiActionTool, payload: unknown): Promise<AiActionExecutionResult> {
  if (tool === 'create_budget') return executeCreateBudgetAction(userId, payload as CreateBudgetActionPayload)
  if (tool === 'create_goal') return executeCreateGoalAction(userId, payload as CreateGoalActionPayload)
  if (tool === 'create_alert') return executeCreateAlertAction(userId, payload as CreateAlertActionPayload)
  throw new Error(`Unsupported executable action: ${tool}`)
}
