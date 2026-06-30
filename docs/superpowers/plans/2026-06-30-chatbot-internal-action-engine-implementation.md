# Plan: Implement BudTrack Chatbot Internal Action Engine

## Source spec

`docs/superpowers/specs/2026-06-30-chatbot-internal-action-engine-design.md`

## Goal

Implement a tool-calling style internal action engine for BudTrack Finance Assistant:

- AI may propose up to 3 safe actions per answer.
- Supported v1 tools: `create_budget`, `create_goal`, `create_alert`, `open_page`, `ask_followup`.
- AI never writes data.
- User reviews/edits action in UI.
- Backend validates ownership and executes create action only after user confirmation.
- Keep current streaming chat behavior.
- No schema migration in v1.

## Constraints

- Keep scope tight.
- No destructive tools.
- No auto-create from chatbot stream.
- No sample/demo production rows.
- No new dependency unless absolutely needed; use TypeScript + native checks.
- Use existing branch unless user says otherwise: `fix/chatbot-streaming-full-context`.
- Preserve existing `text/plain` streaming fallback until SSE path verified.
- Do not touch untracked `prisma/_db_snapshots_20260629_213508/`.

## Decision table

| Original option | Feature name | User decision |
|---|---|---|
| 1 | Heuristic parser from markdown AI | Rejected |
| 2 | Structured actions from AI JSON side-channel | Rejected as not enough |
| 3 | Tool-calling style internal action engine | Accepted: “Jgn tanggung tanggung” |

## Implementation phases

1. Backend action types + parser + validator + tests.
2. Execution endpoint + tests.
3. Streaming route emits SSE text/actions/done events.
4. Frontend reads SSE, stores message actions, renders cards.
5. Review modal executes create actions.
6. Prompt polish + live QA.

---

## Task 0 — Preflight

Run:

```bash
cd /home/iqbalarief96/projects/budtrack
git status --short --branch
git log --oneline -3
```

Expected:

```text
## fix/chatbot-streaming-full-context
127af71 docs: design chatbot internal action engine
76a949a fix: stream chatbot responses
```

If branch differs or there are unexpected tracked changes, stop and ask.

---

## Task 1 — Add action engine types

Create: `lib/ai/actions/types.ts`

```ts
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
```

Update: `app/components/chatbot/types.ts`

Add import:

```ts
import type { AiValidatedAction } from '@/lib/ai/actions/types';
```

Add field to `ChatMessage`:

```ts
actions?: AiValidatedAction[];
```

Update `AnswerAction.kind`:

```ts
kind: 'prompt' | 'navigate' | 'copy' | 'disabled' | 'execute_tool';
```

Verification:

```bash
npm run build
```

Expected: compiles; existing unrelated warnings okay.

Commit:

```bash
git add lib/ai/actions/types.ts app/components/chatbot/types.ts
git commit -m "feat: add chatbot action engine types"
```

---

## Task 2 — Add tool-call extraction helpers

Create: `lib/ai/actions/extract.ts`

```ts
import type { AiProposedAction } from './types'

const TOOL_CALLS_RE = /<BUDTRACK_TOOL_CALLS>\s*([\s\S]*?)\s*<\/BUDTRACK_TOOL_CALLS>/i

function safeJson(text: string): unknown | null {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export function stripToolCalls(text: string): string {
  return text.replace(TOOL_CALLS_RE, '').trim()
}

export function extractToolCalls(text: string): AiProposedAction[] {
  const match = text.match(TOOL_CALLS_RE)
  if (!match) return []

  const parsed = safeJson(match[1])
  if (!parsed || typeof parsed !== 'object') return []

  const actions = (parsed as { actions?: unknown }).actions
  if (!Array.isArray(actions)) return []

  return actions
    .filter((item): item is AiProposedAction => {
      if (!item || typeof item !== 'object') return false
      const action = item as Partial<AiProposedAction>
      return typeof action.tool === 'string'
        && typeof action.label === 'string'
        && typeof action.reason === 'string'
        && typeof action.confidence === 'number'
        && action.payload !== undefined
    })
    .slice(0, 3)
}

export const __actionExtractTest = {
  TOOL_CALLS_RE,
}
```

