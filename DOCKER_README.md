# 使用 Docker 运行本项目

本文档将指导您如何使用 Docker 和 Docker Compose 来构建和运行整个应用。

## 1. 先决条件

请确保您的系统已安装以下软件：
- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/) (通常随 Docker Desktop 一起安装)

## 2. 环境变量配置

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

## 3. 构建和启动服务

在项目的根目录下（与 `docker-compose.yml` 文件同级），打开终端并运行以下命令：

```bash
docker-compose up --build
```

- `docker-compose up`: 此命令会创建并启动 `docker-compose.yml` 中定义的所有服务。
- `--build`: 此标志会强制 Docker 在启动容器之前重新构建镜像。首次运行时或修改了 `Dockerfile` 或源代码后，建议使用此标志。

命令执行后，您会看到三个服务的日志输出。

## 4. 访问服务

服务成功启动后，您可以通过以下地址访问它们：

- **前端应用**: [http://localhost](http://localhost) (或 `http://localhost:80`)
- **后端 API**: [http://localhost:8080](http://localhost:8080)
- **AI 服务**: [http://localhost:8000](http://localhost:8000)

## 5. 停止服务

要停止所有正在运行的容器，请在同一终端窗口中按 `Ctrl + C`。

或者，您可以打开一个新的终端，在项目根目录下运行以下命令：

```bash
docker-compose down
```

此命令会停止并移除由 `docker-compose up` 创建的容器和网络。
