# Docker 日志清理脚本
# 用于清理 Docker 容器的日志文件，释放磁盘空间

Write-Host "开始检查 Docker 日志占用情况..." -ForegroundColor Green

# 检查日志目录大小（Windows Docker Desktop）
$logPath = "$env:USERPROFILE\AppData\Local\Docker\log-driver\"
if (Test-Path $logPath) {
    $logSize = (Get-ChildItem -Path $logPath -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1GB
    Write-Host "Docker 日志目录大小: $([math]::Round($logSize, 2)) GB" -ForegroundColor Yellow
}

# 显示各个容器的日志大小
Write-Host "`n各个容器的日志大小:" -ForegroundColor Cyan
docker ps --format "{{.Names}}" | ForEach-Object {
    $containerName = $_
    try {
        $inspect = docker inspect --format='{{.LogPath}}' $containerName 2>&1
        if ($LASTEXITCODE -eq 0 -and $inspect) {
            Write-Host "  - $containerName" -ForegroundColor White
        }
    } catch {
        # 忽略错误
    }
}

Write-Host "`n清理选项:" -ForegroundColor Green
Write-Host "1. 清理所有已停止容器的日志"
Write-Host "2. 清理所有容器的日志（会丢失当前日志）"
Write-Host "3. 仅查看日志大小，不清理"
Write-Host "4. 清理未使用的 Docker 资源（包括日志）"

$choice = Read-Host "`n请选择操作 (1-4)"

if ($choice -eq "1") {
    Write-Host "`n清理已停止容器的日志..." -ForegroundColor Yellow
    $containers = docker ps -a --filter "status=exited" -q
    if ($containers) {
        $containers | ForEach-Object {
            docker rm $_ 2>&1 | Out-Null
        }
    }
    Write-Host "已清理已停止的容器" -ForegroundColor Green
}

if ($choice -eq "2") {
    Write-Host "`n警告: 这将清理所有容器的日志文件！" -ForegroundColor Red
    $confirm = Read-Host "确认继续? (yes/no)"
    if ($confirm -eq "yes") {
        Write-Host "清理所有容器日志..." -ForegroundColor Yellow
        docker ps -q | ForEach-Object {
            $logPath = docker inspect --format='{{.LogPath}}' $_
            if ($logPath -and (Test-Path $logPath)) {
                Remove-Item $logPath -Force -ErrorAction SilentlyContinue
                Write-Host "已清理: $_" -ForegroundColor Gray
            }
        }
        Write-Host "`n日志清理完成" -ForegroundColor Green
    }
}

if ($choice -eq "3") {
    Write-Host "`n当前运行的容器及其日志位置:" -ForegroundColor Cyan
    docker ps --format "table {{.Names}}\t{{.ID}}" | ForEach-Object {
        Write-Host $_ -ForegroundColor White
    }
}

if ($choice -eq "4") {
    Write-Host "`n清理未使用的 Docker 资源..." -ForegroundColor Yellow
    docker system prune -a --volumes -f
    Write-Host "`n清理完成！" -ForegroundColor Green
}

if (($choice -ne "1") -and ($choice -ne "2") -and ($choice -ne "3") -and ($choice -ne "4")) {
    Write-Host "无效选择" -ForegroundColor Red
}

Write-Host "`n提示: 建议在 docker-compose.yml 中配置日志轮转来防止日志文件过大" -ForegroundColor Cyan
