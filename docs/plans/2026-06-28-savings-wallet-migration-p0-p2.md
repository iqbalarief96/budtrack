# Savings Wallet Migration P0-P2 Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Make legacy savings transactions migrate into the right savings wallet/bucket, with editable preview, strong migration links, auto-rules, and a savings dashboard.

**Architecture:** Keep current `Transaction` + `Wallet(type='SAVINGS')` approach for now. Add migration metadata and transfer pair IDs so migrated INCOME transactions are linked to original EXPENSE transactions. Build P0 UX around existing `/api/savings/migrate`, then harden with schema fields in P1, then add automation/dashboard in P2.

**Tech Stack:** Next.js App Router, React client components, Prisma, SQLite/dev DB, existing Tailwind UI, Playwright/browser QA.

---

## Current Evidence

Existing files:
- `components/MigrateSavingsButton.tsx` — settings UI entry point.
- `app/api/savings/migrate/route.ts` — migration API wrapper.
- `scripts/migrate-savings-to-wallets.ts` — migration engine.
- `prisma/schema.prisma` — `Transaction`, `Wallet`, `CategoryRule` models.
- `app/wallets/page.tsx` and `app/wallets/[walletId]/page.tsx` — existing wallet/savings surfaces.

Current improved behavior:
- Existing migration now skips already-created mirror INCOME transactions using description/date/amount/wallet matching.
- Preview summary now appears in UI, not console only.

Main remaining gaps:
- No per-transaction editable mapping.
- No durable link between source EXPENSE and migrated INCOME.
- No transfer pair relation.
- No saved auto-rules for future transactions/imports.
- No dedicated savings dashboard.

---

## Target UX

### Migration Preview

User clicks `Preview Dulu`, sees table:

| Tanggal | Deskripsi Lama | Amount | Detected Bucket | Destination Wallet | Status |
|---|---|---:|---|---|---|
| 2026-01-01 | Tabungan IWK Jan | Rp500.000 | Tabungan IWK | [select] Tabungan IWK | Pending |

Controls:
- Destination wallet dropdown per row.
- `Create new wallet` inline option.
- Group summary above table.
- `Confirm migration` disabled until every row has destination wallet.

### Migration Commit

On submit:
- Original EXPENSE stays in source wallet.
- New INCOME appears in selected savings wallet.
- Both transactions share `transferPairId`.
- New INCOME stores `migrationSourceTransactionId`.
- Re-run migration skips linked rows.

### Savings Dashboard

Page shows:
- Total savings balance.
- Savings wallets/buckets with balances.
- Monthly contributions.
- Last contribution per bucket.
- Top saving buckets.
- Unmapped savings transactions needing review.

---

# P0 — Quick Wins

## Task 1: Extract savings detection into pure helper

**Objective:** Make naming detection testable and reusable by preview, migrate, auto-rules, and dashboard.

**Files:**
- Create: `lib/savings/savings-detection.ts`
- Test: `lib/savings/savings-detection.selfcheck.ts`
- Modify: `scripts/migrate-savings-to-wallets.ts`

**Implementation:**

Create helper:

```ts
export type SavingsDetection = {
  label: string
  icon: string
  color: string
  confidence: 'high' | 'medium' | 'low'
}

const STOP_WORDS = new Set([
  'bulan', 'bln', 'jan', 'januari', 'feb', 'februari', 'mar', 'maret',
  'apr', 'april', 'mei', 'jun', 'juni', 'jul', 'juli', 'agu', 'agustus',
  'sep', 'september', 'okt', 'oktober', 'nov', 'november', 'des', 'desember',
  'setor', 'transfer', 'tf', 'ke', 'untuk', 'saving', 'savings', 'tabungan'
])

export function titlePreserveAcronym(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.length <= 4 && word === word.toUpperCase()
      ? word
      : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function detectSavingsBucket(description = '', categoryName = ''): SavingsDetection {
  const raw = `${description} ${categoryName}`.trim()
  const lower = raw.toLowerCase()

  const known = [
    { label: 'Tabungan Darurat', keywords: ['darurat', 'emergency'], icon: '🚨', color: '#ef4444' },
    { label: 'Tabungan Liburan', keywords: ['liburan', 'travel', 'vacation', 'holiday'], icon: '✈️', color: '#10b981' },
    { label: 'Tabungan Properti', keywords: ['rumah', 'properti', 'kpr'], icon: '🏠', color: '#f59e0b' },
    { label: 'Tabungan Investasi', keywords: ['investasi', 'reksa', 'saham', 'obligasi'], icon: '📈', color: '#14b8a6' },
    { label: 'Tabungan Emas', keywords: ['emas', 'gold'], icon: '🥇', color: '#eab308' },
  ]

  const hit = known.find((item) => item.keywords.some((keyword) => lower.includes(keyword)))
  if (hit) return { ...hit, confidence: 'high' }

  const match = raw.match(/(?:tabungan|saving|savings)\s+([a-z0-9A-Z\s_-]+)/i)
  if (match?.[1]) {
    const cleaned = match[1]
      .replace(/[_-]/g, ' ')
      .split(/\s+/)
      .filter((word) => word && !STOP_WORDS.has(word.toLowerCase()))
      .slice(0, 4)
      .join(' ')

    if (cleaned) {
      return {
        label: `Tabungan ${titlePreserveAcronym(cleaned)}`,
        icon: '💵',
        color: '#64748b',
        confidence: 'medium'
      }
    }
  }

  return { label: 'Tabungan Lainnya', icon: '💵', color: '#64748b', confidence: 'low' }
}
```

