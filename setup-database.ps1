# Setup Database Script
# This script checks for MySQL and sets up the database

Write-Host "=== Stock Manager Database Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if MySQL is running
Write-Host "Checking MySQL status..." -ForegroundColor Yellow

$mysqlService = Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue

if ($mysqlService) {
    Write-Host "✓ MySQL Service found: $($mysqlService.Name)" -ForegroundColor Green
    
    if ($mysqlService.Status -eq "Running") {
        Write-Host "✓ MySQL is running" -ForegroundColor Green
    } else {
        Write-Host "⚠ MySQL is stopped. Attempting to start..." -ForegroundColor Yellow
        Start-Service $mysqlService.Name
        Start-Sleep -Seconds 3
        Write-Host "✓ MySQL started" -ForegroundColor Green
    }
} else {
    Write-Host "✗ MySQL Service not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install MySQL or XAMPP first." -ForegroundColor Yellow
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  1. XAMPP: https://www.apachefriends.org/download.html" -ForegroundColor White
    Write-Host "  2. MySQL: https://dev.mysql.com/downloads/mysql/" -ForegroundColor White
    Write-Host ""
    Write-Host "After installation, run this script again." -ForegroundColor Yellow
    exit
}

Write-Host ""
Write-Host "Setting up database..." -ForegroundColor Yellow

# Change to Backend directory
Set-Location -Path "Backend"

# Generate Prisma Client
Write-Host "Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate

# Push database schema
Write-Host ""
Write-Host "Creating database and tables..." -ForegroundColor Yellow
npx prisma db push

# Seed database
Write-Host ""
Write-Host "Adding initial data..." -ForegroundColor Yellow
npx prisma db seed

Write-Host ""
Write-Host "=== Setup Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Start Backend: npm run dev" -ForegroundColor White
Write-Host "  2. Open Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  3. Login with: admin@stockmanager.com / Admin@123" -ForegroundColor White
Write-Host ""
