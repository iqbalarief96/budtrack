# Household Inventory / Stok Rumah Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build mobile-first household stock opname in BudTrack for consumables, with barcode lookup, quick opname, stock movements, and shopping list.

**Architecture:** Keep feature isolated in new Prisma models and `/api/household-inventory/*` routes. UI lives at `/household-inventory` with nav label `Stok Rumah`. No sample items, no auto seed on GET, no finance-table mutation, no transaction/receipt integration in v1.

**Tech Stack:** Next.js 14 App Router, Prisma 5 + SQLite, NextAuth, Zod, Vitest, browser `BarcodeDetector`, OpenFoodFacts fetch with timeout.

---

## Preflight rules

Do these before any code task:

```bash
cd /home/iqbalarief96/projects/budtrack
git status --short
systemctl show budtrack.service -p WorkingDirectory -p ExecStart --no-pager
grep DATABASE_URL .env.production .env
```

Expected:

```text
WorkingDirectory=/home/iqbalarief96/projects/budtrack
DATABASE_URL -> prisma/devtest.db
```

Do not run inventory implementation in live dir. Use worktree:

```bash
cd /home/iqbalarief96/projects/budtrack
git worktree add ../budtrack-inventory -b feat/household-inventory
cd ../budtrack-inventory
```

No `npm run dev`, `npm run build`, or `prisma db push` in `/home/iqbalarief96/projects/budtrack` until final deploy.

---

## Task 0: Stabilize current dirty work before inventory

**Objective:** Commit or explicitly park existing wallet/rules hotfixes so inventory diff stays clean.

**Files already dirty in live repo:**
- `app/api/wallets/route.ts`
- `app/components/TransactionModal.tsx`
- `app/wallets/[walletId]/page.tsx`
- `app/wallets/page.tsx`
- `components/savings/SavingsRulesPanel.tsx`
- `lib/validators.ts`
- `app/components/SearchableSelect.tsx`
- `app/components/CategoryCombobox.tsx`
- `prisma/_db_snapshots_20260629_213508/`

**Steps:**

1. Inspect untracked component use:
   ```bash
   cd /home/iqbalarief96/projects/budtrack
   grep -R "CategoryCombobox\|SearchableSelect" app components lib -n
   ```
2. Build current state:
   ```bash
   npm run build
   git diff --check
   ```
3. Commit only relevant wallet/rules files. Do not include `prisma/_db_snapshots_20260629_213508/` unless user explicitly wants DB snapshots tracked.
   ```bash
   git add app/api/wallets/route.ts app/components/TransactionModal.tsx app/wallets/[walletId]/page.tsx app/wallets/page.tsx components/savings/SavingsRulesPanel.tsx lib/validators.ts app/components/SearchableSelect.tsx app/components/CategoryCombobox.tsx
   git commit -m "fix: improve wallet type and savings rules UX"
   ```

**Verification:**

```bash
git status --short
```

Expected: no tracked code changes except possibly untracked `prisma/_db_snapshots_20260629_213508/`.

---

## Task 1: Create inventory worktree

**Objective:** Isolate implementation from live service directory.

**Files:** none

**Steps:**

```bash
cd /home/iqbalarief96/projects/budtrack
git worktree add ../budtrack-inventory -b feat/household-inventory
cd ../budtrack-inventory
git status --short
```

**Verification:**

```bash
pwd
git branch --show-current
```

Expected:

```text
/home/iqbalarief96/projects/budtrack-inventory
feat/household-inventory
```

Commit: none.

---

## Task 2: Add Prisma schema models

**Objective:** Add isolated household inventory tables and User relations.

**Files:**
- Modify: `prisma/schema.prisma`

**Implementation:**

Add relation fields inside `model User`:

```prisma
  householdInventoryItems      HouseholdInventoryItem[]
  householdInventoryCategories HouseholdInventoryCategory[]
  householdInventoryLocations  HouseholdInventoryLocation[]
  householdStockMovements      HouseholdStockMovement[]
  householdProductTemplates    HouseholdProductTemplate[]
  householdShoppingListItems   HouseholdShoppingListItem[]
```

Append models near other domain models:

