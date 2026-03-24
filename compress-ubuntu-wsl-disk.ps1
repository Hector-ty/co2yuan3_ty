# Ubuntu WSL Virtual Disk Compression Script
# Requires Administrator privileges
# This script compresses the Ubuntu WSL virtual disk to reclaim unused space

Write-Host "=== Ubuntu WSL Virtual Disk Compression Script ===" -ForegroundColor Cyan
Write-Host ""

# Check administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Error: Administrator privileges required!" -ForegroundColor Red
    Write-Host "Please right-click PowerShell and select 'Run as administrator'" -ForegroundColor Yellow
    pause
    exit 1
}

# Ubuntu WSL virtual disk file path
$vhdxPath = "$env:LOCALAPPDATA\wsl\{45326831-3a2e-4d66-ae4f-a94cbbea5cba}\ext4.vhdx"

# Check if file exists
if (-not (Test-Path $vhdxPath)) {
    Write-Host "Error: Ubuntu WSL virtual disk file not found: $vhdxPath" -ForegroundColor Red
    Write-Host "Please check if Ubuntu WSL is installed" -ForegroundColor Yellow
    pause
    exit 1
}

# Check current file size
$fileInfo = Get-ItemProperty $vhdxPath
$currentSizeGB = [math]::Round($fileInfo.Length / 1GB, 2)
Write-Host "Current Ubuntu WSL virtual disk file size: $currentSizeGB GB" -ForegroundColor Yellow
Write-Host "File path: $vhdxPath" -ForegroundColor Gray
Write-Host ""

# Check if Ubuntu WSL is running
Write-Host "Checking Ubuntu WSL status..." -ForegroundColor Cyan
$wslStatus = wsl -d Ubuntu -- echo "running" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Warning: Ubuntu WSL is running. It will be shut down." -ForegroundColor Yellow
    Write-Host ""
}

# Shutdown Ubuntu WSL (and all WSL distributions)
Write-Host "Step 1: Shutting down all WSL distributions..." -ForegroundColor Cyan
wsl --shutdown
Start-Sleep -Seconds 3
Write-Host "[OK] All WSL distributions have been shut down" -ForegroundColor Green
Write-Host ""

# Check if Hyper-V is installed (can use Optimize-VHD)
$hasHyperV = Get-Command Optimize-VHD -ErrorAction SilentlyContinue
$useDiskpart = $false

if ($hasHyperV) {
    # Use Optimize-VHD (recommended method)
    Write-Host "Step 2: Compressing Ubuntu WSL virtual disk using Optimize-VHD..." -ForegroundColor Cyan
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
    Write-Host "Step 2: Compressing Ubuntu WSL virtual disk using diskpart..." -ForegroundColor Cyan
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
Write-Host "Note: Your Docker project will not be affected by this compression." -ForegroundColor Cyan
Write-Host "You can now use Ubuntu WSL normally." -ForegroundColor White
Write-Host ""
pause