Create unit test: `lib/ai/actions/__tests__/extract.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { extractToolCalls, stripToolCalls } from '../extract'

describe('action tool extraction', () => {
  it('extracts tool calls and strips marker from markdown', () => {
    const text = `Halo\n<BUDTRACK_TOOL_CALLS>{"actions":[{"id":"a1","tool":"create_goal","label":"Create goal","confidence":0.9,"reason":"Need saving","payload":{"name":"Dana Darurat","target":1000000,"reason":"Need saving"}}]}</BUDTRACK_TOOL_CALLS>`

    expect(stripToolCalls(text)).toBe('Halo')
    expect(extractToolCalls(text)).toHaveLength(1)
    expect(extractToolCalls(text)[0].tool).toBe('create_goal')
  })

  it('returns empty actions on malformed JSON', () => {
    expect(extractToolCalls('<BUDTRACK_TOOL_CALLS>{bad}</BUDTRACK_TOOL_CALLS>')).toEqual([])
  })

  it('caps actions to 3', () => {
    const action = (id: string) => ({ id, tool: 'ask_followup', label: id, confidence: 1, reason: 'x', payload: { prompt: 'x', reason: 'x' } })
    const text = `<BUDTRACK_TOOL_CALLS>${JSON.stringify({ actions: [action('1'), action('2'), action('3'), action('4')] })}</BUDTRACK_TOOL_CALLS>`
    expect(extractToolCalls(text)).toHaveLength(3)
  })
})
```

Run:

```bash
npx vitest run lib/ai/actions/__tests__/extract.test.ts
```

Commit:

```bash
git add lib/ai/actions/extract.ts lib/ai/actions/__tests__/extract.test.ts
git commit -m "feat: extract chatbot tool calls"
```

---

## Task 3 — Add validator and context loader

Create: `lib/ai/actions/validate.ts`

```ts
import type {
  AiActionValidationContext,
  AiProposedAction,
  AiValidatedAction,
  CreateAlertActionPayload,
  CreateBudgetActionPayload,
  CreateGoalActionPayload,
} from './types'

const SUPPORTED_TOOLS = new Set(['create_budget', 'create_goal', 'create_alert', 'open_page', 'ask_followup'])

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function base(action: AiProposedAction, status: AiValidatedAction['status'], warnings: string[], missingFields: string[]): AiValidatedAction {
  return {
    ...action,
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
  if (categoryId && !ctx.categoryIds.includes(categoryId)) warnings.push('Category not found for user')
  if (!categoryId && categoryName) {
    const matches = ctx.categoriesByName.get(categoryName.toLowerCase()) ?? []
    if (matches.length === 1) payload.categoryId = matches[0].id
    if (matches.length > 1) warnings.push('Category name is ambiguous')
  }

  if (!isPositiveNumber(payload.amount)) missingFields.push('amount')

  const periodType = payload.periodType === 'WEEKLY' || payload.periodType === 'YEARLY' ? payload.periodType : 'MONTHLY'

  const clean: CreateBudgetActionPayload = {
    walletId,
    categoryId: typeof payload.categoryId === 'string' ? payload.categoryId : categoryId,
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
    name: typeof payload.name === 'string' ? payload.name.slice(0, 120) : '',
    target: typeof payload.target === 'number' ? payload.target : 0,
    current: typeof payload.current === 'number' && payload.current >= 0 ? payload.current : undefined,
    deadline: typeof payload.deadline === 'string' ? payload.deadline : undefined,
    category: typeof payload.category === 'string' ? payload.category : undefined,
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
    title: typeof payload.title === 'string' ? payload.title.slice(0, 120) : '',
    message: typeof payload.message === 'string' ? payload.message.slice(0, 500) : '',
    walletId,
    categoryId,
    categoryName: typeof payload.categoryName === 'string' ? payload.categoryName : undefined,
    thresholdAmount: isPositiveNumber(payload.thresholdAmount) ? payload.thresholdAmount : undefined,
    reason: typeof payload.reason === 'string' ? payload.reason : action.reason,
  }

  const status = missingFields.length || warnings.length ? 'needs_review' : 'ready'
  return base({ ...action, payload: clean }, status, warnings, missingFields)
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
      return base(withId, 'ready', [], [])
    })
}
```