```prisma
model HouseholdInventoryItem {
  id              String    @id @default(cuid())
  userId          String
  name            String
  barcode         String?
  quantity        Float     @default(0)
  unit            String    @default("pcs")
  minimumQuantity Float     @default(1)
  expiredAt       DateTime?
  notes           String?
  deletedAt       DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  categoryId      String?
  locationId      String?

  user      User                         @relation(fields: [userId], references: [id], onDelete: Cascade)
  category  HouseholdInventoryCategory?  @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  location  HouseholdInventoryLocation?  @relation(fields: [locationId], references: [id], onDelete: SetNull)
  movements HouseholdStockMovement[]

  @@index([userId])
  @@index([userId, barcode])
  @@index([userId, deletedAt])
  @@index([categoryId])
  @@index([locationId])
}

model HouseholdInventoryCategory {
  id        String   @id @default(cuid())
  userId    String
  name      String
  icon      String?
  color     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user             User                       @relation(fields: [userId], references: [id], onDelete: Cascade)
  items            HouseholdInventoryItem[]
  productTemplates HouseholdProductTemplate[]

  @@unique([userId, name])
  @@index([userId])
}

model HouseholdInventoryLocation {
  id        String   @id @default(cuid())
  userId    String
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user  User                     @relation(fields: [userId], references: [id], onDelete: Cascade)
  items HouseholdInventoryItem[]

  @@unique([userId, name])
  @@index([userId])
}

model HouseholdStockMovement {
  id             String   @id @default(cuid())
  userId         String
  itemId         String
  type           String
  quantityBefore Float
  quantityAfter  Float
  delta          Float
  reason         String?
  createdAt      DateTime @default(now())

  user User                   @relation(fields: [userId], references: [id], onDelete: Cascade)
  item HouseholdInventoryItem @relation(fields: [itemId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([itemId])
  @@index([createdAt])
}

model HouseholdProductTemplate {
  id                String   @id @default(cuid())
  userId            String
  barcode           String
  name              String
  brand             String?
  defaultUnit       String?
  defaultCategoryId String?
  source            String   @default("MANUAL")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user            User                        @relation(fields: [userId], references: [id], onDelete: Cascade)
  defaultCategory HouseholdInventoryCategory? @relation(fields: [defaultCategoryId], references: [id], onDelete: SetNull)

  @@unique([userId, barcode])
  @@index([userId])
}

model HouseholdShoppingListItem {
  id        String    @id @default(cuid())
  userId    String
  itemId    String?
  name      String
  unit      String?
  quantity  Float?
  checkedAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([itemId])
}
```

**Verification:**

```bash
npx prisma generate
```

Expected: Prisma Client generated successfully.

**Commit:**

```bash
git add prisma/schema.prisma
git commit -m "feat: add household inventory schema"
```

---

## Task 3: Add pure status and unit helpers with tests

**Objective:** Create deterministic pure functions before API/UI code.

**Files:**
- Create: `lib/household-inventory/status.ts`
- Create: `lib/household-inventory/constants.ts`
- Create: `lib/household-inventory/__tests__/status.test.ts`

**Code:**

`lib/household-inventory/constants.ts`

```ts
export const HOUSEHOLD_UNITS = [
  'pcs',
  'bungkus',
  'pack',
  'botol',
  'liter',
  'ml',
  'kg',
  'gram',
  'sachet',
  'roll',
  'box'
] as const

export const DEFAULT_HOUSEHOLD_CATEGORIES = [
  'Makanan Pokok',
  'Bumbu & Dapur',
  'Minuman',
  'Snack / Instan',
  'Kebersihan Rumah',
  'Mandi & Toiletries',
  'Obat & P3K',
  'Lainnya'
] as const

export const DEFAULT_HOUSEHOLD_LOCATIONS = [
  'Dapur',
  'Kulkas',
  'Freezer',
  'Kamar mandi',
  'Gudang',
  'Rak snack'
] as const
```

`lib/household-inventory/status.ts`

```ts
export type HouseholdStockStatus = 'AMAN' | 'MENIPIS' | 'HABIS' | 'EXPIRED' | 'MAU_EXPIRED'

export interface HouseholdStatusInput {
  quantity: number
  minimumQuantity: number
  expiredAt?: Date | string | null
  now?: Date
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function getHouseholdStockStatus(input: HouseholdStatusInput): HouseholdStockStatus {
  const now = input.now ?? new Date()
  const expiredAt = input.expiredAt ? new Date(input.expiredAt) : null

  if (expiredAt && expiredAt.getTime() < startOfDay(now).getTime()) return 'EXPIRED'
  if (input.quantity <= 0) return 'HABIS'
  if (input.quantity <= input.minimumQuantity) return 'MENIPIS'
  if (expiredAt && expiredAt.getTime() <= startOfDay(addDays(now, 7)).getTime()) return 'MAU_EXPIRED'
  return 'AMAN'
}

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY)
}
```

