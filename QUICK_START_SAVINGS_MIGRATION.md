# Quick Start: Migrasi Tabungan ke Wallet

## Cara Pakai (Super Simple!)

### 1. Buka Settings
- Login ke aplikasi
- Klik menu **Settings** di sidebar
- Pilih tab **Security**

### 2. Lihat Migration Button
Kamu akan lihat box biru dengan judul:
```
🔄 Migrasi Tabungan ke Wallet
```

### 3. Preview Dulu (Recommended)
- Klik tombol **"👁️ Preview Dulu"**
- Buka Console Browser (F12 → Console tab)
- Lihat detail apa yang akan terjadi
- Cek berapa wallet yang akan dibuat
- Cek total balance masing-masing

### 4. Jalankan Migrasi
- Kalau sudah yakin, klik **"Mulai Migrasi"**
- Konfirmasi dengan klik **"Ya, Lanjutkan Migrasi"**
- Tunggu proses selesai (biasanya < 5 detik)
- Halaman akan auto-refresh

### 5. Cek Hasil
- Buka menu **Wallets**
- Lihat wallet SAVINGS baru yang sudah dibuat
- Cek balance masing-masing wallet
- Semua tabungan lama sudah jadi wallet terpisah!

## Contoh Hasil

**Before:**
```
Emergency Fund Breakdown:
- Tabungan Crypto: Rp 5.307.280
- Tabungan Properti: Rp 6.011.490
- Tabungan Deposito: Rp 45.218.842
```

**After:**
```
Wallets:
- 💰 Dompet Utama (MAIN): Rp 10.000.000
- ₿ Tabungan Crypto (SAVINGS): Rp 5.307.280
- 🏠 Tabungan Properti (SAVINGS): Rp 6.011.490
- 💰 Tabungan Deposito (SAVINGS): Rp 45.218.842
```

## FAQ Singkat

**Q: Apakah data lama akan hilang?**
A: Tidak! Transaksi lama tetap ada, hanya ditambahkan marker "[MIGRATED]"

**Q: Bisa dibatalkan?**
A: Bisa, tapi harus manual via database. Makanya preview dulu!

**Q: Aman gak?**
A: Aman! Preview mode tidak mengubah data sama sekali.

**Q: Berapa lama prosesnya?**
A: Biasanya < 5 detik untuk 50-100 transaksi.

## Troubleshooting

**Kalau ada error:**
1. Refresh halaman
2. Coba lagi
3. Cek console browser untuk detail error
4. Kalau masih error, hubungi developer

**Kalau wallet tidak muncul:**
1. Refresh halaman (Ctrl+R)
2. Cek di menu Wallets
3. Filter by wallet type "SAVINGS"

---

**Ready to migrate?** Go to Settings → Security → Migrate Savings! 🚀
