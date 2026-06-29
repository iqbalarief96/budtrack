# Chatbot UX Monster Upgrade Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Upgrade BudTrack chatbot from plain chat into financial command center: rich answer cards, action buttons, severity states, context-aware prompts, insight rail, streaming, and safer message actions.

**Architecture:** Keep current `FinanceChatbot` as page owner, split reusable UI/parser helpers into small local files under `app/components/chatbot/`. Reuse existing APIs first; add one lightweight summary endpoint only if existing endpoints cannot provide header/rail data cheaply. No new dependency unless existing `react-markdown`, `remark-gfm`, `lucide-react`, and shadcn UI primitives fail.

**Tech Stack:** Next.js 14 app router, React client components, Tailwind, existing shadcn UI primitives, existing `/api/ai/chatbot`, wallet context, localStorage chat history.

---

## Acceptance Criteria

- Chatbot screen has 2-column desktop layout: chat left, pinned insights right.
- Mobile collapses to single column, insight rail becomes top/bottom cards.
- Assistant response renders finance cards for totals, top categories, debt risk, safe-to-spend, goals, and action items when detectable.
- Critical/warning/info severity visually distinct.
- Header shows selected wallet, current month, data freshness, spending snapshot if available.
- Prompt chips adapt to available insight risks.
- User can stream response progressively, or at minimum see progressive typewriter if backend streaming is deferred.
- Message actions: copy, regenerate, export, save insight placeholder, action buttons.
- Reset hidden behind `...` menu, not primary CTA.
- `npm run build` passes.
- Live `/chatbot` returns 200 after restart.

---

## Non-goals

- Do not rebuild whole BudTrack dashboard.
- Do not add paid analytics/LLM dependency.
- Do not store chat server-side yet.
- Do not make AI mutate money records without explicit confirmation dialog.

---

## Phase 0 — Safety Baseline

### Task 0.1: Snapshot current files

**Objective:** Know exact starting point before big UI changes.

**Files:**
- Read: `app/components/FinanceChatbot.tsx`
- Read: `app/chatbot/page.tsx`
- Read: `app/api/ai/chatbot/route.ts`
- Read: `lib/ai.ts`

**Steps:**
1. Run:
   ```bash
   cd /home/iqbalarief96/projects/budtrack
   git status --short
   git diff -- app/components/FinanceChatbot.tsx app/chatbot/page.tsx app/api/ai/chatbot/route.ts lib/ai.ts
   ```
2. Save output mentally; do not commit unless user asks.
3. Run:
   ```bash
   npm run build
   ```
4. Expected: exit `0` with known existing warnings only.

---

## Phase 1 — Data Model + Response Parsing

### Task 1.1: Add local chatbot types

**Objective:** Stop stringly UI logic. Define UI-level answer shapes.

**Create:** `app/components/chatbot/types.ts`

```ts
export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: Date | string;
  status?: 'sending' | 'streaming' | 'done' | 'error';
}

export type InsightSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface AnswerMetric {
  label: string;
  value: string;
  detail?: string;
  severity?: InsightSeverity;
}

export interface AnswerAction {
  id: string;
  label: string;
  prompt?: string;
  href?: string;
  kind: 'prompt' | 'navigate' | 'copy' | 'disabled';
  severity?: InsightSeverity;
}

export interface ParsedAnswer {
  summary?: string;
  metrics: AnswerMetric[];
  warnings: AnswerMetric[];
  actions: AnswerAction[];
  markdown: string;
}

export interface ChatInsight {
  id: string;
  label: string;
  value: string;
  detail?: string;
  severity: InsightSeverity;
  prompt: string;
}
```

**Verify:**
```bash
npm run build
```
Expected: pass.

---

### Task 1.2: Add finance answer parser

**Objective:** Detect useful numbers/risk phrases from markdown without changing LLM API yet.

**Create:** `app/components/chatbot/answer-parser.ts`

