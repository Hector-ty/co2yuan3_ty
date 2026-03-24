#!/bin/bash
# Docker 日志清理脚本
# 用于清理 Docker 容器的日志文件，释放磁盘空间

echo "开始检查 Docker 日志占用情况..."

# 检查日志目录大小
if [ -d "/var/lib/docker/containers" ]; then
    LOG_SIZE=$(du -sh /var/lib/docker/containers 2>/dev/null | cut -f1)
    echo "Docker 日志目录大小: $LOG_SIZE"
fi

# 显示各个容器的日志大小
echo ""
echo "各个容器的日志大小:"
docker ps --format "{{.Names}}" | while read container; do
    if [ ! -z "$container" ]; then
        LOG_SIZE=$(docker inspect --format='{{.LogPath}}' $container 2>/dev/null)
        if [ ! -z "$LOG_SIZE" ]; then
            if [ -f "$LOG_SIZE" ]; then
                SIZE=$(du -h "$LOG_SIZE" 2>/dev/null | cut -f1)
                echo "  - $container: $SIZE"
            fi
        fi
    fi
done

echo ""
echo "清理选项:"
echo "1. 清理所有已停止容器的日志"
echo "2. 清理所有容器的日志（会丢失当前日志）"
echo "3. 仅查看日志大小，不清理"
echo "4. 清理未使用的 Docker 资源（包括日志）"

read -p "请选择操作 (1-4): " choice

case $choice in
    1)
        echo ""
        echo "清理已停止容器的日志..."
        docker ps -a --filter "status=exited" -q | xargs -r docker rm
        echo "已清理已停止的容器"
        ;;
    2)
        echo ""
        echo "警告: 这将清理所有容器的日志文件！"
        read -p "确认继续? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            echo "清理所有容器日志..."
            docker ps -q | while read container; do
                LOG_PATH=$(docker inspect --format='{{.LogPath}}' $container 2>/dev/null)
                if [ ! -z "$LOG_PATH" ] && [ -f "$LOG_PATH" ]; then
                    > "$LOG_PATH"
                    echo "已清理: $container"
                fi
            done
            echo ""
            echo "日志清理完成"
        fi
        ;;
    3)
        echo ""
        echo "当前运行的容器:"
        docker ps --format "table {{.Names}}\t{{.ID}}"
        ;;
    4)
        echo ""
        echo "清理未使用的 Docker 资源..."
        docker system prune -a --volumes -f
        echo ""
        echo "清理完成！"
        ;;
    *)
        echo "无效选择"
        ;;
esac

echo ""
echo "提示: 建议在 docker-compose.yml 中配置日志轮转来防止日志文件过大"