Create: `lib/ai/actions/context.ts`

```ts
import prisma from '@/lib/prisma'
import type { AiActionValidationContext } from './types'

export async function getAiActionValidationContext(userId: string): Promise<AiActionValidationContext> {
  const [wallets, categories] = await Promise.all([
    prisma.wallet.findMany({ where: { userId }, select: { id: true } }),
    prisma.category.findMany({ where: { userId }, select: { id: true, name: true } }),
  ])

  const categoriesByName = new Map<string, { id: string; name: string }[]>()
  for (const category of categories) {
    const key = category.name.toLowerCase()
    categoriesByName.set(key, [...(categoriesByName.get(key) ?? []), category])
  }

  return {
    userId,
    walletIds: wallets.map((wallet) => wallet.id),
    categoryIds: categories.map((category) => category.id),
    categoriesByName,
  }
}
```

Create tests: `lib/ai/actions/__tests__/validate.test.ts`

Use pure validator, no DB:

```ts
import { describe, expect, it } from 'vitest'
import { validateProposedActions } from '../validate'
import type { AiActionValidationContext } from '../types'

const ctx: AiActionValidationContext = {
  userId: 'u1',
  walletIds: ['w1'],
  categoryIds: ['c1'],
  categoriesByName: new Map([['makan', [{ id: 'c1', name: 'Makan' }]]]),
}

describe('validateProposedActions', () => {
  it('accepts valid create_budget and resolves category name', () => {
    const [action] = validateProposedActions([{
      id: 'a1', tool: 'create_budget', label: 'Budget Makan', confidence: 0.9, reason: 'Top spend',
      payload: { walletId: 'w1', categoryName: 'Makan', amount: 750000, periodType: 'MONTHLY', reason: 'Top spend' },
    }], ctx)

    expect(action.status).toBe('ready')
    expect((action.payload as any).categoryId).toBe('c1')
  })

  it('marks foreign wallet as needs_review', () => {
    const [action] = validateProposedActions([{
      id: 'a1', tool: 'create_budget', label: 'Budget', confidence: 0.9, reason: 'x',
      payload: { walletId: 'foreign', amount: 1, periodType: 'MONTHLY', reason: 'x' },
    }], ctx)
    expect(action.status).toBe('needs_review')
    expect(action.warnings[0]).toContain('Wallet')
  })

  it('drops unsupported or low confidence actions', () => {
    const actions = validateProposedActions([
      { id: 'bad', tool: 'delete_budget' as any, label: 'Bad', confidence: 1, reason: 'x', payload: {} },
      { id: 'low', tool: 'create_goal', label: 'Low', confidence: 0.2, reason: 'x', payload: {} },
    ], ctx)
    expect(actions).toEqual([])
  })
})
```

Run:

```bash
npx vitest run lib/ai/actions/__tests__/validate.test.ts
```

Commit:

```bash
git add lib/ai/actions/validate.ts lib/ai/actions/context.ts lib/ai/actions/__tests__/validate.test.ts
git commit -m "feat: validate chatbot action proposals"
```

---

## Task 4 — Add executors and execute API route

Create: `lib/ai/actions/executors.ts`

