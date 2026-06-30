# Household Inventory UX Polish Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Turn BudTrack Stok Rumah from a CRUD inventory page into a fast mobile stock-opname flow: scan, confirm, adjust qty, save.

**Architecture:** Keep existing API/schema. Polish only client UX and small UI state helpers. No new backend unless current API blocks a UI action. Use existing `@zxing/browser`, React state, and existing `/api/household-inventory/*` endpoints.

**Tech Stack:** Next.js 14 App Router, React client components, Tailwind CSS, existing BudTrack UI components, ZXing barcode scanner.

---

## Product Decision

Build mobile-first UX improvements for existing household consumables inventory.

### In Scope
- Scan result confirmation sheet.
- Compact add/edit form with advanced fields collapsed.
- Item card quick qty actions.
- Clickable summary filters.
- Better empty states and barcode confidence copy.
- Mobile layout polish.

### Non-Goals
- No native app.
- No OCR receipt restock.
- No transaction auto-restock.
- No seed/sample data.
- No schema migration unless required by a concrete UX blocker.

### Safety Constraints
- Preserve existing `Transaction` data.
- No sample/demo rows.
- Run `npm run build` before deploy.
- Restart `budtrack.service` only after build passes.
- If schema untouched, no `prisma db push` needed.

---

## Current Files

- Page: `app/household-inventory/page.tsx`
- Main client: `components/household-inventory/HouseholdInventoryClient.tsx`
- Scanner: `components/household-inventory/BarcodeScanner.tsx`
- Types: `components/household-inventory/types.ts`
- Lookup API: `app/api/household-inventory/barcode/lookup/route.ts`
- Item API: `app/api/household-inventory/items/route.ts`
- Adjust API: `app/api/household-inventory/items/[id]/adjust/route.ts`
- Opname API: `app/api/household-inventory/opname/route.ts`

---

## UX Target Flow

### Scan-first flow

```text
Scan tab
→ barcode detected
→ lookup product
→ bottom sheet opens
→ user edits qty/location only
→ save
→ toast/status message
→ sheet closes
→ item list refreshes
```

### Manual add flow

```text
Barang tab
→ compact form visible
→ advanced fields hidden by default
→ save
```

### Existing item flow

```text
Item card
→ quick +1/-1/Pakai habis/Restock
→ API adjust
→ list refresh
```

---

## Task 1: Add product name shortener helper

**Objective:** Make scanned product names readable on mobile.

**Files:**
- Create: `components/household-inventory/display.ts`

**Implementation:**

```ts
export function shortProductName(name: string) {
  return name
    .replace(/\binstant noodles?\b/gi, '')
    .replace(/\bflavo(u)?r\b/gi, '')
    .replace(/\bindonesia\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function displayBarcode(barcode?: string | null) {
  if (!barcode) return 'Tanpa barcode'
  return barcode
}
```

**Verification:**

Run:
```bash
npm run build
```

Expected:
```text
Compiled successfully
```

**Commit:**

```bash
git add components/household-inventory/display.ts
git commit -m "feat: add household inventory display helpers"
```

---

## Task 2: Add scan result sheet state

**Objective:** Store detected product separately before saving item.

**Files:**
- Modify: `components/household-inventory/HouseholdInventoryClient.tsx`

**State to add:**

```ts
type ScanDraft = {
  barcode: string
  name: string
  brand?: string | null
  unit: string
  source?: string
  confidence: 'high' | 'low'
}

const [scanDraft, setScanDraft] = useState<ScanDraft | null>(null)
```

**Behavior:**
- When barcode lookup returns `ITEM_FOUND`, switch to list or show existing-item quick action state.
- When lookup returns `TEMPLATE_FOUND` or `ONLINE_FOUND`, open `scanDraft` sheet.
- If product name generic (`Instant Noodles`, `Noodles`, `Mie`), mark `confidence: 'low'`.
- If lookup not found, still open sheet with barcode and empty name.

**Verification:**

Run:
```bash
npm run build
```

Expected:
```text
Compiled successfully
```

**Commit:**

