# KuMMi School System - Restore Script (Targeted)
$zipFile = "KuMMi_Portable_Backup_2026-05-07_1919.zip"
$tempFolder = "restore_temp_0507"

if (!(Test-Path $zipFile)) {
    Write-Host "❌ Error: Backup file '$zipFile' not found!" -ForegroundColor Red
    exit
}

Write-Host "--------------------------------------------------" -ForegroundColor Yellow
Write-Host "  RESTORING FROM: $zipFile" -ForegroundColor Cyan
Write-Host "--------------------------------------------------" -ForegroundColor Yellow

# 1. Extract to temp folder
if (Test-Path $tempFolder) { Remove-Item -Path $tempFolder -Recurse -Force }
Write-Host "Extracting files (this may take a minute)..." -ForegroundColor Gray
Expand-Archive -Path $zipFile -DestinationPath $tempFolder -Force

# 2. Overwrite project files
Write-Host "Restoring source files..." -ForegroundColor Gray
Copy-Item -Path "$tempFolder\*" -Destination "." -Recurse -Force

# 3. Restore Database
Write-Host "Syncing database with restored data..." -ForegroundColor Cyan
if (Test-Path "scripts/migrate-data.cjs") {
    node scripts/migrate-data.cjs
} else {
    Write-Host "⚠️ Warning: migrate-data.cjs not found." -ForegroundColor Yellow
}

# 4. Cleanup
Write-Host "Cleaning up..." -ForegroundColor Gray
Remove-Item -Path $tempFolder -Recurse -Force

Write-Host ""
Write-Host "--------------------------------------------------" -ForegroundColor Green
Write-Host "  RESTORE COMPLETE!" -ForegroundColor Green
Write-Host "--------------------------------------------------" -ForegroundColor Green
