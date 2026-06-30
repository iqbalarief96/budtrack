import type {
  AiActionValidationContext,
  AiProposedAction,
  AiValidatedAction,
  AskFollowupActionPayload,
  CreateAlertActionPayload,
  CreateBudgetActionPayload,
  CreateGoalActionPayload,
  OpenPageActionPayload,
} from './types'

const SUPPORTED_TOOLS = new Set(['create_budget', 'create_goal', 'create_alert', 'open_page', 'ask_followup'])
const ALLOWED_HREFS = new Set(['/budgets', '/goals', '/transactions', '/alerts', '/settings'])

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function base<TPayload>(action: AiProposedAction<TPayload>, status: AiValidatedAction['status'], warnings: string[], missingFields: string[]): AiValidatedAction<TPayload> {
  return {
    ...action,
    label: action.label.slice(0, 120),
    reason: action.reason.slice(0, 500),
    status,
    warnings,
    missingFields,
  }
}

function validateCreateBudget(action: AiProposedAction, ctx: AiActionValidationContext): AiValidatedAction<CreateBudgetActionPayload> {
  const payload = asObject(action.payload)
  const warnings: string[] = []
  const missingFields: string[] = []

  const walletId = typeof payload.walletId === 'string' ? payload.walletId : ''
  if (!walletId) missingFields.push('walletId')
  else if (!ctx.walletIds.includes(walletId)) warnings.push('Wallet not found for user')

  const categoryId = typeof payload.categoryId === 'string' ? payload.categoryId : undefined
  const categoryName = typeof payload.categoryName === 'string' ? payload.categoryName : undefined
  let resolvedCategoryId = categoryId
  if (categoryId && !ctx.categoryIds.includes(categoryId)) warnings.push('Category not found for user')
  if (!categoryId && categoryName) {
    const matches = ctx.categoriesByName.get(categoryName.toLowerCase()) ?? []
    if (matches.length === 1) resolvedCategoryId = matches[0].id
    if (matches.length > 1) warnings.push('Category name is ambiguous')
  }
  if (!resolvedCategoryId) missingFields.push('categoryId')

  if (!isPositiveNumber(payload.amount)) missingFields.push('amount')

  const periodType = payload.periodType === 'WEEKLY' || payload.periodType === 'YEARLY' ? payload.periodType : 'MONTHLY'

  const clean: CreateBudgetActionPayload = {
    walletId,
    categoryId: resolvedCategoryId,
    categoryName,
    amount: typeof payload.amount === 'number' ? payload.amount : 0,
    periodType,
    startDate: typeof payload.startDate === 'string' ? payload.startDate : undefined,
    endDate: typeof payload.endDate === 'string' ? payload.endDate : undefined,
    reason: typeof payload.reason === 'string' ? payload.reason : action.reason,
  }

  const status = missingFields.length || warnings.length ? 'needs_review' : 'ready'
  return base({ ...action, payload: clean }, status, warnings, missingFields)
}

function validateCreateGoal(action: AiProposedAction): AiValidatedAction<CreateGoalActionPayload> {
  const payload = asObject(action.payload)
  const missingFields: string[] = []

  if (typeof payload.name !== 'string' || !payload.name.trim()) missingFields.push('name')
  if (!isPositiveNumber(payload.target)) missingFields.push('target')

  const clean: CreateGoalActionPayload = {
    name: typeof payload.name === 'string' ? payload.name.trim().slice(0, 120) : '',
    target: typeof payload.target === 'number' ? payload.target : 0,
    current: typeof payload.current === 'number' && payload.current >= 0 ? payload.current : undefined,
    deadline: typeof payload.deadline === 'string' ? payload.deadline : undefined,
    category: typeof payload.category === 'string' ? payload.category.slice(0, 80) : undefined,
    description: typeof payload.description === 'string' ? payload.description.slice(0, 500) : undefined,
    reason: typeof payload.reason === 'string' ? payload.reason : action.reason,
  }

  return base({ ...action, payload: clean }, missingFields.length ? 'needs_review' : 'ready', [], missingFields)
}

function validateCreateAlert(action: AiProposedAction, ctx: AiActionValidationContext): AiValidatedAction<CreateAlertActionPayload> {
  const payload = asObject(action.payload)
  const warnings: string[] = []
  const missingFields: string[] = []

  if (typeof payload.title !== 'string' || !payload.title.trim()) missingFields.push('title')
  if (typeof payload.message !== 'string' || !payload.message.trim()) missingFields.push('message')

  const walletId = typeof payload.walletId === 'string' ? payload.walletId : undefined
  if (walletId && !ctx.walletIds.includes(walletId)) warnings.push('Wallet not found for user')

  const categoryId = typeof payload.categoryId === 'string' ? payload.categoryId : undefined
  if (categoryId && !ctx.categoryIds.includes(categoryId)) warnings.push('Category not found for user')

  const clean: CreateAlertActionPayload = {
    type: payload.type === 'budget_risk' || payload.type === 'spending_spike' || payload.type === 'low_balance' ? payload.type : 'custom',
    title: typeof payload.title === 'string' ? payload.title.trim().slice(0, 120) : '',
    message: typeof payload.message === 'string' ? payload.message.trim().slice(0, 500) : '',
    walletId,
    categoryId,
    categoryName: typeof payload.categoryName === 'string' ? payload.categoryName : undefined,
    thresholdAmount: isPositiveNumber(payload.thresholdAmount) ? payload.thresholdAmount : undefined,
    reason: typeof payload.reason === 'string' ? payload.reason : action.reason,
  }

  const status = missingFields.length || warnings.length ? 'needs_review' : 'ready'
  return base({ ...action, payload: clean }, status, warnings, missingFields)
}

function validateOpenPage(action: AiProposedAction): AiValidatedAction<OpenPageActionPayload> {
  const payload = asObject(action.payload)
  const validHref = typeof payload.href === 'string' && ALLOWED_HREFS.has(payload.href)
  const href = validHref ? payload.href as OpenPageActionPayload['href'] : '/budgets'
  const missingFields = validHref ? [] : ['href']

  return base({
    ...action,
    payload: {
      href,
      reason: typeof payload.reason === 'string' ? payload.reason : action.reason,
    },
  }, missingFields.length ? 'needs_review' : 'ready', [], missingFields)
}

function validateAskFollowup(action: AiProposedAction): AiValidatedAction<AskFollowupActionPayload> {
  const payload = asObject(action.payload)
  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim().slice(0, 300) : ''

  return base({
    ...action,
    payload: {
      prompt,
      reason: typeof payload.reason === 'string' ? payload.reason : action.reason,
    },
  }, prompt ? 'ready' : 'needs_review', [], prompt ? [] : ['prompt'])
}

export function validateProposedActions(actions: AiProposedAction[], ctx: AiActionValidationContext): AiValidatedAction[] {
  return actions
    .slice(0, 3)
    .filter((action) => SUPPORTED_TOOLS.has(action.tool))
    .filter((action) => action.confidence >= 0.55)
    .map((action, index) => {
      const withId = { ...action, id: action.id || `${action.tool}-${index}` }
      if (withId.tool === 'create_budget') return validateCreateBudget(withId, ctx)
      if (withId.tool === 'create_goal') return validateCreateGoal(withId)
      if (withId.tool === 'create_alert') return validateCreateAlert(withId, ctx)
      if (withId.tool === 'open_page') return validateOpenPage(withId)
      return validateAskFollowup(withId)
    })
}
