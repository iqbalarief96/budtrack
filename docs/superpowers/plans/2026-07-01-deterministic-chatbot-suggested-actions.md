# Deterministic Chatbot Suggested Actions

## Goal

Replace LLM-only Suggested Actions with app-controlled action generation.

Current bad flow:

```text
User prompt -> LLM maybe emits hidden JSON -> backend parses -> UI shows disabled technical chips
```

Target flow:

```text
User prompt -> deterministic intent detector -> action skeleton -> LLM/extractor fills details -> resolver maps wallet/category -> UI asks for missing human inputs -> user approves -> backend executes
```

## Non-goals

- No automatic budget/goal/alert creation without user approval.
- No broad chatbot redesign.
- No new dependency for fuzzy matching.
- No DB schema migration in first pass.

## Acceptance criteria

- Same user command reliably produces a Suggested Action when intent is clear.
- `walletId`, `categoryId`, `prompt` no longer shown raw in UI.
- Missing category appears as `Pilih kategori dulu` with category picker.
- Missing amount appears as `Isi nominal dulu` with amount input.
- Missing wallet appears as `Pilih wallet dulu`.
- Raw `<BUDTRACK_TOOL_CALLS>` never renders.
- Existing LLM tool-call path still works as fallback.
- Unit tests cover detector, resolver, validator, and partial tool tag stripping.
- Build passes before deploy.

## Current files

- `lib/ai.ts`
  - Prompt construction
  - `parseChatbotToolCalls()`
  - Streaming route uses parser output
- `lib/ai/actions/extract.ts`
  - Strip/extract hidden tool tags
- `lib/ai/actions/types.ts`
  - Action tool/status/payload types
- `lib/ai/actions/context.ts`
  - User wallet/category validation context
- `lib/ai/actions/validate.ts`
  - Validate and normalize actions
- `lib/ai/actions/executors.ts`
  - Execute approved actions
- `app/api/ai/chatbot/route.ts`
  - Chatbot API + SSE action event
- `app/api/ai/actions/execute/route.ts`
  - Re-validates before execution
- `app/components/chatbot/ActionCards.tsx`
  - Suggested Action UI
- `lib/ai/actions/__tests__/*.test.ts`
  - Existing tests

## Phase 1 — Action model: needs_input not technical needs_review

### 1.1 Update `AiActionStatus`

File: `lib/ai/actions/types.ts`

Change:

```ts
export type AiActionStatus =
  | 'proposed'
  | 'ready'
  | 'needs_input'
  | 'blocked'
  | 'needs_review'
  | 'executing'
  | 'executed'
  | 'rejected'
  | 'failed'
```

Keep `needs_review` temporarily for backward compatibility.

### 1.2 Add input issue metadata

File: `lib/ai/actions/types.ts`

Add:

```ts
export type AiActionInputField = 'walletId' | 'categoryId' | 'amount' | 'target' | 'title' | 'message' | 'prompt' | 'href'

export interface AiActionInputIssue {
  field: AiActionInputField
  label: string
  kind: 'select_wallet' | 'select_category' | 'money' | 'text' | 'navigation'
}
```

Extend validated action:

```ts
export interface AiValidatedAction<TPayload = unknown> extends AiProposedAction<TPayload> {
  status: AiActionStatus
  warnings: string[]
  missingFields: string[]
  inputIssues?: AiActionInputIssue[]
}
```

### 1.3 Add friendly field mapping

File: `lib/ai/actions/validate.ts`

Add helper:

```ts
const FIELD_LABELS: Record<string, { label: string; kind: AiActionInputIssue['kind'] }> = {
  walletId: { label: 'Pilih wallet dulu', kind: 'select_wallet' },
  categoryId: { label: 'Pilih kategori dulu', kind: 'select_category' },
  amount: { label: 'Isi nominal dulu', kind: 'money' },
  target: { label: 'Isi target dulu', kind: 'money' },
  title: { label: 'Isi judul dulu', kind: 'text' },
  message: { label: 'Isi pesan dulu', kind: 'text' },
  prompt: { label: 'Lengkapi pertanyaan dulu', kind: 'text' },
  href: { label: 'Pilih halaman dulu', kind: 'navigation' },
}

function inputIssues(fields: string[]): AiActionInputIssue[] {
  return fields.map((field) => ({
    field: field as AiActionInputField,
    label: FIELD_LABELS[field]?.label ?? `Lengkapi ${field}`,
    kind: FIELD_LABELS[field]?.kind ?? 'text',
  }))
}
```