**Verification:**

Run self-check:

```bash
npx tsx lib/savings/savings-detection.selfcheck.ts
```

Expected:

```text
savings-detection selfcheck passed
```

Self-check cases:
- `Tabungan IWK Januari` → `Tabungan IWK`
- `setor tabungan darurat jan` → `Tabungan Darurat`
- `saving emas februari` → `Tabungan Emas`
- unknown → `Tabungan Lainnya`

---

## Task 2: Return row-level preview from migration API

**Objective:** Preview must expose each transaction, detected bucket, existing migration status, and suggested destination wallet.

**Files:**
- Modify: `scripts/migrate-savings-to-wallets.ts`
- Modify: `app/api/savings/migrate/route.ts` only if request/response naming changes.

**Response shape:**

```ts
type SavingsMigrationPreviewRow = {
  sourceTransactionId: string
  date: string
  description: string
  amount: number
  sourceWalletId: string
  sourceWalletName: string
  categoryId: string | null
  categoryName: string | null
  detectedLabel: string
  detectedIcon: string
  detectedColor: string
  confidence: 'high' | 'medium' | 'low'
  suggestedWalletId: string | null
  suggestedWalletName: string | null
  alreadyMigrated: boolean
}
```

Add to dry-run result:

```ts
summary: {
  total,
  groups,
  groupDetails,
  rows,
}
```

**Rules:**
- Existing savings wallet with same detected label becomes `suggestedWalletId`.
- If no wallet exists, `suggestedWalletId = null`, `suggestedWalletName = detectedLabel`.
- Existing migrated transaction marks `alreadyMigrated = true`.

**Verification:**

Use disposable user script:

```bash
npx tsx scripts/tmp-savings-preview-check.ts
```

Expected JSON contains:

```json
{
  "rows": [
    {
      "description": "Tabungan IWK Januari",
      "detectedLabel": "Tabungan IWK",
      "alreadyMigrated": false
    }
  ]
}
```

Remove temp script after pass.

---

## Task 3: Add editable preview table UI

**Objective:** User can review and edit wallet destination before migration.

**Files:**
- Modify: `components/MigrateSavingsButton.tsx`
- Optional create: `components/savings/SavingsMigrationPreviewTable.tsx` if component exceeds ~220 lines.

**State:**

```ts
type Mapping = Record<string, string | 'CREATE_NEW'>
const [mapping, setMapping] = useState<Mapping>({})
const [newWalletNames, setNewWalletNames] = useState<Record<string, string>>({})
```

**UI behavior:**
- Show group cards above table.
- Table rows from `preview.rows`.
- Dropdown options:
  - suggested existing wallet
  - all `SAVINGS` wallets from preview response
  - `Create new wallet: <detectedLabel>`
- If `CREATE_NEW`, show input defaulted to `detectedLabel`.
- Rows with `alreadyMigrated` disabled and labeled `Sudah migrated`.
- Confirm button disabled if any pending row lacks destination.

**Payload for commit:**

```json
{
  "dryRun": false,
  "mappings": [
    {
      "sourceTransactionId": "tx_123",
      "destinationWalletId": "wallet_456"
    },
    {
      "sourceTransactionId": "tx_789",
      "createWalletName": "Tabungan IWK",
      "icon": "💵",
      "color": "#64748b"
    }
  ]
}
```

**Verification:**

Browser QA:
1. Open `/settings`.
2. Click `Preview Dulu`.
3. Verify table visible.
4. Change one row destination.
5. Click `Mulai Migrasi`.
6. Confirm modal shows chosen mapping.

Expected screenshot:
- `tmp/savings-migration-preview-table.png`

