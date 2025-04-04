# Script untuk restore database atau project BudTrack
# Jalankan dengan perintah berikut:
#   - Restore hanya database: .\restore.ps1 -DatabaseOnly
#   - Restore project lengkap: .\restore.ps1 -ProjectOnly
#   - Restore database dan project: .\restore.ps1

param (
    [switch]$DatabaseOnly,
    [switch]$ProjectOnly,
    [string]$BackupFile,
    [string]$DatabaseBackupFile
)

# Konfigurasi
$PROJECT_BACKUPS_DIR = "project-backups"
$DB_BACKUPS_DIR = "backups"
$DB_FILE = "prisma/dev.db"
$TEMP_RESTORE_DIR = "temp_restore_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

# Function untuk menampilkan menu pilihan file backup
function Show-BackupMenu {
    param (
        [string]$Title,
        [array]$Items
    )
    
    if ($Items.Count -eq 0) {
        Write-Host "Tidak ada file backup tersedia!" -ForegroundColor Red
        return $null
    }
    
    Write-Host "`n$Title" -ForegroundColor Cyan
    for ($i = 0; $i -lt $Items.Count; $i++) {
        Write-Host "[$($i+1)] $($Items[$i].Name) ($(Get-Date $Items[$i].LastWriteTime -Format 'yyyy-MM-dd HH:mm:ss')) - $([Math]::Round($Items[$i].Length / 1MB, 2)) MB" -ForegroundColor White
    }
    Write-Host "[0] Batal" -ForegroundColor Yellow
    
    do {
        $selection = Read-Host "`nPilih nomor file backup"
        
        if ($selection -eq "0") {
            return $null
        }
        
        $index = [int]$selection - 1
        if ($index -ge 0 -and $index -lt $Items.Count) {
            return $Items[$index]
        }
        
        Write-Host "Pilihan tidak valid. Silakan pilih lagi." -ForegroundColor Red
    } while ($true)
}

# Function untuk merestore database
function Restore-Database {
    param (
        [string]$BackupFilePath
    )
    
    Write-Host "`nMemulai restore database BudTrack..." -ForegroundColor Cyan
    
    # Validasi file backup
    if (-not (Test-Path $BackupFilePath)) {
        Write-Host "File backup database tidak ditemukan: $BackupFilePath" -ForegroundColor Red
        return $false
    }
    
    # Periksa apakah server sedang berjalan
    $isServerRunning = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*next*" }
    if ($isServerRunning) {
        Write-Host "PERINGATAN: Server development sedang berjalan. Disarankan untuk menghentikan server sebelum merestore database." -ForegroundColor Yellow
        $stopServer = Read-Host "Apakah Anda ingin melanjutkan restore? (y/n)"
        if ($stopServer -ne "y") {
            Write-Host "Restore database dibatalkan." -ForegroundColor Yellow
            return $false
        }
    }
    
    # Buat backup database yang sekarang sebelum merestore
    $currentDbBackupDir = "backups"
    if (-not (Test-Path $currentDbBackupDir)) {
        New-Item -ItemType Directory -Path $currentDbBackupDir -Force | Out-Null
    }
    $currentDbBackupFile = "$currentDbBackupDir/dev.db.before_restore_$(Get-Date -Format 'yyyyMMdd_HHmmss').sqlite"
    
    try {
        if (Test-Path $DB_FILE) {
            Copy-Item -Path $DB_FILE -Destination $currentDbBackupFile -Force -ErrorAction Stop
            Write-Host "Backup database sekarang dibuat: $currentDbBackupFile" -ForegroundColor Green
        }
    } catch {
        Write-Host "Peringatan: Tidak dapat membuat backup database yang sekarang. Database mungkin sedang digunakan." -ForegroundColor Yellow
        $continueWithoutBackup = Read-Host "Apakah Anda ingin melanjutkan restore tanpa backup? (y/n)"
        if ($continueWithoutBackup -ne "y") {
            Write-Host "Restore database dibatalkan." -ForegroundColor Yellow
            return $false
        }
    }
    
    # Restore database
    try {
        # Pastikan folder prisma ada
        if (-not (Test-Path "prisma")) {
            New-Item -ItemType Directory -Path "prisma" -Force | Out-Null
        }
        
        # Coba salin file database
        Copy-Item -Path $BackupFilePath -Destination $DB_FILE -Force -ErrorAction Stop
        Write-Host "Database berhasil direstore dari: $BackupFilePath" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "Error saat merestore database: $_" -ForegroundColor Red
        Write-Host "Database mungkin sedang digunakan oleh aplikasi lain." -ForegroundColor Red
        return $false
    }
}

