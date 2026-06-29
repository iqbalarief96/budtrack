# BudTrack Dashboard V2 Improvement Plan

> **For Hermes:** implement task-by-task, build after each batch, final QA must use `ui-feature-qa-evidence-table`.

**Goal:** Make `/dashboard` decision-first: clear money state, one best action, useful insight, better charts, and low-noise widgets.

**Architecture:** Keep changes client-side in existing dashboard components. No new dependencies. Prefer existing data already loaded in `DashboardContent.tsx`; add tiny derived helpers only.

**Tech Stack:** Next.js/React/TypeScript/Tailwind/Playwright.

---

## Acceptance gates

Run after implementation:

```bash
cd /home/iqbalarief96/projects/budtrack
npm run build
sudo systemctl restart budtrack.service
```

Playwright final QA:

```bash
cd /tmp/budtrack-pw-run
PLAYWRIGHT_BROWSERS_PATH=/home/iqbalarief96/.cache/ms-playwright npx playwright test dashboard-v2-qa.spec.js --reporter=line
```

Final report must include:

```text
Feature | Status | Screenshot / Evidence | Blocker / Note
```

---

## Batch A — Data helpers only

**Objective:** Add small derived dashboard helper values without touching layout.

**Files:**
- Modify: `app/dashboard/DashboardContent.tsx`

**Add derived values near existing `healthScore/todayAction`:**

- `incomeExpenseDelta = summary.income - summary.expense`
- `safeToSpendBreakdown = { balance, expense, sharedBills, goalReserve, safe }`
- `dataQualityLabel = Low | Medium | High`
- `dataQualityReason`
- `topSpendingCategory`
- `largestTransaction`
- `possibleDuplicateCount`
- `monthlyCloseItems`
- `upcomingObligations`
- `goalProjectionText`

**Rules:**
- No API changes.
- Use existing arrays: `filteredTransactions`, `filteredBudgets`, `goals`, `sharedBillsSummary`, `subscriptionAlerts`, `negativeWallets`.
- If data missing, show honest low-data state.

**Verify:**

```bash
npm run build
```

Expected: `✓ Compiled successfully`.

---

## Batch B — Top hero restructure

**Objective:** Make `Total Saldo` primary and reduce top-card clutter.

**Files:**
- Modify: `app/dashboard/DashboardContent.tsx`

**Change:**

Replace current 4 equal top cards with:

```text
[ Total Saldo hero ] [ Safe to Spend card ]
[ Income mini ] [ Expense mini ] [ Today Action primary CTA ]
```

**Implementation details:**
- `Total Saldo` card spans 2 columns on desktop.
- Show wallet scope: `Saldo aktual • {displayName}`.
- Show small trend/cashflow: `Net cashflow {periodLabel}: Rp X`.
- `Today Action` should be visually primary: blue background or stronger border.
- Keep Shared Bills visible but move into `Upcoming Obligations` batch, not top row.

**Verify:**
- Screenshot desktop dashboard.
- Check `Total Saldo` visually bigger than income/expense.
- No horizontal overflow.

---

## Batch C — Safe-to-spend formula card

**Objective:** Explain safe-to-spend number; avoid magic number.

**Files:**
- Modify: `app/dashboard/DashboardContent.tsx`

**Card should show:**

```text
Safe to spend
Rp X
Saldo - expense - bills - goal reserve
Confidence: Low/Medium/High
```

**Formula v1:**

```ts
safe = Math.max(displayBalance - summary.expense - sharedBillsSummary.outstandingAmount - goalReserve, 0)
```

**goalReserve v1:**
- `0` if no active goals.
- else simple `Math.min(displayBalance * 0.1, totalRemainingGoalAmount / 12)`.
- Add `ponytail:` comment explaining rough reserve and upgrade path.

**Verify:**
- Build.
- Screenshot shows formula text + confidence label.

---

## Batch D — Smart Insight replaces generic Tip Keuangan

**Objective:** Remove generic saving tip and replace with data-driven insight.

**Files:**
- Modify: `app/dashboard/DashboardContent.tsx`

**Replace `Tip Keuangan` card with `Smart Insight`:**

Decision order:

1. If `transactionCount < 5`: show low-data insight.
2. Else if `negativeWallets.length > 0`: show negative wallet risk.
3. Else if `budgetUsage > 90`: show budget risk.
4. Else if `topSpendingCategory`: show top category + suggestion.
5. Else show stable state.

**Example copy:**

```text
Smart Insight
Baru 1 transaksi bulan ini. Tambah 4 transaksi lagi biar trend, anomaly, dan forecast lebih akurat.
```

**Verify:**
- Generic `Tip Keuangan` no longer visible.
- `Smart Insight` visible.

---

## Batch E — Replace pie chart with category bars

**Objective:** Make category spending easier to compare.

**Files:**
- Modify: `app/dashboard/DashboardContent.tsx`

**Change:**
- Remove pie chart card usage for category spending.
- Render horizontal bars:

```text
Category name | amount | percent | bar
```

**Rules:**
- If no spending, show compact empty state.
- Percent = amount / total category spending.
- Limit top 6 categories.
- Keep existing bar chart for 6-month cashflow.

