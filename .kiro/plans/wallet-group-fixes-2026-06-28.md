# Plan: Wallet-Group Fixes & Enhancements

**Tanggal:** 2026-06-28
**Branch dasar:** `main` (commit `2a00980`, paling baru — Jun 2026; `master`/`claude/*` justru lama, Nov 2025)
**Repo:** `/home/iqbalarief96/projects/budtrack`
**Server uji:** `https://finansiai.indevs.in` (percobaan)

---

## Konteks & Temuan (grounded dari investigasi kode)

### Bug 401 — akar masalah pasti
`app/api/auth/[...nextauth]/route.ts` HANYA export `GET`/`POST` handler, **TIDAK export `authOptions`**:
```ts
const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }   // <-- authOptions tidak di-export
```
Semua route yang `import { authOptions } from '@/app/api/auth/[...nextauth]/route'` dapat `undefined`
→ `getServerSession(undefined)` gagal resolve session → **401 walau cookie valid**.

**Sebaran (13 route kena), dari `grep`:**
- `app/api/financial-health/route.ts`
- `app/api/safe-to-spend/route.ts`
- `app/api/savings/[type]/route.ts`
- `app/api/subscriptions/analyze/route.ts`
- `app/api/debts/payoff-plan/route.ts`
- `app/api/debts/[debtId]/route.ts`
- `app/api/debts/route.ts`
- `app/api/transactions/[id]/link-goal/route.ts`
- `app/api/forecast/cashflow/route.ts`
- `app/api/wallets/[walletId]/safe-to-spend/route.ts`
- `app/api/wallets/[walletId]/emergency-fund/ai-recommend/route.ts`
- `app/api/wallets/[walletId]/emergency-fund/route.ts`
- `app/api/wallets/[walletId]/forecast/route.ts`

**Sumber import authOptions di codebase saat ini:**
- `@/lib/auth` → 144 route (mayoritas, TERBUKTI JALAN — wallet-groups pakai ini)
- `@/app/api/auth/[...nextauth]/options` → 6 route (juga valid, ini sumber asli)
- `@/app/api/auth/[...nextauth]/route` → 13 route (BUG)

`lib/auth.ts` itu re-export dari `options.ts` + augmentasi tipe Session. Jadi `@/lib/auth` = kanonik.

### Dua sistem grup paralel (utang teknis)
- `WalletGroup` + `WalletGroupMember` (schema line 1155) → single-user, gabung wallet sendiri. **INI yang dipakai fitur "gabung wallet"**. API: `app/api/wallet-groups/**`.
- `Group` + `UserGroup` + `GroupInvite` + `GroupWallet` (schema line 377) → multi-user kolaboratif, di-gate `GROUP_FEATURE_ENABLED`. API: `app/api/groups/**`.
Dua-duanya hidup bareng, gampang ketuker.

### walletContributions sudah ada, belum divisualisasi
`lib/wallet-group/dashboard-aggregation-service.ts` (line 251-271) ngitung per-kategori `walletContributions: [{walletId, walletName, amount}]`.
`app/dashboard/DashboardContent.tsx` (line 44) udah punya `groupDashboardData` state + render `walletBreakdown` di header (line 643). Tab "Analisis" belum render kontribusi per-wallet.

---

## Fase 0 — Branch kerja & baseline
**Tujuan:** kerja aman, ada titik balik.
1. Bikin branch: `git checkout -b fix/wallet-group-auth-and-viz`
2. Pastiin dependency kepasang: `npm install` (postinstall jalanin `prisma generate`)
3. Baseline test: `npm run test` — catat hasil awal (berapa pass/fail) sebagai pembanding.
4. Pastiin bisa build: `npm run build` (boleh skip kalau lama; minimal `npx tsc --noEmit` buat typecheck).

**Verifikasi:** branch aktif, `npm run test` jalan, baseline tercatat.

---

## Fase 1 — Fix bug 401 (quick win, dampak gede)
**Tujuan:** 13 route balik bisa diakses.
1. Ganti import di 13 file dari `'@/app/api/auth/[...nextauth]/route'` → `'@/lib/auth'`.
   - Pakai patch per-file (bukan sed global) biar ke-review.
2. Konsistensikan 6 route yang pakai `/options` → biarin (valid) ATAU samain ke `@/lib/auth` biar 1 sumber. **Keputusan:** samakan semua ke `@/lib/auth` (kanonik tunggal).
3. Tambah guard biar gak kambuh: ESLint rule `no-restricted-imports` yang larang import `authOptions` dari `[...nextauth]/route`.

**Verifikasi (WAJIB sebelum lanjut):**
- `npx tsc --noEmit` clean.
- Login API via curl (cookie jar) ke percobaan, lalu:
  - `GET /api/safe-to-spend` → 200 (sebelumnya 401)
  - `GET /api/financial-health` → 200 (sebelumnya 401)
  - Spot-check 2 route debts/forecast → bukan 401.
- `npm run test` tetap ≥ baseline.

---

