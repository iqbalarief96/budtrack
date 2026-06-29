# BudTrack Dashboard Improvement Plan

> **For Hermes:** implement in small batches, verify each batch with Playwright screenshot table.

**Goal:** Fix QA blockers and improve dashboard clarity: clean console, consistent money totals, better negative wallet display, actionable dashboard, smart empty states, and guided flows.

**Architecture:** Keep existing Next.js App Router + Prisma + client components. Prefer small UI helpers and existing APIs. No new dependencies. First fix correctness (hydration + totals), then add decision widgets.

**Tech Stack:** Next.js, React, Prisma SQLite, Tailwind, Playwright.

---

## Scope order

| Batch | Priority | Outcome |
|---|---:|---|
| A | P0 | Clean hydration console errors |
| B | P1 | Money totals + wallet distribution correct |
| C | P1 | Low-data insights + goal starter suggestions |
| D | P2 | Dashboard action widgets + safe-to-spend |
| E | P2 | Navigation/context polish + chatbot settings link |
| F | P3 | Import checklist + mobile QA |

## Acceptance gate per batch

Run:

```bash
cd /home/iqbalarief96/projects/budtrack
npm run build
sudo systemctl restart budtrack.service
```

Then Playwright:

```bash
cd /tmp/budtrack-pw-run
PLAYWRIGHT_BROWSERS_PATH=/home/iqbalarief96/.cache/ms-playwright npx playwright test dashboard-qa-stable.spec.js --reporter=line
```

Final report must be table: Feature / Status / Screenshot-Evidence / Blocker.

## Batch A — P0 Console stability

**Objective:** Remove React hydration errors #425/#422.

**Likely files:**
- `app/components/FinanceChatbot.tsx`
- any component rendering `new Date()` / `toLocaleTimeString()` during initial render
- `app/dashboard/DashboardContent.tsx` if dashboard also triggers mismatch

**Steps:**
1. Search dynamic render values:
   ```bash
   grep -R "new Date\|Date.now\|toLocaleTime\|Math.random" app -n --include='*.tsx'
   ```
2. Replace SSR-sensitive initial timestamps with stable value or client-only render.
3. For chatbot messages, store timestamp as ISO/string created inside event handlers, not render body.
4. If timestamp must show current time, render placeholder until `useEffect` sets mounted state.
5. Rebuild and rerun dashboard/chatbot Playwright.

**Acceptance:**
- No `pageerror: Minified React error #425`.
- No `pageerror: Minified React error #422`.
- Chatbot initial message still renders.

## Batch B — P1 Money totals + wallet distribution

**Objective:** Make dashboard totals match wallet aggregate or clearly show active filter scope.

**Files:**
- `app/dashboard/DashboardContent.tsx`
- `app/wallets/page.tsx`
- `app/api/wallets/route.ts`
- maybe wallet provider: `app/providers/WalletProvider.tsx`

**Steps:**
1. Identify which endpoint powers dashboard total.
2. Compare with `/api/wallets` aggregate used by Wallets page.
3. Pick one source of truth: active wallet scope vs all active wallets.
4. Add visible scope label on dashboard cards:
   - `Viewing: His Wallet` or `All active wallets`.
5. If active wallet selected, dashboard total should equal selected wallet balance.
6. If all wallets selected, dashboard total should equal wallet page total.

**Acceptance:**
- Dashboard total no longer silently conflicts with Wallets page.
- UI shows scope label near total cards.

## Batch C — P1 Wallet distribution negative balance

**Objective:** Avoid 107% / -7% visual weirdness when wallet balances include negative values.

**Files:**
- `app/wallets/page.tsx`
- optional helper: `app/components/wallets/BalanceDistribution.tsx`

**Steps:**
1. Split wallets into positive and negative buckets.
2. Distribution percentages use positive total only.
3. Render negative wallets under separate “Debt / owed / negative balances” section.
4. Show negative amount as risk/action item, not part of pie percent.
5. Add CTA: “Settle / Reconcile” linking to transactions or shared bills.

**Acceptance:**
- No distribution percent >100% caused by negative wallets.
- Shared Household negative balance appears in separate explanation card.

## Batch D — P1 Transactions low-data insights

**Objective:** Replace generic “Not enough transaction data” with useful low-data guidance.

**Files:**
- `app/transactions/page.tsx`

**Steps:**
1. Find Smart Insights block around `Smart Insights` heading.
2. If transaction count is 0: show onboarding tips.
3. If count is 1-4: show micro-insight:
   - transaction count
   - needed count for trend confidence
   - next best action: import CSV / add recurring / scan receipt
4. Keep existing AI insight for enough data.

**Acceptance:**
- With QA data (1 transaction), UI says roughly: “baru 1 transaksi; butuh 5+ buat trend”.
- Screenshot shows action CTA.

## Batch E — P1 Goals starter suggestions

**Objective:** Turn empty Goals page into guided goal creation.

**Files:**
- `app/goals/GoalsContent.tsx`
- `app/api/goals/route.ts` only if prefill API needs fields already supported