Rules:
- Extract currency: `/Rp\s?[\d.,]+/gi`
- Extract percentages: `/\b\d+(?:[.,]\d+)?%\b/g`
- Critical if content includes: `critical`, `kritis`, `debt`, `utang`, `100%`, `over budget`, `melebihi budget`
- Warning if includes: `warning`, `perhatian`, `risiko`, `boros`, `anomali`
- Success if includes: `aman`, `on track`, `sehat`, `surplus`
- Actions from phrases:
  - create budget → prompt `Bantu buat budget berdasarkan analisis tadi.`
  - set alert → prompt `Bantu set alert untuk risiko tadi.`
  - analyze 3 months → prompt `Analisis 3 bulan terakhir dengan detail.`
  - show transactions → href `/transactions`
  - goals → href `/goals`
  - budgets → href `/budgets`

**Implementation sketch:**
```ts
import type { AnswerAction, AnswerMetric, InsightSeverity, ParsedAnswer } from './types';

const moneyPattern = /Rp\s?[\d.,]+/gi;
const percentPattern = /\b\d+(?:[.,]\d+)?%\b/g;

function detectSeverity(text: string): InsightSeverity | undefined {
  const lower = text.toLowerCase();
  if (/(critical|kritis|utang|debt|over budget|melebihi budget|100%)/i.test(lower)) return 'critical';
  if (/(warning|perhatian|risiko|boros|anomali)/i.test(lower)) return 'warning';
  if (/(aman|on track|sehat|surplus)/i.test(lower)) return 'success';
  return undefined;
}

export function parseAssistantAnswer(markdown: string): ParsedAnswer {
  const clean = markdown.trim();
  const metrics: AnswerMetric[] = [];
  const warnings: AnswerMetric[] = [];
  const actions: AnswerAction[] = [];

  const money = clean.match(moneyPattern) ?? [];
  const percentages = clean.match(percentPattern) ?? [];

  money.slice(0, 4).forEach((value, index) => metrics.push({ label: index === 0 ? 'Main amount' : `Amount ${index + 1}`, value }));
  percentages.slice(0, 3).forEach((value, index) => metrics.push({ label: index === 0 ? 'Main ratio' : `Ratio ${index + 1}`, value, severity: detectSeverity(clean) }));

  const severity = detectSeverity(clean);
  if (severity === 'critical' || severity === 'warning') {
    warnings.push({ label: severity === 'critical' ? 'Critical issue' : 'Needs attention', value: severity.toUpperCase(), detail: clean.split('\n').find(Boolean), severity });
  }

  const lower = clean.toLowerCase();
  if (lower.includes('budget')) actions.push({ id: 'budget', label: 'Open Budgets', href: '/budgets', kind: 'navigate' });
  if (lower.includes('transaction') || lower.includes('pengeluaran')) actions.push({ id: 'transactions', label: 'Show Transactions', href: '/transactions', kind: 'navigate' });
  if (lower.includes('alert') || lower.includes('risiko')) actions.push({ id: 'alert', label: 'Set Alert', prompt: 'Bantu set alert dari risiko yang kamu temukan tadi.', kind: 'prompt', severity });
  actions.push({ id: 'analyze-3m', label: 'Analyze 3 Months', prompt: 'Analisis pengeluaran saya 3 bulan terakhir dengan detail.', kind: 'prompt' });

  return { summary: clean.split('\n').find(Boolean), metrics, warnings, actions: dedupeActions(actions), markdown: clean };
}

function dedupeActions(actions: AnswerAction[]) {
  return Array.from(new Map(actions.map((action) => [action.id, action])).values()).slice(0, 4);
}
```

**Verify:**
- Add one tiny local assert script only if project has no test runner for components:
  ```bash
  node - <<'NODE'
  const text = 'Debt: Rp10.000, 100% spending. Critical issue. Create budget.'
  console.log(/Rp\s?[\d.,]+/gi.test(text) && /critical/i.test(text))
  NODE
  ```
- Then `npm run build`.

---

## Phase 2 — Rich Answer UI