## Fase 2 — Konsolidasi/penamaan dua sistem grup
**Tujuan:** ilangin kebingungan `Group` vs `WalletGroup` tanpa breaking.
**Pendekatan (low-risk, NON-destruktif):** rename konsep di layer presentasi + dokumentasi, JANGAN drop tabel.
1. Tambah komentar header jelas di kedua model schema (`WalletGroup` = "Personal wallet linking (single-user)", `Group` = "Collaborative multi-user, gated").
2. Bikin `lib/wallet-group/README.md` yang jelasin batas tanggung jawab tiap sistem + endpoint masing-masing.
3. Audit UI: pastiin string "Wallet Group" (single-user) nggak ketuker sama "Group Budget" (multi-user) di menu. Kalau ketuker, kasih label beda.
4. **Tidak** menghapus sistem `Group` (masih di-gate, mungkin dipakai nanti). Cukup tandai status `GROUP_FEATURE_ENABLED` di README.

**Verifikasi:** README ada, schema berkomentar, `npm run build` jalan, gak ada perubahan tabel (cek `git diff prisma/schema.prisma` cuma komentar).

> Catatan: kalau lo mau konsolidasi penuh (drop `Group`), itu migrasi DB destruktif — gw pisahin jadi keputusan terpisah, butuh konfirmasi eksplisit + backup DB dulu.

---

## Fase 3 — Group-aware: safe-to-spend & financial-health
**Tujuan:** dua endpoint ini ngerti grup, bukan cuma per-wallet.
1. Baca service inti: `calculateAllWalletsSafeToSpend(userId)` + service financial-health. Pahami input wallet vs userId.
2. Tambah dukungan param `?walletGroupId=` di kedua route:
   - Resolve walletIds dari `WalletGroupMember` (validasi grup milik user).
   - Agregasi metrik lintas wallet di grup (pola sama kayak `dashboard-aggregation-service`).
3. Pastiin response shape konsisten sama mode wallet (frontend gak pecah).

**Verifikasi:**
- `GET /api/safe-to-spend?walletGroupId=<id>` → 200, angka = agregasi 2 wallet (cross-check manual: Dompet Utama + Selly).
- `GET /api/financial-health?walletGroupId=<id>` → 200, konsisten.
- Tambah unit test di `lib/wallet-group/__tests__/` buat agregasi dua endpoint ini.
- `npm run test` hijau.

---

## Fase 4 — Visualisasi kontribusi per-wallet di tab Analisis (MAKSIMALIN)
**Tujuan:** munculin data `walletContributions` yang udah ada jadi chart berguna buat skenario pasangan.
**Data source:** `groupDashboardData.spendingByCategory[].walletContributions` (udah ada di state).
1. Komponen baru `app/components/dashboard/WalletContributionChart.tsx`:
   - **Stacked bar per kategori**: tiap bar = 1 kategori, segmen = kontribusi tiap wallet (Dompet Utama vs Selly). Warna per wallet konsisten.
   - Toggle Pengeluaran/Pemasukan.
2. Komponen `WalletComparisonCard.tsx`: ringkasan "siapa habis berapa" per kategori (mis. Makan: Selly 64jt / gw 48jt) — tabel ringkas + persentase.
3. Render di tab "Analisis" `DashboardContent.tsx`, HANYA saat `isGroupSelected` (mode wallet tunggal gak perlu).
4. State kosong + loading di-handle (grup baru / belum ada transaksi).
5. Pakai lib chart yang udah dipakai project (cek `recharts`/`chart.js` dari import existing — jangan nambah dep baru).

**Verifikasi:**
- Login browser ke percobaan, pilih grup "Keluarga", buka tab Analisis.
- Screenshot: stacked bar per kategori + kartu perbandingan muncul, angka match API `/summary`.
- Mode wallet tunggal: chart kontribusi TIDAK muncul (gak relevan).
- `npm run build` sukses.

---

## Fase 5 — Bersihin grup test G2–G5
**Tujuan:** rapihin data uji, sisain "Keluarga".
1. Via API (cookie jar) DELETE grup `G2`,`G3`,`G4`,`G5` di percobaan.
2. Verifikasi `GET /api/wallet-groups` → tinggal "Keluarga".

**Catatan:** ini di SERVER percobaan (data uji), bukan repo. Akun `racletest` + 1.495 transaksi tetap dibiarkan buat demo, kecuali lo minta hapus.

---

## Fase 6 — Finalisasi
1. `npm run test` + `npm run build` full hijau.
2. `git diff` review per fase.
3. Commit per fase (pesan jelas), JANGAN push otomatis — tunggu konfirmasi lo.
4. Ringkas perubahan + screenshot before/after.

---

## Risiko & Catatan
- **Tidak** ada operasi destruktif DB tanpa konfirmasi (Fase 2 sengaja non-destruktif).
- Perubahan auth nyentuh 13+6 route → verifikasi luas wajib (jangan cuma 2 endpoint).
- Repo lokal `main` ketinggalan dari server? **Tidak** — `main` justru paling baru & punya semua fitur ini. Aman jadi dasar.
- Deploy ke percobaan/stable = langkah terpisah, butuh konfirmasi (server live).