---

## Task 4: Accept mappings in migration engine

**Objective:** Backend uses explicit user mapping instead of only detected grouping.

**Files:**
- Modify: `app/api/savings/migrate/route.ts`
- Modify: `scripts/migrate-savings-to-wallets.ts`

**Function signature:**

```ts
type MigrationMapping = {
  sourceTransactionId: string
  destinationWalletId?: string
  createWalletName?: string
  icon?: string
  color?: string
}

async function migrateSavingsToWallets(
  userId: string,
  dryRun = true,
  mappings: MigrationMapping[] = []
) { ... }
```

**Rules:**
- If mappings empty, keep current detected grouping behavior.
- If mappings present, only migrate listed source transaction IDs.
- Validate every mapped source transaction belongs to `session.user.id`.
- Validate `destinationWalletId` belongs to same user and `type = 'SAVINGS'`.
- If `createWalletName`, create `Wallet(type='SAVINGS')` once per name.
- Reject mapping with neither destination nor create name.

**Verification:**

Runtime script:
- create two source transactions
- map first to existing wallet
- map second to new wallet
- migrate
- assert 2 INCOME transactions created in expected wallets
- rerun migrate
- assert created count = 0

Expected:

```text
mapping migration selfcheck passed
```

---

# P1 — Healthier Data Model

## Task 5: Add migration link fields to Transaction

**Objective:** Stop relying on description matching for idempotency.

**Files:**
- Modify: `prisma/schema.prisma`
- Create migration: `prisma/migrations/<timestamp>_add_savings_migration_links/migration.sql`
- Modify: `scripts/migrate-savings-to-wallets.ts`

**Schema change:**

```prisma
model Transaction {
  // existing fields...
  migrationSourceTransactionId String?
  migrationSourceTransaction   Transaction?  @relation("SavingsMigrationSource", fields: [migrationSourceTransactionId], references: [id], onDelete: SetNull)
  migratedTransactions         Transaction[] @relation("SavingsMigrationSource")
  migrationBatchId             String?

  @@index([migrationSourceTransactionId])
  @@index([userId, migrationBatchId])
}
```

**SQLite migration SQL:**

```sql
ALTER TABLE "Transaction" ADD COLUMN "migrationSourceTransactionId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "migrationBatchId" TEXT;
CREATE INDEX "Transaction_migrationSourceTransactionId_idx" ON "Transaction"("migrationSourceTransactionId");
CREATE INDEX "Transaction_userId_migrationBatchId_idx" ON "Transaction"("userId", "migrationBatchId");
```

**Engine changes:**
- Existing migrated check becomes:

```ts
where: {
  userId,
  walletId: wallet.id,
  type: 'INCOME',
  migrationSourceTransactionId: tx.id,
}
```

- New migrated transaction stores:

```ts
migrationSourceTransactionId: tx.id,
migrationBatchId,
```

**Backfill compatibility:**
- During transition, still fallback to old description/date/amount check.
- If fallback finds old migrated tx with null `migrationSourceTransactionId`, update it with source ID.

**Verification:**

```bash
npx prisma migrate dev --name add_savings_migration_links
npx prisma generate
npx tsx scripts/tmp-savings-migration-link-check.ts
```

Expected:
- migrated INCOME has `migrationSourceTransactionId = source EXPENSE id`
- rerun skips by source ID

---

## Task 6: Add transfer pair ID

**Objective:** Represent saving as one transfer event: EXPENSE out + INCOME in.

**Files:**
- Modify: `prisma/schema.prisma`
- Create migration: `prisma/migrations/<timestamp>_add_transfer_pair_id/migration.sql`
- Modify: `scripts/migrate-savings-to-wallets.ts`
- Optional modify: transaction detail UI later.

**Schema change:**

```prisma
model Transaction {
  // existing fields...
  transferPairId String?

  @@index([userId, transferPairId])
}
```

**Migration SQL:**

```sql
ALTER TABLE "Transaction" ADD COLUMN "transferPairId" TEXT;
CREATE INDEX "Transaction_userId_transferPairId_idx" ON "Transaction"("userId", "transferPairId");
```

**Engine rules:**
- Generate one `transferPairId` per source transaction if source has none:

```ts
const transferPairId = tx.transferPairId || crypto.randomUUID()
```

- Update source EXPENSE with `transferPairId` if empty.
- Create migrated INCOME with same `transferPairId`.
- If source already has `transferPairId`, reuse it.

**Verification:**

Self-check:
- Create source EXPENSE.
- Migrate.
- Fetch source + migrated income.
- Assert `source.transferPairId === migrated.transferPairId`.
- Assert rerun preserves same ID.

