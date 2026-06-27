# KuMMi School System - Portable Backup Creator
# Purpose: Creates a clean, ready-to-move backup of the entire system (including DB)
# Excludes: node_modules, .next, .git, and other temporary files

Write-Host "--------------------------------------------------" -ForegroundColor Yellow
Write-Host "  STARTING DATABASE EXPORT BEFORE BACKUP" -ForegroundColor Cyan
Write-Host "--------------------------------------------------" -ForegroundColor Yellow

if (Test-Path "scripts/export-db.cjs") {
    node scripts/export-db.cjs
} else {
    Write-Warning "scripts/export-db.cjs not found. Database export skipped!"
}

$date = Get-Date -Format "yyyy-MM-dd_HHmm"
$backupName = "KuMMi_Portable_Backup_$date"
$backupFolder = Join-Path $PSScriptRoot $backupName

Write-Host ""
Write-Host "--------------------------------------------------" -ForegroundColor Yellow
Write-Host "  STARTING PORTABLE BACKUP CREATION" -ForegroundColor Cyan
Write-Host "--------------------------------------------------" -ForegroundColor Yellow

# 1. Create temporary staging folder
if (Test-Path $backupFolder) { Remove-Item -Path $backupFolder -Recurse -Force }
New-Item -ItemType Directory -Path $backupFolder | Out-Null

# 2. Define source items to copy
$itemsToCopy = Get-ChildItem -Path $PSScriptRoot -Exclude "node_modules", ".next", ".git", ".vercel", "KuMMi_Backup_*.zip", "KuMMi_Portable_*.zip", $backupName

Write-Host "Copying source files and database..." -ForegroundColor Gray
foreach ($item in $itemsToCopy) {
    $destPath = Join-Path $backupFolder $item.Name
    Copy-Item -Path $item.FullName -Destination $destPath -Recurse -Force
}

# 3. Create a helper setup script inside the backup
$setupScript = @"
# KuMMi School System - One-Click Setup
Write-Host "--------------------------------------------------" -ForegroundColor Yellow
Write-Host "  SETTING UP KUMMI SCHOOL SYSTEM" -ForegroundColor Cyan
Write-Host "--------------------------------------------------" -ForegroundColor Yellow

if (!(Test-Path "node_modules")) {
    Write-Host "Installing dependencies (npm install)... This may take a few minutes." -ForegroundColor Gray
    npm install
}

Write-Host "Generating Prisma Client..." -ForegroundColor Gray
npx prisma generate

Write-Host "Checking database migrations..." -ForegroundColor Gray
npx prisma migrate dev --name init --skip-generate

Write-Host ""
Write-Host "SUCCESS! The system is ready." -ForegroundColor Green
Write-Host "To start the application, run: npm run dev" -ForegroundColor Cyan
Write-Host "--------------------------------------------------" -ForegroundColor Yellow
Pause
"@

$setupScript | Out-File -FilePath (Join-Path $backupFolder "SETUP_NEW_PC.ps1") -Encoding utf8

# 4. Compress into a single ZIP file
Write-Host "Compressing into ZIP archive..." -ForegroundColor Cyan
$zipFile = "$backupFolder.zip"
if (Test-Path $zipFile) { Remove-Item $zipFile }
Compress-Archive -Path "$backupFolder\*" -DestinationPath $zipFile -Force

# 5. Cleanup temporary folder
Remove-Item -Path $backupFolder -Recurse -Force

Write-Host ""
Write-Host "--------------------------------------------------" -ForegroundColor Green
Write-Host "  BACKUP COMPLETE!" -ForegroundColor Green
Write-Host "  File: $($zipFile)" -ForegroundColor White
Write-Host "  Instructions: Copy this ZIP to any PC, Extract, and run 'SETUP_NEW_PC.ps1'" -ForegroundColor Gray
Write-Host "--------------------------------------------------" -ForegroundColor Green
Pause
