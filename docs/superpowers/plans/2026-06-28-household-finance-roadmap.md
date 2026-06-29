# BudTrack Household Finance Roadmap

Tanggal: 2026-06-28
Repo: `/home/iqbalarief96/projects/budtrack`
Target: BudTrack dipakai bareng istri sebagai cockpit keuangan rumah tangga.

## Keputusan Scope dari User

### Masuk roadmap
- No. 1 — Couple / Household Dashboard
- No. 4 — Shared recurring bills
- No. 5 — Shared budget
- No. 6 — Shared goals
- No. 7 — Monthly review otomatis
- No. 8 — His / Hers / Shared ownership
- No. 11 — Reminder WhatsApp/Telegram
- No. 12 — Bank statement import, perlu dijelaskan mekanismenya
- No. 13 — Credit card tracker
- No. 14 — Net worth tracker
- Tambahan baru — Subscription & trial tracker, termasuk trial gratis yang harus dicancel sebelum tagihan

### Explicitly out of scope
- No. 2 — Split transaksi / reimbursement. Istri user bilang tidak perlu.
- No. 9 — Approval ringan untuk transaksi besar. User bilang tidak perlu.
- No. 10 — Attach receipt / bukti transfer. User bilang tidak perlu.
- No. 15 — Privacy mode. Tidak perlu.

## Current Capability Snapshot

Evidence dari repo:

- Prisma schema sudah punya:
  - `RecurringTransaction` di `prisma/schema.prisma:338`
  - `Goal` di `prisma/schema.prisma:529`
  - `Bill`, `BillPayment`, `BillReminder` di `prisma/schema.prisma:925`
  - `Group`, `GroupWallet`, `GroupTransaction`, `ExpenseSplit` sekitar `prisma/schema.prisma:420`
- App sudah punya route/page:
  - `/dashboard` — `app/dashboard/page.tsx`, `app/dashboard/DashboardContent.tsx`
  - `/recurring` — `app/recurring/page.tsx`
  - `/budget` — `app/budget/page.tsx`
  - `/goals` — `app/goals/page.tsx`, `app/goals/GoalsContent.tsx`
  - `/reports` — `app/reports/page.tsx`
  - `/net-worth` — `app/net-worth/page.tsx`
- API sudah punya:
  - `app/api/recurring/*`
  - `app/api/wallet-groups/[id]/bills/route.ts`
  - `app/api/wallet-groups/[id]/budgets/route.ts`
  - `app/api/subscriptions/analyze/route.ts`
- UI sudah punya subscription insight card:
  - `app/components/dashboard/SubscriptionIntelligenceCard.tsx`

Kesimpulan: jangan rewrite. Pakai pondasi existing dan rapihin jadi mode household/couple.

## Product Direction

BudTrack harus jadi:

> Dashboard keputusan finansial rumah tangga: uang masuk, uang keluar, tagihan, budget, goal, kartu kredit, subscription/trial, dan net worth keluarga.

Bukan cuma transaction logger.

## Recommended Build Order

1. Household Workspace Foundation
2. Household Dashboard
3. Shared Recurring Bills + Subscription/Trial Tracker
4. Shared Budget
5. Shared Goals
6. Monthly Review
7. His/Hers/Shared Ownership
8. Reminder Engine Telegram/WhatsApp
9. Credit Card Tracker
10. Net Worth Tracker
11. Bank Statement Import

Rationale:
- Dashboard dulu supaya UX punya pusat.
- Bills + subscriptions/trials paling urgent buat cegah lupa bayar/lupa cancel.
- Budget/goals/monthly review bikin habit.
- Credit card/net worth/import bisa nyusul karena schema lebih luas.

---

# Phase 1 — Household Workspace Foundation

## Goal
Bikin konsep “rumah tangga” sebagai scope utama tanpa bikin multi-tenant privacy kompleks.

Karena privacy mode tidak perlu, semua data household bisa visible untuk user pasangan.

## Data Model

Reuse `WalletGroup` kalau sudah stabil. Kalau `WalletGroup` saat ini lebih ke grouping wallet, tambahkan model baru yang eksplisit:

File: `prisma/schema.prisma`