```bash
git add components/household-inventory/HouseholdInventoryClient.tsx
git commit -m "feat: add household scan draft state"
```

---

## Task 3: Build `ScanResultSheet` component

**Objective:** Let user confirm scanned product with minimal fields.

**Files:**
- Create: `components/household-inventory/ScanResultSheet.tsx`
- Modify: `components/household-inventory/HouseholdInventoryClient.tsx`

**Component props:**

```ts
interface ScanResultSheetProps {
  draft: ScanDraft
  locations: HouseholdLocation[]
  categories: HouseholdCategory[]
  onCancel: () => void
  onSave: (payload: {
    name: string
    barcode: string
    quantity: number
    unit: string
    locationId?: string | null
    categoryId?: string | null
  }) => Promise<void>
}
```

**Visible fields:**
- Product title.
- Barcode subtitle.
- Qty stepper: `-`, number, `+`.
- Unit input.
- Location select.
- Optional category select.
- Save button.

**Low confidence copy:**

```text
Nama produk kurang yakin. Edit dulu kalau salah.
```

**Verification:**

Run:
```bash
npm run build
```

Expected:
```text
Compiled successfully
```

Manual check:
```text
Scan tab -> scan/input barcode -> sheet appears -> save creates item
```

**Commit:**

```bash
git add components/household-inventory/ScanResultSheet.tsx components/household-inventory/HouseholdInventoryClient.tsx
git commit -m "feat: add household scan result sheet"
```

---

## Task 4: Compact add form + advanced fields

**Objective:** Make manual add usable on mobile by hiding rarely used fields.

**Files:**
- Modify: `components/household-inventory/HouseholdInventoryClient.tsx`

**Default visible:**
- Nama.
- Barcode.
- Qty.
- Unit.
- Lokasi.
- Simpan.

**Advanced collapsed:**
- Minimum.
- Kategori.
- Expired.
- Notes.

**UI copy:**

```text
Detail tambahan
```

**Verification:**

Run:
```bash
npm run build
```

Expected:
```text
Compiled successfully
```

Manual check:
```text
Barang tab -> compact form visible -> Detail tambahan toggles extra fields
```

**Commit:**

```bash
git add components/household-inventory/HouseholdInventoryClient.tsx
git commit -m "feat: compact household item form"
```

---

## Task 5: Add item card quick actions

**Objective:** Adjust stock without opening a full form.

**Files:**
- Modify: `components/household-inventory/HouseholdInventoryClient.tsx`

**Actions per item card:**

```text
-1
+1
Pakai habis
Restock
```

**API calls:**

```ts
POST /api/household-inventory/items/:id/adjust
{ delta: -1, reason: 'consume' }

POST /api/household-inventory/items/:id/adjust
{ delta: 1, reason: 'restock' }

POST /api/household-inventory/items/:id/adjust
{ delta: -item.quantity, reason: 'consume' }
```

For `Restock`, use a small inline input or quick `+1` first. Do not add modal unless needed.

**Verification:**

Run:
```bash
npm run build
```

Expected:
```text
Compiled successfully
```

Manual check:
```text
Item card -> +1 updates qty -> -1 updates qty -> no negative qty
```

**Commit:**

```bash
git add components/household-inventory/HouseholdInventoryClient.tsx
git commit -m "feat: add household quick stock actions"
```

---

## Task 6: Make summary cards clickable filters

**Objective:** Turn summary into navigation/filter controls.

**Files:**
- Modify: `components/household-inventory/HouseholdInventoryClient.tsx`

**State:**

```ts
const [statusFilter, setStatusFilter] = useState<'all' | 'AMAN' | 'MENIPIS' | 'HABIS' | 'EXPIRED'>('all')
```

**Behavior:**
- Click `Total` => all.
- Click `Aman` => only `AMAN`.
- Click `Menipis` => only `MENIPIS`.
- Click `Habis` => only `HABIS`.
- Click `Expired` => only `EXPIRED` + `MAU_EXPIRED`.

**Visual:**
- Active card has ring/border.
- Menipis amber, Habis red, Expired purple.

