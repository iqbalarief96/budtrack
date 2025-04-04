# Script untuk backup penuh project BudTrack
# Jalankan dengan perintah: .\backup-project.ps1

# Konfigurasi
$PROJECT_DIR = Get-Location
$BACKUP_DIR = "project-backups"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = "budtrack_backup_$TIMESTAMP.zip"
$TEMP_DIR = "temp_backup_$TIMESTAMP"
$EXCLUDE_DIRS = @("node_modules", ".next", ".git", "project-backups", "backups")
$DB_FILE = "prisma/dev.db"
$DB_BACKUP = "prisma/dev.db.backup"

# Buat direktori backup jika belum ada
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
    Write-Host "Direktori backup dibuat: $BACKUP_DIR"
}

# Buat direktori temporary
New-Item -ItemType Directory -Path $TEMP_DIR -Force | Out-Null
Write-Host "Direktori temporary dibuat: $TEMP_DIR" -ForegroundColor Cyan

Write-Host "Memulai backup project BudTrack..." -ForegroundColor Cyan
Write-Host "Directory project: $PROJECT_DIR" -ForegroundColor Cyan
Write-Host "Backup akan menyimpan ke: $BACKUP_DIR\$BACKUP_FILE" -ForegroundColor Cyan
Write-Host "Direktori yang tidak dibackup: $($EXCLUDE_DIRS -join ', ')" -ForegroundColor Yellow

# Salin semua file ke direktori temporary (kecuali yang di EXCLUDE_DIRS)
Write-Host "Menyalin file project ke direktori temporary..." -ForegroundColor Cyan
foreach ($item in Get-ChildItem -Path $PROJECT_DIR -Exclude $EXCLUDE_DIRS) {
    if ($item.Name -ne $TEMP_DIR) {
        $destination = Join-Path -Path $TEMP_DIR -ChildPath $item.Name
        Copy-Item -Path $item.FullName -Destination $destination -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Pastikan database tersalin, meskipun sedang digunakan
Write-Host "Membuat backup database..." -ForegroundColor Cyan
try {
    # Coba copy database langsung
    Copy-Item -Path $DB_FILE -Destination (Join-Path -Path $TEMP_DIR -ChildPath $DB_FILE) -Force -ErrorAction Stop
    Write-Host "Database berhasil disalin langsung" -ForegroundColor Green
} catch {
    # Jika gagal karena file sedang digunakan, gunakan backup yang sudah ada
    if (Test-Path "backups") {
        $latestBackup = Get-ChildItem -Path "backups" -Filter "dev.db.backup_*.sqlite" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($latestBackup) {
            $dbDir = Join-Path -Path $TEMP_DIR -ChildPath "prisma"
            if (-not (Test-Path $dbDir)) {
                New-Item -ItemType Directory -Path $dbDir -Force | Out-Null
            }
            Copy-Item -Path $latestBackup.FullName -Destination (Join-Path -Path $TEMP_DIR -ChildPath $DB_FILE) -Force
            Write-Host "Database disalin dari backup terbaru: $($latestBackup.Name)" -ForegroundColor Yellow
        } else {
            Write-Host "Tidak ada backup database yang ditemukan!" -ForegroundColor Red
        }
    } else {
        Write-Host "Database tidak dapat disalin dan tidak ada backup yang tersedia!" -ForegroundColor Red
    }
}

# Hitung jumlah file yang akan dibackup
$fileCount = (Get-ChildItem -Path $TEMP_DIR -Recurse -File).Count
Write-Host "Total file yang akan dibackup: $fileCount" -ForegroundColor Cyan

# Membuat backup ZIP dari direktori temporary
try {
    if (Get-Command Compress-Archive -ErrorAction SilentlyContinue) {
        # Gunakan modul bawaan PowerShell 5+
        Compress-Archive -Path "$TEMP_DIR\*" -DestinationPath "$BACKUP_DIR\$BACKUP_FILE" -Force
    } else {
        # Gunakan .NET Framework untuk PowerShell versi lebih lama
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::CreateFromDirectory($TEMP_DIR, "$BACKUP_DIR\$BACKUP_FILE")
    }
    
    # Hitung ukuran backup
    $fileSize = (Get-Item "$BACKUP_DIR\$BACKUP_FILE").Length / 1MB
    Write-Host "Backup project berhasil dibuat: $BACKUP_DIR\$BACKUP_FILE" -ForegroundColor Green
    Write-Host "Ukuran backup: $([Math]::Round($fileSize, 2)) MB" -ForegroundColor Green
} 
catch {
    Write-Host "Error saat membuat backup: $_" -ForegroundColor Red
    # Tetap lanjutkan untuk membersihkan direktori temporary
}

# Bersihkan direktori temporary
Remove-Item -Path $TEMP_DIR -Recurse -Force
Write-Host "Direktori temporary dibersihkan" -ForegroundColor Cyan

# Tampilkan daftar backup project yang tersedia
$projectBackups = Get-ChildItem -Path $BACKUP_DIR -Filter "budtrack_backup_*.zip" | Sort-Object LastWriteTime -Descending
Write-Host "`nDaftar backup project tersedia:" -ForegroundColor Cyan
$projectBackups | Format-Table Name, @{Name="Size (MB)"; Expression={[Math]::Round($_.Length / 1MB, 2)}}, LastWriteTime

Write-Host "`nTotal backup project tersimpan: $($projectBackups.Count)" -ForegroundColor Cyan
Write-Host "Backup selesai pada: $(Get-Date)" -ForegroundColor Green

Write-Host "`nPetunjuk untuk memindahkan project ke laptop lain:" -ForegroundColor Yellow
Write-Host "1. Salin file backup $BACKUP_DIR\$BACKUP_FILE ke laptop baru" -ForegroundColor Yellow
Write-Host "2. Extract file backup tersebut" -ForegroundColor Yellow
Write-Host "3. Buka terminal di direktori hasil extract" -ForegroundColor Yellow
Write-Host "4. Jalankan 'npm install' untuk menginstal dependensi" -ForegroundColor Yellow
Write-Host "5. Jalankan 'npm run dev' untuk memulai server development" -ForegroundColor Yellow 