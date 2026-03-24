# Docker 磁盘空间占用说明

## 为什么只修改几处代码，Docker 会占用大量磁盘空间？

### 主要原因分析

#### 1. **多阶段构建产生的中间层**
每个服务的 Dockerfile 都使用多阶段构建（multi-stage build），会产生多个中间镜像层：

- **前端 (frontend)**：
  - `node:20-alpine` 基础镜像 (~50MB)
  - 构建阶段：安装 node_modules (~200-500MB)
  - 构建阶段：编译后的 dist 文件
  - 运行阶段：`nginx:stable-alpine` 基础镜像 (~25MB)
  - **总计：约 300-600MB**

- **移动端 (mobile)**：
  - 与前端类似的结构
  - **总计：约 300-600MB**

- **后端 (backend)**：
  - `node:20-alpine` 基础镜像 (~50MB)
  - 构建阶段：安装 node_modules (~100-300MB)
  - 运行阶段：复制 node_modules 和应用代码
  - **总计：约 200-400MB**

- **AI 服务 (ai_service)**：
  - Python 基础镜像和相关依赖
  - **总计：约 200-500MB**

**小计：约 1-2GB（仅镜像）**

#### 2. **基础镜像占用**
- `node:20-alpine`: ~50MB × 4个服务 = 200MB
- `nginx:stable-alpine`: ~25MB
- `mongo:6.0`: ~200MB
- `ollama/ollama:latest`: ~500MB-2GB（取决于是否包含模型）
- Python 基础镜像: ~100-200MB

**小计：约 1-3GB**

#### 3. **构建缓存 (Build Cache)**
Docker 会保留构建缓存以加速后续构建：
- npm 缓存：`/root/.npm`（即使使用缓存挂载，也会在本地保留）
- 中间层缓存：每个 RUN 命令都会创建一层
- 未使用的构建层

**可能占用：500MB-2GB**

#### 4. **数据卷 (Volumes)**
- `mongodb_data`: 数据库数据（可能几GB）
- `ollama_data`: AI 模型数据（可能 5-20GB，取决于下载的模型）

**可能占用：5-25GB**

#### 5. **容器日志**
虽然配置了日志轮转，但累积的日志仍会占用空间：
- 每个容器最多保留 3-10 个日志文件
- 每个日志文件最大 10-100MB
- 6个服务 × 10个文件 × 100MB = 最多 6GB

**可能占用：1-6GB**

#### 6. **未清理的旧镜像和容器**
每次 `docker-compose up --build` 会：
- 创建新的镜像（旧镜像不会自动删除）
- 停止旧容器（但不会删除）
- 保留旧的构建层

**可能占用：几GB**

### 总占用估算

| 项目 | 最小占用 | 典型占用 | 最大占用 |
|------|---------|---------|---------|
| 镜像层 | 1GB | 2GB | 3GB |
| 基础镜像 | 1GB | 2GB | 3GB |
| 构建缓存 | 500MB | 1GB | 2GB |
| 数据卷 | 5GB | 10GB | 25GB |
| 容器日志 | 1GB | 3GB | 6GB |
| 旧资源 | 1GB | 2GB | 5GB |
| **总计** | **~10GB** | **~20GB** | **~44GB** |

## 清理方案

### 方案 1：清理未使用的资源（推荐）

```powershell
# 清理所有未使用的资源（镜像、容器、网络、构建缓存）
docker system prune -a --volumes

# 或者分步清理
# 1. 清理未使用的容器
docker container prune -f

# 2. 清理未使用的镜像
docker image prune -a -f

# 3. 清理未使用的卷（注意：会删除未使用的数据卷）
docker volume prune -f

# 4. 清理构建缓存
docker builder prune -a -f
```

### 方案 2：仅清理构建缓存（安全）

```powershell
# 清理所有构建缓存（不会删除镜像和容器）
docker builder prune -a -f
```

### 方案 3：清理特定服务的旧镜像

```powershell
# 查看所有镜像
docker images

# 删除特定镜像的旧版本（保留最新的）
docker images | grep "co2yuan3-main" | grep -v latest | awk '{print $3}' | xargs docker rmi
```

