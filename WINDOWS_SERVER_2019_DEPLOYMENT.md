# co2yuan3 在 Windows Server 2019 部署指南（校园网私网）

本文面向 Windows Server 2019，目标是让系统在校园网私网可访问并可长期稳定运行。

## 1. 部署前决策（强烈建议先确认）

- 推荐使用 Docker 部署（本项目已提供 `docker-compose.yml`）。
- 如果你的服务器是纯命令行环境，建议使用 `Docker Engine + Compose`（不依赖桌面界面）。
- 如果你的服务器允许桌面环境，也可使用 Docker Desktop，但在 Server 场景下通常不如 Engine 方案稳定。
- 若要启用 `ollama` 的 GPU 推理，需提前确认 NVIDIA 驱动、容器运行时与 Docker 的 GPU 支持已打通。

## 2. 服务器基础准备

以管理员身份打开 PowerShell：

```powershell
# 查看系统版本
winver

# 建议开启时间同步
w32tm /resync
```

建议配置固定内网 IP（由校园网网管分配），并记录：

- 服务器内网 IP（例如 `10.x.x.x`）
- 访问域名（可选，例如 `carbon.school.local`）

## 3. 安装 Docker 与 Compose

> 下面给出通用 PowerShell 安装流程。若你们学校有统一镜像源/软件仓库，请优先按校内规范安装。

```powershell
# 安装 DockerMsftProvider
Install-Module -Name DockerMsftProvider -Repository PSGallery -Force

# 安装 Docker Engine
Install-Package -Name docker -ProviderName DockerMsftProvider -Force

# 启动并设置开机自启
Start-Service docker
Set-Service -Name docker -StartupType Automatic

# 查看版本
docker version
```

安装 Docker Compose（若未自带）：

```powershell
docker compose version
```

如果提示不存在，请按 Docker 官方方式安装 Compose 插件（或改用独立 `docker-compose.exe`）。

## 4. 拉取项目并准备目录

```powershell
# 示例：部署目录
mkdir E:\deploy -ErrorAction SilentlyContinue
cd E:\deploy

# 拉取代码（替换为你的仓库地址）
git clone <你的仓库地址> co2yuan3-main
cd .\co2yuan3-main
```

建议把业务数据放在独立磁盘，并定期备份（特别是 MongoDB 与 uploads）。

## 5. 环境变量与配置修改

### 5.1 先配置后端密钥

编辑 `docker-compose.yml` 中 `backend.environment`，至少确认：

- `JWT_SECRET` 改为强随机字符串
- `MONGODB_URI` 保持容器内访问（当前默认 `mongodb://mongodb:27017/carbon_platform` 可用）
- `DEBUG_REPORT_XML` 生产环境建议留空

### 5.2 生产建议新增 `.env`

在项目根目录新建 `.env`，示例：

```env
DEBUG_REPORT_XML=
```

### 5.3 若没有 GPU，禁用 ollama 的 GPU 预留

当前 `docker-compose.yml` 中 `ollama` 使用了 `deploy.resources.reservations.devices`。  
如果服务器无 NVIDIA GPU，请删除或注释该段，避免启动异常。

## 6. 校园网私网访问配置

## 6.1 防火墙放行必要端口

以管理员 PowerShell 执行（按需调整）：

```powershell
# 前端主站
New-NetFirewallRule -DisplayName "co2yuan-frontend-80" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 80

# 移动端页面（如果需要）
New-NetFirewallRule -DisplayName "co2yuan-mobile-81" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 81

# 后端 API（建议仅内网白名单访问）
New-NetFirewallRule -DisplayName "co2yuan-api-8080" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8080
```

> 不建议对校园网开放 `27017`（MongoDB）与 `11434`（Ollama）等内部端口。

## 6.2 校园网访问方式

- 直接通过内网 IP 访问：`http://<服务器内网IP>/`
- 若有内网 DNS，配置 A 记录后可用：`http://carbon.school.local/`
- 建议由校园网网关或 Nginx 统一做反向代理，仅暴露 80/443

## 7. 启动服务

在项目根目录执行：

```powershell
# 首次部署或更新代码后
docker compose up -d --build

# 查看运行状态
docker compose ps

# 查看关键日志
docker compose logs -f backend
docker compose logs -f frontend
```

## 8. 部署后验收清单

在服务器本机检查：

```powershell
curl http://localhost/
curl http://localhost:8080
```

在校园网其他机器检查：

- 打开 `http://<服务器内网IP>/` 可访问前端页面
- 登录、录入、报表导出等核心功能可用
- 若 AI 功能启用：确认 `ollama` 与 `ai_service` 正常响应

## 9. 运维与更新

## 9.1 常用命令

```powershell
# 停止服务
docker compose down

# 更新后重建
git pull
docker compose up -d --build

# 查看资源占用
docker stats
docker system df
```

## 9.2 数据备份（最少）

- `mongodb_data` 卷：业务数据
- `backend_uploads` 卷：上传文件/教学视频

可通过以下方式查看卷：

```powershell
docker volume ls
```

建议每周做一次离线备份，并保留至少 2-4 周历史版本。

## 10. 安全建议（上线前必做）

- 修改默认密钥（`JWT_SECRET`）
- 限制 `8080/8000/11434/27017` 仅本机或白名单访问
- 优先只对外暴露 `80/443`
- 若在校园网跨网段访问，和网管确认 ACL、VLAN、出口策略
- 建议接入 HTTPS（内网 CA 或学校统一证书）

## 11. 常见问题排查

- 容器启动失败：`docker compose logs <service>` 查看报错
- 镜像拉取慢：配置镜像加速（可参考 `DOCKER_README.md`）
- 端口不通：检查防火墙规则、校园网 ACL、是否监听正确端口
- AI 不可用：先检查 `ollama` 容器状态与模型是否已拉取

---

如果你愿意，我可以下一步继续帮你生成一份“**Windows Server 2019 一键部署脚本**”（含防火墙、拉起、健康检查），你只需要改几个变量即可执行。