**Steps:**
1. Keep current empty state.
2. Add starter cards:
   - Dana darurat 3 bulan
   - Pay off debt / settle negative wallet
   - Monthly saving target
   - Vacation / big purchase
3. Clicking starter opens existing Add Goal flow with prefilled title/type/target suggestion.
4. For negative wallet exists, prioritize debt payoff suggestion.

**Acceptance:**
- Empty goals page has starter cards.
- At least one starter can open goal form/prefill.

## Batch F — P2 Dashboard action widgets

**Objective:** Make dashboard answer “what should I do today?”

**Files:**
- `app/dashboard/DashboardContent.tsx`
- optional components:
  - `app/components/dashboard/TodayActionCard.tsx`
  - `app/components/dashboard/FinancialHealthScore.tsx`
  - `app/components/dashboard/SafeToSpendWidget.tsx`
  - `app/components/dashboard/DataQualityScore.tsx`

**Steps:**
1. Add Financial Health Score from existing simple inputs:
   - cashflow positive/negative
   - budget usage
   - negative wallet present
   - data quality count
2. Add Safe-to-spend card using existing `/api/safe-to-spend` or wallet safe endpoint.
3. Add Today Action card with priority:
   - negative wallet → reconcile
   - no goals → create starter goal
   - low transaction count → add/import transactions
   - budget near limit → review budget
4. Add Monthly close checklist:
   - log transactions
   - reconcile wallet
   - review budgets
   - check subscriptions/shared bills

**Acceptance:**
- Dashboard top area shows health score + safe-to-spend + today action.
- Existing cards still visible.


## Batch G — P2 Nav + wallet context polish

**Objective:** Make current context obvious without heavy uppercase nav.

**Files:**
- `app/components/Sidebar.tsx`
- `app/navigation.tsx`
- `app/providers/WalletProvider.tsx`
- page headers: dashboard/transactions/budgets/goals/chatbot

**Steps:**
1. Add active route styling for current page.
2. Reduce visual weight of uppercase group labels.
3. Add sticky scope chip near page header:
   - `Viewing: His Wallet`
   - quick switch dropdown if existing wallet provider supports it
4. Avoid building new global state; reuse `useWallet()`.

**Acceptance:**
- Current route visually obvious.
- Wallet scope visible on key pages.

## Batch H — P2 Chatbot settings link + AI action follow-through

**Objective:** Make AI failures/action buttons useful.

**Files:**
- `app/components/FinanceChatbot.tsx`
- `app/components/chatbot/AnswerCards.tsx`
- `app/components/chatbot/format.ts` or action parser files

**Steps:**
1. When AI settings missing, show CTA linking to `/settings` and mention AI Integrations tab.
2. Map AI action labels to real routes:
   - Open Budgets → `/budgets`
   - Show Transactions → `/transactions`
   - Analyze 3 Months → `/transactions?range=3m` if supported, else `/transactions`
3. Keep action parser conservative; unknown actions remain inert/secondary.

**Acceptance:**
- Error state has Settings CTA.
- Known AI actions navigate somewhere useful.

## Batch I — P3 Import checklist + mobile QA

**Objective:** Make import less risky and add mobile regression coverage.

**Files:**
- `app/components/ImportModal.tsx`
- `/tmp/budtrack-pw-run/dashboard-mobile-qa.spec.js`

**Steps:**
1. Add import checklist to modal:
   - preview file
   - duplicate detection note
   - savings rules applied note
   - undo/export backup note
2. Add Playwright mobile viewport run for dashboard, transactions, wallets, chatbot.
3. Capture screenshots under `/tmp/budtrack-mobile-qa-shots`.

**Acceptance:**
- Import modal has guided checklist.
- Mobile QA screenshots exist, no horizontal overflow.

## Implementation sequence

1. Batch A first. Do not continue polish while console red.
2. Batch B + C next. Money correctness before new widgets.
3. Batch D + E. Improve empty/low-data states.
4. Batch F. Add dashboard decision layer.
5. Batch G + H. Polish navigation and chatbot action flow.
6. Batch I. Finish with guided import and mobile QA.

## Final QA table required

| Feature | Status | Screenshot / Evidence | Blocker / Note |
|---|---:|---|---|
| Console clean | ✅/❌ | Playwright `ERRORS:[]` | hydration if not clean |
| Dashboard totals | ✅/❌ | dashboard + wallets screenshots | scope mismatch if any |
| Negative wallet display | ✅/❌ | wallets screenshot | percent >100 fails |
| Low-data insight | ✅/❌ | transactions screenshot | needs count text |
| Goal starters | ✅/❌ | goals screenshot | form prefill if tested |
| Today action | ✅/❌ | dashboard screenshot | must be actionable |
| Nav/context | ✅/❌ | any route screenshot | active page/scope visible |
| Chatbot settings/action | ✅/❌ | chatbot screenshot | missing route if action dead |
| Mobile | ✅/❌ | mobile screenshots | overflow if any |