**Verification:**

Run:
```bash
npm run build
```

Expected:
```text
Compiled successfully
```

Manual check:
```text
Click Menipis -> list filters
Click Total -> list resets
```

**Commit:**

```bash
git add components/household-inventory/HouseholdInventoryClient.tsx
git commit -m "feat: add household summary filters"
```

---

## Task 7: Improve mobile tab/navigation layout

**Objective:** Reduce horizontal squeeze on phones.

**Files:**
- Modify: `components/household-inventory/HouseholdInventoryClient.tsx`

**Changes:**
- Make tabs sticky under header.
- Use 2-column grid on small screens.
- Keep labels short:
  - `Ringkas`
  - `Barang`
  - `Scan`
  - `Opname`
  - `Belanja`

**Verification:**

Run:
```bash
npm run build
```

Expected:
```text
Compiled successfully
```

Manual mobile check:
```text
Tabs fit in viewport, no horizontal scroll needed
```

**Commit:**

```bash
git add components/household-inventory/HouseholdInventoryClient.tsx
git commit -m "feat: improve household mobile navigation"
```

---

## Task 8: Add useful empty states

**Objective:** Guide first-time user toward scan/manual/default setup.

**Files:**
- Modify: `components/household-inventory/HouseholdInventoryClient.tsx`

**Empty item list copy:**

```text
Belum ada stok rumah.
Scan barcode atau tambah manual barang pertama.
```

**Actions:**
- `Scan Barang` switches tab to scan.
- `Tambah Manual` switches tab to item form.
- `Buat Kategori & Lokasi Default` calls existing defaults endpoints.

**Verification:**

Run:
```bash
npm run build
```

Expected:
```text
Compiled successfully
```

**Commit:**

```bash
git add components/household-inventory/HouseholdInventoryClient.tsx
git commit -m "feat: add household inventory empty states"
```

---

## Task 9: Browser QA on live-like server

**Objective:** Verify UX with real rendered page.

**Commands:**

```bash
npm run build
npm run start -- -p 18002 -H 127.0.0.1
```

Use browser at:

```text
http://127.0.0.1:18002/household-inventory
```

**Checks:**

| Flow | Expected |
|---|---|
| Summary cards | clickable, filter list |
| Barang tab | compact form; advanced hidden |
| Scan tab manual barcode | sheet opens |
| Sheet save | item appears in list |
| Quick +1/-1 | qty updates |
| Empty list | useful CTA visible |
| Mobile viewport | no broken horizontal layout |

**Commit if needed:**

```bash
git add .
git commit -m "fix: polish household inventory QA issues"
```

---

## Task 10: Production deploy

**Objective:** Deploy only after build and route smoke pass.

**Preflight:**

```bash
git status --short
sqlite3 prisma/devtest.db 'SELECT COUNT(*) FROM "Transaction";'
npm run build
```

**Deploy:**

```bash
sudo systemctl restart budtrack.service
sleep 3
systemctl is-active budtrack.service
curl -I -sS http://127.0.0.1:18001/household-inventory | sed -n '1,8p'
```

**Expected:**

```text
active
HTTP/1.1 200 OK
```

**Final report format:**

```markdown
| Feature | Status | Evidence | Notes |
|---|---:|---|---|
| Scan result sheet | ✅ | screenshot/build output | |
| Compact form | ✅ | screenshot/build output | |
| Quick actions | ✅ | manual/browser check | |
| Summary filters | ✅ | manual/browser check | |
```

---

## Rollback

If deploy breaks:

```bash
git log --oneline -5
git revert <bad_commit>
npm run build
sudo systemctl restart budtrack.service
```

If DB untouched, no DB rollback needed.

---

## Done Criteria

- Scan no longer dumps user into long form.
- Scanned product is confirmed in bottom sheet.
- Manual add form is short by default.
- Item card supports quick stock adjustment.
- Summary cards filter list.
- Mobile layout fits common phone viewport.
- `npm run build` passes.
- `budtrack.service` active after restart.
- `/household-inventory` returns `200 OK`.
