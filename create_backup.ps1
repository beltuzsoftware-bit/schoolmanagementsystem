# KuMMi School System - Backup Script
# This script will create a ZIP archive of your project, excluding node_modules and build folders.

Write-Host "--------------------------------------------------" -ForegroundColor Yellow
Write-Host "  STARTING DATABASE EXPORT BEFORE BACKUP" -ForegroundColor Cyan
Write-Host "--------------------------------------------------" -ForegroundColor Yellow

if (Test-Path "scripts/export-db.cjs") {
    node scripts/export-db.cjs
} else {
    Write-Warning "scripts/export-db.cjs not found. Database export skipped!"
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$destination = "KuMMi_Backup_$timestamp.zip"

Write-Host ""
Write-Host "Creating backup: $destination..." -ForegroundColor Cyan

# Define items to include (everything except node_modules, .next, and existing zips)
$items = Get-ChildItem -Path . -Exclude "node_modules", ".next", "*.zip", ".git"

Compress-Archive -Path $items -DestinationPath $destination -Force

Write-Host "Success! Backup created at: $(Get-Location)\$destination" -ForegroundColor Green
Pause
