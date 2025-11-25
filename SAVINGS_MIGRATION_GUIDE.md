# Panduan Migrasi Tabungan ke Wallet System

## Masalah

**Sistem Lama:**
- Tabungan dicatat sebagai transaksi EXPENSE dengan kategori SAVINGS
- Contoh: Input "Tabungan Crypto Rp 1.000.000" → jadi transaksi expense
- Semua tabungan tercampur dalam 1 emergency fund breakdown

**Sistem Baru:**
- Setiap jenis tabungan punya wallet SAVINGS sendiri
- Contoh: Wallet "Tabungan Crypto" dengan balance Rp 5.000.000
- Lebih mudah tracking dan management per tabungan

## Solusi: Migration Script

Script ini akan otomatis:
1. ✅ Cari semua transaksi expense kategori savings
2. ✅ Group berdasarkan jenis tabungan (Crypto, Properti, dll)
3. ✅ Buat wallet SAVINGS untuk masing-masing
4. ✅ Hitung total balance dan set ke wallet
5. ✅ Mark transaksi lama sebagai "MIGRATED"

## Cara Pakai

### Opsi 1: Via UI (Recommended)

1. Tambahkan component di settings page:

```tsx
import MigrateSavingsButton from '@/components/MigrateSavingsButton'

// Di dalam settings page
<MigrateSavingsButton />
```

2. Klik "Preview Dulu" untuk lihat apa yang akan terjadi (dry run)
3. Cek console browser untuk detail
4. Kalau sudah yakin, klik "Mulai Migrasi"

### Opsi 2: Via Command Line

```bash
# Dry run (preview only, no changes)
npx tsx scripts/migrate-savings-to-wallets.ts <userId>

# Apply migration (make actual changes)
npx tsx scripts/migrate-savings-to-wallets.ts <userId> --apply
```

**Cara dapat userId:**
1. Login ke aplikasi
2. Buka browser console
3. Ketik: `localStorage.getItem('userId')` atau cek di database

## Contoh Output

```
============================================================
Migration: Savings Transactions → Savings Wallets
Mode: DRY RUN (no changes)
User ID: clxxx123
============================================================

Found 45 savings transactions

Grouped into 8 savings types:

₿ Tabungan Crypto
   Transactions: 12
   Total Amount: Rp 5.307.280
   Color: #f97316

🏠 Tabungan Properti
   Transactions: 8
   Total Amount: Rp 6.011.490
   Color: #f59e0b

💰 Tabungan Deposito
   Transactions: 5
   Total Amount: Rp 45.218.842
   Color: #84cc16

...

⚠️  DRY RUN MODE - No changes made
Run with dryRun=false to apply changes
```

## Jenis Tabungan yang Dikenali

Script otomatis detect jenis tabungan berdasarkan keyword:

| Jenis | Keywords | Icon | Color |
|-------|----------|------|-------|
| Tabungan Darurat | darurat, emergency | 🚨 | Red |
| Tabungan Pendidikan | pendidikan, school, kuliah | 🎓 | Blue |
| Tabungan Liburan | liburan, travel, vacation, umroh | ✈️ | Green |
| Tabungan Pensiun | pensiun, retirement | 👴 | Purple |
| Tabungan Properti | rumah, properti, kpr, house | 🏠 | Orange |
| Tabungan Kendaraan | kendaraan, mobil, motor, car | 🚗 | Cyan |
| Tabungan Bank | bank, rekening, account | 🏦 | Indigo |
| Tabungan Emas | emas, gold, logam mulia | 🥇 | Yellow |
| Tabungan Crypto | crypto, bitcoin, ethereum | ₿ | Orange |
| Tabungan Investasi | investasi, reksa, saham, stock | 📈 | Teal |
| Tabungan Deposito | deposito, deposit | 💰 | Lime |
| Tabungan Lainnya | (default untuk yang tidak match) | 💵 | Gray |

## Yang Terjadi Setelah Migrasi

### Before:
```
Transactions:
- [EXPENSE] Tabungan Crypto: -Rp 1.000.000
- [EXPENSE] Tabungan Crypto: -Rp 500.000
- [EXPENSE] Tabungan Properti: -Rp 2.000.000

Emergency Fund Breakdown:
- Crypto: Rp 1.500.000
- Properti: Rp 2.000.000
```

### After:
```
Wallets:
- 💰 Dompet Utama (MAIN): Rp 10.000.000
- ₿ Tabungan Crypto (SAVINGS): Rp 1.500.000
- 🏠 Tabungan Properti (SAVINGS): Rp 2.000.000

Transactions (marked as migrated):
- [EXPENSE] Tabungan Crypto [MIGRATED TO WALLET: Tabungan Crypto]: -Rp 1.000.000
- [EXPENSE] Tabungan Crypto [MIGRATED TO WALLET: Tabungan Crypto]: -Rp 500.000
- [EXPENSE] Tabungan Properti [MIGRATED TO WALLET: Tabungan Properti]: -Rp 2.000.000
```

## Safety Features

1. **Dry Run Mode**: Preview dulu sebelum apply
2. **Duplicate Check**: Kalau wallet sudah ada, update balance aja
3. **Transaction Marking**: Transaksi lama di-mark biar gak double count
4. **Error Handling**: Kalau 1 gagal, yang lain tetap jalan
5. **Detailed Logging**: Semua proses tercatat di console

## Rollback (Kalau Ada Masalah)

Kalau ada masalah setelah migrasi:

```sql
-- 1. Hapus wallet yang baru dibuat
DELETE FROM Wallet WHERE type = 'SAVINGS' AND userId = 'xxx';

-- 2. Hapus marker [MIGRATED] dari transaksi
UPDATE Transaction 
SET description = REPLACE(description, ' [MIGRATED TO WALLET: Tabungan XXX]', '')
WHERE userId = 'xxx';
```

## FAQ

**Q: Apakah transaksi lama akan dihapus?**
A: Tidak, hanya ditambahkan marker "[MIGRATED]" di deskripsi.

**Q: Bagaimana kalau ada transaksi baru setelah migrasi?**
A: Sistem baru akan langsung create wallet atau update balance wallet yang ada.

**Q: Apakah bisa run migrasi berkali-kali?**
A: Bisa, tapi tidak disarankan. Script akan skip wallet yang sudah ada.

**Q: Bagaimana kalau ada typo di nama tabungan?**
A: Script akan create wallet baru. Bisa merge manual nanti via UI.

**Q: Apakah emergency fund lama masih berfungsi?**
A: Ya, tapi sekarang per-wallet. Setiap wallet savings bisa punya target sendiri.

## Testing

Sebelum run di production:

1. Backup database dulu!
```bash
npm run backup-db
```

2. Test di development environment
3. Run dry-run dulu untuk preview
4. Verify hasil di UI
5. Baru apply di production

## Support

Kalau ada masalah:
1. Cek console log untuk error details
2. Cek database untuk verify data
3. Rollback kalau perlu
4. Contact developer

---

**Status**: Ready to use
**Last Updated**: November 25, 2025