### 方案 4：清理容器日志（使用项目脚本）

```powershell
# 运行项目提供的清理脚本
.\clean-docker-logs.ps1
```

### 方案 5：完全重置（谨慎使用）

```powershell
# 停止所有容器
docker-compose down

# 删除所有容器、镜像、卷、网络
docker system prune -a --volumes -f

# 重新构建（会重新下载所有内容）
docker-compose up --build -d
```

## 优化建议

### 1. 使用 .dockerignore 优化构建上下文

确保 `.dockerignore` 文件正确配置，排除不必要的文件：
- `node_modules`（已在 .dockerignore 中）
- `.git`
- 文档文件
- 测试文件

### 2. 定期清理

建议每次构建前或每周执行一次清理：

```powershell
# 快速清理脚本
docker system prune -f
docker builder prune -f
```

### 3. 限制日志大小

已在 `docker-compose.yml` 中配置了日志轮转，但可以进一步优化：

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "5m"    # 减小单个日志文件大小
    max-file: "2"     # 减少保留的日志文件数量
```

### 4. 使用多阶段构建优化

当前 Dockerfile 已经使用了多阶段构建，这是最佳实践。

### 5. 考虑使用 Docker BuildKit

启用 BuildKit 可以更好地利用缓存：

```powershell
$env:DOCKER_BUILDKIT=1
docker-compose build
```

## 检查磁盘占用

### 查看 Docker 磁盘使用情况

```powershell
# 查看总体使用情况
docker system df

# 查看详细信息
docker system df -v

# 查看各个镜像大小
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

# 查看各个容器大小
docker ps -s
```

### 查看数据卷大小

```powershell
# 查看所有卷
docker volume ls

# 查看卷的详细信息（需要进入容器）
docker exec -it <container_name> du -sh /data/db
```

## 常见问题

### Q: 为什么每次构建都会下载 node_modules？

A: 如果 `package.json` 或 `package-lock.json` 发生变化，Docker 会重新执行 `npm install`。这是正常的。

### Q: 可以删除 ollama_data 卷吗？

A: 可以，但会删除已下载的 AI 模型，下次需要重新下载。

### Q: 可以删除 mongodb_data 卷吗？

A: **不建议**，除非您确定要删除所有数据库数据。

### Q: 如何只清理某个服务的镜像？

A: 
```powershell
# 停止并删除特定服务
docker-compose stop frontend
docker-compose rm frontend
docker rmi co2yuan3-main-frontend
```

## 快速清理脚本

创建一个 `clean-docker-space.ps1` 脚本（项目已存在）：

```powershell
# 清理未使用的 Docker 资源
Write-Host "开始清理 Docker 资源..." -ForegroundColor Green

# 显示当前使用情况
Write-Host "`n清理前的磁盘使用情况:" -ForegroundColor Cyan
docker system df

# 清理未使用的资源
Write-Host "`n清理未使用的容器、网络、镜像和构建缓存..." -ForegroundColor Yellow
docker system prune -a -f

# 清理构建缓存
Write-Host "`n清理构建缓存..." -ForegroundColor Yellow
docker builder prune -a -f

# 显示清理后的使用情况
Write-Host "`n清理后的磁盘使用情况:" -ForegroundColor Cyan
docker system df

Write-Host "`n清理完成！" -ForegroundColor Green
```

## 总结

1. **正常现象**：即使只修改几处代码，Docker 也会占用较多空间，因为需要构建完整的运行环境。

2. **主要占用**：
   - 数据卷（特别是 ollama 模型）：最大占用
   - 构建缓存和旧镜像：次要占用
   - 容器日志：较小占用

3. **建议操作**：
   - 定期运行 `docker system prune -a -f` 清理未使用的资源
   - 使用 `docker system df` 监控磁盘使用
   - 如果 ollama 模型很大且不需要，可以考虑删除 `ollama_data` 卷

4. **安全清理**：
   - `docker builder prune -a -f`：只清理构建缓存，最安全
   - `docker system prune -a -f`：清理未使用的所有资源，较安全
   - `docker system prune -a --volumes -f`：包括数据卷，**需谨慎**