Update `base()`:

```ts
function base<TPayload>(
  action: AiProposedAction<TPayload>,
  status: AiValidatedAction['status'],
  warnings: string[],
  missingFields: string[]
): AiValidatedAction<TPayload> {
  return {
    ...action,
    label: action.label.slice(0, 120),
    reason: action.reason.slice(0, 500),
    status,
    warnings,
    missingFields,
    inputIssues: inputIssues(missingFields),
  }
}
```

Status rule:

```ts
function actionStatus(missingFields: string[], warnings: string[]): AiActionStatus {
  if (warnings.some((warning) => /not found|ambiguous/i.test(warning))) return 'needs_input'
  if (missingFields.length) return 'needs_input'
  return 'ready'
}
```

Use this in validators.

## Phase 2 — Context: expose wallets/categories for UI completion

### 2.1 Extend validation context

File: `lib/ai/actions/types.ts`

```ts
export interface AiActionOption {
  id: string
  name: string
}

export interface AiActionValidationContext {
  userId: string
  defaultWalletId?: string
  walletIds: string[]
  categoryIds: string[]
  wallets: AiActionOption[]
  categories: AiActionOption[]
  categoriesByName: Map<string, { id: string; name: string }[]>
}
```

### 2.2 Return full options

File: `lib/ai/actions/context.ts`

```ts
return {
  userId,
  defaultWalletId: defaultWalletId && wallets.some((wallet) => wallet.id === defaultWalletId) ? defaultWalletId : undefined,
  walletIds: wallets.map((wallet) => wallet.id),
  categoryIds: categories.map((category) => category.id),
  wallets,
  categories,
  categoriesByName,
}
```

## Phase 3 — Category resolver: exact, case-insensitive, alias, fuzzy

### 3.1 Create resolver file

File: `lib/ai/actions/resolve.ts`

```ts
import type { AiActionValidationContext } from './types'

const CATEGORY_ALIASES: Record<string, string[]> = {
  makan: ['makan', 'food', 'kuliner', 'resto', 'restaurant'],
  transportasi: ['transport', 'transportasi', 'gojek', 'grab', 'bensin', 'parkir'],
  belanja: ['belanja', 'shopping', 'shop', 'marketplace'],
  tagihan: ['tagihan', 'bill', 'bills', 'listrik', 'internet', 'air'],
  tabungan: ['tabungan', 'saving', 'savings', 'nabung'],
}

function normalize(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, ' ')
}

function scoreName(query: string, candidate: string) {
  const q = normalize(query)
  const c = normalize(candidate)
  if (!q || !c) return 0
  if (q === c) return 1
  if (c.includes(q) || q.includes(c)) return 0.85

  const qTokens = new Set(q.split(' '))
  const cTokens = new Set(c.split(' '))
  const shared = [...qTokens].filter((token) => cTokens.has(token)).length
  return shared / Math.max(qTokens.size, cTokens.size)
}

export function resolveCategoryId(categoryName: string | undefined, ctx: AiActionValidationContext) {
  if (!categoryName) return { id: undefined, ambiguous: false }

  const direct = ctx.categoriesByName.get(categoryName.toLowerCase()) ?? []
  if (direct.length === 1) return { id: direct[0].id, ambiguous: false }
  if (direct.length > 1) return { id: undefined, ambiguous: true }

  const normalized = normalize(categoryName)
  const aliasKey = Object.entries(CATEGORY_ALIASES).find(([, aliases]) => aliases.some((alias) => normalize(alias) === normalized))?.[0]
  const query = aliasKey ?? categoryName

  const ranked = ctx.categories
    .map((category) => ({ category, score: scoreName(query, category.name) }))
    .filter((item) => item.score >= 0.75)
    .sort((a, b) => b.score - a.score)

  if (ranked.length === 1) return { id: ranked[0].category.id, ambiguous: false }
  if (ranked.length > 1 && ranked[0].score > ranked[1].score) return { id: ranked[0].category.id, ambiguous: false }
  return { id: undefined, ambiguous: ranked.length > 1 }
}
```

