# Design: BudTrack Chatbot Internal Action Engine

## Summary

BudTrack Finance Assistant should move from “AI gives advice, user manually navigates” to “AI proposes safe, reviewable actions, user approves, backend executes.”

This design adds an internal tool-calling style action engine for chatbot recommendations. The AI can propose up to 3 structured actions per response, such as creating a budget, goal, or alert. Actions are never executed by the AI directly. The frontend renders action cards under the assistant message, the user reviews/edits details in a modal/sheet, and a backend execution endpoint validates ownership and creates the real record.

## Goals

- Make AI recommendations directly useful, not just text advice.
- Support hybrid proposed actions in one answer: budget, goal, alert, navigation/follow-up.
- Keep streaming chatbot UX.
- Keep full financial context available to AI.
- Add backend-owned validation and execution.
- Require explicit user approval before writes.
- Fit current BudTrack architecture with minimal unrelated refactor.

## Non-goals

- No autonomous AI writes.
- No destructive actions in v1.
- No update/delete existing records in v1.
- No sample/demo rows in production path.
- No separate agent framework.
- No new dependency unless native validation proves too painful.
- No large UI redesign of chat layout.

## Existing Context

Current relevant files:

- `app/components/FinanceChatbot.tsx`
  - Streams assistant text from `/api/ai/chatbot`.
  - Renders `AnswerCards` for non-streaming/done assistant messages.
- `app/components/chatbot/AnswerCards.tsx`
  - Already renders cards/actions under assistant messages.
  - Supports `prompt`, `navigate`, `copy`, and disabled actions.
- `app/components/chatbot/answer-parser.ts`
  - Uses heuristic markdown parsing for metrics/warnings/actions.
  - Not safe enough for create actions.
- `lib/ai.ts`
  - Owns provider calls, streaming parser, chatbot prompt builder.
- `app/api/ai/chatbot/route.ts`
  - Authenticates user.
  - Builds financial context.
  - Streams assistant response.
- `app/api/budgets/route.ts`
  - Existing budget create endpoint with validation.
- `app/api/goals/route.ts`
  - Existing goal create endpoint.
- `app/api/alerts/*`
  - Alert creation patterns exist, but v1 action engine should use one central execution route.

Current limitation:

```text
AI can recommend “create budget” in markdown, but UI cannot safely create it from structured intent.
```

## High-Level Architecture

```text
User sends chat
  -> /api/ai/chatbot
  -> AI produces streamed markdown answer
  -> AI also produces structured tool-call proposals
  -> backend validates proposals into safe actions
  -> frontend renders action cards under assistant answer
  -> user clicks an action
  -> review modal/sheet opens
  -> user edits/confirms
  -> /api/ai/actions/execute validates again
  -> backend creates Budget/Goal/Alert
  -> frontend shows success + View link
```

Critical boundary:

```text
Chatbot route may propose actions.
Only action execution route may write data.
```

## Data Model / Types

Add shared TS types under:

```text
lib/ai/actions/types.ts
```

Core types:

```ts
export type AiActionTool =
  | 'create_budget'
  | 'create_goal'
  | 'create_alert'
  | 'open_page'
  | 'ask_followup';

export type AiActionStatus =
  | 'proposed'
  | 'ready'
  | 'needs_review'
  | 'executing'
  | 'executed'
  | 'rejected'
  | 'failed';

export interface AiProposedAction<TPayload = unknown> {
  id: string;
  tool: AiActionTool;
  label: string;
  description?: string;
  confidence: number;
  payload: TPayload;
  reason: string;
}

export interface AiValidatedAction<TPayload = unknown> extends AiProposedAction<TPayload> {
  status: AiActionStatus;
  warnings: string[];
  missingFields: string[];
}

export interface AiActionExecutionResult {
  success: boolean;
  tool: AiActionTool;
  entityId?: string;
  entityType?: 'budget' | 'goal' | 'alert';
  viewHref?: string;
  message: string;
}
```

### `create_budget` payload

```ts
export interface CreateBudgetActionPayload {
  walletId: string;
  categoryId?: string;
  categoryName?: string;
  amount: number;
  periodType: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  startDate?: string;
  endDate?: string;
  reason: string;
}
```

### `create_goal` payload

```ts
export interface CreateGoalActionPayload {
  name: string;
  target: number;
  current?: number;
  deadline?: string;
  category?: string;
  description?: string;
  reason: string;
}
```

### `create_alert` payload

