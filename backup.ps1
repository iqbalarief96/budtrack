# Script untuk backup database SQLite BudTrack
# Jalankan dengan perintah: .\backup.ps1

# Konfigurasi
$SOURCE_DB = "prisma/dev.db"
$BACKUP_DIR = "backups"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = "dev.db.backup_$TIMESTAMP.sqlite"
$MAX_BACKUPS = 10  # Jumlah maksimum backup yang disimpan

# Buat direktori backup jika belum ada
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
    Write-Host "Direktori backup dibuat: $BACKUP_DIR"
}

# Buat backup database
try {
    Copy-Item -Path $SOURCE_DB -Destination "$BACKUP_DIR/$BACKUP_FILE" -Force
    Write-Host "Backup database berhasil dibuat: $BACKUP_DIR/$BACKUP_FILE" -ForegroundColor Green
    
    # Hitung ukuran backup
    $fileSize = (Get-Item "$BACKUP_DIR/$BACKUP_FILE").Length / 1KB
    Write-Host "Ukuran backup: $([Math]::Round($fileSize, 2)) KB" -ForegroundColor Cyan
} 
catch {
    Write-Host "Error saat membuat backup: $_" -ForegroundColor Red
    exit 1
}

# Hapus backup lama jika melebihi jumlah maksimum
$backupFiles = Get-ChildItem -Path $BACKUP_DIR -Filter "dev.db.backup_*.sqlite" | Sort-Object LastWriteTime
if ($backupFiles.Count -gt $MAX_BACKUPS) {
    $numToDelete = $backupFiles.Count - $MAX_BACKUPS
    Write-Host "Menghapus $numToDelete backup lama untuk menjaga maksimum $MAX_BACKUPS backup" -ForegroundColor Yellow
    
    $backupFiles | Select-Object -First $numToDelete | ForEach-Object {
        Remove-Item $_.FullName -Force
        Write-Host "Backup dihapus: $($_.Name)" -ForegroundColor Yellow
    }
}

# Tampilkan daftar backup yang tersedia
$currentBackups = Get-ChildItem -Path $BACKUP_DIR -Filter "dev.db.backup_*.sqlite" | Sort-Object LastWriteTime -Descending
Write-Host "`nDaftar backup tersedia:" -ForegroundColor Cyan
$currentBackups | Format-Table Name, @{Name="Size (KB)"; Expression={[Math]::Round($_.Length / 1KB, 2)}}, LastWriteTime

Write-Host "`nTotal backup tersimpan: $($currentBackups.Count)" -ForegroundColor Cyan
Write-Host "Backup selesai pada: $(Get-Date)" -ForegroundColor Green 