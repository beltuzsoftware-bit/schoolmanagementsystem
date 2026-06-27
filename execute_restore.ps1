Write-Host "🚀 Starting Option B Restore Process..." -ForegroundColor Cyan

# 1. Scan for backup ZIP files and folders in workspace
$backups = Get-ChildItem -Path . -Filter "KuMMi_Portable_Backup_*" 
$zipBackups = $backups | Where-Object { $_.Extension -eq ".zip" }
$folderBackups = $backups | Where-Object { $_.PSIsContainer }

$allBackups = @()
foreach ($z in $zipBackups) {
    $allBackups += [PSCustomObject]@{
        Name = $z.Name
        FullName = $z.FullName
        Type = "ZIP"
        LastWriteTime = $z.LastWriteTime
    }
}
foreach ($f in $folderBackups) {
    $allBackups += [PSCustomObject]@{
        Name = $f.Name
        FullName = $f.FullName
        Type = "Folder"
        LastWriteTime = $f.LastWriteTime
    }
}

# Sort by newest first
$allBackups = $allBackups | Sort-Object LastWriteTime -Descending

if ($allBackups.Count -eq 0) {
    Write-Host "❌ No KuMMi_Portable_Backup_* ZIPs or Folders found in current directory!" -ForegroundColor Red
    Pause
    Exit
}

Write-Host "Available Backups to Restore (Newest First):" -ForegroundColor Yellow
for ($i = 0; $i -lt $allBackups.Count; $i++) {
    Write-Host " [$($i + 1)] $($allBackups[$i].Name) ($($allBackups[$i].Type), modified: $($allBackups[$i].LastWriteTime))" -ForegroundColor Gray
}

$choice = Read-Host "Select backup number to restore (or press Enter for the latest [1])"
if ([string]::IsNullOrWhiteSpace($choice)) {
    $choiceIndex = 0
} else {
    $choiceIndex = [int]$choice - 1
}

if ($choiceIndex -lt 0 -or $choiceIndex -ge $allBackups.Count) {
    Write-Host "❌ Invalid selection!" -ForegroundColor Red
    Pause
    Exit
}

$selected = $allBackups[$choiceIndex]
Write-Host "Selected backup: $($selected.Name)" -ForegroundColor Green

# 2. Backup current data.json for safety
if (Test-Path "data.json") {
    $safeDate = Get-Date -Format "yyyy-MM-dd_HHmmss"
    Write-Host "📦 Creating safety backup of current data.json as 'data.json.before_restore_$safeDate.json'..." -ForegroundColor Gray
    Copy-Item -Path "data.json" -Destination "data.json.before_restore_$safeDate.json" -Force
}

# 3. Extract if ZIP or copy if Folder
$tempExtractDir = "restore_temp_staging"
if (Test-Path $tempExtractDir) { Remove-Item -Path $tempExtractDir -Recurse -Force }

if ($selected.Type -eq "ZIP") {
    Write-Host "📦 Extracting $($selected.Name)..." -ForegroundColor Cyan
    Expand-Archive -Path $selected.FullName -DestinationPath $tempExtractDir -Force
    $sourceDir = $tempExtractDir
} else {
    $sourceDir = $selected.FullName
}

# 4. Copy files from source to destination
Write-Host "📂 Copying files to root workspace..." -ForegroundColor Gray
$itemsToCopy = Get-ChildItem -Path $sourceDir -Exclude "node_modules", ".next", ".git", "backups", "brain", $tempExtractDir

foreach ($item in $itemsToCopy) {
    $destPath = Join-Path "." $item.Name
    Copy-Item -Path $item.FullName -Destination $destPath -Recurse -Force
}

# Cleanup temp
if ($selected.Type -eq "ZIP" -and (Test-Path $tempExtractDir)) {
    Remove-Item -Path $tempExtractDir -Recurse -Force
}

# 5. Sync restored data into the database
Write-Host "🔄 Syncing restored data.json to Postgres database..." -ForegroundColor Gray
if (Test-Path "scripts/migrate-data.cjs") {
    node scripts/migrate-data.cjs
} else {
    Write-Host "❌ Error: scripts/migrate-data.cjs not found after copy!" -ForegroundColor Red
}

Write-Host "✅ Restore complete! Please restart your dev server (npm run dev)." -ForegroundColor Green
Pause