```ts
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

async function assertCategory(userId: string, categoryId?: string) {
  if (!categoryId) return
  const category = await prisma.category.findFirst({ where: { id: categoryId, userId }, select: { id: true } })
  if (!category) throw new Error('Category not found')
}

export async function executeCreateBudgetAction(userId: string, payload: CreateBudgetActionPayload): Promise<AiActionExecutionResult> {
  await assertWallet(userId, payload.walletId)
  await assertCategory(userId, payload.categoryId)

  if (!Number.isFinite(payload.amount) || payload.amount <= 0) throw new Error('Invalid budget amount')

  const fallbackRange = monthRange()
  const budget = await prisma.budget.create({
    data: {
      userId,
      walletId: payload.walletId,
      categoryId: payload.categoryId,
      amount: payload.amount,
      spent: 0,
      startDate: payload.startDate ? new Date(payload.startDate) : fallbackRange.startDate,
      endDate: payload.endDate ? new Date(payload.endDate) : fallbackRange.endDate,
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
      deadline: payload.deadline ? new Date(payload.deadline) : null,
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
  await assertCategory(userId, payload.categoryId)
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
```

Create: `app/api/ai/actions/execute/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { executeAiAction } from '@/lib/ai/actions/executors'
import { getAiActionValidationContext } from '@/lib/ai/actions/context'
import { validateProposedActions } from '@/lib/ai/actions/validate'
import type { AiActionTool, AiProposedAction } from '@/lib/ai/actions/types'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const tool = body?.tool as AiActionTool
    const payload = body?.payload

    if (!tool || !payload) {
      return NextResponse.json({ error: 'tool and payload are required' }, { status: 400 })
    }

    const proposed: AiProposedAction = {
      id: typeof body?.actionId === 'string' ? body.actionId : `${tool}-manual`,
      tool,
      label: typeof body?.label === 'string' ? body.label : tool,
      confidence: 1,
      reason: typeof payload?.reason === 'string' ? payload.reason : 'User confirmed AI action',
      payload,
    }

    const ctx = await getAiActionValidationContext(session.user.id)
    const [validated] = validateProposedActions([proposed], ctx)
    if (!validated) {
      return NextResponse.json({ error: 'Unsupported or invalid action' }, { status: 400 })
    }
    if (validated.missingFields.length > 0 || validated.warnings.some((warning) => /not found/i.test(warning))) {
      return NextResponse.json({
        error: 'Action needs review',
        missingFields: validated.missingFields,
        warnings: validated.warnings,
      }, { status: 400 })
    }

    const result = await executeAiAction(session.user.id, validated.tool, validated.payload)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error executing AI action:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to execute action',
    }, { status: 500 })
  }
}
```

Verification:

```bash
npm run build
```

Commit:

```bash
git add lib/ai/actions/executors.ts app/api/ai/actions/execute/route.ts
git commit -m "feat: execute chatbot action tools"
```

---

## Task 5 — Emit SSE events from chatbot route

Update `lib/ai.ts`.

Add exports to build prompt + strip actions:

```ts
import { extractToolCalls, stripToolCalls } from '@/lib/ai/actions/extract'
```

Change `buildChatbotPrompt` from private to exported:

```ts
export function buildChatbotPrompt(params: ChatbotParams): string {
```

Append action instruction before final question in `buildChatbotPrompt`:

```ts
  fullPrompt += "BudTrack action proposal rules:\n"
  fullPrompt += "You may propose up to 3 actions using <BUDTRACK_TOOL_CALLS>{...}</BUDTRACK_TOOL_CALLS> at the very end.\n"
  fullPrompt += "Supported tools: create_budget, create_goal, create_alert, open_page, ask_followup.\n"
  fullPrompt += "Never say an action was created. Never auto-create. User must confirm.\n"
  fullPrompt += "Only propose actions grounded in wallet/category data from context.\n"
  fullPrompt += "If details are missing, propose ask_followup instead.\n"
  fullPrompt += "Tool JSON shape: {\"actions\":[{\"id\":\"...\",\"tool\":\"create_budget\",\"label\":\"...\",\"confidence\":0.8,\"reason\":\"...\",\"payload\":{...}}]}\n\n"
```

Add helper:

```ts
export function parseChatbotToolCalls(text: string) {
  return {
    visibleText: stripToolCalls(text),
    proposedActions: extractToolCalls(text),
  }
}
```

