# 移动端应用 Docker 部署指南

本文档说明如何使用 Docker 启动移动端碳排放分析应用。

## 前置要求

1. 已安装 Docker 和 Docker Compose
2. 已准备好地图数据文件 `region_150000.json`

## 快速启动

### 方式一：使用 Docker Compose（推荐）

移动端服务已集成到主项目的 `docker-compose.yml` 中。

1. **复制地图数据文件**（如果还没有）

```bash
# Windows PowerShell
Copy-Item "client\public\geo\region_150000.json" -Destination "MT\public\geo\"

# Linux/Mac
cp client/public/geo/region_150000.json MT/public/geo/
```

2. **在项目根目录启动所有服务**

```bash
docker-compose up --build
```

这将启动：
- 前端应用（端口 80）
- 移动端应用（端口 81）
- 后端服务（端口 8080）
- MongoDB 数据库（端口 27017）
- AI 服务（端口 8000）

3. **访问移动端应用**

打开浏览器访问：http://localhost:81

### 方式二：单独构建移动端服务

如果想单独构建和运行移动端服务：

1. **进入移动端目录**

```bash
cd MT
```

2. **构建 Docker 镜像**

```bash
docker build -t carbon-mobile .
```

3. **运行容器**

```bash
docker run -d \
  -p 81:81 \
  --name carbon-mobile \
  --network co2yuan3-main_default \
  carbon-mobile
```

注意：需要确保后端服务在同一个 Docker 网络中运行。

## 配置说明

### 端口配置

- 移动端应用默认端口：`81`
- 可以在 `docker-compose.yml` 中修改端口映射

### Nginx 配置

Nginx 配置文件位于 `MT/nginx.conf`，包含：
- API 代理配置（转发到后端服务）
- 静态资源缓存
- Gzip 压缩

### 环境变量

移动端应用通过 Nginx 代理访问后端 API，无需额外环境变量配置。

## 构建优化

Dockerfile 使用多阶段构建：
1. **构建阶段**：使用 Node.js 构建 React 应用
2. **运行阶段**：使用 Nginx 提供静态文件服务

这样可以减小最终镜像大小。

## 故障排除

### 问题1: 地图无法加载

**原因**：地图数据文件缺失

**解决**：
```bash
# 确保地图文件存在
ls MT/public/geo/region_150000.json

# 如果不存在，从 client 目录复制
Copy-Item "client\public\geo\region_150000.json" -Destination "MT\public\geo\"
```

### 问题2: API 请求失败

**原因**：后端服务未启动或网络配置问题

**解决**：
1. 检查后端服务是否运行：`docker ps | grep backend`
2. 检查网络连接：`docker network ls`
3. 查看日志：`docker-compose logs mobile`

### 问题3: 构建失败

**原因**：依赖安装失败

**解决**：
1. 检查网络连接
2. 查看构建日志：`docker-compose build mobile`
3. 尝试清理缓存：`docker-compose build --no-cache mobile`

## 生产部署建议

1. **使用环境变量**：可以通过环境变量配置 API 地址
2. **启用 HTTPS**：在生产环境中配置 SSL 证书
3. **资源优化**：启用 Nginx 缓存和压缩
4. **监控日志**：配置日志收集和监控

## 停止服务

```bash
# 停止所有服务
docker-compose down

# 只停止移动端服务
docker-compose stop mobile

# 停止并删除移动端容器
docker-compose rm -f mobile
```

## 更新应用

```bash
# 重新构建并启动
docker-compose up -d --build mobile

# 或者重建所有服务
docker-compose up -d --build
```
