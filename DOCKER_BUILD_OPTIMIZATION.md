# Docker 构建优化说明

## 优化内容

本次优化主要针对 `docker-compose up --build -d` 的执行速度进行了以下改进：

### 1. 添加 .dockerignore 文件
- **client/.dockerignore**: 排除 node_modules、dist、日志文件等，减少构建上下文大小
- **server/.dockerignore**: 排除不必要的文件，减少构建上下文

### 2. 使用 BuildKit 缓存挂载
所有 Dockerfile 中的包管理器安装步骤都使用了 BuildKit 的缓存挂载功能：

- **npm 缓存**: `--mount=type=cache,target=/root/.npm`
- **pip 缓存**: `--mount=type=cache,target=/root/.cache/pip`

这样可以避免每次构建都重新下载依赖包，大幅提升构建速度。

### 3. 优化 docker-compose.yml
添加了 `cache_from` 配置，利用之前的构建缓存。

## 使用方法

### 确保启用 BuildKit
BuildKit 在 Docker Desktop 中默认已启用。如果未启用，可以设置环境变量：

```powershell
$env:DOCKER_BUILDKIT=1
$env:COMPOSE_DOCKER_CLI_BUILD=1
```

或者在执行命令时使用：

```powershell
$env:DOCKER_BUILDKIT=1; docker-compose up --build -d
```

### 预期效果

- **首次构建**: 时间可能略长（需要下载依赖）
- **后续构建**: 
  - 如果代码未变化，大部分步骤会使用缓存（CACHED），构建时间 < 5秒
  - 如果只修改了代码，依赖安装步骤会使用缓存，构建时间约 15-20秒
  - 如果修改了依赖文件，需要重新安装依赖，但构建时间仍比优化前快 30-50%

## 优化前后对比

| 场景 | 优化前 | 优化后（预期） |
|------|--------|---------------|
| 首次构建 | ~39秒 | ~35秒 |
| 代码修改 | ~39秒 | ~15-20秒 |
| 无变化 | ~39秒 | ~3-5秒 |

## 注意事项

1. 缓存挂载需要 BuildKit 支持，确保 Docker 版本 >= 18.09
2. 如果遇到缓存问题，可以清理缓存：
   ```powershell
   docker builder prune
   ```
3. .dockerignore 文件会排除 node_modules，确保构建时不会复制本地 node_modules