Update `generateChatbotResponse()` to return `visibleText` only:

```ts
const raw = await generateAIResponse(...)
return parseChatbotToolCalls(raw).visibleText
```

Update `app/api/ai/chatbot/route.ts`.

Add imports:

```ts
import { parseChatbotToolCalls } from '@/lib/ai';
import { getAiActionValidationContext } from '@/lib/ai/actions/context';
import { validateProposedActions } from '@/lib/ai/actions/validate';
```

Add helper near bottom:

```ts
function sse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}
```

Replace streaming response body with SSE protocol:

```ts
const stream = new ReadableStream({
  async start(controller) {
    let raw = ''
    try {
      for await (const chunk of streamChatbotResponse(...)) {
        raw += chunk
        const { visibleText } = parseChatbotToolCalls(raw)
        const delta = visibleText.slice(sentText.length)
        if (delta) {
          sentText = visibleText
          controller.enqueue(encoder.encode(sse('text', { delta })))
        }
      }

      const parsed = parseChatbotToolCalls(raw)
      const tail = parsed.visibleText.slice(sentText.length)
      if (tail) controller.enqueue(encoder.encode(sse('text', { delta: tail })))

      const ctx = await getAiActionValidationContext(user.id)
      const actions = validateProposedActions(parsed.proposedActions, ctx)
      if (actions.length) controller.enqueue(encoder.encode(sse('actions', { actions })))

      controller.enqueue(encoder.encode(sse('done', {})))
      controller.close()
    } catch (error) {
      controller.enqueue(encoder.encode(sse('error', { message: error instanceof Error ? error.message : 'Unknown chatbot stream error' })))
      controller.close()
    }
  }
})
```

Important: initialize `let sentText = ''` inside `start()` before loop.

Headers:

```ts
'Content-Type': 'text/event-stream; charset=utf-8'
```

Verification:

```bash
npm run build
```

Commit:

```bash
git add lib/ai.ts app/api/ai/chatbot/route.ts
git commit -m "feat: stream chatbot action events"
```

---

## Task 6 — Update frontend stream reader for SSE + fallback

Update: `app/components/FinanceChatbot.tsx`

Add local SSE parser helper above component:

```ts
function parseSseEvents(buffer: string) {
  const events: Array<{ event: string; data: any }> = [];
  const parts = buffer.split('\n\n');
  const rest = parts.pop() ?? '';

  for (const part of parts) {
    const eventLine = part.split('\n').find((line) => line.startsWith('event:'));
    const dataLine = part.split('\n').find((line) => line.startsWith('data:'));
    if (!eventLine || !dataLine) continue;

    try {
      events.push({
        event: eventLine.slice(6).trim(),
        data: JSON.parse(dataLine.slice(5).trim()),
      });
    } catch {
      // Ignore malformed event.
    }
  }

  return { events, rest };
}
```

In `sendMessage`, after response ok and reader creation, branch:

```ts
const isEventStream = response.headers.get('content-type')?.includes('text/event-stream');
```

If `!isEventStream`, keep current plain text path as fallback.

If event stream:

```ts
let reply = '';
let buffer = '';
let finalActions: AiValidatedAction[] = [];

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const parsed = parseSseEvents(buffer);
  buffer = parsed.rest;

  for (const event of parsed.events) {
    if (event.event === 'text') {
      reply += typeof event.data?.delta === 'string' ? event.data.delta : '';
      setMessages([...baseMessages, { ...placeholder, content: cleanAssistantText(reply), actions: finalActions }]);
    }
    if (event.event === 'actions' && Array.isArray(event.data?.actions)) {
      finalActions = event.data.actions;
      setMessages([...baseMessages, { ...placeholder, content: cleanAssistantText(reply), actions: finalActions }]);
    }
    if (event.event === 'error') {
      throw new Error(event.data?.message || 'Chatbot stream error');
    }
  }
}

const finalReply = cleanAssistantText(reply);
if (!finalReply) throw new Error('Chatbot returned an empty response');

const finalMessage: ChatMessage = {
  ...placeholder,
  content: finalReply,
  actions: finalActions,
  status: 'done',
};
```