# Function untuk merestore project lengkap
function Restore-Project {
    param (
        [string]$BackupFilePath
    )
    
    Write-Host "`nMemulai restore project BudTrack lengkap..." -ForegroundColor Cyan
    
    # Validasi file backup
    if (-not (Test-Path $BackupFilePath)) {
        Write-Host "File backup project tidak ditemukan: $BackupFilePath" -ForegroundColor Red
        return $false
    }
    
    # Periksa apakah server sedang berjalan
    $isServerRunning = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*next*" }
    if ($isServerRunning) {
        Write-Host "PERINGATAN: Server development sedang berjalan. Harap hentikan server sebelum merestore project." -ForegroundColor Yellow
        $stopServer = Read-Host "Apakah Anda ingin melanjutkan restore? (y/n)"
        if ($stopServer -ne "y") {
            Write-Host "Restore project dibatalkan." -ForegroundColor Yellow
            return $false
        }
    }
    
    # Buat direktori temporary untuk extract
    New-Item -ItemType Directory -Path $TEMP_RESTORE_DIR -Force | Out-Null
    Write-Host "Direktori temporary dibuat: $TEMP_RESTORE_DIR" -ForegroundColor Cyan
    
    # Extract backup ke direktori temporary
    try {
        Write-Host "Mengekstrak file backup ke direktori temporary..." -ForegroundColor Cyan
        Expand-Archive -Path $BackupFilePath -DestinationPath $TEMP_RESTORE_DIR -Force
        
        # Periksa hasil ekstrak
        $extractedItems = Get-ChildItem -Path $TEMP_RESTORE_DIR
        Write-Host "File terextract: $($extractedItems.Count) item" -ForegroundColor Cyan
        
        # Konfirmasi penggantian file
        $confirmReplace = Read-Host "PERINGATAN: Restore akan mengganti file project yang ada. Lanjutkan? (y/n)"
        if ($confirmReplace -ne "y") {
            Write-Host "Restore project dibatalkan." -ForegroundColor Yellow
            Remove-Item -Path $TEMP_RESTORE_DIR -Recurse -Force
            return $false
        }
        
        # Buat backup direktori project sekarang
        $currentProjectBackupDir = "$PROJECT_BACKUPS_DIR/project_before_restore_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        Write-Host "Membuat backup project yang sekarang ke: $currentProjectBackupDir" -ForegroundColor Cyan
        New-Item -ItemType Directory -Path $currentProjectBackupDir -Force | Out-Null
        
        # Salin file-file penting yang mungkin ingin dipertahankan
        Copy-Item -Path "prisma/dev.db" -Destination "$currentProjectBackupDir/dev.db" -ErrorAction SilentlyContinue
        Copy-Item -Path ".env" -Destination "$currentProjectBackupDir/.env" -ErrorAction SilentlyContinue
        Copy-Item -Path ".env.local" -Destination "$currentProjectBackupDir/.env.local" -ErrorAction SilentlyContinue
        
        # Salin file dari direktori temporary ke project
        Write-Host "Menyalin file dari backup ke project..." -ForegroundColor Cyan
        
        # Salin semua file/direktori kecuali node_modules dan .next
        foreach ($item in Get-ChildItem -Path "$TEMP_RESTORE_DIR" -Exclude "node_modules", ".next", ".git") {
            $destination = Join-Path -Path (Get-Location) -ChildPath $item.Name
            if (Test-Path $destination) {
                Remove-Item -Path $destination -Recurse -Force -ErrorAction SilentlyContinue
            }
            Copy-Item -Path $item.FullName -Destination $destination -Recurse -Force -ErrorAction SilentlyContinue
        }
        
        Write-Host "Project berhasil direstore dari: $BackupFilePath" -ForegroundColor Green
        
        # Tanyakan apakah pengguna ingin menginstal dependencies
        $installDependencies = Read-Host "Apakah Anda ingin menginstal ulang dependencies (npm install)? (y/n)"
        if ($installDependencies -eq "y") {
            Write-Host "Menginstal dependencies..." -ForegroundColor Cyan
            npm install
        }
        
        return $true
    } catch {
        Write-Host "Error saat merestore project: $_" -ForegroundColor Red
        return $false
    } finally {
        # Bersihkan direktori temporary
        Remove-Item -Path $TEMP_RESTORE_DIR -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Direktori temporary dibersihkan" -ForegroundColor Cyan
    }
}

