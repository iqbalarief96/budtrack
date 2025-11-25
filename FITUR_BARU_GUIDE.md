# 🎯 PANDUAN FITUR BARU BUDTRACK

## 📊 1. BUDGET FORECAST & ALERTS

### Apa itu?
Fitur yang memprediksi apakah budget kamu akan exceed atau tidak berdasarkan pola spending saat ini.

### Cara Pakai:

#### A. Lihat di Dashboard
1. Buka halaman **Dashboard**
2. Klik icon **pensil** (Edit Mode) di pojok kanan atas
3. Klik **"Tambah Widget"**
4. Pilih **"Budget Forecast"** dari list
5. Klik **"Simpan Perubahan"**

Widget akan menampilkan:
- ✅ **On Track** (hijau) - Spending normal
- ⚠️ **Warning** (kuning) - Spending 10%+ lebih cepat dari jadwal
- 🚨 **Danger** (merah) - Spending 20%+ lebih cepat dari jadwal

#### B. Informasi yang Ditampilkan:
- **Current Spent** - Sudah berapa yang dihabiskan
- **Projected Overage** - Prediksi kelebihan budget
- **Exceed Date** - Kapan budget akan habis
- **Recommended Daily Spending** - Limit harian yang disarankan

#### C. Contoh Penggunaan:
```
Budget: Rp 3.000.000 untuk Makanan (1-30 Nov)
Hari ke-10: Sudah spent Rp 1.500.000

Forecast akan show:
- Daily average: Rp 150.000/hari
- Projected total: Rp 4.500.000 (exceed!)
- Will exceed on: 20 November
- Recommendation: Limit to Rp 75.000/hari
```

---

## 📥 2. BANK STATEMENT IMPORT

### Apa itu?
Import transaksi dari CSV bank statement (BCA, Mandiri, BRI, BNI) secara otomatis.

### Cara Pakai:

#### A. Download CSV dari Bank
1. Login ke **Internet Banking** bank kamu
2. Pilih menu **Mutasi Rekening** atau **Transaction History**
3. Pilih periode (misal: 1 bulan terakhir)
4. Download sebagai **CSV** atau **Excel** (save as CSV)

#### B. Import ke Budtrack
1. Buka halaman **Transactions**
2. Klik tombol **"Import Bank Statement"**
3. Pilih **Wallet** tujuan (misal: Dompet Utama)
4. Pilih **Bank Format**:
   - **Auto-detect** - Biarkan sistem detect otomatis
   - **BCA** - Jika dari BCA
   - **Mandiri** - Jika dari Mandiri
   - **BRI** - Jika dari BRI
   - **BNI** - Jika dari BNI
   - **Generic** - Untuk format CSV umum
5. Centang **"Skip duplicate transactions"** (recommended)
6. Klik **"Choose File"** dan pilih CSV kamu
7. Tunggu proses import selesai

#### C. Hasil Import:
- ✅ **Imported** - Jumlah transaksi yang berhasil diimport
- ⚠️ **Skipped** - Jumlah duplikat yang di-skip
- ❌ **Errors** - Jika ada yang gagal

#### D. Setelah Import:
1. Semua transaksi masuk dengan kategori **"Uncategorized"**
2. Buka halaman **Transactions**
3. Edit kategori satu-per-satu atau gunakan **bulk edit**
4. Atau buat **Category Rules** untuk auto-categorize di masa depan

#### E. Tips:
- Import per bulan untuk hasil terbaik
- Check duplikat sebelum import
- Backup database sebelum import besar
- Jika format tidak terdeteksi, pilih "Generic" dan pastikan CSV punya kolom: Date, Description, Amount

---

## 🔄 3. RECURRING TRANSACTION AUTOMATION

### Apa itu?
Sistem otomatis yang membuat transaksi dari recurring items (langganan, tagihan bulanan, gaji, dll).

### Cara Pakai:

#### A. Setup Recurring Transaction
1. Buka halaman **Recurring**
2. Klik **"Add Recurring Transaction"**
3. Isi form:
   - **Name**: Nama transaksi (misal: "Netflix Subscription")
   - **Amount**: Jumlah (misal: 186000)
   - **Type**: EXPENSE atau INCOME
   - **Frequency**: Daily/Weekly/Monthly/Quarterly/Yearly
   - **Start Date**: Kapan mulai
   - **Wallet**: Pilih wallet
   - **Category**: Pilih kategori (optional)
4. Klik **"Save"**

#### B. Lihat Upcoming Recurring di Dashboard
1. Buka halaman **Dashboard**
2. Klik icon **pensil** (Edit Mode)
3. Klik **"Tambah Widget"**
4. Pilih **"Upcoming Recurring"**
5. Klik **"Simpan Perubahan"**

