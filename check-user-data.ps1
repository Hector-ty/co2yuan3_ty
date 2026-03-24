# MongoDB User Data Integrity Check Script
# Check if each user in the database contains all required fields

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MongoDB User Data Integrity Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running in the correct directory
if (-not (Test-Path "server\scripts\checkUserData.js")) {
    Write-Host "Error: Cannot find check script server\scripts\checkUserData.js" -ForegroundColor Red
    Write-Host "Please ensure you are running this script from the project root directory" -ForegroundColor Yellow
    exit 1
}

# Check if MONGODB_URI is set
$env:MONGODB_URI = if ($env:MONGODB_URI) { 
    $env:MONGODB_URI 
} else { 
    "mongodb://localhost:27017/carbon_platform" 
}

Write-Host "Using MongoDB URI: $env:MONGODB_URI" -ForegroundColor Yellow
Write-Host ""

# Run the check script
Write-Host "Running data check..." -ForegroundColor Green
Write-Host ""

node server/scripts/checkUserData.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Check completed!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Error occurred during check, please see error messages above" -ForegroundColor Red
    exit 1
}