Update localStorage restore to preserve `actions` automatically (current JSON parse should already keep unknown fields).

Verification:

```bash
npm run build
```

Commit:

```bash
git add app/components/FinanceChatbot.tsx
git commit -m "feat: read chatbot action event stream"
```

---

## Task 7 — Add ActionCards and basic review execution

Create: `app/components/chatbot/ActionCards.tsx`

```tsx
'use client';

import { useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AiActionExecutionResult, AiValidatedAction } from '@/lib/ai/actions/types';

interface ActionCardsProps {
  actions: AiValidatedAction[];
  onNavigate: (href: string) => void;
  onPrompt: (prompt: string) => void;
}

export function ActionCards({ actions, onNavigate, onPrompt }: ActionCardsProps) {
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, AiActionExecutionResult>>({});

  if (!actions.length) return null;

  async function execute(action: AiValidatedAction) {
    if (action.tool === 'open_page') {
      const href = (action.payload as any)?.href;
      if (href) onNavigate(href);
      return;
    }
    if (action.tool === 'ask_followup') {
      const prompt = (action.payload as any)?.prompt;
      if (prompt) onPrompt(prompt);
      return;
    }

    setExecutingId(action.id);
    try {
      const response = await fetch('/api/ai/actions/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId: action.id, tool: action.tool, label: action.label, payload: action.payload }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to execute action');
      setResults((current) => ({ ...current, [action.id]: data }));
    } finally {
      setExecutingId(null);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-950">
        <Sparkles className="h-4 w-4" /> Suggested actions
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => {
          const result = results[action.id];
          return (
            <Button
              key={action.id}
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full bg-white"
              disabled={executingId === action.id || action.status === 'needs_review'}
              onClick={() => execute(action)}
              title={action.warnings.concat(action.missingFields).join(', ')}
            >
              {executingId === action.id ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : result ? <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> : <ArrowRight className="mr-2 h-3.5 w-3.5" />}
              {result ? result.message : action.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
```

Minimal v1 does direct execute for `ready` actions, disabled for `needs_review`. This respects user click but does not yet offer edit modal. If this feels too risky during implementation, make all create actions open a read-only confirmation first. Full edit modal is Task 8.

Update `FinanceChatbot.tsx`:

Import:

```ts
import { ActionCards } from './chatbot/ActionCards';
```

Render after markdown inside assistant block:

```tsx
{!isUser && message.actions && message.actions.length > 0 && (
  <ActionCards actions={message.actions} onPrompt={sendMessage} onNavigate={router.push} />
)}
```

Place after:

```tsx
{clean && <MarkdownMessage content={clean} />}
```

Verification:

```bash
npm run build
```

Commit:

```bash
git add app/components/chatbot/ActionCards.tsx app/components/FinanceChatbot.tsx
git commit -m "feat: render chatbot action cards"
```

---

## Task 8 — Add review modal/sheet before create actions

This upgrades Task 7 from direct-click execute to confirm/edit.

If existing dialog components exist under `components/ui/dialog`, use them. Check:

```bash
find components/ui -maxdepth 1 -name '*dialog*' -o -name '*sheet*'
```

If dialog exists, create: `app/components/chatbot/ActionReviewDialog.tsx`

Fields:

- For `create_budget`: amount, periodType, reason text, wallet/category read-only labels if IDs present.
- For `create_goal`: name, target, current, deadline, description.
- For `create_alert`: title, message, thresholdAmount.

Keep v1 boring:

- Use `<input>`/`<textarea>` native if no existing form components.
- No category creation.
- No complex searchable selects yet.
- Disabled/missing-field actions can open review, but submit disabled until required fields filled.

Expected interface:

