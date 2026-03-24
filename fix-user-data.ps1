# MongoDB User Data Fix Script
# Set default values for users with missing fields

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "MongoDB User Data Fix Tool" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Warning: This script will set default values for missing fields" -ForegroundColor Red
Write-Host "Suggestion: Run check-user-data.ps1 first to see issues" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Confirm to continue fixing? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Operation cancelled" -ForegroundColor Yellow
    exit 0
}

# Check if running in the correct directory
if (-not (Test-Path "server\scripts\fixUserData.js")) {
    Write-Host "Error: Cannot find fix script server\scripts\fixUserData.js" -ForegroundColor Red
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

# Run the fix script
Write-Host "Fixing data..." -ForegroundColor Green
Write-Host ""

node server/scripts/fixUserData.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Fix completed!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Error occurred during fix, please see error messages above" -ForegroundColor Red
    exit 1
}
