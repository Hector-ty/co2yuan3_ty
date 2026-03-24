# Docker 空间清理脚本
# 用于清理 Docker 的闲置资源，释放 C 盘空间

Write-Host "=== Docker 空间清理工具 ===" -ForegroundColor Cyan
Write-Host ""

# 检查 Docker 是否运行
$dockerRunning = docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "错误: Docker 未运行或无法连接" -ForegroundColor Red
    Write-Host "请先启动 Docker Desktop" -ForegroundColor Yellow
    pause
    exit 1
}

# 显示当前 Docker 磁盘使用情况
Write-Host "正在检查 Docker 磁盘使用情况..." -ForegroundColor Green
Write-Host ""
docker system df

Write-Host ""
Write-Host "=== 清理选项 ===" -ForegroundColor Cyan
Write-Host "1. 清理未使用的容器、网络、镜像（安全，推荐）"
Write-Host "2. 清理所有未使用的资源，包括未使用的镜像（更彻底）"
Write-Host "3. 清理构建缓存（BuildKit cache）"
Write-Host "4. 清理所有未使用的卷（注意：会删除未使用的数据卷）"
Write-Host "5. 全面清理（包含以上所有，最彻底）"
Write-Host "6. 仅查看磁盘使用情况，不清理"
Write-Host "7. 压缩 WSL 虚拟磁盘（需要关闭 Docker Desktop）"
Write-Host ""

$choice = Read-Host "请选择操作 (1-7)"

