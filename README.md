# BudTrack - Aplikasi Manajemen Keuangan

Aplikasi manajemen keuangan berbasis web untuk melacak pengeluaran, pendapatan, dan anggaran.

## Fitur Utama

- Dashboard keuangan
- Manajemen transaksi (pemasukan & pengeluaran)
- Pengelolaan dompet/rekening
- Pengelolaan kategori
- Anggaran belanja
- Transaksi berulang
- Analisis keuangan
- Laporan dan ekspor data
- Smart kategorisasi

## Cara Menjalankan Aplikasi

```bash
# Install dependensi
npm install

# Jalankan development server
npm run dev
```

## Database Management

### Backup dan Restore

BudTrack menyediakan script untuk melakukan backup dan restore database maupun project lengkap.

#### Backup

##### Backup Database

Untuk membuat backup database saja, jalankan script:

```
.\backup.ps1
```

Script ini akan membuat backup database ke direktori `backups` dengan format nama `dev.db.backup_YYYYMMDD_HHMMSS.sqlite`.

##### Backup Project Lengkap

Untuk membuat backup seluruh project (termasuk kode dan database), jalankan script:

```
.\backup-project.ps1
```

Script ini akan membuat backup project lengkap ke direktori `project-backups` dengan format nama `budtrack_backup_YYYYMMDD_HHMMSS.zip`. Script ini akan mengecualikan direktori yang tidak perlu seperti `node_modules`, `.next`, dan `.git`.

#### Restore

Untuk melakukan restore database atau project, jalankan script:

```
.\restore.ps1
```

Script ini akan menampilkan menu interaktif untuk memilih jenis restore yang diinginkan:
1. Restore Database saja
2. Restore Project lengkap (termasuk database)
3. Restore keduanya secara terpisah

Anda juga dapat menjalankan script dengan parameter berikut:
- Restore database saja: `.\restore.ps1 -DatabaseOnly`
- Restore project lengkap: `.\restore.ps1 -ProjectOnly`
- Restore dengan file backup tertentu: `.\restore.ps1 -BackupFile "path\to\backup.zip"` atau `.\restore.ps1 -DatabaseBackupFile "path\to\backup.sqlite"`

Script restore akan melakukan backup terlebih dahulu sebelum melakukan restore untuk memastikan Anda dapat kembali ke versi sebelumnya jika terjadi kesalahan.

### Memindahkan Project ke Komputer Lain

1. Jalankan `.\backup-project.ps1` untuk membuat backup project lengkap
2. Salin file backup dari direktori `project-backups` ke komputer baru
3. Extract file backup tersebut
4. Buka terminal di direktori hasil extract
5. Jalankan `npm install` untuk menginstal dependencies
6. Jalankan `npm run dev` untuk memulai server development

### Seed Database

Aplikasi menyediakan beberapa script untuk mengisi database dengan data contoh:

```powershell
# Menambahkan kategori
npx ts-node prisma/seed.ts

# Menambahkan dompet
npx ts-node prisma/walletSeed.ts

# Menambahkan transaksi
npx ts-node prisma/transactionSeed.ts

# Menambahkan anggaran
npx ts-node prisma/budgetSeed.ts
``` 