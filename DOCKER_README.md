# 使用 Docker 运行本项目

本文档将指导您如何使用 Docker 和 Docker Compose 来构建和运行整个应用。

## 1. 先决条件

请确保您的系统已安装以下软件：
- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/) (通常随 Docker Desktop 一起安装)

## 2. 镜像加速与国内镜像源（推荐）

在国内或网络较慢环境下，建议配置 Docker 镜像加速与国内镜像源，以大幅缩短拉取基础镜像的时间。

### 2.1 本项目已使用的国内镜像

- **Dockerfile 基础镜像**：各服务的 Dockerfile 已统一使用 DaoCloud 镜像源（`docker.m.daocloud.io`）拉取 `node`、`nginx`、`python` 等基础镜像，构建时无需额外配置即可从国内源拉取。
- **docker-compose**：MongoDB 已使用 `docker.m.daocloud.io/library/mongo:6.0`。
- **npm/pip**：构建阶段已使用 npmmirror、清华 pip 等国内源安装依赖。

### 2.2 配置 Docker 守护进程镜像加速（可选）

若希望所有 `docker pull`（包括未在 Dockerfile 里写死镜像地址的拉取）都走国内加速，可配置 Docker 守护进程的 registry 镜像：

**Windows（Docker Desktop）：**

1. 打开 Docker Desktop → **Settings** → **Docker Engine**。
2. 在 JSON 配置中增加或合并 `registry-mirrors`，例如：

```json
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://docker.1ms.run"
  ],
  "insecure-registries": [],
  "debug": false
}
```

3. 点击 **Apply & restart**，等待 Docker 重启生效。

**Linux（如 WSL2 内的 Docker 或原生 Linux）：**

编辑 `/etc/docker/daemon.json`（若不存在则新建），内容示例：

```json
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://docker.1ms.run"
  ]
}
```

然后执行：

```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
```

**说明：**

- 以上为 DaoCloud、1ms 等国内镜像加速地址，可根据本地网络情况选用或替换为阿里云、腾讯云等提供的镜像加速地址。
- 配置后，拉取 Docker Hub 上的镜像会优先从镜像站获取，从而加快下载速度。

## 3. 环境变量配置

在启动服务之前，您需要配置后端服务所需的环境变量。

打开 `docker-compose.yml` 文件，找到 `backend` 服务的 `environment` 部分：

```yaml
  environment:
    # TODO: 将这里替换为您的实际 MongoDB 连接字符串
    - MONGODB_URI=mongodb://your_mongodb_host:27017/co2yuan
    - JWT_SECRET=your_jwt_secret_key # 建议替换为一个更安全的密钥
    - AI_SERVICE_URL=http://ai_service:8000
    - PORT=8080
```

**重要：**
- 将 `MONGODB_URI` 的值 `mongodb://your_mongodb_host:27017/co2yuan` 替换为您的真实 MongoDB 数据库连接地址。如果您的 MongoDB 也在 Docker 容器中运行，可以使用其服务名作为主机名。
- 为了安全，建议将 `JWT_SECRET` 的值 `your_jwt_secret_key` 替换为您自己的密钥。

## 4. 构建和启动服务

在项目的根目录下（与 `docker-compose.yml` 文件同级），打开终端并运行以下命令：

```bash
docker-compose up --build
```

- `docker-compose up`: 此命令会创建并启动 `docker-compose.yml` 中定义的所有服务。
- `--build`: 此标志会强制 Docker 在启动容器之前重新构建镜像。首次运行时或修改了 `Dockerfile` 或源代码后，建议使用此标志。

命令执行后，您会看到三个服务的日志输出。

## 5. 访问服务

服务成功启动后，您可以通过以下地址访问它们：

- **前端应用**: [http://localhost](http://localhost) (或 `http://localhost:80`)
- **后端 API**: [http://localhost:8080](http://localhost:8080)
- **AI 服务**: [http://localhost:8000](http://localhost:8000)

## 6. 停止服务

要停止所有正在运行的容器，请在同一终端窗口中按 `Ctrl + C`。

或者，您可以打开一个新的终端，在项目根目录下运行以下命令：

```bash
docker-compose down
```

此命令会停止并移除由 `docker-compose up` 创建的容器和网络。

## 7. 日志管理

### 7.1 日志自动轮转配置

为了防止 Docker 容器日志文件占用过多磁盘空间，本项目的 `docker-compose.yml` 已为所有服务配置了日志轮转：

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"    # 单个日志文件最大大小
    max-file: "3"      # 保留的日志文件数量
```

**当前配置说明：**
- **frontend/mobile**: 每个容器最多保留 3 个日志文件，每个文件最大 10MB（总共约 30MB）
- **backend/ai_service/mongodb**: 每个容器最多保留 5 个日志文件，每个文件最大 50MB（总共约 250MB）
- **ollama**: 最多保留 5 个日志文件，每个文件最大 100MB（总共约 500MB）

当日志文件达到最大大小时，Docker 会自动轮转，保留最新的日志文件。

### 7.2 查看日志占用情况

您可以随时检查容器的日志占用情况：

```bash
# 查看所有运行的容器
docker ps

# 查看特定容器的日志
docker logs <容器名>

# 查看日志文件大小（Linux/Mac）
du -sh /var/lib/docker/containers/*/

# Windows Docker Desktop 日志位置
# %USERPROFILE%\AppData\Local\Docker\log-driver\
```

### 7.3 清理日志

**方法 1: 使用清理脚本**

我们提供了日志清理脚本，您可以根据需要选择清理方式：

- **Windows PowerShell**: 运行 `.\clean-docker-logs.ps1`
- **Linux/Mac**: 运行 `bash clean-docker-logs.sh`

**方法 2: 手动清理**

```bash
# 清理所有已停止容器的日志
docker container prune

# 清理所有未使用的 Docker 资源（包括日志、镜像、网络等）
docker system prune -a --volumes

# 仅清理特定容器的日志（需要停止容器）
docker stop <容器名>
truncate -s 0 $(docker inspect --format='{{.LogPath}}' <容器名>)
docker start <容器名>
```

**方法 3: 清理所有日志文件（慎用）**

```bash
# 这会删除所有容器的日志文件
docker ps -q | xargs docker inspect --format='{{.LogPath}}' | xargs truncate -s 0
```

### 7.4 防止日志占用过多空间的建议

1. **使用日志轮转配置**（已在 docker-compose.yml 中配置）
2. **定期清理日志**：建议每周或每月运行一次清理脚本
3. **监控磁盘空间**：定期检查 Docker 占用的磁盘空间
   ```bash
   docker system df
   ```
4. **调整日志级别**：如果不需要详细的调试日志，可以在应用层面调整日志级别