### 3.2 Use resolver in validator

File: `lib/ai/actions/validate.ts`

Replace category name lookup with:

```ts
const resolved = resolveCategoryId(categoryName, ctx)
if (!categoryId && resolved.id) resolvedCategoryId = resolved.id
if (!categoryId && resolved.ambiguous) warnings.push('Category name is ambiguous')
```

## Phase 4 — Deterministic intent detector

### 4.1 Create detector

File: `lib/ai/actions/detect.ts`

```ts
import type { AiProposedAction } from './types'

function parseMoney(text: string) {
  const match = text.match(/(?:rp\s*)?([0-9][0-9.,]*)\s*(juta|jt|ribu|rb|k)?/i)
  if (!match) return undefined
  const raw = Number(match[1].replace(/[.,]/g, ''))
  if (!Number.isFinite(raw) || raw <= 0) return undefined
  const unit = match[2]?.toLowerCase()
  if (unit === 'juta' || unit === 'jt') return raw * 1_000_000
  if (unit === 'ribu' || unit === 'rb' || unit === 'k') return raw * 1_000
  return raw
}

function categoryAfterKeyword(text: string) {
  const match = text.match(/(?:budget|kategori|untuk|buat)\s+([a-zA-Z\s]{3,40})(?:\s+(?:rp|sebesar|bulan|minggu|tahun)|$)/i)
  return match?.[1]?.trim()
}

export function detectSuggestedActions(prompt: string): AiProposedAction[] {
  const text = prompt.toLowerCase()
  const actions: AiProposedAction[] = []

  if (/\b(buat|bikin|set|atur)\b.*\bbudget\b|\bbudget\b.*\b(buat|bikin|set|atur)\b/i.test(prompt)) {
    actions.push({
      id: 'detected-create-budget',
      tool: 'create_budget',
      label: 'Buat budget',
      confidence: 1,
      reason: 'User asked to create or set a budget',
      payload: {
        categoryName: categoryAfterKeyword(prompt),
        amount: parseMoney(prompt),
        periodType: text.includes('minggu') ? 'WEEKLY' : text.includes('tahun') ? 'YEARLY' : 'MONTHLY',
        reason: 'Detected from user request',
      },
    })
  }

  if (/\b(buat|bikin|set)\b.*\b(goal|target|nabung)\b|\b(goal|target|nabung)\b.*\b(buat|bikin|set)\b/i.test(prompt)) {
    actions.push({
      id: 'detected-create-goal',
      tool: 'create_goal',
      label: 'Buat goal',
      confidence: 1,
      reason: 'User asked to create a saving goal',
      payload: {
        name: prompt.replace(/^(buat|bikin|set)\s+/i, '').slice(0, 80),
        target: parseMoney(prompt),
        reason: 'Detected from user request',
      },
    })
  }

  if (/\b(buat|bikin|set)\b.*\b(alert|ingatkan|reminder)\b|\b(alert|ingatkan|reminder)\b.*\b(buat|bikin|set)\b/i.test(prompt)) {
    actions.push({
      id: 'detected-create-alert',
      tool: 'create_alert',
      label: 'Buat alert',
      confidence: 1,
      reason: 'User asked to create an alert',
      payload: {
        type: 'custom',
        title: 'Alert BudTrack',
        message: prompt,
        thresholdAmount: parseMoney(prompt),
        reason: 'Detected from user request',
      },
    })
  }

  return actions.slice(0, 3)
}
```

### 4.2 Merge detected + LLM actions

File: `app/api/ai/chatbot/route.ts`

Import:

```ts
import { detectSuggestedActions } from '@/lib/ai/actions/detect'
```