```prisma
model Household {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  members   HouseholdMember[]
  bills     HouseholdBill[]
  budgets   HouseholdBudget[]
  goals     HouseholdGoal[]
  reviews   MonthlyReview[]
}

model HouseholdMember {
  id          String   @id @default(cuid())
  householdId String
  userId      String
  displayName String?
  role        String   @default("MEMBER") // OWNER, MEMBER
  createdAt   DateTime @default(now())

  household Household @relation(fields: [householdId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([householdId, userId])
  @@index([householdId])
  @@index([userId])
}
```

If avoiding new model for v1, add `householdId` later and use current `WalletGroup` ID as household scope.

## Files to touch

- `prisma/schema.prisma`
- `app/settings/page.tsx`
- `app/components/Sidebar.tsx`
- New API:
  - `app/api/households/route.ts`
  - `app/api/households/[id]/members/route.ts`

## Tests

Add tests around access scoping:

- `tests/household-access.test.ts`

Expected cases:
- user can read their household
- user cannot read household where they are not member
- owner can add member by email

## Commands

```bash
cd /home/iqbalarief96/projects/budtrack
npx prisma migrate dev --name add-households
npm test
npx next build --no-lint
```

---

# Phase 2 — Household Dashboard

## Goal
Dashboard khusus rumah tangga.

URL:

```text
/household
```

Or if keeping single dashboard:

```text
/dashboard?view=household
```

Recommendation: buat page dedicated `/household`, lalu nanti link dari sidebar.

## UX Cards

1. Total household balance
2. Income bulan ini
3. Expense bulan ini
4. Savings rate
5. Bills due soon
6. Subscription/trial alerts
7. Budget usage
8. Goal progress
9. Credit card outstanding
10. Net worth snapshot

## Files to add

- `app/household/page.tsx`
- `app/household/HouseholdDashboardContent.tsx`
- `app/components/household/HouseholdSummaryCards.tsx`
- `app/components/household/BillsDueSoonCard.tsx`
- `app/components/household/TrialExpiryCard.tsx`
- `app/components/household/HouseholdBudgetCard.tsx`
- `app/components/household/HouseholdGoalCard.tsx`
- `app/components/household/CreditCardSnapshotCard.tsx`
- `app/components/household/NetWorthSnapshotCard.tsx`
- `app/api/household/summary/route.ts`

## API shape

`GET /api/household/summary?householdId=...`

```ts
interface HouseholdSummaryResponse {
  householdId: string
  period: string
  balance: number
  incomeThisMonth: number
  expenseThisMonth: number
  savingsRate: number
  billsDueSoon: Array<{
    id: string
    name: string
    amount: number
    dueDate: string
    daysLeft: number
  }>
  trialAlerts: Array<{
    id: string
    name: string
    trialEndsAt: string
    daysLeft: number
    cancelUrl?: string
  }>
  budgetUsage: Array<{
    category: string
    limit: number
    spent: number
    percentage: number
  }>
  goals: Array<{
    id: string
    name: string
    target: number
    current: number
    percentage: number
  }>
}
```

## Verification

- Login user with household.
- Open `/household`.
- Cards load without infinite `Loading...`.
- API returns 200 and scoped data only.

---

# Phase 3 — Shared Recurring Bills + Subscription/Trial Tracker

## Goal
Satu tempat untuk:

- tagihan rutin: internet, listrik, BPJS, cicilan, Netflix, Spotify
- subscription berbayar: ChatGPT, YouTube Premium, iCloud, hosting, domain
- trial gratis: Xiaomi MiMo, app trial, SaaS trial
- reminder sebelum tagihan/trial habis
- status: active, cancelled, expired, paused

## Why this matters

Ini fitur yang paling cocok buat pain user:

> Daftar gratis/trial suka lupa, takut tiba-tiba ketagih karena lupa cancel.

## Data Model

File: `prisma/schema.prisma`

Tambahkan model baru, jangan campur full dengan `RecurringTransaction` karena trial belum tentu ada transaksi.