Expected:

```text
transfer pair selfcheck passed
```

---

# P2 — Automation + Dashboard

## Task 7: Add SavingsRule model

**Objective:** Save auto-routing rules for future savings transactions/imports.

**Files:**
- Modify: `prisma/schema.prisma`
- Create migration: `prisma/migrations/<timestamp>_add_savings_rules/migration.sql`
- Create: `lib/savings/savings-rules.ts`

**Schema:**

```prisma
model SavingsRule {
  id                  String   @id @default(cuid())
  userId              String
  name                String
  pattern             String
  isRegex             Boolean  @default(false)
  isActive            Boolean  @default(true)
  destinationWalletId String
  priority            Int      @default(100)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  destinationWallet   Wallet   @relation(fields: [destinationWalletId], references: [id], onDelete: Cascade)

  @@index([userId, isActive, priority])
  @@index([destinationWalletId])
}
```

Also add to `User`:

```prisma
savingsRules SavingsRule[]
```

Add to `Wallet`:

```prisma
savingsRules SavingsRule[]
```

**Rule matcher:**

```ts
export async function findSavingsRuleDestination(userId: string, text: string) {
  const rules = await prisma.savingsRule.findMany({
    where: { userId, isActive: true },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  })

  return rules.find((rule) => rule.isRegex
    ? new RegExp(rule.pattern, 'i').test(text)
    : text.toLowerCase().includes(rule.pattern.toLowerCase())
  ) ?? null
}
```

**Verification:**
- rule `IWK` routes `Tabungan IWK Januari` to `Tabungan IWK` wallet
- inactive rule ignored
- lower priority wins

---

## Task 8: Add CRUD API for savings rules

**Objective:** Let UI create/edit/delete routing rules.

**Files:**
- Create: `app/api/savings/rules/route.ts`
- Create: `app/api/savings/rules/[id]/route.ts`

**Endpoints:**

```text
GET    /api/savings/rules
POST   /api/savings/rules
PATCH  /api/savings/rules/:id
DELETE /api/savings/rules/:id
```

**Validation:**
- Must be authenticated.
- Rule belongs to session user.
- `destinationWalletId` must belong to user and `type = 'SAVINGS'`.
- Regex rules compile before save.

**Verification:**

Curl/Playwright API test:
- create rule
- list shows rule
- patch pattern
- delete rule
- list no longer shows rule

Expected:

```text
savings rules api selfcheck passed
```

---

## Task 9: Apply savings rules in preview/migration

**Objective:** Rules override heuristic naming.

**Files:**
- Modify: `scripts/migrate-savings-to-wallets.ts`
- Modify: `lib/savings/savings-rules.ts`

**Priority order:**

```text
manual mapping > active SavingsRule > heuristic detection > Tabungan Lainnya
```

**Preview row addition:**

```ts
routingSource: 'manual' | 'rule' | 'heuristic' | 'fallback'
matchedRuleId?: string
matchedRuleName?: string
```

**Verification:**
- With rule `IWK`, preview row says `routingSource = 'rule'` and destination wallet is IWK.
- Manual mapping still overrides rule.

---

## Task 10: Add savings rules UI

**Objective:** User manages auto-rules from settings or savings dashboard.

**Files:**
- Create: `components/savings/SavingsRulesPanel.tsx`
- Modify: `app/settings/page.tsx`

**UI:**
- List active rules.
- Add rule: name, pattern, regex checkbox, destination wallet, priority.
- Toggle active.
- Delete.

**Verification screenshot:**

```text
/tmp/budtrack-qa-shots/savings-rules-panel.png
```

---

## Task 11: Add savings dashboard API

**Objective:** Provide aggregate savings data for dashboard.

**Files:**
- Create: `app/api/savings/dashboard/route.ts`
- Create: `lib/savings/savings-dashboard.ts`

**Response shape:**

```ts
type SavingsDashboard = {
  totalBalance: number
  totalContributedThisMonth: number
  totalContributedAllTime: number
  walletCount: number
  wallets: Array<{
    walletId: string
    name: string
    icon: string | null
    color: string | null
    balance: number
    contributedThisMonth: number
    contributedAllTime: number
    lastContributionDate: string | null
    lastContributionAmount: number | null
  }>
  monthlyTrend: Array<{
    month: string
    amount: number
  }>
  unmapped: Array<{
    transactionId: string
    date: string
    description: string
    amount: number
    detectedLabel: string
  }>
}
```

