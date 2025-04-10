# Script untuk backup database dan/atau project BudTrack
# Jalankan dengan perintah berikut:
#   - Backup hanya database: .\backup-all.ps1 -DatabaseOnly
#   - Backup project lengkap: .\backup-all.ps1 -ProjectOnly
#   - Backup database dan project: .\backup-all.ps1

param (
    [switch]$DatabaseOnly,
    [switch]$ProjectOnly,
    [int]$MaxBackups = 10
)

# Konfigurasi
$PROJECT_DIR = Get-Location
$DB_BACKUPS_DIR = "backups"
$PROJECT_BACKUPS_DIR = "project-backups"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$DB_FILE = "prisma/dev.db"
$DB_BACKUP_FILE = "$DB_BACKUPS_DIR/dev.db.backup_$TIMESTAMP.sqlite"
$PROJECT_BACKUP_FILE = "$PROJECT_BACKUPS_DIR/budtrack_backup_$TIMESTAMP.zip"
$TEMP_DIR = "temp_backup_$TIMESTAMP"
$EXCLUDE_DIRS = @("node_modules", ".next", ".git", "project-backups", "backups", $TEMP_DIR)

# Function untuk backup database
function Backup-Database {
    Write-Host "`nMemulai backup database..." -ForegroundColor Cyan
    
    # Buat direktori backup jika belum ada
    if (-not (Test-Path $DB_BACKUPS_DIR)) {
        New-Item -ItemType Directory -Path $DB_BACKUPS_DIR | Out-Null
        Write-Host "Direktori backup database dibuat: $DB_BACKUPS_DIR" -ForegroundColor Cyan
    }
    
    # Coba backup database
    try {
        # Pastikan folder prisma ada
        if (Test-Path $DB_FILE) {
            Copy-Item -Path $DB_FILE -Destination $DB_BACKUP_FILE -Force -ErrorAction Stop
            
            # Hitung ukuran backup
            $fileSize = (Get-Item $DB_BACKUP_FILE).Length / 1KB
            Write-Host "Backup database berhasil dibuat: $DB_BACKUP_FILE" -ForegroundColor Green
            Write-Host "Ukuran backup: $([Math]::Round($fileSize, 2)) KB" -ForegroundColor Green
            
            # Bersihkan backup lama jika melebihi batas
            $oldBackups = Get-ChildItem -Path $DB_BACKUPS_DIR -Filter "dev.db.backup_*.sqlite" | Sort-Object LastWriteTime
            if ($oldBackups.Count -gt $MaxBackups) {
                $countToDelete = $oldBackups.Count - $MaxBackups
                $backupsToDelete = $oldBackups | Select-Object -First $countToDelete
                
                foreach ($backup in $backupsToDelete) {
                    Remove-Item $backup.FullName -Force
                    Write-Host "Backup lama dihapus: $($backup.Name)" -ForegroundColor Yellow
                }
            }
            
            # Tampilkan daftar backup yang tersedia
            $availableBackups = Get-ChildItem -Path $DB_BACKUPS_DIR -Filter "dev.db.backup_*.sqlite" | Sort-Object LastWriteTime -Descending
            Write-Host "`nDaftar backup database tersedia:" -ForegroundColor Cyan
            foreach ($backup in $availableBackups) {
                $age = "{0:dd} hari {0:hh} jam {0:mm} menit" -f ((Get-Date) - $backup.LastWriteTime)
                Write-Host "- $($backup.Name) ($(Get-Date $backup.LastWriteTime -Format 'yyyy-MM-dd HH:mm:ss')) - $([Math]::Round($backup.Length / 1KB, 2)) KB" -ForegroundColor White
            }
            
            return $true
        } else {
            Write-Host "PERINGATAN: File database ($DB_FILE) tidak ditemukan!" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "Error saat membuat backup database: $_" -ForegroundColor Red
        Write-Host "Database mungkin sedang digunakan oleh aplikasi lain." -ForegroundColor Red
        return $false
    }
}

# Function untuk backup project
function Backup-Project {
    param (
        [bool]$IncludeDatabase = $true
    )
    
    Write-Host "`nMemulai backup project lengkap..." -ForegroundColor Cyan
    
    # Buat direktori backup jika belum ada
    if (-not (Test-Path $PROJECT_BACKUPS_DIR)) {
        New-Item -ItemType Directory -Path $PROJECT_BACKUPS_DIR | Out-Null
        Write-Host "Direktori backup project dibuat: $PROJECT_BACKUPS_DIR" -ForegroundColor Cyan
    }
    
    # Buat direktori temporary untuk staging backup
    New-Item -ItemType Directory -Path $TEMP_DIR -Force | Out-Null
    Write-Host "Direktori temporary dibuat: $TEMP_DIR" -ForegroundColor Cyan
    
    # Banner informasi
    Write-Host "Memulai backup project BudTrack..." -ForegroundColor Cyan
    Write-Host "Directory project: $PROJECT_DIR" -ForegroundColor Cyan
    Write-Host "Backup akan menyimpan ke: $PROJECT_BACKUP_FILE" -ForegroundColor Cyan
    Write-Host "Direktori yang tidak dibackup: $($EXCLUDE_DIRS -join ', ')" -ForegroundColor Yellow
    if ($IncludeDatabase) {
        Write-Host "Database akan disertakan dalam backup project" -ForegroundColor Cyan
    } else {
        Write-Host "Database TIDAK akan disertakan dalam backup project" -ForegroundColor Yellow
    }
    
    # Variable untuk melacak status database
    $databaseIncluded = $false
    $databaseSource = ""
    
    try {
        # Salin semua file ke direktori temporary (kecuali yang di EXCLUDE_DIRS)
        Write-Host "Menyalin file project ke direktori temporary..." -ForegroundColor Cyan
        foreach ($item in Get-ChildItem -Path $PROJECT_DIR -Exclude $EXCLUDE_DIRS) {
            $destination = Join-Path -Path $TEMP_DIR -ChildPath $item.Name
            Copy-Item -Path $item.FullName -Destination $destination -Recurse -Force -ErrorAction SilentlyContinue
        }
        
        # Pastikan database tersalin, meskipun sedang digunakan
        if ($IncludeDatabase) {
            Write-Host "Menyalin database..." -ForegroundColor Cyan
            
            # Pastikan folder prisma ada di direktori temporary
            $tempPrismaDir = Join-Path -Path $TEMP_DIR -ChildPath "prisma"
            if (-not (Test-Path $tempPrismaDir)) {
                New-Item -ItemType Directory -Path $tempPrismaDir -Force | Out-Null
                Write-Host "Dibuat direktori prisma di temporary folder" -ForegroundColor Cyan
            }
            
            $tempDbPath = Join-Path -Path $tempPrismaDir -ChildPath "dev.db"
            
            try {
                # Coba copy database langsung
                Copy-Item -Path $DB_FILE -Destination $tempDbPath -Force -ErrorAction Stop
                Write-Host "Database berhasil disalin langsung" -ForegroundColor Green
                $databaseIncluded = $true
                $databaseSource = "langsung dari file aktif"
            } catch {
                # Jika gagal karena file sedang digunakan, gunakan backup yang sudah ada
                if (Test-Path $DB_BACKUPS_DIR) {
                    $latestBackup = Get-ChildItem -Path $DB_BACKUPS_DIR -Filter "dev.db.backup_*.sqlite" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
                    if ($latestBackup) {
                        Copy-Item -Path $latestBackup.FullName -Destination $tempDbPath -Force
                        Write-Host "Database disalin dari backup terbaru: $($latestBackup.Name)" -ForegroundColor Yellow
                        $databaseIncluded = $true
                        $databaseSource = "dari backup terbaru ($($latestBackup.Name))"
                    } else {
                        Write-Host "Tidak ada backup database yang ditemukan!" -ForegroundColor Red
                        $databaseIncluded = $false
                    }
                } else {
                    Write-Host "Database tidak dapat disalin dan tidak ada backup yang tersedia!" -ForegroundColor Red
                    $databaseIncluded = $false
                }
            }
            
            # Verifikasi database telah tersalin
            if ($databaseIncluded -and (Test-Path $tempDbPath)) {
                $dbSize = (Get-Item $tempDbPath).Length / 1KB
                Write-Host "Database termasuk dalam backup - Ukuran: $([Math]::Round($dbSize, 2)) KB" -ForegroundColor Green
            } else {
                Write-Host "PERINGATAN: Database tidak disertakan dalam backup!" -ForegroundColor Red
            }
        }
        
        # Hitung jumlah file yang akan dibackup
        $fileCount = (Get-ChildItem -Path $TEMP_DIR -Recurse -File).Count
        Write-Host "Total file yang akan dibackup: $fileCount" -ForegroundColor Cyan
        
        # Membuat backup ZIP dari direktori temporary
        if (Get-Command Compress-Archive -ErrorAction SilentlyContinue) {
            # Gunakan modul bawaan PowerShell 5+
            Compress-Archive -Path "$TEMP_DIR\*" -DestinationPath $PROJECT_BACKUP_FILE -Force
        } else {
            # Gunakan .NET Framework untuk PowerShell versi lebih lama
            Add-Type -AssemblyName System.IO.Compression.FileSystem
            [System.IO.Compression.ZipFile]::CreateFromDirectory($TEMP_DIR, $PROJECT_BACKUP_FILE)
        }
        
        # Hitung ukuran backup
        $fileSize = (Get-Item $PROJECT_BACKUP_FILE).Length / 1MB
        Write-Host "Backup project berhasil dibuat: $PROJECT_BACKUP_FILE" -ForegroundColor Green
        Write-Host "Ukuran backup: $([Math]::Round($fileSize, 2)) MB" -ForegroundColor Green
        
        # Bersihkan backup lama jika melebihi batas
        $oldBackups = Get-ChildItem -Path $PROJECT_BACKUPS_DIR -Filter "budtrack_backup_*.zip" | Sort-Object LastWriteTime
        if ($oldBackups.Count -gt $MaxBackups) {
            $countToDelete = $oldBackups.Count - $MaxBackups
            $backupsToDelete = $oldBackups | Select-Object -First $countToDelete
            
            foreach ($backup in $backupsToDelete) {
                Remove-Item $backup.FullName -Force
                Write-Host "Backup lama dihapus: $($backup.Name)" -ForegroundColor Yellow
            }
        }
        
        # Tampilkan daftar backup yang tersedia
        $availableBackups = Get-ChildItem -Path $PROJECT_BACKUPS_DIR -Filter "budtrack_backup_*.zip" | Sort-Object LastWriteTime -Descending
        Write-Host "`nDaftar backup project tersedia:" -ForegroundColor Cyan
        $availableBackups | Format-Table Name, @{Name="Size (MB)"; Expression={[Math]::Round($_.Length / 1MB, 2)}}, LastWriteTime
        
        return @{
            Success = $true
            DatabaseIncluded = $databaseIncluded
            DatabaseSource = $databaseSource
        }
    } catch {
        Write-Host "Error saat membuat backup project: $_" -ForegroundColor Red
        return @{
            Success = $false
            DatabaseIncluded = $false
            DatabaseSource = ""
        }
    } finally {
        # Bersihkan direktori temporary
        Remove-Item -Path $TEMP_DIR -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Direktori temporary dibersihkan" -ForegroundColor Cyan
    }
}

# Tampilkan header
Write-Host "`n==============================================" -ForegroundColor Cyan
Write-Host "       BudTrack Backup Tool" -ForegroundColor Cyan
Write-Host "==============================================`n" -ForegroundColor Cyan

# Logic untuk backup berdasarkan parameter
if ((-not $DatabaseOnly -and -not $ProjectOnly) -or ($DatabaseOnly -and $ProjectOnly)) {
    # Jika tidak ada parameter, atau kedua parameter diberikan, tanyakan user
    Write-Host "Pilih jenis backup:" -ForegroundColor Cyan
    Write-Host "[1] Backup Database saja" -ForegroundColor White
    Write-Host "[2] Backup Project lengkap (termasuk database)" -ForegroundColor White
    Write-Host "[3] Backup keduanya secara terpisah" -ForegroundColor White
    Write-Host "[0] Batal" -ForegroundColor Yellow
    
    $choice = Read-Host "`nMasukkan pilihan"
    
    switch ($choice) {
        "1" { $DatabaseOnly = $true }
        "2" { $ProjectOnly = $true }
        "3" { $DatabaseOnly = $true; $ProjectOnly = $true }
        "0" { exit }
        default {
            Write-Host "Pilihan tidak valid. Backup dibatalkan." -ForegroundColor Red
            exit
        }
    }
}

# Jalankan backup sesuai pilihan
$dbSuccess = $false
$projectResult = @{
    Success = $false
    DatabaseIncluded = $false
    DatabaseSource = ""
}

if ($DatabaseOnly) {
    $dbSuccess = Backup-Database
}

if ($ProjectOnly) {
    $projectResult = Backup-Project -IncludeDatabase $true
}

# Tampilkan ringkasan
Write-Host "`n=================== RINGKASAN ===================" -ForegroundColor Cyan

if ($DatabaseOnly) {
    if ($dbSuccess) {
        Write-Host "✓ Backup database berhasil dibuat: $DB_BACKUP_FILE" -ForegroundColor Green
    } 
    else {
        Write-Host "✗ Backup database gagal" -ForegroundColor Red
    }
}

if ($ProjectOnly) {
    if ($projectResult.Success) {
        Write-Host "✓ Backup project berhasil dibuat: $PROJECT_BACKUP_FILE" -ForegroundColor Green
        
        if ($projectResult.DatabaseIncluded) {
            Write-Host "  ✓ Database termasuk dalam backup project $($projectResult.DatabaseSource)" -ForegroundColor Green
        } 
        else {
            Write-Host "  ✗ Database TIDAK termasuk dalam backup project" -ForegroundColor Red
        }
    } 
    else {
        Write-Host "✗ Backup project gagal" -ForegroundColor Red
    }
}

Write-Host "`nProses backup selesai pada: $(Get-Date)" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan 