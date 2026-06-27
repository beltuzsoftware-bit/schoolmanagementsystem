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
