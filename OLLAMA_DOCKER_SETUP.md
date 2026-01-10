# Ollama Docker 部署指南 - deepseek-r1:8b 模型

本文档说明如何将本地 deepseek-r1:8b 模型部署到 Docker 容器中，并启用 GPU 支持。

## 前置要求

### 1. 安装 NVIDIA Docker 支持

**Windows (WSL2):**
```bash
# 在 WSL2 中安装 NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

**Linux:**
```bash
# 安装 NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

**验证 GPU 支持:**
```bash
docker run --rm --gpus all nvidia/cuda:11.0.3-base-ubuntu20.04 nvidia-smi
```

### 2. 确保 Docker Compose 版本支持 GPU

Docker Compose v2 及以上版本支持 GPU 配置。检查版本：
```bash
docker compose version
```

## 模型迁移方案

### 方案一：从本地模型目录迁移（推荐）

如果您的模型已经下载在本地，可以将其复制到 Docker volume：

#### 步骤 1: 找到本地模型位置

**Windows:**
```
C:\Users\<用户名>\.ollama\models
```

**Linux/Mac:**
```
~/.ollama/models
```

#### 步骤 2: 启动 Ollama 容器（临时）

```bash
docker-compose up -d ollama
```

#### 步骤 3: 将本地模型复制到容器

**Windows (PowerShell):**
```powershell
# 找到本地模型文件
$localModelPath = "$env:USERPROFILE\.ollama\models"

# 复制模型到容器
docker cp "$localModelPath\manifests\registry.ollama.ai\library\deepseek-r1\8b" co2yuan3-main-ollama-1:/root/.ollama/models/manifests/registry.ollama.ai/library/deepseek-r1/
docker cp "$localModelPath\blobs" co2yuan3-main-ollama-1:/root/.ollama/models/
```

**Linux/Mac:**
```bash
# 找到本地模型文件
LOCAL_MODEL_PATH="$HOME/.ollama/models"

# 复制模型到容器
docker cp "$LOCAL_MODEL_PATH/manifests/registry.ollama.ai/library/deepseek-r1/8b" co2yuan3-main-ollama-1:/root/.ollama/models/manifests/registry.ollama.ai/library/deepseek-r1/
docker cp "$LOCAL_MODEL_PATH/blobs" co2yuan3-main-ollama-1:/root/.ollama/models/
```

#### 步骤 4: 验证模型

```bash
docker-compose exec ollama ollama list
```

### 方案二：在容器中直接拉取模型（简单但需要重新下载）

如果网络条件良好，可以直接在容器中拉取模型：

```bash
# 启动 ollama 服务
docker-compose up -d ollama

# 等待服务启动（约10秒）
sleep 10

# 拉取模型（会自动使用 GPU 加速）
docker-compose exec ollama ollama pull deepseek-r1:8b

# 验证模型
docker-compose exec ollama ollama list
```

## 启动完整服务

### 1. 启动所有服务

```bash
docker-compose up -d --build
```

### 2. 检查服务状态

```bash
# 查看所有服务状态
docker-compose ps

# 检查 Ollama 服务日志
docker-compose logs ollama

# 检查 GPU 使用情况
docker-compose exec ollama nvidia-smi
```

### 3. 验证模型可用性

```bash
# 在容器中测试模型
docker-compose exec ollama ollama run deepseek-r1:8b "你好"
```

## 常见问题

### 1. GPU 不可用

**问题:** `Error: could not select device driver "" with capabilities: [[gpu]]`

**解决方案:**
- 确保已安装 NVIDIA Container Toolkit
- 重启 Docker 服务: `sudo systemctl restart docker`
- 检查 NVIDIA 驱动: `nvidia-smi`

### 2. 模型未找到

**问题:** 容器中找不到 deepseek-r1:8b 模型

**解决方案:**
```bash
# 进入容器检查
docker-compose exec ollama ollama list

# 如果模型不存在，重新拉取
docker-compose exec ollama ollama pull deepseek-r1:8b
```

### 3. 模型加载慢

**问题:** 首次加载模型很慢

**解决方案:**
- 这是正常现象，模型需要从磁盘加载到 GPU 内存
- 后续请求会更快，因为模型已缓存在 GPU 内存中

### 4. 内存不足

**问题:** GPU 内存或系统内存不足

**解决方案:**
- deepseek-r1:8b 需要约 8GB GPU 显存
- 如果显存不足，考虑使用量化版本或更小的模型
- 检查系统内存: `free -h`

## 性能优化

### 1. 使用量化模型（如果显存不足）

```bash
# 拉取量化版本（如果可用）
docker-compose exec ollama ollama pull deepseek-r1:8b-q4_0
```

### 2. 调整并发请求数

在 `docker-compose.yml` 中可以为 ollama 服务设置资源限制：

```yaml
ollama:
  deploy:
    resources:
      limits:
        memory: 16G
      reservations:
        devices:
          - driver: nvidia
            count: all
            capabilities: [gpu]
```

## 监控和维护

### 查看 GPU 使用情况

```bash
# 在容器中查看
docker-compose exec ollama nvidia-smi

# 或使用 watch 实时监控
watch -n 1 docker-compose exec ollama nvidia-smi
```

### 查看模型大小

```bash
docker-compose exec ollama du -sh /root/.ollama/models
```

### 备份模型数据

```bash
# 备份 volume
docker run --rm -v co2yuan3-main_ollama_data:/data -v $(pwd):/backup ubuntu tar czf /backup/ollama_backup.tar.gz /data
```

### 恢复模型数据

```bash
# 恢复 volume
docker run --rm -v co2yuan3-main_ollama_data:/data -v $(pwd):/backup ubuntu tar xzf /backup/ollama_backup.tar.gz -C /
```

## 更新配置

如果修改了模型名称或配置，需要更新以下文件：

1. `docker-compose.yml` - 环境变量 `OLLAMA_MODEL`
2. `ai_service/app/main.py` - 模型名称
3. `server/services/ollamaService.js` - 模型名称（如果硬编码）

重启服务：
```bash
docker-compose restart backend ai_service
```