**Rules:**
- Savings wallets: `Wallet.type = 'SAVINGS'`.
- Contributions: `Transaction.type = 'INCOME'` in savings wallets, or migrated transactions linked by `migrationSourceTransactionId`.
- Unmapped: old `EXPENSE` savings transactions with no migrated target.

**Verification:**
- Seed two savings wallets and three contributions.
- API returns correct total balance, monthly trend, last contribution.

---

## Task 12: Add savings dashboard page

**Objective:** Show “saving berapa, saving apa aja” in one place.

**Files:**
- Create: `app/savings/page.tsx`
- Create: `components/savings/SavingsDashboard.tsx`
- Modify: `app/components/Sidebar.tsx` add menu item `Tabungan`.

**Page sections:**
1. Header cards:
   - Total Tabungan
   - Setoran Bulan Ini
   - Jumlah Bucket
2. Bucket cards:
   - name, balance, this month, last contribution
3. Monthly contribution chart/table.
4. Unmapped savings transactions card:
   - CTA: `Review & Migrasi`

**Verification:**
- Navigate `/savings`.
- Confirm cards render.
- Confirm IWK/Darurat buckets appear.
- Screenshot:

```text
/tmp/budtrack-qa-shots/savings-dashboard.png
```

---

# Acceptance Criteria

## P0 Done When

- Preview shows row-level transactions.
- User can pick destination wallet per transaction.
- User can create new savings wallet during migration.
- Better naming extracts `Tabungan IWK Januari` → `Tabungan IWK`.
- Migration with mappings is idempotent.

## P1 Done When

- `Transaction.migrationSourceTransactionId` exists and is populated for migrated INCOME rows.
- `Transaction.transferPairId` exists and matches source EXPENSE + target INCOME.
- Migration no longer depends on description matching for new data.
- Legacy migrated rows can be backfilled opportunistically.

## P2 Done When

- User can create savings auto-rules.
- Preview uses rules before heuristic detection.
- `/savings` dashboard shows total saving + buckets + monthly trend + unmapped queue.

---

# Recommended Build Order

1. Task 1 — detection helper.
2. Task 2 — row-level preview API.
3. Task 3 — editable preview table.
4. Task 4 — mapping-based migration.
5. Task 5 — migration source link.
6. Task 6 — transfer pair ID.
7. Task 7 — SavingsRule model.
8. Task 8 — SavingsRule API.
9. Task 9 — rules in preview/migration.
10. Task 10 — rules UI.
11. Task 11 — dashboard API.
12. Task 12 — dashboard page.

---

# Test Matrix

## Unit/self-check

```bash
npx tsx lib/savings/savings-detection.selfcheck.ts
npx tsx scripts/tmp-savings-mapping-check.ts
npx tsx scripts/tmp-savings-transfer-pair-check.ts
npx tsx scripts/tmp-savings-rules-check.ts
npx tsx scripts/tmp-savings-dashboard-check.ts
```

## Browser QA

Use Playwright:

1. `/settings` → migration preview table screenshot.
2. Change mapping → confirm modal screenshot.
3. Commit migration → wallet balance screenshot.
4. Re-run migration → shows already migrated/skipped screenshot.
5. `/settings` → savings rules panel screenshot.
6. `/savings` → dashboard screenshot.

## Data assertions

```sql
-- no duplicate migrated transactions per source
select migrationSourceTransactionId, count(*)
from "Transaction"
where migrationSourceTransactionId is not null
group by migrationSourceTransactionId
having count(*) > 1;

-- transfer pair has two sides
select transferPairId, count(*)
from "Transaction"
where transferPairId is not null
group by transferPairId;
```

Expected:
- first query returns 0 rows.
- second query returns pair counts of 2 for migrated savings transfers.

---

# Risks / Decisions

## Keep as Wallet vs add SavingsBucket model

Decision for now: keep using `Wallet(type='SAVINGS')`.

Reason:
- existing app already understands wallets
- minimal schema/UI blast radius
- user mental model: “tabungan masuk wallet masing-masing”

Future upgrade path:
- add `SavingsBucket` only if same real wallet needs many virtual buckets without separate balances.

## Float money values

Existing schema uses `Float`. Do not change in this plan.

Future upgrade path:
- migrate money fields to integer cents/sen.

## Rollback

No full rollback in P0-P2.

Reason:
- transfer pair + migration source link makes rollback possible later.
- adding rollback now adds risk.

Future rollback behavior:
- delete migrated INCOME where `migrationBatchId = X`
- subtract created amount from savings wallets
- clear source `transferPairId` only if no other linked transaction

---

# First Implementation Step

Start with Task 1 and Task 2 together. They are low-risk and unlock all UI work.
