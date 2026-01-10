# RAGFlow 与 Ollama 连接配置检查报告

## ✅ 检查结果

### 1. Ollama 容器状态
- **容器名称**: `co2yuan3-main-ollama-1`
- **状态**: ✅ 运行中 (Up 2 hours)
- **端口映射**: `0.0.0.0:11434->11434/tcp`
- **网络**: `co2yuan3-main_default`
- **IP 地址**: `172.18.0.3`

### 2. RAGFlow 容器状态
- **容器名称**: `docker-ragflow-cpu-1`
- **状态**: ✅ 运行中
- **端口映射**: `8082->80/tcp, 9380->9380/tcp`
- **网络**: `docker_ragflow`
- **IP 地址**: `172.19.0.6`
- **特殊配置**: ✅ 已配置 `host.docker.internal:host-gateway`

### 3. 网络连接测试
- **连接方式**: RAGFlow → Ollama (通过 `host.docker.internal`)
- **测试结果**: ✅ **连接成功**
- **测试命令**: `curl http://host.docker.internal:11434/api/tags`
- **返回结果**: 成功获取模型列表

### 4. 可用模型
- ✅ `deepseek-r1:8b` (5.2 GB) - **已安装**
- ✅ `gpt-oss:120b-cloud` (384 bytes) - 云模型

## 📋 在 RAGFlow 中添加 Ollama 模型的配置

### 步骤 1: 登录 RAGFlow
访问: `http://localhost:8082`

### 步骤 2: 进入模型管理
1. 点击右上角用户头像
2. 选择 "系统设置" → "LLM 模型"
3. 点击 "添加模型" 或 "新建模型"

### 步骤 3: 填写配置信息

#### 基本信息
- **模型名称**: `deepseek-r1:8b`
- **模型类型**: `Chat` 或 `LLM`
- **LLM Factory**: 选择 `Ollama`

#### 连接配置（重要！）
- **Base URL**: `http://host.docker.internal:11434`
  - ⚠️ 必须使用 `host.docker.internal`，因为 RAGFlow 在 Docker 中
  - 不能使用 `localhost` 或 `127.0.0.1`
  - 不能使用 `http://ollama:11434`（不在同一网络）

- **API Key**: 留空（Ollama 不需要 API Key）

#### 模型参数（可选）
- **Max Tokens**: `8192` 或更高
- **Temperature**: `0.7`
- **Top P**: `0.9`

### 步骤 4: 保存并测试
1. 点击 "保存"
2. 测试连接是否成功
3. 如果成功，模型会出现在可用模型列表中

## 🔍 网络架构说明

```
┌─────────────────────────────────────┐
│  宿主机 (Host)                       │
│  ┌───────────────────────────────┐  │
│  │ Docker Network:               │  │
│  │ co2yuan3-main_default         │  │
│  │  ┌──────────────────────┐    │  │
│  │  │ Ollama Container      │    │  │
│  │  │ IP: 172.18.0.3        │    │  │
│  │  │ Port: 11434           │    │  │
│  │  └──────────────────────┘    │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Docker Network:               │  │
│  │ docker_ragflow                │  │
│  │  ┌──────────────────────┐    │  │
│  │  │ RAGFlow Container    │    │  │
│  │  │ IP: 172.19.0.6       │    │  │
│  │  │ 通过 host.docker.    │    │  │
│  │  │ internal 访问宿主机  │    │  │
│  │  └──────────────────────┘    │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## ⚠️ 重要提示

1. **网络隔离**: 
   - Ollama 和 RAGFlow 在不同的 Docker 网络中
   - 不能直接通过服务名 `ollama` 访问
   - 必须使用 `host.docker.internal` 访问宿主机上的服务

2. **端口映射**:
   - Ollama 的端口 `11434` 已映射到宿主机
   - RAGFlow 可以通过 `host.docker.internal:11434` 访问

3. **连接验证**:
   - 已测试连接成功 ✅
   - 可以正常获取模型列表 ✅
   - `deepseek-r1:8b` 模型可用 ✅

## 🔧 如果连接失败

### 检查清单
1. ✅ Ollama 容器是否运行: `docker ps | findstr ollama`
2. ✅ 端口是否正确: `11434`
3. ✅ RAGFlow 是否配置了 `extra_hosts`
4. ✅ Base URL 是否使用 `host.docker.internal`

### 故障排除
```bash
# 1. 检查 Ollama 是否可访问
docker exec docker-ragflow-cpu-1 curl http://host.docker.internal:11434/api/tags

# 2. 检查 Ollama 容器状态
docker ps | findstr ollama

# 3. 检查 RAGFlow 容器配置
docker inspect docker-ragflow-cpu-1 | findstr host.docker.internal

# 4. 测试模型是否可用
docker exec co2yuan3-main-ollama-1 ollama list
```

## 📝 配置总结

**在 RAGFlow Web 界面中添加模型时，使用以下配置：**

```
模型名称: deepseek-r1:8b
LLM Factory: Ollama
Base URL: http://host.docker.internal:11434
API Key: (留空)
```

**验证连接成功的标志：**
- 能够获取模型列表
- 能够看到 `deepseek-r1:8b` 模型
- 测试对话时能够正常响应

