# Household Inventory / Stok Rumah Design

> **For Hermes:** after user approves this spec, use the writing-plans skill to create the implementation plan. Do not implement from this design directly.

**Goal:** Add a mobile-first household stock opname feature to BudTrack for tracking consumables such as gula, garam, mie, minyak, sabun, and similar home goods.

**Architecture:** Keep household inventory isolated from existing finance tables. Add new Prisma models, new `/api/household-inventory/*` routes, and a new mobile-first page. No sample rows, no auto-seeding, no transaction/receipt integration in v1.

**Tech Stack:** Next.js 14 app router, Prisma + SQLite, NextAuth session auth, browser camera APIs, OpenFoodFacts barcode lookup.

---

## 1. Problem

User wants stock opname for household consumables:

- know current remaining stock
- know whether stock is enough, low, empty, expired, or near expiry
- scan barcode from phone
- update stock quickly during home audit
- build shopping list from low/empty items

This is **not** asset inventory and must not affect net worth, wallets, transactions, savings rules, or dashboard money calculations.

---

## 2. Locked Scope

### In v1

- Household stock items with `quantity + unit`
- Custom categories and locations
- Optional expiry date per item
- Per-item minimum threshold
- Stock status: Aman, Menipis, Habis, Expired, Mau Expired
- Movement history for all stock changes
- Quick opname mode
- Scan mode
- Shopping list from low/empty items
- Barcode lookup:
  - local item lookup
  - local product template lookup
  - OpenFoodFacts online lookup
  - manual fallback
- Mobile-first UI

### Deferred

- Auto restock from receipt scan/import
- Linking stock restock to BudTrack transactions
- Telegram/Discord/email alerts
- Net worth integration
- Full ZXing fallback if native scanner proves unreliable
- Batch-level expiry tracking

---

## 3. Hard Safety Rules

No feature code may:

- create sample household items
- seed demo items when page loads
- auto-create stock rows from online barcode lookup
- mutate existing `Transaction`, `Wallet`, `Category`, or `SavingsRule` rows
- run development/build experiments in live service directory
- run Prisma DB push against live DB without snapshot first

Allowed default setup:

- User clicks **Buat kategori default**
- User clicks **Buat lokasi default**

These actions may only create default category/location rows, never stock items.

---

## 4. Data Model

