# Docker WSL Virtual Disk Compression Script
# Requires Administrator privileges
# Note: Close Docker Desktop before running this script

Write-Host "=== Docker WSL Virtual Disk Compression Script ===" -ForegroundColor Cyan
Write-Host ""

# Check administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Error: Administrator privileges required!" -ForegroundColor Red
    Write-Host "Please right-click PowerShell and select 'Run as administrator'" -ForegroundColor Yellow
    pause
    exit 1
}

# Virtual disk file path
$vhdxPath = "$env:LOCALAPPDATA\Docker\wsl\disk\docker_data.vhdx"

# Check if file exists
if (-not (Test-Path $vhdxPath)) {
    Write-Host "Error: Virtual disk file not found: $vhdxPath" -ForegroundColor Red
    pause
    exit 1
}

# Check current file size
$fileInfo = Get-ItemProperty $vhdxPath
$currentSizeGB = [math]::Round($fileInfo.Length / 1GB, 2)
Write-Host "Current virtual disk file size: $currentSizeGB GB" -ForegroundColor Yellow
Write-Host "File path: $vhdxPath" -ForegroundColor Gray
Write-Host ""

# Check if Docker Desktop is running
$dockerProcess = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
if ($dockerProcess) {
    Write-Host "Warning: Docker Desktop is running!" -ForegroundColor Red
    Write-Host "Please close Docker Desktop before running this script" -ForegroundColor Yellow
    Write-Host "1. Right-click Docker icon in system tray" -ForegroundColor White
    Write-Host "2. Select 'Quit Docker Desktop'" -ForegroundColor White
    Write-Host "3. Wait for Docker to fully close" -ForegroundColor White
    Write-Host ""
    $continue = Read-Host "Have you closed Docker Desktop? (y/n)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "Operation cancelled" -ForegroundColor Yellow
        pause
        exit 0
    }
}

# Shutdown all WSL distributions
Write-Host ""
Write-Host "Step 1: Shutting down all WSL distributions..." -ForegroundColor Cyan
wsl --shutdown
Start-Sleep -Seconds 3
Write-Host "[OK] WSL has been shut down" -ForegroundColor Green
Write-Host ""

# Check if Hyper-V is installed (can use Optimize-VHD)
$hasHyperV = Get-Command Optimize-VHD -ErrorAction SilentlyContinue
$useDiskpart = $false

if ($hasHyperV) {
    # Use Optimize-VHD (recommended method)
    Write-Host "Step 2: Compressing virtual disk using Optimize-VHD..." -ForegroundColor Cyan
    Write-Host "This may take 10-30 minutes, please wait..." -ForegroundColor Yellow
    Write-Host ""
    
    try {
        Optimize-VHD -Path $vhdxPath -Mode Full
        Write-Host "[OK] Compression completed!" -ForegroundColor Green
    }
    catch {
        Write-Host "Error: Optimize-VHD compression failed: $_" -ForegroundColor Red
        Write-Host "Trying diskpart method..." -ForegroundColor Yellow
        $useDiskpart = $true
    }
}
else {
    $useDiskpart = $true
}

# Use diskpart method (alternative)
if ($useDiskpart) {
    Write-Host "Step 2: Compressing virtual disk using diskpart..." -ForegroundColor Cyan
    Write-Host "This may take 10-30 minutes, please wait..." -ForegroundColor Yellow
    Write-Host ""
    
    $diskpartScript = "select vdisk file=`"$vhdxPath`"`nattach vdisk readonly`ncompact vdisk`ndetach vdisk"
    
    try {
        $diskpartScript | diskpart
        Write-Host "[OK] Compression completed!" -ForegroundColor Green
    }
    catch {
        Write-Host "Error: diskpart compression failed: $_" -ForegroundColor Red
        pause
        exit 1
    }
}

# Check file size after compression
Write-Host ""
Write-Host "Step 3: Checking compression results..." -ForegroundColor Cyan
Start-Sleep -Seconds 2
$fileInfoAfter = Get-ItemProperty $vhdxPath
$newSizeGB = [math]::Round($fileInfoAfter.Length / 1GB, 2)
$savedGB = [math]::Round($currentSizeGB - $newSizeGB, 2)

Write-Host ""
Write-Host "=== Compression Results ===" -ForegroundColor Green
Write-Host "Size before: $currentSizeGB GB" -ForegroundColor White
Write-Host "Size after: $newSizeGB GB" -ForegroundColor White
Write-Host "Space saved: $savedGB GB" -ForegroundColor Green
Write-Host ""

Write-Host "[OK] Compression operation completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Start Docker Desktop" -ForegroundColor White
Write-Host "2. In project directory, run: docker-compose up -d" -ForegroundColor White
Write-Host "3. All services and data will be restored normally" -ForegroundColor White
Write-Host ""
pause