`lib/household-inventory/__tests__/status.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { getHouseholdStockStatus } from '../status'

describe('getHouseholdStockStatus', () => {
  const now = new Date('2026-06-30T12:00:00.000Z')

  it('marks expired before stock level', () => {
    expect(getHouseholdStockStatus({ quantity: 10, minimumQuantity: 1, expiredAt: '2026-06-29', now })).toBe('EXPIRED')
  })

  it('marks zero quantity as habis', () => {
    expect(getHouseholdStockStatus({ quantity: 0, minimumQuantity: 1, now })).toBe('HABIS')
  })

  it('marks quantity at minimum as menipis', () => {
    expect(getHouseholdStockStatus({ quantity: 5, minimumQuantity: 5, now })).toBe('MENIPIS')
  })

  it('marks expiry within seven days as mau expired', () => {
    expect(getHouseholdStockStatus({ quantity: 10, minimumQuantity: 1, expiredAt: '2026-07-05', now })).toBe('MAU_EXPIRED')
  })

  it('marks healthy stock as aman', () => {
    expect(getHouseholdStockStatus({ quantity: 10, minimumQuantity: 1, now })).toBe('AMAN')
  })
})
```

**Verification:**

```bash
npx vitest run lib/household-inventory/__tests__/status.test.ts
```

Expected: 5 passed.

**Commit:**

```bash
git add lib/household-inventory
git commit -m "feat: add household inventory status helpers"
```

---

## Task 4: Add validation schemas

**Objective:** Centralize request validation.

**Files:**
- Create: `lib/household-inventory/validation.ts`

**Code:**

```ts
import { z } from 'zod'

const optionalId = z.string().min(1).optional().nullable()
const optionalTrimmed = z.string().trim().min(1).optional().nullable()

export const householdItemCreateSchema = z.object({
  name: z.string().trim().min(1),
  barcode: optionalTrimmed,
  categoryId: optionalId,
  locationId: optionalId,
  quantity: z.coerce.number().min(0),
  unit: z.string().trim().min(1),
  minimumQuantity: z.coerce.number().min(0),
  expiredAt: z.string().datetime().optional().nullable(),
  notes: z.string().trim().optional().nullable()
})

export const householdItemUpdateSchema = householdItemCreateSchema.partial()

export const adjustItemSchema = z.object({
  mode: z.enum(['ADD', 'SUBTRACT', 'SET']),
  quantity: z.coerce.number().min(0),
  reason: z.enum(['RESTOCK', 'USED', 'EXPIRED', 'DAMAGED', 'AUDIT', 'SHOPPING_LIST_RESTOCK']),
  note: z.string().trim().optional().nullable()
})

export const opnameSchema = z.object({
  updates: z.array(z.object({
    itemId: z.string().min(1),
    quantity: z.coerce.number().min(0)
  })).min(1)
})

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1),
  icon: z.string().trim().optional().nullable(),
  color: z.string().trim().optional().nullable()
})

export const locationCreateSchema = z.object({
  name: z.string().trim().min(1)
})

export const barcodeLookupSchema = z.object({
  barcode: z.string().trim().min(3).max(64)
})

export const shoppingListItemCreateSchema = z.object({
  itemId: z.string().min(1).optional().nullable(),
  name: z.string().trim().min(1),
  unit: z.string().trim().optional().nullable(),
  quantity: z.coerce.number().min(0).optional().nullable()
})

export const shoppingRestockSchema = z.object({
  items: z.array(z.object({
    itemId: z.string().min(1),
    boughtQuantity: z.coerce.number().positive()
  })).min(1)
})
```

**Verification:**

```bash
npx tsc --noEmit --pretty false
```

If project has pre-existing TS noise, use `npm run build` later as final check.

**Commit:**

```bash
git add lib/household-inventory/validation.ts
git commit -m "feat: add household inventory validation"
```

---