### `HouseholdInventoryItem`

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
```

### `HouseholdInventoryCategory`

```prisma
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
```

### `HouseholdInventoryLocation`

```prisma
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
```

### `HouseholdStockMovement`

```prisma
model HouseholdStockMovement {
  id             String   @id @default(cuid())
  userId         String
  itemId         String
  type           String   // RESTOCK, USED, EXPIRED, DAMAGED, AUDIT, SHOPPING_LIST_RESTOCK
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
```

### `HouseholdProductTemplate`

```prisma
model HouseholdProductTemplate {
  id                String   @id @default(cuid())
  userId            String
  barcode           String
  name              String
  brand             String?
  defaultUnit       String?
  defaultCategoryId String?
  source            String   @default("MANUAL") // MANUAL, ONLINE, MANUAL_CORRECTED
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user            User                        @relation(fields: [userId], references: [id], onDelete: Cascade)
  defaultCategory HouseholdInventoryCategory? @relation(fields: [defaultCategoryId], references: [id], onDelete: SetNull)

  @@unique([userId, barcode])
  @@index([userId])
}
```

### Optional `HouseholdShoppingListItem`

Use only if manual shopping-list items are included in v1. Otherwise derive shopping list from stock thresholds.

```prisma
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

Add relation arrays to `User` for all required models.

---

## 5. Status Logic

Status is computed, not stored.

```ts
if (expiredAt && expiredAt < today) return "EXPIRED"
if (quantity <= 0) return "HABIS"
if (quantity <= minimumQuantity) return "MENIPIS"
if (expiredAt && expiredAt <= todayPlus7Days) return "MAU_EXPIRED"
return "AMAN"
```

If an item is expired but still has stock, show both facts in UI:

- main status: Expired
- stock count remains visible

---

## 6. API Design

Routes:

```text
GET    /api/household-inventory/items
POST   /api/household-inventory/items
GET    /api/household-inventory/items/[id]
PATCH  /api/household-inventory/items/[id]
DELETE /api/household-inventory/items/[id]
POST   /api/household-inventory/items/[id]/adjust
POST   /api/household-inventory/opname
GET    /api/household-inventory/categories
POST   /api/household-inventory/categories
POST   /api/household-inventory/categories/defaults
GET    /api/household-inventory/locations
POST   /api/household-inventory/locations
POST   /api/household-inventory/locations/defaults
GET    /api/household-inventory/shopping-list
POST   /api/household-inventory/shopping-list/restock
POST   /api/household-inventory/barcode/lookup
```

Every route must:

- require `getServerSession(authOptions)`
- scope reads/writes with `userId = session.user.id`
- verify referenced category/location/item belongs to current user
- return 401 unauthenticated
- never create sample rows

### Create Item

Payload:

```ts
{
  name: string
  barcode?: string
  categoryId?: string
  locationId?: string
  quantity: number
  unit: string
  minimumQuantity: number
  expiredAt?: string
  notes?: string
}
```

Behavior:

- Reject duplicate barcode when another active item already uses it for same user
- Create item
- If quantity > 0, create `RESTOCK` movement from 0 to quantity

### Adjust Item

Payload:

```ts
{
  mode: "ADD" | "SUBTRACT" | "SET"
  quantity: number
  reason: "RESTOCK" | "USED" | "EXPIRED" | "DAMAGED" | "AUDIT" | "SHOPPING_LIST_RESTOCK"
  note?: string
}
```

Rules:

- ADD increases stock
- SUBTRACT clamps at 0; no negative stock
- SET sets exact stock
- Always create movement if quantity changes

### Bulk Opname

Payload:

```ts
{ updates: [{ itemId: string, quantity: number }] }
```

Behavior:

- Transactional update
- Verify each item belongs to user
- Only changed quantities create `AUDIT` movements

---

## 7. Barcode Lookup

Route:

```text
POST /api/household-inventory/barcode/lookup
```

Payload:

```ts
{ barcode: string }
```

Flow:

1. Search active `HouseholdInventoryItem` by `userId + barcode`
2. If found: return `ITEM_FOUND`
3. Search `HouseholdProductTemplate` by `userId + barcode`
4. If found: return `TEMPLATE_FOUND`
5. Query OpenFoodFacts
6. If found: save/update local `HouseholdProductTemplate`, return `ONLINE_FOUND`
7. Else return `NOT_FOUND`

OpenFoodFacts endpoint:

```text
https://world.openfoodfacts.org/api/v2/product/{barcode}.json
```

Mapping:

- `product.product_name` -> template name
- `product.brands` -> brand
- `product.quantity` -> hint / notes
- default unit from quantity if clear, otherwise `pcs`

Online lookup timeout:

```text
3 seconds max
```

Online lookup must not create stock item. It only pre-fills the form.

---

## 8. UI Design

Route:

```text
/household-inventory
```

Navigation label:

```text
Stok Rumah
```

Tabs:

```text
Ringkasan | Barang | Opname | Scan | Belanja
```

### Ringkasan

Show cards:

- total item
- Aman count
- Menipis count
- Habis count
- Mau expired count
- Perlu dibeli count

Show priority lists:

- Habis
- Menipis
- Mau expired

### Barang

Mobile card list with:

- search
- category filter
- location filter
- status filter
- Edit
- Adjust
- History

### Add/Edit Form

Fields:

- Nama Barang
- Barcode + Scan button
- Kategori
- Lokasi
- Quantity
- Unit dropdown + custom option
- Minimum quantity
- Expired date optional
- Notes optional

### Opname Cepat

Flow:

- filter by category/location
- list items
- show old quantity
- input new quantity
- save all
- create `AUDIT` movement for changed rows only

### Scan Mode

Flow:

- start camera scanner
- detect barcode
- call lookup API
- if `ITEM_FOUND`: quick adjust view
- if template/online found: prefilled create form
- if not found: manual form with barcode prefilled
- manual barcode input always visible

### Belanja

Shopping list sources:

- automatic items where quantity <= minimumQuantity
- optional manual shopping items if implemented

Restock flow:

- user checks item
- enters bought quantity
- click `Restock yang dicentang`
- stock increases
- movement type `SHOPPING_LIST_RESTOCK`

---

## 9. Barcode Scanner Target

Design target:

```text
Native BarcodeDetector -> ZXing fallback -> manual input
```

Implementation staging:

- v1: Native BarcodeDetector + manual input
- v1.1: add `@zxing/browser` if native scanner proves unreliable

Reason:

- avoid dependency unless needed
- Chrome Android likely supports native path
- manual fallback prevents blocker

Use small adapter boundary so ZXing can be added later without rewriting UI.

---

## 10. Default Categories and Locations

Defaults are user-triggered only.

Categories:

```text
Makanan Pokok
Bumbu & Dapur
Minuman
Snack / Instan
Kebersihan Rumah
Mandi & Toiletries
Obat & P3K
Lainnya
```

Locations:

```text
Dapur
Kulkas
Freezer
Kamar mandi
Gudang
Rak snack
```

Duplicate handling:

- use `@@unique([userId, name])`
- skip existing rows
- return created + skipped counts

---

## 11. Implementation Safety Plan

Current live BudTrack service runs from:

```text
/home/iqbalarief96/projects/budtrack
```

Implementation must happen in a worktree:

```bash
cd /home/iqbalarief96/projects/budtrack
git worktree add ../budtrack-inventory -b feat/household-inventory
cd ../budtrack-inventory
```

Before live DB schema push:

```bash
cd /home/iqbalarief96/projects/budtrack
systemctl show budtrack.service -p WorkingDirectory -p ExecStart --no-pager
grep DATABASE_URL .env.production .env
sqlite3 prisma/devtest.db "SELECT COUNT(*) FROM User;"
SNAP="prisma/_db_snapshots_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$SNAP"
cp prisma/devtest.db "$SNAP/devtest.db"
```

Expected DB target:

```text
file:/home/iqbalarief96/projects/budtrack/prisma/devtest.db
```

No command may use `prisma/dev.db` as production DB.

---

## 12. Testing Matrix

### DB Safety

| Check | Expected |
|---|---|
| `.env.production` | points to `prisma/devtest.db` |
| `User` count | > 0 before and after |
| transaction count | unchanged unless user action explicitly touches transactions, which v1 should not |
| household item count before user action | 0 |
| no sample row names | true |

### API

| Feature | Expected |
|---|---|
| unauthenticated request | 401 |
| create item | item + initial movement |
| duplicate barcode | 409 or existing item response |
| adjust ADD | qty increases + movement |
| adjust SUBTRACT | qty never below 0 |
| adjust SET | exact qty + movement |
| bulk opname | only changed rows create AUDIT movement |
| barcode existing item | `ITEM_FOUND` |
| barcode online success | `ONLINE_FOUND`, template cached |
| barcode online fail | manual fallback via `NOT_FOUND` |

### UI

| Flow | Expected |
|---|---|
| empty inventory | no sample, setup CTA only |
| create defaults | category/location rows only |
| create item | appears in list |
| edit item | persists |
| adjust | qty and history update |
| opname | mass update + AUDIT logs |
| scan unsupported | manual input visible |
| shopping list restock | qty increases and item leaves list if above minimum |

### Regression

| Area | Expected |
|---|---|
| login/register | no P2021 |
| wallets | wallet type selector still works |
| savings rules | still loads and edits |
| transaction modal | category selector still works |
| dashboard | no crash |

---

## 13. Risk Cuts

If implementation gets too large, cut in this order:

1. Manual shopping-list items
2. ZXing fallback dependency
3. Online category heuristic
4. Full movement-history page

Do not cut:

- movement log
- manual barcode fallback
- no-sample rule
- soft delete
- DB snapshot before schema push
- user scoping on every route

---

## 14. Final Decisions for Implementation Plan

- Include `HouseholdShoppingListItem` in v1 so shopping list can contain both auto low-stock items and manual add-ons.
- Use one combined first-run setup CTA: **Siapkan kategori & lokasi default**. Internally it may call separate category/location helpers, but user sees one button.
- Use route `/household-inventory` and nav label `Stok Rumah`.
- Implement scanner v1 as Native `BarcodeDetector` + manual input fallback; keep adapter boundary ready for ZXing v1.1.
- Keep transaction/receipt auto-restock out of v1 even though import/receipt features exist elsewhere in BudTrack.