```prisma
model SubscriptionTracker {
  id               String   @id @default(cuid())
  userId           String
  householdId      String?
  name             String
  provider         String?
  planName         String?
  amount           Float?
  currencyCode     String   @default("IDR")
  billingCycle     String?  // MONTHLY, YEARLY, WEEKLY, ONE_TIME, TRIAL_ONLY
  status           String   @default("ACTIVE") // TRIAL, ACTIVE, CANCELLED, EXPIRED, PAUSED
  startedAt        DateTime?
  trialEndsAt      DateTime?
  nextBillingAt    DateTime?
  cancelBeforeAt   DateTime?
  cancelUrl        String?
  accountEmail     String?
  paymentMethod    String?
  category         String?
  notes            String?
  remindDaysBefore String   @default("[1,3,7]")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([householdId])
  @@index([status])
  @@index([trialEndsAt])
  @@index([nextBillingAt])
}
```

If adding `Household` model in Phase 1, relate `householdId` properly later.

## Pages

- `app/subscriptions/page.tsx`
- `app/subscriptions/new/page.tsx`
- `app/subscriptions/[id]/page.tsx`

## Components

- `app/components/subscriptions/SubscriptionList.tsx`
- `app/components/subscriptions/SubscriptionForm.tsx`
- `app/components/subscriptions/TrialAlertBanner.tsx`
- `app/components/subscriptions/SubscriptionCalendar.tsx`
- `app/components/subscriptions/SubscriptionCostSummary.tsx`

## API

- `app/api/subscriptions/route.ts`
  - GET list
  - POST create
- `app/api/subscriptions/[id]/route.ts`
  - GET detail
  - PATCH update
  - DELETE archive/cancel
- `app/api/subscriptions/upcoming/route.ts`
  - GET due billing/trials in next N days

## UX behavior

Create form fields:

```text
Nama layanan: ChatGPT Plus
Tipe: Trial / Paid / Free account
Harga: Rp0 / Rp349000
Billing: monthly/yearly/trial only
Trial ends at: date
Cancel before: date
Reminder: 7, 3, 1 days before
Cancel URL: optional
Payment method: BCA / Mandiri CC / etc
Account email: optional
Notes: optional
```

Dashboard alert examples:

```text
Trial Xiaomi MiMo habis 2 hari lagi. Cancel sebelum 2026-07-01.
ChatGPT Plus charge berikutnya 5 hari lagi: Rp349.000.
```

## Interaction with existing subscription analyzer

Existing:

- `app/api/subscriptions/analyze/route.ts`
- `app/components/dashboard/SubscriptionIntelligenceCard.tsx`

Keep analyzer as “detected from recurring transactions”. Add tracker as “manually tracked subscriptions/trials”. Later combine both into one Subscription Center.

## Tests

- trial ending in 7 days appears in upcoming alerts
- cancelled subscription does not appear in active monthly total
- trial-only subscription with Rp0 still appears in reminder
- user cannot access another user's subscriptions

---

# Phase 4 — Shared Budget

## Goal
Budget rumah tangga per kategori.

Examples:

```text
Makan keluarga: Rp3.000.000
Belanja rumah: Rp2.000.000
Transport: Rp1.500.000
Hiburan: Rp1.000.000
Subscription: Rp500.000
```

## Existing foundation

There is `/budget` and wallet group budgets API:

- `app/budget/page.tsx`
- `app/api/wallet-groups/[id]/budgets/route.ts`

## Model Strategy

If existing `Budget` supports group/wallet scope, reuse. If not, add:

```prisma
model HouseholdBudget {
  id          String   @id @default(cuid())
  householdId String
  categoryId  String?
  name        String
  limitAmount Float
  period      String   @default("MONTHLY")
  startDate   DateTime
  endDate     DateTime?
  alertAt80   Boolean  @default(true)
  alertAt100  Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  household Household @relation(fields: [householdId], references: [id], onDelete: Cascade)

  @@index([householdId])
  @@index([categoryId])
}
```

## Verification

- Add household budget.
- Add expenses in matching category.
- Budget card shows spent / limit.
- 80% and 100% thresholds trigger warning.

---

# Phase 5 — Shared Goals

## Goal
Goals bareng:

- dana darurat keluarga
- rumah
- liburan
- umroh
- kendaraan
- pendidikan anak nanti

## Existing foundation

- `Goal` model exists.
- `/goals` pages exist.

