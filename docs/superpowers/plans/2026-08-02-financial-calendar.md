# Financial Calendar (`/calendar`)

## Problem
User harus buka 3 halaman beda (`/recurring`, `/bills`, `/goals`) buat tau tanggal tertentu ada apa. Belum ada satu timeline yang nyambungin recurring + bills + goals + transaksi per tanggal.

## Goal
Halaman `/calendar` baru:
- Gabung recurring + bills + goals + shared bills + transaksi dalam satu timeline bulanan
- Date strip horizontal (ala wireframe needmcp calendar-view) buat filter tanggal
- Kartu per tanggal: `Rp 1.200.000 jatuh tempo • Listrik`
- Klik tanggal → lihat transaksi hari itu
- Badge warning kalau ada yang overdue

## Constraints / Fakta dari DB production
- SQLite `prisma/devtest.db` (service budtrack, port 18001)
- Count saat ini: transactions 3155, wallets 21, users 9, recurring 0, bills 0, goals 1
- Recurring/bills kosong di DB — halaman akan didominasi transaksi. Tetap implement full karena user berniat pakai fitur ini, tapi ekspektasi data awal kosong.

## Data model yang dipakai
- `RecurringTransaction`: nextPaymentDate, frequency (DAILY/WEEKLY/BIWEEKLY/MONTHLY/QUARTERLY/YEARLY), isActive, type, amount, name, walletId
- `Bill`: dueDate, isPaid, isRecurring, frequency, amount, name, walletId
- `Goal`: deadline, status, isArchived, name, target, current
- `SharedBill`: dueDate, status (open/partially_paid/paid), title, totalAmount, walletId?
- `Transaction`: date, amount, type (INCOME/EXPENSE), walletId, categoryId

## Backend
New: `app/api/calendar/route.ts` — GET
Params:
- `month=YYYY-MM` (default: bulan sekarang)
- `walletId` optional (kalau ada, filter items + transactions by wallet; kalau tidak, semua wallet)

Response:
```json
{
  "month": "2026-08",
  "days": [
    {
      "date": "2026-08-01",
      "income": 0,
      "expense": 0,
      "items": [
        { "kind": "bill", "id": "...", "title": "Listrik", "amount": 1200000, "date": "2026-08-20", "type": "expense", "walletId": "...", "walletName": "Dompet Utama", "isOverdue": false }
      ],
      "transactions": [ { "id": "...", "description": "...", "amount": 50000, "type": "EXPENSE", "categoryId": "..." } ]
    }
  ],
  "overdue": [ { "kind": "bill", "id": "...", "title": "...", "amount": 0, "date": "...", "walletName": "..." } ],
  "summary": { "income": 0, "expense": 0, "net": 0 }
}
```

Service: `lib/calendar/calendar-service.ts` (pure + prisma)
Pure helpers (unit-testable):
- `parseMonthParam(param, now)` → { year, month, start, end, label }
- `buildMonthDates(year, month)` → string[] `YYYY-MM-DD`
- `projectRecurringIntoRange(startDate, frequency, rangeStart, rangeEnd)` → Date[]
- `groupItemsByDate(items)` → Record<date, items>
- `isOverdue(dateStr, today)` → boolean

DB queries (dalam route/service):
- bills: `where userId, isPaid false, walletId?`, recurring bill projection
- recurring: `where userId, isActive true`, projection via helper
- goals: `where userId, isArchived false, status != COMPLETED, deadline in range`
- sharedBills: `where userId, status != paid, dueDate in range`
- transactions: `where userId, date in range, walletId?` → group by date, sum income/expense per day

## Frontend
New: `app/calendar/page.tsx` (client component, gaya halaman existing)
- Header: judul "Kalender Keuangan" + month navigator (‹ Bulan ›) + WalletSelector reuse
- Overdue banner: chip merah `N overdue` kalau ada, klik → buka list overdue
- Date strip: horizontal scroll, semua tanggal bulan; tanggal dengan item dapat dot; tanggal terpilih pill aktif; hari ini outline
- Detail panel:
  - Kalau tanggal dipilih → kartu items hari itu (group by kind: Tagihan / Berulang / Goal / Transaksi), tiap kartu `Rp amount • title`, income hijau expense merah
  - Kalau belum pilih → list semua hari yang punya item, grouped per tanggal
- Loading state + empty state
- Gaya: pakai Tailwind existing (blue-600 accent), bukan redesign global

Sidebar: tambah `/calendar` di `app/components/Sidebar.tsx` (icon FiCalendar, label "Kalender"), cek placement grup.

## Tests
`lib/calendar/__tests__/calendar-service.test.ts`
1. parseMonthParam default → bulan sekarang
2. parseMonthParam "2026-08" → start 2026-08-01 end 2026-08-31
3. buildMonthDates 2026-02 → 28 hari
4. projectRecurringIntoRange: next 2026-08-05, MONTHLY, range Aug → [2026-08-05]; next 2026-08-20, WEEKLY, range Aug → 20,27
5. groupItemsByDate
6. isOverdue: kemarin true, besok false

## Verify
1. `npx vitest run lib/calendar`
2. `npm run build`
3. restart `budtrack.service`
4. Browser QA real user: `/calendar` render, navigasi bulan, klik tanggal, transaksi muncul
5. QA table

## Commit
- Commit terpisah hanya calendar files (`app/calendar/`, `app/api/calendar/`, `lib/calendar/`, `app/components/Sidebar.tsx`)
- JANGAN commit file safe-to-spend yang masih uncommitted (masih nunggu approval user)