```ts
export interface CreateAlertActionPayload {
  type: 'budget_risk' | 'spending_spike' | 'low_balance' | 'custom';
  title: string;
  message: string;
  walletId?: string;
  categoryId?: string;
  categoryName?: string;
  thresholdAmount?: number;
  reason: string;
}
```

### Helper tools

`open_page`:

```ts
export interface OpenPageActionPayload {
  href: '/budgets' | '/goals' | '/transactions' | '/alerts' | '/settings';
  reason: string;
}
```

`ask_followup`:

```ts
export interface AskFollowupActionPayload {
  prompt: string;
  reason: string;
}
```

## AI Tool Proposal Contract

The AI must return user-facing markdown plus optional tool calls.

For streaming compatibility, the backend should not depend on parsing visible markdown for tools. Instead, use a structured event protocol from backend to frontend.

Backend-to-frontend stream events:

```text
event: text
data: {"delta":"markdown chunk"}

event: actions
data: {"actions":[...]}

event: done
data: {}
```

Frontend appends `text.delta` to the assistant message. When `actions` arrives, it stores validated actions on the message.

Provider-side action extraction can be v1 implemented by a final JSON action block inside the AI completion, parsed server-side and never shown to the user:

```text
<BUDTRACK_TOOL_CALLS>
{"actions":[...]}
</BUDTRACK_TOOL_CALLS>
```

The server strips this block before sending final visible text, validates it, and emits validated action events. This is a pragmatic bridge until true provider-native tool calling is wired for every model.

System prompt rules:

```text
You may propose up to 3 BudTrack actions.
Only propose actions grounded in provided financial data.
Never claim action was created.
Never auto-create anything.
If required details are missing, propose ask_followup instead.
Use walletId/categoryId only when present in context.
Each action needs label, reason, confidence, tool, payload.
Confidence must be 0-1.
Do not propose destructive actions.
```

## Backend Modules

### `lib/ai/actions/registry.ts`

Purpose: central list of supported tools.

Each registry entry defines:

```ts
{
  tool: AiActionTool;
  label: string;
  maxPerResponse?: number;
  validate: (input, context) => Promise<AiValidatedAction>;
  execute?: (payload, context) => Promise<AiActionExecutionResult>;
}
```

This keeps action logic out of `FinanceChatbot.tsx` and out of `app/api/ai/chatbot/route.ts`.

### `lib/ai/actions/validate.ts`

Validates proposals before UI sees them.

Rules:

- Max 3 actions per assistant response.
- Unknown tool rejected.
- `confidence < 0.55` rejected or downgraded to `needs_review`.
- `amount`, `target`, `thresholdAmount` must be positive finite numbers.
- `walletId` must belong to session user.
- `categoryId` must belong to session user.
- `categoryName` may be resolved to existing category; if ambiguous, mark `needs_review`.
- `reason` required.
- Label required and length capped.
- Payload strips unknown fields.

### `lib/ai/actions/executors.ts`

Execution functions:

- `executeCreateBudgetAction`
- `executeCreateGoalAction`
- `executeCreateAlertAction`

These use Prisma directly or share existing service functions if available. Avoid calling internal HTTP routes from server code.

### `/app/api/ai/actions/execute/route.ts`

Single write endpoint for AI action execution.

Input:

```json
{
  "tool": "create_budget",
  "payload": {
    "walletId": "...",
    "categoryId": "...",
    "amount": 750000,
    "periodType": "MONTHLY"
  }
}
```

Behavior:

1. Authenticate session.
2. Validate tool and payload against user ownership.
3. Execute create action.
4. Return result.

Response:

```json
{
  "success": true,
  "tool": "create_budget",
  "entityType": "budget",
  "entityId": "...",
  "viewHref": "/budgets/...",
  "message": "Budget created"
}
```

## Frontend Design

### Message type

Extend `ChatMessage` in:

```text
app/components/chatbot/types.ts
```

Add:

```ts
actions?: AiValidatedAction[];
```

### Stream reader

`FinanceChatbot.tsx` currently reads plain text chunks. Upgrade to parse SSE-style events:

```text
text event -> append to message.content
actions event -> set message.actions
done event -> finalize message
error event -> show error state
```

Keep compatibility: if response content-type is `text/plain`, fallback to old text streaming reader.

### Action rendering

Upgrade `AnswerCards.tsx` or add:

```text
app/components/chatbot/ActionCards.tsx
app/components/chatbot/ActionReviewSheet.tsx
```

Render under assistant answer:

```text
Suggested actions
[Create Budget: Makan Rp750.000]
[Create Goal: Dana Darurat Rp3.000.000]
[Create Alert: Makan > Rp100.000]
```