### Task 2.1: Add severity style helpers

**Objective:** One source for critical/warning/info/success classes.

**Create:** `app/components/chatbot/severity.ts`

```ts
import type { InsightSeverity } from './types';

export function severityClasses(severity: InsightSeverity = 'info') {
  const map = {
    critical: 'border-red-200 bg-red-50 text-red-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    info: 'border-blue-200 bg-blue-50 text-blue-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  } satisfies Record<InsightSeverity, string>;
  return map[severity];
}

export function severityDotClasses(severity: InsightSeverity = 'info') {
  const map = {
    critical: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
    success: 'bg-emerald-500',
  } satisfies Record<InsightSeverity, string>;
  return map[severity];
}
```

**Verify:** `npm run build`.

---

### Task 2.2: Add `AnswerCards` component

**Objective:** Render numbers/warnings/actions above raw markdown.

**Create:** `app/components/chatbot/AnswerCards.tsx`

Features:
- Metric grid when metrics exist.
- Warning cards when severity exists.
- Action button row.
- Accept `onPrompt(prompt)` and `onNavigate(href)`.

**Use existing:** `Button`, `Badge`, `AlertTriangle`, `ArrowRight`, `BarChart3` from `lucide-react`.

**Verify:** manually insert sample parsed answer in component story area? No storybook. Instead temporary render through real chat history not needed. Build pass enough, visual later.

---

### Task 2.3: Wire `AnswerCards` into assistant bubble

**Modify:** `app/components/FinanceChatbot.tsx`

Replace assistant rendering:
```tsx
const parsed = parseAssistantAnswer(cleanAssistantText(message.content));
<AnswerCards parsed={parsed} onPrompt={sendMessage} onNavigate={(href) => router.push(href)} />
<MarkdownMessage content={parsed.markdown} />
```

Add `useRouter` from `next/navigation`.

**Guardrail:** Do not show cards for welcome message.

**Verify:**
```bash
npm run build
sudo systemctl restart budtrack.service
curl -sS -I https://budtrack.iqbalarif.me/chatbot | head
```
Expected: 200.

---

## Phase 3 — Better Markdown Spacing

### Task 3.1: Tune `MarkdownMessage`

**Objective:** Make assistant text readable after cards.

**Modify:** `app/components/FinanceChatbot.tsx` or extract to `app/components/chatbot/MarkdownMessage.tsx`.

Changes:
- `p`: `mb-4 leading-7`
- `li`: `leading-7 pl-1`
- `ul/ol`: `space-y-1.5 mb-4`
- `h2/h3`: stronger top margin only after first block
- `table`: keep horizontal scroll, sticky-ish header not needed.

**Verify:** build + screenshot.

---

## Phase 4 — Header Intelligence

### Task 4.1: Find cheap existing data endpoint

**Objective:** Avoid adding backend if existing endpoint has wallet summary.

Check these first:
- `app/api/wallets/[walletId]/safe-to-spend/route.ts`
- `app/api/wallets/[walletId]/forecast/route.ts`
- `app/api/wallet-groups/[id]/summary/route.ts`
- `app/api/dashboard/layout/route.ts`
- `app/api/transactions/route.ts`

**Decision:**
- If one endpoint returns monthly spending + date, use it.
- If not, add one narrow endpoint in Task 4.2.

---

### Task 4.2: Add narrow chatbot summary endpoint only if needed

**Objective:** Provide header + insight rail data without scraping many endpoints client-side.

**Create:** `app/api/ai/chatbot/summary/route.ts`

Return shape:
```ts
interface ChatbotSummaryResponse {
  walletId: string;
  walletName: string;
  monthLabel: string;
  dataFreshness: string;
  totalExpense: number;
  topCategory?: { name: string; amount: number; percent?: number };
  safeToSpend?: number;
  debtRisk?: 'none' | 'warning' | 'critical';
  budgetStatus?: 'under' | 'near' | 'over' | 'unknown';
}
```

