# 修复排放因子脚本
# 使用方法：在 PowerShell 中运行 .\fix-emission-factors.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "排放因子初始化脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查后端服务是否运行
Write-Host "检查后端服务..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-WebRequest -Uri "http://localhost:5000/api/regions" -Method GET -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✓ 后端服务正在运行" -ForegroundColor Green
} catch {
    Write-Host "✗ 后端服务未运行或无法访问" -ForegroundColor Red
    Write-Host "请先启动后端服务：cd server && npm run dev" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "正在登录..." -ForegroundColor Yellow
$loginBody = @{
    email = "root@root.com"
    password = "root1234"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -ErrorAction Stop
    
    $token = $loginResponse.token
    Write-Host "✓ 登录成功！" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "正在初始化排放因子..." -ForegroundColor Yellow
    $headers = @{
        Authorization = "Bearer $token"
    }
    
    $initResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/emission-factors/initialize" `
        -Method POST `
        -Headers $headers `
        -ErrorAction Stop
    
    Write-Host "✓ 排放因子初始化成功！" -ForegroundColor Green
    Write-Host ""
    Write-Host "响应信息：" -ForegroundColor Cyan
    Write-Host ($initResponse | ConvertTo-Json -Depth 3) -ForegroundColor White
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "现在可以尝试提交数据了！" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    
} catch {
    Write-Host ""
    Write-Host "✗ 错误：" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "请检查：" -ForegroundColor Yellow
    Write-Host "1. 后端服务是否正在运行" -ForegroundColor Yellow
    Write-Host "2. MongoDB 是否正在运行" -ForegroundColor Yellow
    Write-Host "3. 网络连接是否正常" -ForegroundColor Yellow
}


