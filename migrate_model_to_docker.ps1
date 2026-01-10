# 模型迁移脚本 - 将本地 deepseek-r1:8b 模型迁移到 Docker 容器 (PowerShell)
# 使用方法: .\migrate_model_to_docker.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Ollama 模型迁移脚本" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 检查 Docker 是否运行
try {
    docker info | Out-Null
} catch {
    Write-Host "❌ 错误: Docker 未运行，请先启动 Docker" -ForegroundColor Red
    exit 1
}

# 检查容器是否存在
$containerName = docker-compose ps -q ollama 2>$null

if (-not $containerName) {
    Write-Host "📦 启动 Ollama 容器..." -ForegroundColor Yellow
    docker-compose up -d ollama
    Start-Sleep -Seconds 5
    $containerName = docker-compose ps -q ollama
}

Write-Host "✅ Ollama 容器已运行: $containerName" -ForegroundColor Green

# Windows 本地模型路径
$localModelPath = "$env:USERPROFILE\.ollama\models"

Write-Host "🔍 检查本地模型路径: $localModelPath" -ForegroundColor Yellow

# 检查本地模型是否存在
if (-not (Test-Path $localModelPath)) {
    Write-Host "⚠️  本地模型目录不存在: $localModelPath" -ForegroundColor Yellow
    Write-Host "💡 将使用方案二：在容器中直接拉取模型" -ForegroundColor Yellow
    $response = Read-Host "是否继续？(y/n)"
    if ($response -ne "y" -and $response -ne "Y") {
        exit 1
    }
    
    Write-Host "📥 在容器中拉取 deepseek-r1:8b 模型..." -ForegroundColor Yellow
    docker-compose exec ollama ollama pull deepseek-r1:8b
    Write-Host "✅ 模型拉取完成！" -ForegroundColor Green
    exit 0
}

# 检查模型文件
$modelManifestPath = Join-Path $localModelPath "manifests\registry.ollama.ai\library\deepseek-r1\8b"
if (-not (Test-Path $modelManifestPath)) {
    Write-Host "⚠️  未找到 deepseek-r1:8b 模型文件" -ForegroundColor Yellow
    Write-Host "💡 将使用方案二：在容器中直接拉取模型" -ForegroundColor Yellow
    $response = Read-Host "是否继续？(y/n)"
    if ($response -ne "y" -and $response -ne "Y") {
        exit 1
    }
    
    Write-Host "📥 在容器中拉取 deepseek-r1:8b 模型..." -ForegroundColor Yellow
    docker-compose exec ollama ollama pull deepseek-r1:8b
    Write-Host "✅ 模型拉取完成！" -ForegroundColor Green
    exit 0
}

Write-Host "✅ 找到本地模型文件" -ForegroundColor Green

# 复制模型到容器
Write-Host "📦 开始复制模型到容器..." -ForegroundColor Yellow

# 创建目标目录
docker exec $containerName mkdir -p /root/.ollama/models/manifests/registry.ollama.ai/library/deepseek-r1

# 复制 manifest
Write-Host "  复制 manifest 文件..." -ForegroundColor Yellow
$manifestSource = Join-Path $localModelPath "manifests\registry.ollama.ai\library\deepseek-r1\8b"
docker cp "${manifestSource}" "${containerName}:/root/.ollama/models/manifests/registry.ollama.ai/library/deepseek-r1/" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  manifest 复制失败，尝试其他方法..." -ForegroundColor Yellow
}

# 复制 blobs 目录
$blobsPath = Join-Path $localModelPath "blobs"
if (Test-Path $blobsPath) {
    Write-Host "  复制 blobs 目录（这可能需要一些时间）..." -ForegroundColor Yellow
    docker cp "${blobsPath}" "${containerName}:/root/.ollama/models/" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  blobs 复制失败，模型可能需要重新下载部分文件" -ForegroundColor Yellow
    }
}

Write-Host "✅ 模型文件复制完成" -ForegroundColor Green

# 验证模型
Write-Host "🔍 验证模型..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
docker-compose exec ollama ollama list

# 测试模型
Write-Host ""
$response = Read-Host "是否测试模型？(y/n)"
if ($response -eq "y" -or $response -eq "Y") {
    Write-Host "🧪 测试模型响应..." -ForegroundColor Yellow
    docker-compose exec ollama ollama run deepseek-r1:8b "你好"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  模型测试失败，可能需要重新拉取模型" -ForegroundColor Yellow
        Write-Host "💡 运行: docker-compose exec ollama ollama pull deepseek-r1:8b" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ 模型迁移完成！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步：" -ForegroundColor Yellow
Write-Host "1. 启动所有服务: docker-compose up -d"
Write-Host "2. 检查服务状态: docker-compose ps"
Write-Host "3. 查看日志: docker-compose logs ollama"
Write-Host ""