## Task 5: Add API utilities

**Objective:** Avoid repeated auth and ownership boilerplate.

**Files:**
- Create: `lib/household-inventory/api.ts`

**Code:**

```ts
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function requireUserId() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  return { userId }
}

export async function ensureHouseholdCategory(userId: string, categoryId?: string | null) {
  if (!categoryId) return true
  const category = await prisma.householdInventoryCategory.findFirst({ where: { id: categoryId, userId } })
  return Boolean(category)
}

export async function ensureHouseholdLocation(userId: string, locationId?: string | null) {
  if (!locationId) return true
  const location = await prisma.householdInventoryLocation.findFirst({ where: { id: locationId, userId } })
  return Boolean(location)
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}
```

**Verification:**

```bash
npx tsc --noEmit --pretty false
```

**Commit:**

```bash
git add lib/household-inventory/api.ts
git commit -m "feat: add household inventory api helpers"
```

---

## Task 6: Implement categories and locations APIs

**Objective:** Add category/location CRUD-lite plus explicit defaults setup.

**Files:**
- Create: `app/api/household-inventory/categories/route.ts`
- Create: `app/api/household-inventory/categories/defaults/route.ts`
- Create: `app/api/household-inventory/locations/route.ts`
- Create: `app/api/household-inventory/locations/defaults/route.ts`

**Implementation notes:**

- `GET` returns current user's rows sorted by name.
- `POST` validates body and creates one row.
- Defaults routes iterate constants and upsert/skip by `userId_name` unique.
- Never create item rows.

**Verification:**

```bash
npm run build
```

Expected: build succeeds. Existing dynamic server warnings may appear; no new compile errors.

**Commit:**

```bash
git add app/api/household-inventory/categories app/api/household-inventory/locations
git commit -m "feat: add household category and location APIs"
```

---

## Task 7: Implement item list/create/update/delete APIs

**Objective:** Add core item CRUD with soft delete and movement creation.

**Files:**
- Create: `app/api/household-inventory/items/route.ts`
- Create: `app/api/household-inventory/items/[id]/route.ts`

**Implementation notes:**

- List supports `search`, `categoryId`, `locationId`, `status` query params.
- Server computes status using `getHouseholdStockStatus`.
- Create validates category/location ownership.
- Duplicate active barcode for same user returns 409 with existing item id/name.
- Delete sets `deletedAt = new Date()`.
- Do not hard delete movements.

**Verification:**

```bash
npm run build
```

**Commit:**

```bash
git add app/api/household-inventory/items
git commit -m "feat: add household inventory item APIs"
```

---

## Task 8: Implement adjust and opname APIs

**Objective:** Add audited stock mutations.

**Files:**
- Create: `app/api/household-inventory/items/[id]/adjust/route.ts`
- Create: `app/api/household-inventory/opname/route.ts`

**Implementation notes:**

- All writes in Prisma transaction.
- `SUBTRACT` clamps to zero.
- Movement is written only when quantity changes.
- Opname verifies all item ids belong to user before updates.

**Verification:**

```bash
npm run build
```

**Commit:**

```bash
git add app/api/household-inventory/items app/api/household-inventory/opname
git commit -m "feat: add household stock adjustment APIs"
```

---

## Task 9: Implement barcode lookup service and API

**Objective:** Lookup local item/template first, then OpenFoodFacts, with manual fallback.

**Files:**
- Create: `lib/household-inventory/barcode.ts`
- Create: `app/api/household-inventory/barcode/lookup/route.ts`

**Implementation notes:**

`barcode.ts` exports:

```ts
export async function lookupOpenFoodFacts(barcode: string): Promise<null | {
  barcode: string
  name: string
  brand?: string
  defaultUnit?: string
}> { /* fetch with AbortController timeout */ }
```

Timeout:

```ts
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 3000)
```

API returns one of:

```ts
type BarcodeLookupResponse =
  | { status: 'ITEM_FOUND'; item: unknown }
  | { status: 'TEMPLATE_FOUND'; template: unknown }
  | { status: 'ONLINE_FOUND'; template: unknown }
  | { status: 'NOT_FOUND'; barcode: string }
```

Never create `HouseholdInventoryItem` from online result.

**Verification:**

```bash
npm run build
```

Optional network smoke:

