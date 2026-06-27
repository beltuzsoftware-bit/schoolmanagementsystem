# KuMMi School System - Restore Script
$zipFile = "KuMMi_Portable_Backup_2026-04-25_1105.zip"
$tempFolder = "restore_temp_" + (Get-Date -Format "HHmm")

if (!(Test-Path $zipFile)) {
    Write-Host "❌ Error: Backup file '$zipFile' not found!" -ForegroundColor Red
    Pause
    exit
}

Write-Host "--------------------------------------------------" -ForegroundColor Yellow
Write-Host "  RESTORING FROM: $zipFile" -ForegroundColor Cyan
Write-Host "--------------------------------------------------" -ForegroundColor Yellow

# 1. Extract to temp folder
if (Test-Path $tempFolder) { Remove-Item -Path $tempFolder -Recurse -Force }
Write-Host "Extracting files..." -ForegroundColor Gray
Expand-Archive -Path $zipFile -DestinationPath $tempFolder -Force

# 2. Overwrite project files
Write-Host "Restoring source files..." -ForegroundColor Gray
# Note: We copy everything from the temp folder back to root
# This will overwrite current files
Copy-Item -Path "$tempFolder\*" -Destination "." -Recurse -Force

# 3. Restore Database
Write-Host "Syncing database with restored data..." -ForegroundColor Cyan
if (Test-Path "scripts/migrate-data.cjs") {
    node scripts/migrate-data.cjs
} else {
    Write-Host "⚠️ Warning: migrate-data.cjs not found. Database not automatically updated." -ForegroundColor Yellow
}

# 4. Cleanup
Write-Host "Cleaning up..." -ForegroundColor Gray
Remove-Item -Path $tempFolder -Recurse -Force

Write-Host ""
Write-Host "--------------------------------------------------" -ForegroundColor Green
Write-Host "  RESTORE COMPLETE!" -ForegroundColor Green
Write-Host "  The system has been rolled back to 2026-04-25." -ForegroundColor White
Write-Host "--------------------------------------------------" -ForegroundColor Green
Pause