Widget akan show:
- 📅 Transaksi yang akan diproses dalam 30 hari
- ⏰ Countdown hari (Today, Tomorrow, in 3 days, etc)
- 💰 Amount dan type (income/expense)

#### C. Manual Actions:
Dari widget, kamu bisa:

**1. Create Now (▶️)**
- Klik icon **Play**
- Transaksi langsung dibuat sekarang
- Next date otomatis di-update

**2. Skip Next (⏭️)**
- Klik icon **Skip Forward**
- Skip occurrence berikutnya
- Next date loncat ke periode selanjutnya

#### D. Automatic Processing:
Sistem akan otomatis create transaksi setiap hari jam 00:00 (midnight) untuk recurring yang due.

**Setup Cron Job:**

**Option 1: Vercel (Recommended)**
```bash
# Sudah dikonfigurasi di vercel.json
# Tinggal deploy ke Vercel
# Tambahkan CRON_SECRET di environment variables
```

**Option 2: Manual Cron**
```bash
# Tambahkan ke crontab
0 0 * * * curl -X POST https://budtrack.com/api/recurring/process?secret=YOUR_SECRET
```

**Option 3: Node Script**
```bash
# Run manual
npm run process-recurring

# Atau tambahkan ke crontab
0 0 * * * cd /path/to/budtrack && npm run process-recurring
```

#### E. Contoh Use Cases:

**1. Subscription (Netflix, Spotify, etc)**
```
Name: Netflix Premium
Amount: 186000
Type: EXPENSE
Frequency: MONTHLY
Start Date: 1st of month
Category: Entertainment
```

**2. Salary/Gaji**
```
Name: Gaji Bulanan
Amount: 10000000
Type: INCOME
Frequency: MONTHLY
Start Date: 25th of month
Category: Salary
```

**3. Utility Bills**
```
Name: Listrik PLN
Amount: 500000
Type: EXPENSE
Frequency: MONTHLY
Start Date: 20th of month
Category: Utilities
```

**4. Rent/Sewa**
```
Name: Sewa Kost
Amount: 2000000
Type: EXPENSE
Frequency: MONTHLY
Start Date: 1st of month
Category: Housing
```

#### F. Notifications:
Sistem akan notify kamu (via dashboard widget) untuk recurring yang akan diproses besok.

---

## 🎨 CARA TAMBAH WIDGET KE DASHBOARD

### Step-by-Step:
1. Buka **Dashboard**
2. Klik icon **✏️ Pensil** di pojok kanan atas
3. Muncul bar biru "Mode Edit"
4. Klik **"Tambah Widget"**
5. Pilih widget yang mau ditambahkan:
   - **Budget Forecast** - Prediksi budget
   - **Upcoming Recurring** - Recurring yang akan datang
   - **Summary Stats** - Ringkasan keuangan
   - **Quick Actions** - Tombol cepat
   - **Expense Chart** - Chart pengeluaran
   - **Transaction List** - List transaksi terbaru
   - dll.
6. Klik **"Simpan Perubahan"**

### Customize Widget:
- **Drag & Drop** - Geser widget untuk ubah posisi
- **Resize** - Klik icon **⛶** untuk ubah ukuran
- **Remove** - Klik icon **✕** untuk hapus widget

---

## 🔧 TROUBLESHOOTING

### Budget Forecast tidak muncul?
- Pastikan kamu punya budget yang aktif
- Budget harus punya end date di masa depan
- Sudah ada transaksi di kategori budget tersebut

### Bank Import gagal?
- Pastikan file format CSV (bukan Excel)
- Check apakah bank format sudah benar
- Coba gunakan "Auto-detect" atau "Generic"
- Pastikan CSV punya kolom: Date, Description, Amount

### Recurring tidak auto-create?
- Check apakah recurring sudah active
- Pastikan next payment date sudah lewat
- Check apakah cron job sudah running
- Coba manual trigger dari widget

### Widget tidak muncul setelah ditambah?
- Klik "Simpan Perubahan" setelah tambah widget
- Refresh halaman
- Check apakah ada error di console browser

---

## 📞 NEED HELP?

Jika ada masalah:
1. Check console browser (F12) untuk error
2. Check server logs
3. Restart aplikasi
4. Clear browser cache

---

## 🎉 TIPS & TRICKS

### Budget Forecast:
- Set budget realistis berdasarkan history
- Check forecast setiap minggu
- Adjust spending jika status "Warning" atau "Danger"

### Bank Import:
- Import rutin setiap bulan
- Buat category rules untuk auto-categorize
- Backup database sebelum import besar

### Recurring:
- Setup semua subscription dan bills
- Review upcoming recurring setiap minggu
- Skip jika tidak perlu (misal: lagi traveling)

---

**Happy Budgeting! 💰**
