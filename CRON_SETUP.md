# Budget Auto-Reset Cron Job Setup

Dokumentasi untuk setup automatic budget reset menggunakan cron job di VPS.

## Overview

Budget dengan `isRecurring: true` akan otomatis direset setiap awal periode baru (harian/mingguan/bulanan/dll) menggunakan cron job yang memanggil endpoint `/api/budgets/reset`.

## Prerequisites

1. Aplikasi sudah deploy di VPS
2. Access SSH ke VPS
3. `curl` terinstall di VPS (biasanya sudah default)

## Setup Steps

### 1. Generate API Key

Generate random string untuk `CRON_API_KEY`:

```bash
# Di komputer lokal atau VPS
openssl rand -hex 32
```

### 2. Update Environment Variables

Tambahkan ke file `.env` di VPS:

```bash
CRON_API_KEY=your-generated-api-key-here
```

Restart aplikasi setelah update:

```bash
# Jika pakai PM2
pm2 restart budtrack

# Jika pakai systemd
sudo systemctl restart budtrack
```

### 3. Option A: Automated Setup (Recommended)

Jalankan script setup otomatis:

```bash
# Di VPS, masuk ke folder project
cd /path/to/budtrack

# Beri permission execute
chmod +x setup-cron.sh

# Jalankan script
./setup-cron.sh
```

Script akan meminta:
- **Application URL**: URL aplikasi Anda (misal: `https://budtrack.yourdomain.com`)
- **CRON_API_KEY**: API key yang sudah digenerate di step 1

### 3. Option B: Manual Setup

#### Edit Crontab

```bash
crontab -e
```

#### Tambahkan Cron Job

Tambahkan baris ini (ganti dengan URL dan API key Anda):

```bash
# Reset budgets setiap hari jam 00:00 (midnight)
0 0 * * * curl -X POST "https://budtrack.yourdomain.com/api/budgets/reset" -H "Authorization: Bearer YOUR_CRON_API_KEY" >> /var/log/budtrack-cron.log 2>&1
```

**Penjelasan:**
- `0 0 * * *` = Setiap hari jam 00:00 (midnight)
- `curl -X POST` = Panggil endpoint reset
- `-H "Authorization: Bearer ..."` = Kirim API key untuk authentication
- `>> /var/log/budtrack-cron.log 2>&1` = Simpan log ke file

#### Buat Log File

```bash
sudo touch /var/log/budtrack-cron.log
sudo chmod 644 /var/log/budtrack-cron.log
```

## Cron Schedule Examples

Jika ingin ubah jadwal, gunakan format cron:

```bash
# Setiap hari jam 00:00 (midnight)
0 0 * * * [command]

# Setiap hari jam 02:00 (2 AM)
0 2 * * * [command]

# Setiap 6 jam
0 */6 * * * [command]

# Setiap jam
0 * * * * [command]
```

## Testing

### Test Manual Execution

```bash
curl -X POST "https://budtrack.yourdomain.com/api/budgets/reset" \
  -H "Authorization: Bearer YOUR_CRON_API_KEY" \
  -H "Content-Type: application/json"
```

Response sukses:
```json
{
  "success": true,
  "message": "Budget reset check completed",
  "results": {
    "snapshotsCreated": 5,
    "budgetsReset": 5,
    "errors": []
  }
}
```

### View Cron Logs

```bash
# View semua logs
cat /var/log/budtrack-cron.log

# Monitor logs real-time
tail -f /var/log/budtrack-cron.log

# View 50 baris terakhir
tail -n 50 /var/log/budtrack-cron.log
```

### Check Crontab Status

```bash
# List semua cron jobs
crontab -l

# Check cron service status
sudo systemctl status cron     # Debian/Ubuntu
sudo systemctl status crond    # CentOS/RHEL
```

## Troubleshooting

### Cron Tidak Jalan

1. **Check cron service running:**
   ```bash
   sudo systemctl status cron
   sudo systemctl start cron  # jika tidak running
   ```

2. **Check crontab syntax:**
   ```bash
   crontab -l
   ```

3. **Check logs:**
   ```bash
   tail -f /var/log/budtrack-cron.log
   sudo tail -f /var/log/syslog | grep CRON  # Ubuntu/Debian
   sudo tail -f /var/log/cron                # CentOS/RHEL
   ```

### API Returns 401 Unauthorized

- Pastikan `CRON_API_KEY` di `.env` sama dengan yang di cron job
- Restart aplikasi setelah update `.env`
- Test manual dengan curl untuk verify API key

### curl: command not found

Install curl:
```bash
# Ubuntu/Debian
sudo apt-get install curl

# CentOS/RHEL
sudo yum install curl
```

### Permission Denied di Log File

```bash
sudo chmod 644 /var/log/budtrack-cron.log
sudo chown $USER:$USER /var/log/budtrack-cron.log
```

## How It Works

1. **Cron job runs** → Memanggil `/api/budgets/reset` dengan API key
2. **API endpoint checks** → Cari semua budgets dengan:
   - `isRecurring: true`
   - `endDate < now` (periode sudah lewat)
3. **For each budget:**
   - Buat snapshot di `BudgetHistory` (simpan data lama)
   - Update budget dengan periode baru
   - Reset `spent` ke 0
   - Update `lastResetDate`
4. **Return results** → Jumlah budgets yang di-reset

## Remove Cron Job

Jika ingin hapus cron job:

```bash
# Edit crontab
crontab -e

# Hapus atau comment baris budget reset (tambahkan # di awal)
# 0 0 * * * curl -X POST ...

# Atau hapus semua crontab
crontab -r
```

## Security Notes

- **NEVER commit** `CRON_API_KEY` ke git
- Gunakan HTTPS untuk production
- Pastikan API key cukup panjang dan random (min 32 characters)
- Rotate API key secara berkala
- Monitor logs untuk aktivitas mencurigakan

## Monitoring

### Recommended: Setup Alert Jika Cron Gagal

Tambahkan monitoring service seperti:
- **UptimeRobot** - Free tier available
- **Cronitor** - Specialized untuk cron monitoring
- **Dead Man's Snitch** - Cron job monitoring

Atau setup email notification di VPS jika cron gagal.