Use mobile-first bottom sheet behavior if existing dialog/sheet component exists; otherwise use current dialog primitives.

### Review modal/sheet

Fields per action:

`create_budget`:

- wallet select/read-only default
- category select/search
- amount
- period type
- start/end date
- reason

`create_goal`:

- name
- target
- current
- deadline
- category
- description

`create_alert`:

- title
- message
- threshold amount
- category/wallet if present
- reason

Primary button:

```text
Create Budget / Create Goal / Create Alert
```

After success:

```text
Action card status: executed
Button: View Budget / View Goal / View Alert
```

## UX Placement

Based on current chat screenshot and layout:

- Place action cards inside assistant bubble, after rendered markdown.
- Keep cards compact, pill/card hybrid.
- On mobile, use horizontal scroll or stacked compact cards.
- Do not place create actions only in right rail; rail is summary context, while action belongs to answer.
- Keep max 3 action cards to avoid clutter.

## Safety / Data Integrity

Hard rules:

- AI cannot execute writes.
- User must click and confirm.
- Backend validates session ownership on execute.
- Backend revalidates edited payload, does not trust frontend.
- No create with unknown wallet.
- No category auto-create in v1 unless user explicitly confirms in review modal.
- No production sample/seed fallback.
- No destructive tool types in v1.
- No hidden execution during stream.
- Audit logs optional v1.1, but execution result should be visible in chat state.

Live-service safety for implementation:

- Use isolated branch/worktree where practical.
- Run `npm test` and `npm run build` before restart.
- Snapshot DB before schema changes. This design can avoid schema changes in v1 by storing actions only in client chat history and executing directly.
- If persistent action audit is added later, create migration separately.

## Error Handling

Action proposal validation errors:

- Invalid actions are dropped or shown disabled with reason.
- If all actions invalid, assistant answer still renders.

Execution errors:

- Show toast + inline card error.
- Keep review modal data intact so user can edit and retry.
- Return structured backend error:

```json
{
  "success": false,
  "error": "Invalid category",
  "field": "categoryId"
}
```

Provider errors:

- If AI text succeeds but actions malformed, keep text and omit actions.
- Log action parsing failure server-side with no secrets.

## Testing Strategy

Unit tests:

- Parse/extract tool calls from AI response.
- Validate max 3 actions.
- Reject unknown tool.
- Reject invalid amount/target.
- Reject foreign wallet/category.
- Resolve category by name.

API tests or focused smoke:

- Execute create budget with valid payload.
- Execute create goal with valid payload.
- Execute create alert with valid payload.
- Reject unauthenticated execute.

Frontend verification:

- Fresh chat response with 2-3 proposed actions renders cards.
- Clicking action opens review sheet.
- Edited payload submits.
- Success card shows View link.
- Streaming text still appears progressively before actions arrive.

Regression checks:

```bash
npm test
npm run build
```

Live smoke:

- Login QA user.
- Ask: “audit pengeluaran dan buatin action plan yang bisa langsung gw apply.”
- Confirm answer streams.
- Confirm action cards appear.
- Create one budget from card.
- Confirm budget appears in `/budgets`.

## Incremental Build Plan

### Phase 1 — Engine skeleton

- Add action types.
- Add registry/validators.
- Add action extraction from AI response.
- Emit `actions` event from chatbot route.
- Frontend can render disabled validated cards.

### Phase 2 — Execute route

- Add `/api/ai/actions/execute`.
- Implement `create_budget`, `create_goal`, `create_alert` executors.
- Add backend validation.

### Phase 3 — Review UI

- Add action cards and review sheet.
- Submit edited payload to execute route.
- Show success/failure state.

### Phase 4 — Prompt polish

- Tune chatbot prompt to propose useful, grounded actions.
- Cap to 3 actions.
- Prefer high confidence.
- Use `ask_followup` when missing info.

## Open Questions

- Should action proposal history be persisted server-side, or is local chat history enough for v1?
- Should category auto-create be allowed if AI proposes a category not found?
- Should alerts use existing `Alert` model only, or a richer alert-rule model later?

Recommended v1 answers:

- Do not persist proposals server-side yet.
- Do not auto-create categories unless user explicitly confirms later.
- Use existing `Alert` model for v1; add alert rules later only if needed.

## Spec Self-Review

- No placeholders left.
- Scope is tool-calling action engine, not heuristic parser.
- User approval required for all writes.
- Existing streaming architecture preserved.
- Existing BudTrack files and APIs referenced.
- No destructive/data-loss operation introduced.
- No production sample/seed fallback.
- Testing and live QA requirements included.