**Keep minimal:** query current month transactions for selected wallet; group category client/server whichever cheaper.

**Security:** session required, wallet ownership check required.

**Verify:**
```bash
curl -i https://budtrack.iqbalarif.me/api/ai/chatbot/summary?walletId=BAD
```
Expected: 401/403/400, not leaked data.

---

### Task 4.3: Add `useChatbotSummary` client fetch

**Objective:** Header and rail get real data.

**Create:** `app/components/chatbot/useChatbotSummary.ts`

Behavior:
- Fetch only when `selectedWallet?.id` exists.
- Abort previous request on wallet change.
- Return `{data, isLoading, error, refresh}`.
- Do not block chat if summary fails.

**Verify:** build.

---

### Task 4.4: Render smart header

**Modify:** `app/components/FinanceChatbot.tsx`

Header should show:
- Wallet name
- Current month label
- Total spending chip
- Data freshness chip (`Updated just now` or date)
- AI/provider badge stays secondary

**UX:** If loading, use skeleton-ish grey pill.

**Verify:** screenshot desktop.

---

## Phase 5 — Pinned Insight Rail

### Task 5.1: Add `InsightRail` component

**Create:** `app/components/chatbot/InsightRail.tsx`

Cards:
- Safe to spend
- Top spend category
- Debt risk
- Budget status
- Data freshness

Each card:
- label
- value
- detail
- severity color
- click prompt button (`Ask AI`)

**Responsive:**
- desktop `xl:grid-cols-[minmax(0,1fr)_320px]`
- mobile rail becomes horizontal/stack above composer or under welcome.

---

### Task 5.2: Change chat body layout to 2 columns

**Modify:** `app/components/FinanceChatbot.tsx`

Current:
```tsx
<main>messages</main>
```

Target:
```tsx
<main className="grid flex-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_320px]">
  <div className="overflow-y-auto">messages</div>
  <InsightRail ... />
</main>
```

**Pitfall:** Keep footer full width under grid. Do not put composer inside scroll area.

**Verify:** screenshot desktop and mobile-ish width via browser if available.

---

## Phase 6 — Context-Aware Prompt Chips

### Task 6.1: Generate prompts from summary

**Create:** `app/components/chatbot/prompts.ts`

Function:
```ts
export function getContextPrompts(summary?: ChatbotSummaryResponse) { ... }
```

Rules:
- Debt critical → first chip: `Prioritasin utang bulan ini`
- Budget over/near → `Cari kategori yang bikin budget jebol`
- Safe-to-spend low → `Bikin survival plan sampai gajian`
- Top category exists → `Audit kategori ${name}`
- Always include fallback six prompts.

**Verify:** plain Node-compatible logic, or build.

---

### Task 6.2: Wire prompts into welcome and rail

**Modify:** `FinanceChatbot.tsx`

Replace static `suggestions` with `getContextPrompts(summary)`.

**Verify:** selected wallet with debt should show debt chip first; if data missing fallback prompts show.

---

## Phase 7 — Streaming Answer

### Task 7.1: Add streaming API mode

**Objective:** Real streaming when provider supports it; keep non-stream fallback.

**Modify:** `app/api/ai/chatbot/route.ts`

Behavior:
- If request body `{ stream: true }`, return `text/event-stream` or `ReadableStream` chunks.
- Else existing JSON response unchanged.

**Modify:** `lib/ai.ts`

Add `generateAIResponseStream(params)` that:
- Uses same endpoint resolver.
- Sends `stream: true`.
- Parses SSE chunks from OpenAI-compatible providers.
- Yields text deltas.
- Falls back to non-stream if upstream ignores stream.

**Risk:** This touches backend. Do after UI cards are stable.

**Verify:**
```bash
curl -N -X POST https://budtrack.iqbalarif.me/api/ai/chatbot \
  -H 'Content-Type: application/json' \
  --data '{"prompt":"test","walletId":"REAL_ID","history":[],"stream":true}'
```
Expected: visible chunks or SSE lines.

