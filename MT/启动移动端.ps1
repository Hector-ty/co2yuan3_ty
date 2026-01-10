# 移动端 Docker 启动脚本 (PowerShell)

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  移动端应用 Docker 启动脚本" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Docker 是否安装
Write-Host "1. 检查 Docker 环境..." -ForegroundColor Yellow
try {
    docker --version | Out-Null
    Write-Host "   ✓ Docker 已安装" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Docker 未安装，请先安装 Docker Desktop" -ForegroundColor Red
    exit 1
}

# 检查地图数据文件
Write-Host "2. 检查地图数据文件..." -ForegroundColor Yellow
$mapFile = "public\geo\region_150000.json"
$sourceMapFile = "..\client\public\geo\region_150000.json"

if (Test-Path $mapFile) {
    Write-Host "   ✓ 地图文件已存在" -ForegroundColor Green
} elseif (Test-Path $sourceMapFile) {
    Write-Host "   正在复制地图文件..." -ForegroundColor Yellow
    $geoDir = "public\geo"
    if (-not (Test-Path $geoDir)) {
        New-Item -ItemType Directory -Path $geoDir -Force | Out-Null
    }
    Copy-Item $sourceMapFile -Destination $mapFile -Force
    Write-Host "   ✓ 地图文件已复制" -ForegroundColor Green
} else {
    Write-Host "   ⚠ 警告: 地图文件不存在，地图功能可能无法使用" -ForegroundColor Yellow
    Write-Host "   请手动复制: client\public\geo\region_150000.json -> MT\public\geo\" -ForegroundColor Yellow
}

# 切换到项目根目录
Write-Host "3. 切换到项目根目录..." -ForegroundColor Yellow
$rootDir = Split-Path -Parent $PSScriptRoot
Set-Location $rootDir
Write-Host "   当前目录: $rootDir" -ForegroundColor Gray

# 启动 Docker 服务
Write-Host ""
Write-Host "4. 启动 Docker 服务..." -ForegroundColor Yellow
Write-Host "   这将启动所有服务（前端、移动端、后端、数据库等）" -ForegroundColor Gray
Write-Host ""

$response = Read-Host "是否继续？(Y/N)"
if ($response -ne 'Y' -and $response -ne 'y') {
    Write-Host "已取消" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "正在启动服务，请稍候..." -ForegroundColor Cyan
Write-Host ""

# 启动服务
docker-compose up --build

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "服务已启动！" -ForegroundColor Green
Write-Host ""
Write-Host "访问地址:" -ForegroundColor Cyan
Write-Host "  移动端应用: http://localhost:81" -ForegroundColor Yellow
Write-Host "  前端应用:   http://localhost:80" -ForegroundColor Yellow
Write-Host "  后端API:    http://localhost:8080" -ForegroundColor Yellow
Write-Host ""
Write-Host "按 Ctrl+C 停止服务" -ForegroundColor Gray
Write-Host "================================" -ForegroundColor Cyan
