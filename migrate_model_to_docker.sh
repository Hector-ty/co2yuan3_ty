#!/bin/bash

# 模型迁移脚本 - 将本地 deepseek-r1:8b 模型迁移到 Docker 容器
# 使用方法: ./migrate_model_to_docker.sh

set -e

echo "=========================================="
echo "Ollama 模型迁移脚本"
echo "=========================================="

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ 错误: Docker 未运行，请先启动 Docker"
    exit 1
fi

# 检查容器是否存在
CONTAINER_NAME=$(docker-compose ps -q ollama 2>/dev/null || echo "")

if [ -z "$CONTAINER_NAME" ]; then
    echo "📦 启动 Ollama 容器..."
    docker-compose up -d ollama
    sleep 5
    CONTAINER_NAME=$(docker-compose ps -q ollama)
fi

echo "✅ Ollama 容器已运行: $CONTAINER_NAME"

# 检测操作系统
if [[ "$OSTYPE" == "linux-gnu"* ]] || [[ "$OSTYPE" == "darwin"* ]]; then
    # Linux/Mac
    LOCAL_MODEL_PATH="$HOME/.ollama/models"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows (Git Bash)
    LOCAL_MODEL_PATH="$USERPROFILE/.ollama/models"
    LOCAL_MODEL_PATH=$(cygpath -u "$LOCAL_MODEL_PATH" 2>/dev/null || echo "$LOCAL_MODEL_PATH")
else
    echo "⚠️  无法自动检测操作系统，请手动指定模型路径"
    read -p "请输入本地模型路径 (例如: ~/.ollama/models): " LOCAL_MODEL_PATH
    LOCAL_MODEL_PATH=$(eval echo "$LOCAL_MODEL_PATH")
fi

echo "🔍 检查本地模型路径: $LOCAL_MODEL_PATH"

# 检查本地模型是否存在
if [ ! -d "$LOCAL_MODEL_PATH" ]; then
    echo "⚠️  本地模型目录不存在: $LOCAL_MODEL_PATH"
    echo "💡 将使用方案二：在容器中直接拉取模型"
    read -p "是否继续？(y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    
    echo "📥 在容器中拉取 deepseek-r1:8b 模型..."
    docker-compose exec ollama ollama pull deepseek-r1:8b
    echo "✅ 模型拉取完成！"
    exit 0
fi

# 检查模型文件
MODEL_MANIFEST_PATH="$LOCAL_MODEL_PATH/manifests/registry.ollama.ai/library/deepseek-r1"
if [ ! -f "$MODEL_MANIFEST_PATH/8b" ]; then
    echo "⚠️  未找到 deepseek-r1:8b 模型文件"
    echo "💡 将使用方案二：在容器中直接拉取模型"
    read -p "是否继续？(y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    
    echo "📥 在容器中拉取 deepseek-r1:8b 模型..."
    docker-compose exec ollama ollama pull deepseek-r1:8b
    echo "✅ 模型拉取完成！"
    exit 0
fi

echo "✅ 找到本地模型文件"

# 复制模型到容器
echo "📦 开始复制模型到容器..."

# 创建目标目录
docker exec $CONTAINER_NAME mkdir -p /root/.ollama/models/manifests/registry.ollama.ai/library/deepseek-r1

# 复制 manifest
echo "  复制 manifest 文件..."
docker cp "$MODEL_MANIFEST_PATH/8b" $CONTAINER_NAME:/root/.ollama/models/manifests/registry.ollama.ai/library/deepseek-r1/ 2>/dev/null || {
    echo "⚠️  manifest 复制失败，尝试其他方法..."
}

# 复制 blobs 目录
if [ -d "$LOCAL_MODEL_PATH/blobs" ]; then
    echo "  复制 blobs 目录（这可能需要一些时间）..."
    docker cp "$LOCAL_MODEL_PATH/blobs" $CONTAINER_NAME:/root/.ollama/models/ 2>/dev/null || {
        echo "⚠️  blobs 复制失败，模型可能需要重新下载部分文件"
    }
fi

echo "✅ 模型文件复制完成"

# 验证模型
echo "🔍 验证模型..."
sleep 2
docker-compose exec ollama ollama list

# 测试模型
echo ""
read -p "是否测试模型？(y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧪 测试模型响应..."
    docker-compose exec ollama ollama run deepseek-r1:8b "你好" || {
        echo "⚠️  模型测试失败，可能需要重新拉取模型"
        echo "💡 运行: docker-compose exec ollama ollama pull deepseek-r1:8b"
    }
fi

echo ""
echo "=========================================="
echo "✅ 模型迁移完成！"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 启动所有服务: docker-compose up -d"
echo "2. 检查服务状态: docker-compose ps"
echo "3. 查看日志: docker-compose logs ollama"
echo ""

