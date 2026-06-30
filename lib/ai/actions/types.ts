export type AiActionTool =
  | 'create_budget'
  | 'create_goal'
  | 'create_alert'
  | 'open_page'
  | 'ask_followup'

export type AiActionStatus =
  | 'proposed'
  | 'ready'
  | 'needs_review'
  | 'executing'
  | 'executed'
  | 'rejected'
  | 'failed'

export type AiActionEntityType = 'budget' | 'goal' | 'alert'

export interface AiProposedAction<TPayload = unknown> {
  id: string
  tool: AiActionTool
  label: string
  description?: string
  confidence: number
  payload: TPayload
  reason: string
}

export interface AiValidatedAction<TPayload = unknown> extends AiProposedAction<TPayload> {
  status: AiActionStatus
  warnings: string[]
  missingFields: string[]
}

export interface AiActionExecutionResult {
  success: boolean
  tool: AiActionTool
  entityId?: string
  entityType?: AiActionEntityType
  viewHref?: string
  message: string
}

export interface CreateBudgetActionPayload {
  walletId: string
  categoryId?: string
  categoryName?: string
  amount: number
  periodType: 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  startDate?: string
  endDate?: string
  reason: string
}

export interface CreateGoalActionPayload {
  name: string
  target: number
  current?: number
  deadline?: string
  category?: string
  description?: string
  reason: string
}

export interface CreateAlertActionPayload {
  type: 'budget_risk' | 'spending_spike' | 'low_balance' | 'custom'
  title: string
  message: string
  walletId?: string
  categoryId?: string
  categoryName?: string
  thresholdAmount?: number
  reason: string
}

export interface OpenPageActionPayload {
  href: '/budgets' | '/goals' | '/transactions' | '/alerts' | '/settings'
  reason: string
}

export interface AskFollowupActionPayload {
  prompt: string
  reason: string
}

export interface AiActionValidationContext {
  userId: string
  walletIds: string[]
  categoryIds: string[]
  categoriesByName: Map<string, { id: string; name: string }[]>
}