---

### Task 7.2: Client streaming reader

**Modify:** `FinanceChatbot.tsx`

When sending:
- Add assistant placeholder with `status: 'streaming'`, empty content.
- Fetch `{ stream: true }`.
- Read `response.body.getReader()`.
- Append chunks to placeholder.
- On error, mark message `error` and show retry.

**Fallback:** If `response.body` missing, use JSON current path.

**Verify:** manual chat shows text appearing progressively.

---

## Phase 8 — Message Actions

### Task 8.1: Move reset into dropdown menu

**Objective:** Reset no longer primary header CTA.

**Use existing:** `components/ui/dropdown-menu.tsx`

Header action:
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon">...</Button></DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={clearChat}>Reset chat</DropdownMenuItem>
    <DropdownMenuItem onClick={exportChat}>Export chat</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

### Task 8.2: Add regenerate

**Objective:** Re-run last user prompt.

Implementation:
- Find last user message before assistant message.
- Remove target assistant message and any newer streaming state.
- Call `sendMessage(lastUser.content)` with option `{ appendUser: false }`.

**Keep minimal:** If complex, regenerate only latest assistant response.

---

### Task 8.3: Add export chat

**Objective:** Download current chat as markdown.

Implementation:
```ts
const blob = new Blob([messages.map(m => `## ${m.role}\n\n${m.content}`).join('\n\n')], { type: 'text/markdown' });
const url = URL.createObjectURL(blob);
// create <a download="budtrack-chat.md">
```

No backend.

---

### Task 8.4: Add save insight placeholder

**Objective:** Button exists but honest if backend missing.

Implementation:
- `Save insight` copies message to clipboard and toast: `Insight copied. Persistent insight save belum aktif.`
- Do not invent DB table yet.

Upgrade path later: add `savedInsights` model/table.

---

## Phase 9 — Visual QA

### Task 9.1: Browser QA checklist

**Verify:**
- Desktop `/chatbot`: no awkward center column.
- Mobile width: no horizontal overflow.
- Long markdown answer readable.
- Table scrolls inside bubble/card.
- Critical warning card visible.
- Insight rail pinned and not squeezing chat too much.
- Composer stays bottom.
- Reset hidden under `...`.
- Buttons not disabled when wallet selected.

Commands:
```bash
npm run build
sudo systemctl restart budtrack.service
curl -sS -I https://budtrack.iqbalarif.me/chatbot | head
journalctl -u budtrack.service --since '2 minutes ago' --no-pager | grep -E 'Error|TypeError|ReferenceError' || true
```

Expected:
- build exit 0
- service active
- `/chatbot` HTTP 200
- no new runtime errors

---

## Suggested Execution Order

1. Types + parser + severity helpers.
2. Answer cards wired into current chat.
3. Markdown spacing cleanup.
4. Header summary data.
5. Insight rail layout.
6. Context-aware prompts.
7. Message actions + reset menu.
8. Streaming last, because backend risk highest.
9. Browser QA + screenshot evidence.

---

## Rollback Plan

If layout breaks:
```bash
git checkout -- app/components/FinanceChatbot.tsx app/chatbot/page.tsx
sudo systemctl restart budtrack.service
```

If streaming breaks:
- Keep JSON path as default.
- Disable client `{ stream: true }`.
- Leave parser/cards intact.

---

## Final Verification Table

| Feature | Evidence Needed |
|---|---|
| AI answer cards | Screenshot with metric cards above markdown |
| Action buttons | Screenshot buttons + click one action |
| Severity styling | Screenshot critical/warning card |
| Better markdown spacing | Screenshot long response |
| Header intelligence | Screenshot wallet/month/spending/freshness |
| Context-aware chips | Screenshot chips change based on summary |
| Insight panel kanan | Screenshot desktop two-column layout |
| Streaming answer | Short screen/video or log showing chunks |
| Message actions | Screenshot dropdown/actions |
| Reset hidden | Screenshot `...` menu |