# Tampilkan header
Write-Host "`n==============================================" -ForegroundColor Cyan
Write-Host "       BudTrack Restore Tool" -ForegroundColor Cyan
Write-Host "==============================================`n" -ForegroundColor Cyan

# Logic untuk restore berdasarkan parameter
if ((-not $DatabaseOnly -and -not $ProjectOnly) -or ($DatabaseOnly -and $ProjectOnly)) {
    # Jika tidak ada parameter, atau kedua parameter diberikan, tanyakan user
    Write-Host "Pilih jenis restore:" -ForegroundColor Cyan
    Write-Host "[1] Restore Database saja" -ForegroundColor White
    Write-Host "[2] Restore Project lengkap (termasuk database)" -ForegroundColor White
    Write-Host "[3] Restore keduanya secara terpisah" -ForegroundColor White
    Write-Host "[0] Batal" -ForegroundColor Yellow
    
    $choice = Read-Host "`nMasukkan pilihan"
    
    switch ($choice) {
        "1" { $DatabaseOnly = $true }
        "2" { $ProjectOnly = $true }
        "3" { $DatabaseOnly = $true; $ProjectOnly = $true }
        "0" { exit }
        default {
            Write-Host "Pilihan tidak valid. Restore dibatalkan." -ForegroundColor Red
            exit
        }
    }
}

# Restore Database
if ($DatabaseOnly) {
    $databaseBackup = $null
    
    if ($DatabaseBackupFile) {
        if (Test-Path $DatabaseBackupFile) {
            $databaseBackup = Get-Item $DatabaseBackupFile
        } else {
            Write-Host "File backup database tidak ditemukan: $DatabaseBackupFile" -ForegroundColor Red
        }
    } else {
        $dbBackups = Get-ChildItem -Path $DB_BACKUPS_DIR -Filter "dev.db.backup_*.sqlite" | Sort-Object LastWriteTime -Descending
        $databaseBackup = Show-BackupMenu -Title "Pilih file backup database:" -Items $dbBackups
    }
    
    if ($databaseBackup) {
        $result = Restore-Database -BackupFilePath $databaseBackup.FullName
        if ($result) {
            Write-Host "Restore database berhasil!" -ForegroundColor Green
        } else {
            Write-Host "Restore database gagal." -ForegroundColor Red
        }
    } else {
        Write-Host "Restore database dibatalkan." -ForegroundColor Yellow
    }
}

# Restore Project
if ($ProjectOnly) {
    $projectBackup = $null
    
    if ($BackupFile) {
        if (Test-Path $BackupFile) {
            $projectBackup = Get-Item $BackupFile
        } else {
            Write-Host "File backup project tidak ditemukan: $BackupFile" -ForegroundColor Red
        }
    } else {
        $projectBackups = Get-ChildItem -Path $PROJECT_BACKUPS_DIR -Filter "budtrack_backup_*.zip" | Sort-Object LastWriteTime -Descending
        $projectBackup = Show-BackupMenu -Title "Pilih file backup project:" -Items $projectBackups
    }
    
    if ($projectBackup) {
        $result = Restore-Project -BackupFilePath $projectBackup.FullName
        if ($result) {
            Write-Host "Restore project berhasil!" -ForegroundColor Green
        } else {
            Write-Host "Restore project gagal." -ForegroundColor Red
        }
    } else {
        Write-Host "Restore project dibatalkan." -ForegroundColor Yellow
    }
}

Write-Host "`nProses restore selesai." -ForegroundColor Cyan 