## Enhancement

Add household scope to existing goal instead of duplicating too much:

```prisma
model Goal {
  // existing fields...
  householdId String?
  ownerType   String @default("PERSONAL") // PERSONAL, HOUSEHOLD
}
```

Add projection fields if not already enough:

```text
monthlyRequired = (target - current) / monthsLeft
onTrack = current >= expectedProgressByToday
```

## UX

Goal page should support tabs:

```text
Personal Goals | Household Goals
```

Goal card:

```text
Dana Darurat Keluarga
Target: Rp60.000.000
Current: Rp12.500.000
Need: Rp3.200.000/month to hit deadline
Status: Behind / On Track / Ahead
```

## Verification

- Create household goal.
- Link deposit transaction to goal.
- Progress updates.
- Dashboard shows top 3 household goals.

---

# Phase 6 — Monthly Review

## Goal
Generate monthly financial review automatically.

## Output example

```text
Juni 2026
Income keluarga: RpX
Expense keluarga: RpY
Savings rate: Z%
Top spending: Makan luar, Transport, Subscription
Budget over: Belanja rumah +12%
Bills missed: 0
Trials expiring soon: 2
Net worth change: +RpY
Recommendation: kurangi makan luar Rp500k untuk keep goal dana darurat on-track.
```

## Data Model

```prisma
model MonthlyReview {
  id          String   @id @default(cuid())
  householdId String?
  userId      String
  year        Int
  month       Int
  income      Float
  expense     Float
  savingsRate Float
  netWorth    Float?
  summary     String
  insights    String // JSON
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, year, month])
  @@index([householdId])
}
```

## API

- `app/api/monthly-review/route.ts`
- `app/api/monthly-review/generate/route.ts`

## Page

- `app/monthly-review/page.tsx`

## MVP logic

Rule-based first. No AI required.

Insights:
- compare expense vs previous month
- top 5 categories
- budget overruns
- upcoming subscriptions/trials
- savings rate
- goal on-track/off-track

## Later AI layer

AI summary can be added after deterministic data is correct.

---

# Phase 7 — His / Hers / Shared Ownership

## Goal
Label transaksi biar laporan bisa jawab:

- pengeluaran Iqbal
- pengeluaran Selly
- pengeluaran bersama

No split/reimbursement.

## Data Model

Add to `Transaction`:

```prisma
ownershipType String @default("PERSONAL") // PERSONAL, HOUSEHOLD, SPOUSE
ownerLabel    String? // IQBAL, SELLY, SHARED, CUSTOM
householdId   String?
```

If avoiding migration risk, use transaction `notes`/metadata is bad. Prefer real columns.

## UI

In `app/components/TransactionModal.tsx`, add selector:

```text
Ownership:
- Personal Iqbal
- Personal Selly
- Shared Household
```

No calculation, no debt. Just classification.

## Dashboard impact

Add breakdown card:

```text
Shared household: RpX
Iqbal personal: RpY
Selly personal: RpZ
```

## Verification

- Create transaction with `Shared Household`.
- Report filters by ownership.
- Monthly review includes ownership breakdown.

---

# Phase 8 — Reminder Engine Telegram/WhatsApp

## Goal
Remind user before:

- bills due
- subscription billing
- trial cancellation deadline
- budget over 80/100%
- credit card due date

## Recommendation
Start with Telegram first because Hermes/VPS workflow easier. WhatsApp can be later via third-party API.

## Data Model

```prisma
model ReminderPreference {
  id          String   @id @default(cuid())
  userId      String
  channel     String   @default("TELEGRAM") // TELEGRAM, EMAIL, WHATSAPP
  target      String   // chat_id, email, phone
  enabled     Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model ReminderLog {
  id        String   @id @default(cuid())
  userId    String
  type      String
  refId     String?
  channel   String
  status    String
  sentAt    DateTime @default(now())
  message   String

  @@index([userId])
  @@index([type])
  @@index([sentAt])
}
```

## Cron/script

Create script:

- `scripts/send-reminders.ts`

Run hourly/daily via systemd timer or cron.

Initial schedule:

```text
daily at 07:00 Asia/Jakarta
```

## Message examples