Replace final action build:

```ts
const actionContext = await getAiActionValidationContext(user.id, walletId)
const detectedActions = detectSuggestedActions(trimmedPrompt)
const actions = validateProposedActions([...detectedActions, ...parsed.proposedActions], actionContext)
```

This makes same command reliably produce action even when LLM omits tool tag.

## Phase 5 — UI: fill missing inputs instead of disabled chips

### 5.1 Add friendly reason helper

File: `app/components/chatbot/ActionCards.tsx`

```tsx
function actionIssueText(action: AiValidatedAction) {
  const issues = action.inputIssues ?? []
  if (issues.length > 0) return issues.map((issue) => issue.label).join(' • ')
  if (action.warnings.length > 0) return action.warnings.join(' • ')
  return ''
}
```

Replace:

```tsx
const disabledReason = action.warnings.concat(action.missingFields).join(', ')
```

With:

```tsx
const disabledReason = actionIssueText(action)
```

### 5.2 Do not disable needs_input chip

Replace:

```tsx
disabled={executingId === action.id || action.status === 'needs_review'}
```

With:

```tsx
disabled={executingId === action.id || action.status === 'blocked'}
```

### 5.3 Approve disabled only when not ready

Replace:

```tsx
disabled={!reviewAction || executingId === reviewAction.id || reviewAction.status === 'needs_review'}
```

With:

```tsx
disabled={!reviewAction || executingId === reviewAction.id || reviewAction.status !== 'ready'}
```

### 5.4 Add local editable payload state

Still in `ActionCards.tsx`, keep minimal first pass:

```tsx
const [draftPayloadById, setDraftPayloadById] = useState<Record<string, Record<string, unknown>>>({})

function draftPayload(action: AiValidatedAction) {
  return draftPayloadById[action.id] ?? (action.payload as Record<string, unknown>)
}

function updateDraft(action: AiValidatedAction, key: string, value: unknown) {
  setDraftPayloadById((current) => ({
    ...current,
    [action.id]: {
      ...(current[action.id] ?? action.payload as Record<string, unknown>),
      [key]: value,
    },
  }))
}
```

Pass draft payload to execute:

```tsx
body: JSON.stringify({ actionId: action.id, tool: action.tool, label: action.label, payload: draftPayload(action) })
```

### 5.5 Render inputs in dialog

Initial minimal fields:

```tsx
{reviewAction?.inputIssues?.map((issue) => {
  if (issue.kind === 'money') {
    return (
      <label key={issue.field} className="block text-sm">
        <span className="font-medium text-slate-700">{issue.label}</span>
        <input
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          inputMode="numeric"
          onChange={(event) => updateDraft(reviewAction, issue.field, Number(event.target.value.replace(/\D/g, '')))}
        />
      </label>
    )
  }

  return (
    <div key={issue.field} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      {issue.label}
    </div>
  )
})}
```

Phase 5.5 is intentionally simple. Dropdowns come in Phase 6 once options are in action payload/meta.

## Phase 6 — Category dropdown

### 6.1 Include category options on action needing category

Option A (smallest): append `categoryOptions` to payload only when missing `categoryId`.

File: `lib/ai/actions/validate.ts`

```ts
const clean: CreateBudgetActionPayload & { categoryOptions?: { id: string; name: string }[] } = {
  ...,
  categoryOptions: resolvedCategoryId ? undefined : ctx.categories,
}
```

Better future: put options in `inputIssues[].options`, but this needs type change.

### 6.2 Render select

File: `ActionCards.tsx`

```tsx
if (issue.kind === 'select_category') {
  const options = (draftPayload(reviewAction).categoryOptions ?? []) as { id: string; name: string }[]
  return (
    <label key={issue.field} className="block text-sm">
      <span className="font-medium text-slate-700">Pilih kategori dulu</span>
      <select
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
        onChange={(event) => updateDraft(reviewAction, 'categoryId', event.target.value)}
      >
        <option value="">Pilih kategori</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
    </label>
  )
}
```

### 6.3 Revalidate on execute