```bash
node -e "fetch('https://world.openfoodfacts.org/api/v2/product/8999999000005.json').then(r=>console.log(r.status)).catch(e=>console.error(e.message))"
```

**Commit:**

```bash
git add lib/household-inventory/barcode.ts app/api/household-inventory/barcode
git commit -m "feat: add household barcode lookup"
```

---

## Task 10: Implement shopping list APIs

**Objective:** Support auto low-stock list plus manual add-ons and restock checked items.

**Files:**
- Create: `app/api/household-inventory/shopping-list/route.ts`
- Create: `app/api/household-inventory/shopping-list/restock/route.ts`

**Implementation notes:**

`GET` returns:

- auto items: active inventory where `quantity <= minimumQuantity`
- manual items: `HouseholdShoppingListItem` where `checkedAt = null`

`POST /shopping-list` creates manual item.

`POST /restock`:

- transaction
- verify item ownership
- add bought quantity
- create `SHOPPING_LIST_RESTOCK` movement

**Verification:**

```bash
npm run build
```

**Commit:**

```bash
git add app/api/household-inventory/shopping-list
git commit -m "feat: add household shopping list APIs"
```

---

## Task 11: Add barcode scanner adapter component

**Objective:** Provide Native BarcodeDetector + manual fallback without new dependency.

**Files:**
- Create: `components/household-inventory/BarcodeScanner.tsx`

**Implementation notes:**

- Client component.
- Uses `navigator.mediaDevices.getUserMedia`.
- Uses `window.BarcodeDetector` when available.
- Always shows manual barcode input.
- Stop camera tracks on unmount.
- Expose callback: `onBarcode(barcode: string)`.

TypeScript browser global declaration can stay local:

```ts
declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => {
      detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>
    }
  }
}
```

**Verification:**

```bash
npm run build
```

**Commit:**

```bash
git add components/household-inventory/BarcodeScanner.tsx
git commit -m "feat: add household barcode scanner component"
```

---

## Task 12: Add reusable UI components for inventory

**Objective:** Build boring mobile-first pieces before page composition.

**Files:**
- Create: `components/household-inventory/InventorySummary.tsx`
- Create: `components/household-inventory/InventoryItemList.tsx`
- Create: `components/household-inventory/InventoryItemForm.tsx`
- Create: `components/household-inventory/InventoryAdjustModal.tsx`
- Create: `components/household-inventory/QuickOpnameTable.tsx`
- Create: `components/household-inventory/ShoppingList.tsx`
- Create: `components/household-inventory/MovementHistory.tsx`

**Implementation notes:**

- Keep state local; no new global provider.
- Use existing `fetch` pattern from pages/components.
- Avoid native tiny datalist for lots of options; use normal select for short unit/category/location lists.
- Empty state must say no items and show setup/add CTAs, not fake rows.

**Verification:**

```bash
npm run build
```

**Commit:**

```bash
git add components/household-inventory
git commit -m "feat: add household inventory UI components"
```

---

## Task 13: Add inventory page

**Objective:** Compose tabs and data flow at `/household-inventory`.

**Files:**
- Create: `app/household-inventory/page.tsx`

**Implementation notes:**

Tabs:

```text
Ringkasan | Barang | Opname | Scan | Belanja
```

Page responsibilities:

- fetch items/categories/locations/shopping list
- create defaults on explicit button click
- create/edit/delete items
- adjust stock
- lookup barcode and route to quick adjust or form prefill
- save opname
- restock shopping list items

**Verification:**

```bash
npm run build
```

**Commit:**

```bash
git add app/household-inventory/page.tsx
git commit -m "feat: add household inventory page"
```

---

## Task 14: Add navigation link

**Objective:** Make feature discoverable as `Stok Rumah`.

**Files:**
- Modify: `components/Navbar.tsx` or actual navigation file found during implementation.

**Steps:**

1. Inspect nav file:
   ```bash
   grep -R "href=\"/wallets\"\|Dompet\|Dashboard" app components -n
   ```
2. Add link:
   ```text
   href="/household-inventory"
   label="Stok Rumah"
   ```
3. Use existing icon style; no new icon package.

**Verification:**

```bash
npm run build
```

**Commit:**

```bash
git add components/Navbar.tsx
git commit -m "feat: add household inventory navigation"
```

---

## Task 15: Add API smoke script for local DB only