```text
BudTrack: Trial Xiaomi MiMo habis 2 hari lagi. Cancel sebelum 30 Jun 2026.
BudTrack: Tagihan Internet Rp350.000 jatuh tempo besok.
BudTrack: Budget Makan sudah 84%. Sisa Rp480.000 sampai akhir bulan.
```

## Verification

- seed a trial ending tomorrow
- run script manually
- assert one reminder sent/logged
- run script again same day
- assert no duplicate spam

---

# Phase 9 — Credit Card Tracker

## Goal
Track kartu kredit:

- statement cycle
- due date
- outstanding
- minimum payment
- available limit
- charges not yet billed
- annual fee reminder

## Data Model

```prisma
model CreditCardAccount {
  id             String   @id @default(cuid())
  userId         String
  householdId    String?
  name           String
  bankName       String?
  last4          String?
  creditLimit    Float
  statementDay   Int
  dueDay         Int
  annualFeeDate  DateTime?
  isActive       Boolean @default(true)
  notes          String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions CreditCardTransaction[]

  @@index([userId])
}

model CreditCardTransaction {
  id             String   @id @default(cuid())
  creditCardId   String
  amount         Float
  description    String
  transactionDate DateTime
  statementMonth String?
  isInstallment  Boolean @default(false)
  installmentInfo String?
  categoryId     String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  creditCard CreditCardAccount @relation(fields: [creditCardId], references: [id], onDelete: Cascade)

  @@index([creditCardId])
  @@index([transactionDate])
}
```

## Pages

- `app/credit-cards/page.tsx`
- `app/credit-cards/[id]/page.tsx`

## Verification

- Add Mandiri credit card.
- Add transactions.
- Statement estimate calculates current cycle.
- Reminder due date appears in reminder engine.

---

# Phase 10 — Net Worth Tracker

## Goal
Track family net worth:

```text
assets - liabilities = net worth
```

Assets:
- cash/wallets
- savings
- investments
- gold
- vehicle
- property
- receivables

Liabilities:
- credit card outstanding
- loans
- mortgage/KPR
- paylater

## Current state

There is `/net-worth/page.tsx`, but verify whether it is fully persisted or calculated. If page is static/mock, replace with real model.

## Data Model