switch ($choice) {
    "1" {
        Write-Host "`n正在清理未使用的容器、网络、镜像..." -ForegroundColor Yellow
        docker system prune -f
        Write-Host "`n清理完成！" -ForegroundColor Green
    }
    
    "2" {
        Write-Host "`n正在清理所有未使用的资源（包括未使用的镜像）..." -ForegroundColor Yellow
        Write-Host "警告: 这将删除所有未使用的镜像" -ForegroundColor Red
        $confirm = Read-Host "确认继续? (y/n)"
        if ($confirm -eq "y" -or $confirm -eq "Y") {
            docker system prune -a -f
            Write-Host "`n清理完成！" -ForegroundColor Green
        } else {
            Write-Host "操作已取消" -ForegroundColor Yellow
        }
    }
    
    "3" {
        Write-Host "`n正在清理构建缓存..." -ForegroundColor Yellow
        docker builder prune -a -f
        Write-Host "`n清理完成！" -ForegroundColor Green
    }
    
    "4" {
        Write-Host "`n正在清理未使用的卷..." -ForegroundColor Yellow
        Write-Host "警告: 这将删除所有未使用的数据卷" -ForegroundColor Red
        $confirm = Read-Host "确认继续? (y/n)"
        if ($confirm -eq "y" -or $confirm -eq "Y") {
            docker volume prune -f
            Write-Host "`n清理完成！" -ForegroundColor Green
        } else {
            Write-Host "操作已取消" -ForegroundColor Yellow
        }
    }
    
    "5" {
        Write-Host "`n正在进行全面清理..." -ForegroundColor Yellow
        Write-Host "警告: 这将删除所有未使用的资源，包括镜像、容器、卷、网络和构建缓存" -ForegroundColor Red
        $confirm = Read-Host "确认继续? (y/n)"
        if ($confirm -eq "y" -or $confirm -eq "Y") {
            Write-Host "`n步骤 1/3: 清理系统资源..." -ForegroundColor Cyan
            docker system prune -a -f
            Write-Host "步骤 2/3: 清理构建缓存..." -ForegroundColor Cyan
            docker builder prune -a -f
            Write-Host "步骤 3/3: 清理未使用的卷..." -ForegroundColor Cyan
            docker volume prune -f
            Write-Host "`n全面清理完成！" -ForegroundColor Green
        } else {
            Write-Host "操作已取消" -ForegroundColor Yellow
        }
    }
    
    "6" {
        Write-Host "`n当前 Docker 磁盘使用情况:" -ForegroundColor Cyan
        docker system df -v
    }
    
    "7" {
        Write-Host "`n=== WSL 虚拟磁盘压缩 ===" -ForegroundColor Cyan
        Write-Host "注意: 压缩虚拟磁盘需要关闭 Docker Desktop" -ForegroundColor Yellow
        Write-Host ""
        
        # 检查 Docker Desktop 是否运行
        $dockerProcess = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
        if ($dockerProcess) {
            Write-Host "检测到 Docker Desktop 正在运行" -ForegroundColor Red
            Write-Host "请先关闭 Docker Desktop:" -ForegroundColor Yellow
            Write-Host "1. 右键点击系统托盘中的 Docker 图标" -ForegroundColor White
            Write-Host "2. 选择 'Quit Docker Desktop'" -ForegroundColor White
            Write-Host "3. 等待 Docker 完全关闭" -ForegroundColor White
            Write-Host ""
            $continue = Read-Host "已关闭 Docker Desktop? (y/n)"
            if ($continue -ne "y" -and $continue -ne "Y") {
                Write-Host "操作已取消" -ForegroundColor Yellow
                pause
                exit 0
            }
        }
        
        # 检查管理员权限
        $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
        if (-not $isAdmin) {
            Write-Host "错误: 压缩虚拟磁盘需要管理员权限！" -ForegroundColor Red
            Write-Host "请右键点击 PowerShell 并选择 '以管理员身份运行'" -ForegroundColor Yellow
            pause
            exit 1
        }
        
        # 虚拟磁盘路径
        $vhdxPath = "$env:LOCALAPPDATA\Docker\wsl\disk\docker_data.vhdx"
        
        if (-not (Test-Path $vhdxPath)) {
            Write-Host "错误: 虚拟磁盘文件未找到: $vhdxPath" -ForegroundColor Red
            pause
            exit 1
        }
        
        # 显示当前大小
        $fileInfo = Get-ItemProperty $vhdxPath
        $currentSizeGB = [math]::Round($fileInfo.Length / 1GB, 2)
        Write-Host "当前虚拟磁盘大小: $currentSizeGB GB" -ForegroundColor Yellow
        Write-Host ""
        
        # 关闭 WSL
        Write-Host "正在关闭 WSL..." -ForegroundColor Cyan
        wsl --shutdown
        Start-Sleep -Seconds 3
        Write-Host "[OK] WSL 已关闭" -ForegroundColor Green
        Write-Host ""
        
        # 压缩虚拟磁盘
        Write-Host "正在压缩虚拟磁盘..." -ForegroundColor Cyan
        Write-Host "这可能需要 10-30 分钟，请耐心等待..." -ForegroundColor Yellow
        Write-Host ""
        
        $hasHyperV = Get-Command Optimize-VHD -ErrorAction SilentlyContinue
        $success = $false
        
        if ($hasHyperV) {
            try {
                Optimize-VHD -Path $vhdxPath -Mode Full
                $success = $true
            } catch {
                Write-Host "Optimize-VHD 失败，尝试使用 diskpart..." -ForegroundColor Yellow
            }
        }
        
        if (-not $success) {
            $diskpartScript = @"
select vdisk file="$vhdxPath"
attach vdisk readonly
compact vdisk
detach vdisk
"@
            try {
                $diskpartScript | diskpart
                $success = $true
            } catch {
                Write-Host "压缩失败: $_" -ForegroundColor Red
                pause
                exit 1
            }
        }
        
        if ($success) {
            # 显示压缩结果
            Start-Sleep -Seconds 2
            $fileInfoAfter = Get-ItemProperty $vhdxPath
            $newSizeGB = [math]::Round($fileInfoAfter.Length / 1GB, 2)
            $savedGB = [math]::Round($currentSizeGB - $newSizeGB, 2)
            
            Write-Host ""
            Write-Host "=== 压缩结果 ===" -ForegroundColor Green
            Write-Host "压缩前: $currentSizeGB GB" -ForegroundColor White
            Write-Host "压缩后: $newSizeGB GB" -ForegroundColor White
            Write-Host "释放空间: $savedGB GB" -ForegroundColor Green
            Write-Host ""
            Write-Host "[OK] 压缩完成！" -ForegroundColor Green
            Write-Host ""
            Write-Host "下一步:" -ForegroundColor Cyan
            Write-Host "1. 启动 Docker Desktop" -ForegroundColor White
            Write-Host "2. 在项目目录运行: docker-compose up -d" -ForegroundColor White
        }
    }
    
    default {
        Write-Host "无效选择" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "清理后的磁盘使用情况:" -ForegroundColor Cyan
docker system df

Write-Host ""
Write-Host "提示:" -ForegroundColor Cyan
Write-Host "- 定期运行选项 1 可以保持 Docker 环境整洁" -ForegroundColor Gray
Write-Host "- 如果 C 盘空间仍然不足，可以运行选项 7 压缩虚拟磁盘" -ForegroundColor Gray
Write-Host "- 压缩虚拟磁盘前请确保已关闭 Docker Desktop" -ForegroundColor Gray
Write-Host ""

pause