Already covered by `app/api/ai/actions/execute/route.ts`. It re-runs `validateProposedActions()` before execution.

## Phase 7 — Tests

### 7.1 Detector tests

File: `lib/ai/actions/__tests__/detect.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { detectSuggestedActions } from '../detect'

describe('detectSuggestedActions', () => {
  it('detects create budget intent', () => {
    const [action] = detectSuggestedActions('buat budget makan 750 ribu bulan ini')
    expect(action.tool).toBe('create_budget')
    expect((action.payload as any).amount).toBe(750000)
    expect((action.payload as any).periodType).toBe('MONTHLY')
  })

  it('detects create goal intent', () => {
    const [action] = detectSuggestedActions('bikin goal nabung 5 juta')
    expect(action.tool).toBe('create_goal')
    expect((action.payload as any).target).toBe(5000000)
  })
})
```

### 7.2 Resolver tests

File: `lib/ai/actions/__tests__/resolve.test.ts`

Cover:
- exact match
- case-insensitive match
- alias match
- ambiguous match
- no match

### 7.3 Validator tests

Update `lib/ai/actions/__tests__/validate.test.ts`:

- missing category returns `needs_input`
- input issue label is `Pilih kategori dulu`
- selected wallet still auto-filled
- ready action remains executable

### 7.4 Existing extractor tests stay

Already cover partial tool tag stripping.

## Phase 8 — Verification commands

Run focused tests:

```bash
npx vitest run \
  lib/ai/actions/__tests__/extract.test.ts \
  lib/ai/actions/__tests__/validate.test.ts \
  lib/ai/actions/__tests__/detect.test.ts \
  lib/ai/actions/__tests__/resolve.test.ts
```

Expected:

```text
Test Files  4 passed
Tests       all passed
```

Build:

```bash
npm run build
```

Expected:

```text
✓ Compiled successfully
```

Known pre-existing warnings allowed:

```text
Attempted import error: 'prisma' is not exported from '@/lib/prisma'
Dynamic server usage
Browserslist old
OPENAI_API_KEY not set
```

Deploy:

```bash
git status --short
git add lib/ai/actions app/api/ai/chatbot/route.ts app/components/chatbot/ActionCards.tsx
git commit -m "feat: deterministic chatbot suggested actions"
sudo systemctl restart budtrack.service
sleep 3
systemctl is-active budtrack.service
curl -sS https://budtrack.iqbalarif.me/chatbot -o /tmp/budtrack-chatbot-actions.html
grep -o '/_next/static/chunks/app/chatbot/page-[^" ]*\.js' /tmp/budtrack-chatbot-actions.html | head -1
```

Expected:

```text
active
/_next/static/chunks/app/chatbot/page-*.js
```

## Phase 9 — Manual QA

Use authenticated browser session.

| Scenario | Expected |
|---|---|
| `buat budget makan 750 ribu bulan ini` | Suggested Action appears every time |
| Category exact match exists | action ready or approveable |
| Category missing/unknown | dialog says `Pilih kategori dulu`, not `categoryId` |
| Amount missing | dialog says `Isi nominal dulu` |
| `bikin goal nabung 5 juta` | Suggested goal action appears |
| Normal finance question | no forced action unless intent detected |
| LLM emits tool tag | raw tag hidden, action parsed |

## Rollback

If UI breaks:

```bash
git revert HEAD
npm run build
sudo systemctl restart budtrack.service
```

If only action detector too aggressive:

- Temporarily remove detected actions merge in `app/api/ai/chatbot/route.ts`:

```ts
const actions = validateProposedActions(parsed.proposedActions, actionContext)
```

## Commit plan

1. `feat: add chatbot action detector and resolver`
2. `feat: collect missing chatbot action inputs`
3. `fix: hide technical action validation labels`
4. `test: cover deterministic chatbot actions`

## Risk notes

- Regex money parser can misread unrelated numbers. Keep detector only on explicit action verbs.
- Fuzzy category matching can choose wrong category. Use threshold and ambiguity fallback.
- Do not auto-execute. User approval remains mandatory.