```prisma
model NetWorthSnapshot {
  id          String   @id @default(cuid())
  userId      String
  householdId String?
  snapshotDate DateTime
  totalAssets Float
  totalLiabilities Float
  netWorth Float
  notes String?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([snapshotDate])
}

model AssetItem {
  id          String   @id @default(cuid())
  userId      String
  householdId String?
  name        String
  type        String // CASH, INVESTMENT, GOLD, VEHICLE, PROPERTY, OTHER
  value       Float
  currencyCode String @default("IDR")
  notes       String?
  updatedAt   DateTime @updatedAt
  createdAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model LiabilityItem {
  id          String   @id @default(cuid())
  userId      String
  householdId String?
  name        String
  type        String // CREDIT_CARD, LOAN, MORTGAGE, PAYLATER, OTHER
  balance     Float
  interestRate Float?
  dueDate     DateTime?
  notes       String?
  updatedAt   DateTime @updatedAt
  createdAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

## Out-of-scope clarification for no. 9 and no. 10

Do not implement:

- No. 9 — Approval ringan untuk transaksi besar
- No. 10 — Attach receipt / bukti transfer

User explicitly said both are not needed. Keep the finance UX lightweight: focus on dashboard, recurring bills, subscriptions/trials, budget, goals, monthly review, reminders, credit card tracker, net worth, and bank import.

---

# Phase 11 — Bank Statement Import

## What no. 12 means

Bank statement import = lo download mutasi dari bank/e-wallet sebagai CSV/XLS/PDF, lalu BudTrack baca dan ubah jadi transaksi.

Use case:

- malas input transaksi satu-satu
- import mutasi BCA/Mandiri/e-wallet tiap minggu/bulan
- app auto-detect duplicate supaya gak dobel
- app auto-categorize berdasarkan merchant/description

## MVP format

Start with CSV/XLSX only. Jangan PDF dulu.

Supported columns flexible:

```text
Date, Description, Debit, Credit, Amount, Balance
```

## Data Model

```prisma
model ImportBatch {
  id          String   @id @default(cuid())
  userId      String
  walletId    String
  fileName    String
  source      String? // BCA, MANDIRI, GOPAY, OVO, CUSTOM
  status      String  @default("PENDING") // PENDING, MAPPED, IMPORTED, FAILED
  totalRows   Int     @default(0)
  importedRows Int    @default(0)
  skippedRows Int     @default(0)
  createdAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model ImportRow {
  id            String   @id @default(cuid())
  importBatchId String
  rowIndex      Int
  rawData       String // JSON
  parsedDate    DateTime?
  description   String?
  amount        Float?
  type          String?
  duplicateOfId String?
  status        String @default("PENDING") // PENDING, READY, DUPLICATE, ERROR, IMPORTED
  errorMessage  String?

  @@index([importBatchId])
}
```

## Flow

1. User upload CSV/XLSX.
2. App previews rows.
3. User maps columns.
4. App detects duplicates using hash:

```text
walletId + date + amount + normalizedDescription
```

5. User confirms import.
6. App creates transactions.

## Files

- `app/import/page.tsx`
- `app/components/import/StatementUploader.tsx`
- `app/components/import/ColumnMapper.tsx`
- `app/components/import/ImportPreviewTable.tsx`
- `app/api/import/statement/route.ts`
- `lib/import/parseCsv.ts`
- `lib/import/parseXlsx.ts`
- `lib/import/dedupe.ts`
- `lib/import/categoryRules.ts`

## Dependencies

Use existing package if already installed. If not:

```bash
npm install papaparse xlsx
npm install -D @types/papaparse
```

## Verification

- Import sample CSV with 10 rows.
- Preview shows parsed data.
- Duplicate row is skipped.
- Confirm import creates correct transactions.

---

# Testing Strategy

## Required commands after each phase

```bash
cd /home/iqbalarief96/projects/budtrack
npm test
npx next build --no-lint
```

Note: normal `next build` currently hits existing ESLint issues, so deployment uses:

```bash
npx next build --no-lint
```

## Manual smoke tests

- Login at `https://budtrack.iqbalarif.me/auth/signin`
- Open `/household`
- Add bill
- Add subscription trial
- Add budget
- Add goal
- Check dashboard cards
- Restart service and confirm data persists

## Production deploy commands

```bash
cd /home/iqbalarief96/projects/budtrack
npx prisma migrate deploy
npx next build --no-lint
sudo systemctl restart budtrack.service
systemctl is-active budtrack.service
curl -I https://budtrack.iqbalarif.me
```

---

# First Implementation Slice

Start with:

## Slice A — Subscription & Trial Tracker + Dashboard Alert

Reason:
- user explicitly asked for trial/subscription tracking
- high personal value
- small enough to implement without touching every finance model
- can reuse reminder engine later

Tasks:

1. Add `SubscriptionTracker` model.
2. Create migration.
3. Add API CRUD.
4. Add `/subscriptions` page.
5. Add dashboard card for upcoming trials/billings.
6. Add sidebar link.
7. Add tests.
8. Deploy.

Expected outcome:

```text
User can add ChatGPT Plus paid subscription.
User can add Xiaomi MiMo free trial with expiry date.
Dashboard warns before trial ends.
```

# Second Implementation Slice

## Slice B — Shared Bills

1. Audit existing `Bill` UI/API.
2. Add household scope if missing.
3. Add due-soon dashboard card.
4. Add paid/unpaid flow.
5. Add reminder compatibility.

# Third Implementation Slice

## Slice C — Household Dashboard

1. Create `/household`.
2. Pull subscription alerts, bills, budget, goals.
3. Add summary cards.
4. Add sidebar link.

# Deferred Work

- Bank statement import: valuable but needs careful parser/dedupe.
- Credit card tracker: good after subscription/bills because reminder engine can be reused.
- Net worth: good after credit card tracker because liabilities feed net worth.

# Notes

Do not implement split/reimbursement unless user reverses decision. Istri user explicitly said no.
Do not implement large-transaction approval/review unless user reverses decision. User said no.
Do not implement receipt / bukti transfer attachment unless user reverses decision. User said no.
Do not implement privacy mode.
