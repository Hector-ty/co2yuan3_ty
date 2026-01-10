#!/bin/bash

# 移动端 Docker 启动脚本 (Linux/Mac)

echo "================================"
echo "  移动端应用 Docker 启动脚本"
echo "================================"
echo ""

# 检查 Docker 是否安装
echo "1. 检查 Docker 环境..."
if command -v docker &> /dev/null; then
    echo "   ✓ Docker 已安装"
else
    echo "   ✗ Docker 未安装，请先安装 Docker"
    exit 1
fi

# 检查地图数据文件
echo "2. 检查地图数据文件..."
MAP_FILE="public/geo/region_150000.json"
SOURCE_MAP_FILE="../client/public/geo/region_150000.json"

if [ -f "$MAP_FILE" ]; then
    echo "   ✓ 地图文件已存在"
elif [ -f "$SOURCE_MAP_FILE" ]; then
    echo "   正在复制地图文件..."
    mkdir -p public/geo
    cp "$SOURCE_MAP_FILE" "$MAP_FILE"
    echo "   ✓ 地图文件已复制"
else
    echo "   ⚠ 警告: 地图文件不存在，地图功能可能无法使用"
    echo "   请手动复制: client/public/geo/region_150000.json -> MT/public/geo/"
fi

# 切换到项目根目录
echo "3. 切换到项目根目录..."
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"
echo "   当前目录: $ROOT_DIR"

# 启动 Docker 服务
echo ""
echo "4. 启动 Docker 服务..."
echo "   这将启动所有服务（前端、移动端、后端、数据库等）"
echo ""

read -p "是否继续？(Y/N) " response
if [ "$response" != "Y" ] && [ "$response" != "y" ]; then
    echo "已取消"
    exit 0
fi

echo ""
echo "正在启动服务，请稍候..."
echo ""

# 启动服务
docker-compose up --build

echo ""
echo "================================"
echo "服务已启动！"
echo ""
echo "访问地址:"
echo "  移动端应用: http://localhost:81"
echo "  前端应用:   http://localhost:80"
echo "  后端API:    http://localhost:8080"
echo ""
echo "按 Ctrl+C 停止服务"
echo "================================"