```ts
interface ActionReviewDialogProps {
  action: AiValidatedAction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExecuted: (actionId: string, result: AiActionExecutionResult) => void;
}
```

Patch `ActionCards.tsx`:

- Button click opens dialog for create tools.
- `open_page` and `ask_followup` remain instant.
- Dialog executes `/api/ai/actions/execute`.

Verification:

```bash
npm run build
```

Commit:

```bash
git add app/components/chatbot/ActionReviewDialog.tsx app/components/chatbot/ActionCards.tsx
git commit -m "feat: review chatbot actions before execution"
```

---

## Task 9 — Add focused API execution tests or smoke script

If full API test harness exists, use it. If not, add pure executor validation tests first and a local smoke script under `scripts/` is acceptable.

Create: `lib/ai/actions/__tests__/executors.test.ts` only if mocking Prisma patterns already exist. Search:

```bash
find lib -path '*__tests__*' -type f | grep -E 'prisma|mock' | head
```

If no clean mocking pattern, do not overbuild. Rely on:

```bash
npm test
npm run build
```

Then perform live QA with QA account created during previous stream work:

```text
qa-chatbot-stream@budtrack.local
```

Do not print password in final.

---

## Task 10 — Prompt QA and live smoke

Run full verification:

```bash
npm test
npm run build
sudo systemctl restart budtrack.service
curl -sI https://budtrack.iqbalarif.me/chatbot | head -1
```

Expected:

```text
Test Files ... passed
✓ Compiled successfully
active
HTTP/2 200
```

Browser QA:

1. Login QA user if not already logged in.
2. Set wallet:

```js
localStorage.setItem('selectedWalletId','qa-chatbot-stream-wallet')
localStorage.removeItem('selectedWalletGroupId')
```

3. Ask:

```text
Audit data wallet ini dan kasih action plan yang bisa langsung gw apply: budget, goal, dan alert kalau relevan.
```

4. Verify:

- Text streams progressively.
- Suggested actions section appears.
- Max 3 actions.
- Click one ready action.
- Review dialog opens.
- Confirm creates record.
- Success state appears.
- View link works or at least target route returns 200.

Check logs:

```bash
sudo journalctl -u budtrack.service --since '10 minutes ago' --no-pager | grep -Ei 'ai action|chatbot|error|timed out' | tail -80
```

Expected:

```text
No timeout/error for verified request
```

---

## Task 11 — Final commit and report

Run:

```bash
git status --short
git log --oneline -8
```

Expected only pre-existing untracked snapshot may remain:

```text
?? prisma/_db_snapshots_20260629_213508/
```

If new files are uncommitted, commit them:

```bash
git add <files>
git commit -m "feat: add chatbot internal action engine"
```

Final report must include:

- Branch name.
- Commits made.
- Files changed.
- `npm test` result.
- `npm run build` result.
- Live chatbot status.
- Browser QA evidence.
- Any skipped scope.

## Risks / watchouts

- Provider may not obey marker format. Backend must tolerate malformed/no actions and still render text.
- Streaming marker may leak partially if stripping on every chunk is naive. The plan uses `parseChatbotToolCalls(raw)` and `visibleText.slice(sentText.length)`, but verify marker never appears in UI.
- Direct execute without edit modal is too risky; Task 8 should be completed before final live deploy if actions create real records.
- Existing `BudgetSchema` route may enforce slightly different date/period assumptions; executors use Prisma directly to avoid route coupling. Verify created budget appears in `/budgets`.
- Existing `Alert` model is notification-like, not alert-rule-like. V1 creates an alert record only; richer recurring alert rules should be v1.1.

## Done criteria

- Plan file exists and is committed if requested.
- Action proposals are validated before UI.
- Write execution only happens via `/api/ai/actions/execute` after user click/confirm.
- Create budget/goal/alert all have backend validation.
- Chat streaming still works.
- UI shows action cards under assistant message.
- Review dialog prevents accidental create.
- `npm test` passes.
- `npm run build` passes.
- Live QA confirms at least one created entity from chatbot action.
