# Backup Script for Kummi School System
# Usage: .\scripts\backup.ps1

Write-Host "--------------------------------------------------" -ForegroundColor Yellow
Write-Host "  STARTING DATABASE EXPORT BEFORE BACKUP" -ForegroundColor Cyan
Write-Host "--------------------------------------------------" -ForegroundColor Yellow

if (Test-Path "scripts/export-db.cjs") {
    node scripts/export-db.cjs
} elseif (Test-Path "export-db.cjs") {
    node export-db.cjs
} else {
    Write-Warning "export-db.cjs not found. Database export skipped!"
}

$date = Get-Date -Format "dd-MM-yyyy"
$timestamp = Get-Date -Format "HH-mm"
$backupName = "kummi-school-system_$date`_$timestamp"
$destination = "D:\backups\$backupName"

if (!(Test-Path "D:\backups")) {
    New-Item -ItemType Directory -Path "D:\backups"
}

Write-Host ""
Write-Host "🚀 Creating backup: $backupName" -ForegroundColor Cyan

# Define exclusions
$exclude = @("node_modules", ".next", ".git", "backups")

# Create zip archive
try {
    Compress-Archive -Path ".\*" -DestinationPath "D:\backups\$backupName.zip" -CompressionLevel Optimal
    Write-Host "✅ Backup successful: D:\backups\$backupName.zip" -ForegroundColor Green
} catch {
    Write-Host "❌ Backup failed: $_" -ForegroundColor Red
}