**Objective:** Leave one runnable non-browser check for DB safety and no-sample invariant.

**Files:**
- Create: `scripts/check-household-inventory-safety.ts`

**Script behavior:**

- Connect via Prisma.
- Print counts for `User`, `Transaction`, and household tables.
- Assert no household item name contains `sample`, `demo`, or `contoh`.
- Assert transaction count unchanged if caller passes `EXPECTED_TRANSACTION_COUNT` env.

**Verification:**

```bash
npx ts-node --project scripts/tsconfig.json scripts/check-household-inventory-safety.ts
```

**Commit:**

```bash
git add scripts/check-household-inventory-safety.ts
git commit -m "test: add household inventory safety check"
```

---

## Task 16: Full worktree verification

**Objective:** Prove branch compiles/tests before touching live dir.

**Commands in worktree:**

```bash
cd /home/iqbalarief96/projects/budtrack-inventory
npx prisma generate
npx vitest run lib/household-inventory/__tests__/status.test.ts
npm run build
git status --short
```

Expected:

- Prisma generate succeeds
- status tests pass
- build exits 0
- no unintended dirty files

Do not deploy yet.

---

## Task 17: Live deploy preflight and DB snapshot

**Objective:** Prepare live DB safely before schema push.

**Commands in live dir:**

```bash
cd /home/iqbalarief96/projects/budtrack
systemctl show budtrack.service -p WorkingDirectory -p ExecStart --no-pager
grep DATABASE_URL .env.production .env
sqlite3 prisma/devtest.db "SELECT COUNT(*) FROM User;"
sqlite3 prisma/devtest.db "SELECT COUNT(*) FROM \"Transaction\";"
SNAP="prisma/_db_snapshots_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$SNAP"
cp prisma/devtest.db "$SNAP/devtest.db"
echo "$SNAP"
```

Expected:

- WorkingDirectory is live dir
- DB URL is `devtest.db`
- User count > 0
- Transaction count recorded
- Snapshot path printed

Stop if any mismatch.

---

## Task 18: Merge and apply schema

**Objective:** Bring verified inventory code into live dir and create new tables.

**Commands:**

```bash
cd /home/iqbalarief96/projects/budtrack
git merge feat/household-inventory
npx prisma generate
npx prisma db push
npm run build
```

Expected:

- schema push adds only household tables
- build exits 0

If build fails, do not restart service.

---

## Task 19: Restart and verify production

**Objective:** Confirm live app remains healthy.

**Commands:**

```bash
sudo systemctl restart budtrack.service
systemctl is-active budtrack.service
journalctl -u budtrack.service -n 100 --no-pager | grep -E "P2021|Prisma|Error" || true
sqlite3 prisma/devtest.db "SELECT COUNT(*) FROM \"Transaction\";"
sqlite3 prisma/devtest.db "SELECT COUNT(*) FROM HouseholdInventoryItem;"
```

Expected:

- service active
- no P2021
- transaction count same as Task 17
- HouseholdInventoryItem count 0 before user creates item

---

## Task 20: Browser/mobile QA

**Objective:** Verify real user flows.

**Manual/browser checks:**

| Flow | Expected |
|---|---|
| `/household-inventory` empty | no sample rows, setup CTA visible |
| click setup defaults | categories/locations created only |
| create item manual | item appears |
| adjust +1 | qty increases, movement shown |
| opname set qty | AUDIT movement created |
| manual barcode lookup unknown | form opens with barcode prefilled |
| OpenFoodFacts barcode lookup | prefilled form, no stock row until save |
| shopping restock | qty increases, item leaves low list if above min |
| camera denied/unsupported | manual barcode input visible |
| wallets page | still loads |
| savings rules | still loads |
| login/register | no P2021 |

Evidence report should be table-driven with screenshots if using browser tool.

---

## Rollback plan

If code breaks before DB push:

```bash
git reset --hard HEAD~1
npm run build
```

If live deploy breaks after merge but before restart:

```bash
git reset --hard HEAD~1
npm run build
```

If DB rollback needed:

```bash
cd /home/iqbalarief96/projects/budtrack
cp prisma/_db_snapshots_<timestamp>/devtest.db prisma/devtest.db
sudo systemctl restart budtrack.service
```

Because v1 only adds isolated household tables, DB rollback should not touch existing finance data.
