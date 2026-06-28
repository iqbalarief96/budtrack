# Wallet Group vs Group — Dua Sistem Grup di BudTrack

Aplikasi ini punya **DUA sistem grup yang BERBEDA** dan koeksis. Gampang ketuker
karena namanya mirip. Catatan ini menjelaskan batas tanggung jawab masing-masing.

---

## Sistem #1 — `Group` (Collaborative / Multi-user)

Berbagi anggaran **antar-user** (mis. keluarga, tim, pasangan yang mau kelola bareng).

| Aspek | Detail |
|---|---|
| Prisma models | `Group`, `UserGroup`, `UserGroupSettings`, `GroupWallet`, `GroupTransaction`, `GroupBudget`, `GroupInvite` (schema ~line 377) |
| Konsep | members, roles, invites, wallet milik grup (`GroupWallet`) |
| API | `app/api/groups/**` |
| UI | menu **"Grup Bersama"** (Sidebar) / route `/groups` |
| Flag | `GROUP_FEATURE_ENABLED = true` (AKTIF) di `app/api/groups/*` |
| Kepemilikan wallet | wallet baru milik grup, bukan wallet personal user |

## Sistem #2 — `WalletGroup` (Personal Wallet Linking / Single-user)

**Satu user** menggabung beberapa wallet **miliknya sendiri** jadi satu tampilan agregat
(mis. lihat "Dompet Utama" + "Selly" sekaligus). **Tidak ada** kolaborasi antar-user.

| Aspek | Detail |
|---|---|
| Prisma models | `WalletGroup`, `WalletGroupMember` (schema ~line 1166) |
| Konsep | view gabungan wallet personal, maks 5 grup/user, tidak ada members/invites/roles |
| API | `app/api/wallet-groups/**` |
| UI | section **"Wallet Groups"** di `WalletSelector` + halaman `/wallets` |
| Service agregasi | `lib/wallet-group/*` (dashboard, insights, budget, bills, goals, recurring, report) |
| Kepemilikan wallet | wallet tetap milik user, cuma di-link untuk view gabungan |

---

## Cara cepat membedakan saat baca kode

- Lihat **model Prisma**: `Group*` = multi-user, `WalletGroup*` = personal linking.
- Lihat **path API**: `/api/groups/` = multi-user, `/api/wallet-groups/` = personal.
- Lihat **istilah**: "members/invites/roles" = Sistem #1; "link/aggregate/breakdown" = Sistem #2.

## Utang teknis (catatan untuk maintainer)

Dua sistem ini overlap secara konsep dan membingungkan. Konsolidasi penuh
(mis. men-deprecate salah satu) adalah perubahan **destruktif** (migrasi DB,
hapus tabel) dan HARUS:
1. backup DB dulu,
2. konfirmasi eksplisit pemilik produk,
3. migrasi data existing bila ada.

Sampai itu diputuskan, JANGAN gabungkan/hapus tabel. Cukup pertahankan
pemisahan penamaan yang jelas seperti di atas.