**Verify:**
- No pie legend clutter.
- Category bars visible or honest empty state.
- Build passes.

---

## Batch F — Compact Quick Actions

**Objective:** Reduce visual weight of `Aksi Cepat`.

**Files:**
- Modify: `app/dashboard/DashboardContent.tsx`

**Change:**
- Replace large action grid/card with compact pill row.
- Keep only:
  - Add Transaction
  - Import
  - Chatbot
- Secondary actions stay accessible elsewhere, not dashboard core.

**Verify:**
- `Aksi Cepat` takes less vertical space.
- 3 actions visible and clickable.

---

## Batch G — Monthly Close Checklist

**Objective:** Add workflow card so dashboard tells user what to do monthly.

**Files:**
- Modify: `app/dashboard/DashboardContent.tsx`

**Add card:**

```text
Monthly Close
☐ Reconcile wallet balance
☐ Review budget overspend
☐ Pay/settle shared bills
☐ Move saving to goals
```

**Rules:**
- Static checklist for now.
- Use computed status text if possible:
  - shared bills open -> highlight pay/settle
  - budgetUsage > 90 -> highlight review budget
  - negative wallet -> highlight reconcile

**Verify:**
- Checklist visible.
- No persistence needed.

---

## Batch H — Upcoming Obligations card

**Objective:** Merge subscription alert, shared bills, negative wallets into one obligations card.

**Files:**
- Modify: `app/dashboard/DashboardContent.tsx`

**Card should include:**

```text
Upcoming Obligations
- Subscriptions due next 14 days
- Shared bills outstanding
- Negative wallet balances
```

**Rules:**
- If empty, collapse to compact “No upcoming obligations”.
- Remove/replace oversized `Subscription Alerts` standalone card.
- Show at most 4 obligation rows.

**Verify:**
- Empty subscription state no longer wastes vertical space.
- Negative wallet / shared bill visible when applicable.

---

## Batch I — Recent transaction anomaly badges

**Objective:** Make recent transaction list more useful.

**Files:**
- Modify: `app/dashboard/DashboardContent.tsx`

**Add badges:**

- `Large` if amount > average expense * 2.
- `Duplicate?` if same amount + description appears within 48h.
- `Recurring?` if description appears 3+ times.

**Rules:**
- Keep simple helper function.
- Only annotate recent list; no DB writes.
- If no anomalies, do nothing.

**Verify:**
- Recent transactions still render.
- Badges render only when conditions match.

---

## Batch J — Goal projection text

**Objective:** Show useful forecast for goals.

**Files:**
- Modify: `app/dashboard/DashboardContent.tsx`

**Add to goal widget/card:**

```text
At current pace: target reached in X months
```

**Simple v1:**
- If no transactions/goals: show starter prompt.
- If active goal and currentAmount/targetAmount available: show remaining amount.
- If monthly net cashflow > 0: `remaining / monthlyNetCashflow` months.
- Else: “Need positive monthly cashflow to project.”

**Verify:**
- Text visible on dashboard where goals exist.
- Honest empty state where no goals.

---

## Batch K — Dashboard personalization placeholder

**Objective:** Add light “pin/reorder later” affordance without implementing full drag-drop.

**Files:**
- Modify: `app/dashboard/DashboardContent.tsx`

**Change:**
- Add small “Customize” button in dashboard header.
- Opens simple disabled/popover note:

```text
Widget pin/reorder coming soon. Current layout optimized for decision-first flow.
```

**Why:**
- Satisfies P3 direction without overbuilding drag/drop.

**Verify:**
- Button visible.
- No new dependency.

---

## Batch L — Final QA script

**Objective:** Prove all visual changes.

**Files:**
- Create: `/tmp/budtrack-pw-run/dashboard-v2-qa.spec.js`

**Checks:**

```text
SESSION:200
HAS_TOTAL_HERO:true
HAS_SAFE_BREAKDOWN:true
HAS_SMART_INSIGHT:true
HAS_CATEGORY_BARS:true
HAS_COMPACT_ACTIONS:true
HAS_MONTHLY_CLOSE:true
HAS_OBLIGATIONS:true
HAS_DATA_QUALITY:true
HAS_MOBILE_NO_OVERFLOW:true
```

**Screenshots:**

```text
/tmp/budtrack-dashboard-v2-qa/01-dashboard-hero.png
/tmp/budtrack-dashboard-v2-qa/02-dashboard-insights.png
/tmp/budtrack-dashboard-v2-qa/03-dashboard-charts.png
/tmp/budtrack-dashboard-v2-qa/04-mobile-dashboard.png
```

---

## Non-goals for this pass

Do not implement:
- drag/drop widget reorder
- persistent checklist state
- backend anomaly detection
- new AI endpoint
- new chart dependency
- database migrations

---

## Final delivery format

Use table:

```text
Feature | Status | Screenshot / Evidence | Blocker / Note
```

Include:
- build output
- service status
- Playwright output
- screenshots with `MEDIA:/absolute/path`
- known blockers/noise
