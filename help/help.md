# 项目统一帮助文档

本文件是项目的统一帮助文档，旨在提供全面的项目信息，包括项目概述、技术栈、核心功能、开发历程以及详细的模块说明，以帮助任何新加入的开发者快速上手。

---

## 1. 项目概述

本项目是一个全栈的碳排放数据监测与分析平台。用户可以通过该系统录入、管理和可视化分析不同地区的碳排放数据。系统前端采用 React 构建，后端采用 Node.js 和 Express 构建，是一个典型的 MERN 技术栈应用。

---

## 2. 核心功能

- **用户认证**: 提供登录页面以验证用户身份。
- **数据填报**:
  - 拥有一个结构化的多层级表单，用于提交不同地区和年份的碳排放活动数据。
  - 支持化石燃料、移动源、外购电力/热力等多种排放源的数据录入。
  - 在用户输入数据时，实时计算并显示单个条目产生的碳排放量。
- **数据看板**:
  - 以表格形式展示所有历史提交的数据，并支持按年份和行政区划进行搜索。
  - 提供将当前筛选的数据导出为 CSV 文件的功能。
  - **数据可视化**:
    - **内蒙古热力图**: 使用 ECharts，在内蒙古地图上以热力图的形式展示各市的人均碳排放强度。
    - **多维度图表分析**: 包含饼图（排放构成）、柱状图（排放强度、年度排放量）和折线图（年均变化率）等多种图表，用于深度分析选定的数据记录。
    - 支持同级别行政单位的数据对比分析。

---

## 3. 技术栈

- **前端**:
  
  - **框架**: React
  - **构建工具**: Vite
  - **UI 库**: Material-UI (MUI)
  - **表单库**: React Hook Form
  - **动画库**: Framer Motion
  - **图表库**: ECharts
  - **数据请求**: `axios`

- **后端**:
  
  - **环境**: Node.js
  - **框架**: Express.js
  - **数据库**: MongoDB
  - **ODM**: Mongoose

---

## 4. 开发历程与关键决策

项目经历了多次重要的技术迭代和重构，以达到当前的状态。

### 4.1. UI/UX 技术栈升级

为了提升应用的现代化水平和用户体验，我们进行了一系列前端技术栈的升级和重构。

- **UI 库迁移: Ant Design -> Material-UI (MUI)**: 统一了项目 UI 风格，并利用 MUI 的主题定制能力实现了**玻璃拟态 (Glassmorphism)** 的半透明视觉效果。
- **表单库迁移: Ant Design Form -> React Hook Form**: 提升了表单性能，简化了状态管理，并解决了由此引发的无限重渲染 bug。
- **动画库集成: Framer Motion**: 为页面切换和组件加载添加了流畅的动画效果。
- **视觉风格升级: 视频背景**: 引入了全屏视频背景，打造了沉浸式的视觉体验。

### 4.2. 地图可视化方案演进

实现内蒙古热力图是本次开发的核心挑战，过程一波三折，最终通过**确保 ECharts 在 DOM 元素和所有数据都准备好之后才进行初始化**的策略，成功在客户端稳定渲染了地图。

### 4.3. 功能增强与修复

- **数据看板**: 实现了历史数据搜索、图表显示逻辑优化等功能。
- **数据录入**: 细化了移动源的数据结构，并同步更新了排放因子和后端计算引擎。
- **稳定性**: 修复了包括数据提交失败 (400 Error)、组件用法警告、资源加载失败 (404 Error) 在内的多个 Bug。

### 4.4. 用户注册功能实现

为了方便新用户使用系统，我们添加了完整的用户注册功能。

- **前端实现**:
  - 在 `LoginPage.jsx` 中，我们添加了一个切换按钮，允许用户在登录和注册表单之间进行切换。
  - 注册表单包含邮箱、密码、单位名称和地区选择等字段。
  - 地区选择功能实现为级联选择，用户可以方便地选择市和其下的区县。
- **后端实现**:
  - 在 `Account.js` 模型中，我们添加了 `email` 字段，并将其设置为唯一。
  - 在 `auth.js` 控制器中，我们实现了 `register` 方法，用于处理用户注册请求。该方法会自动为新用户生成一个唯一的8位数字账号。
  - 在 `auth.js` 路由中，我们添加了 `/api/auth/register` 端点，用于接收注册请求。

### 4.5. 图表功能与布局综合修复

在一次集中的问题修复会话中，我们解决了一系列从前端布局到后端服务的复杂问题，显著提升了应用的稳定性和用户体验。

- **数据看板图表修复**:
  
  - **问题**: 点击数据看板中的记录后，关联的图表无法显示。
  - **修复**: 我们首先定位到 `DashboardPage.jsx`，发现虽然图表组件已被导入，但缺少根据 `selectedRecord` 状态来渲染图表的 JSX 代码。通过添加一个专门的“图表分析”区域，我们成功地在用户选择记录后动态渲染了图表。

- **全栈稳定性修复**:
  
  - **问题**: 应用出现 `favicon.ico` 404、API `401 Unauthorized` 和 `500 Internal Server Error` 等多重错误。
  - **诊断与修复**:
    1. 通过创建空的 `favicon.ico` 文件解决了 `404` 问题。
    2. `401` 错误最终被定位为服务器因 `.env` 文件未更新而使用了错误的 `JWT_SECRET`。通过终止僵尸 `node.exe` 进程并重启服务器，问题得以解决。
    3. `500` 错误是由于 `mongoose.connect` 中使用了在新版本中已被废弃的参数。通过移除这些参数，我们恢复了数据库连接的稳定性。

- **前端体验优化**:
  
  - **数据大屏布局调整**: 根据用户反馈，我们移除了数据大屏 (`DataScreenPage.jsx`) 中的排放地图，并重新调整了 `Grid` 布局，使剩余的数据卡片和图表尺寸更大，布局更合理。
  - **图表数据读取修复**: 解决了数据看板中所有图表（排放构成、排放强度、年度排放量、年均变化率）因 `props` 传递和内部数据结构不匹配而无法正确显示数据的问题。
  - **图表尺寸自适应**: 面对图表尺寸无法自适应容器的顽固问题，我们最终放弃了纯CSS方案，通过在 `DashboardPage.jsx` 中直接为图表容器 `Paper` 设置一个更大的固定高度 (`60vh`)，并调整 `Grid` 布局为每行两个图表，成功地使图表在视觉上显著变大，达到了预期的效果。

## 5. 模块详细说明

### 5.1. 目录结构概览

```
├── client/                # 前端代码 (React + Vite)
│   ├── public/            # 静态资源,直接复制到构建目录
│   ├── src/               # 前端源码
│   └── ...
├── server/                # 后端代码 (Node.js + Express)
│   ├── controllers/       # 控制器 (处理业务逻辑)
│   ├── models/            # 数据模型 (数据库 Schema)
│   ├── routes/            # 路由 (定义 API 端点)
│   └── ...
├── .env.example           # 环境变量示例文件
└── ...
```

*完整的树状结构请参考 `EngineeringDirectory.md`*

### 5.2. 前端 (`client/`)

- **`src/main.jsx`**: **应用入口文件**。负责配置全局 MUI 主题（包括半透明样式和暗色模式），并渲染根组件 `App.jsx`。
- **`src/App.jsx`**: **根组件**。负责处理登录状态切换、集成视频背景组件，并使用 Framer Motion 管理页面过渡动画。
- **`src/components/`**: **可复用UI组件目录**。
  - `DataEntryForm.jsx`: 使用 React Hook Form 和 MUI 构建的复杂数据录入表单。
  - `VideoBackground.jsx`: 实现全屏视频背景的组件。
  - `charts/`: 存放所有 ECharts 图表组件。
- **`src/pages/`**: **页面级组件目录**。
  - `DashboardPage.jsx`: 应用的核心页面，集成了数据显示表格、搜索、图表分析等众多功能。
  - `LoginPage.jsx`: 用户登录页面。

### 5.3. 后端 (`server/`)

- **`index.js`**: **服务启动入口**。
- **`routes/`**: **路由层**。定义 API 端点。
- **`controllers/`**: **控制器层**。处理业务逻辑，例如，`carbonData.js` 现在支持层级式的行政区划代码查询。
- **`models/`**: **数据模型层**。定义 Mongoose 数据模型，例如，`CarbonData.js` 已更新以支持更复杂的移动源数据结构。
- **`middleware/`**: **中间件层**。例如，`auth.js` 用于处理用户身份验证。
- **`utils/`**: **工具函数目录**。
  - `calculationEngine.js`: **核心计算引擎**。封装了碳排放计算算法，已更新以支持新的移动源计算逻辑。

---

# 项目解耦成就

根据 `qu1.md` 中的解耦计划，已成功对 `client/src/pages` 目录下的核心组件进行了重构和解耦。

## 1. `DashboardPage.jsx` 解耦详情：

* **大脑 Hook `useCarbonData.js`**：
  
  * 将 `DashboardPage.jsx` 中所有关于 `submittedData`, `allSubmittedData`, `loadingData`, `error`, `success` 的 `useState` 状态剪切过去。
  * 将 `refetchAllData`, `handleSearch`, `handleDelete`, `handleSaveEdit`, `handleFormSubmit`, `handleExport` 等核心业务逻辑函数剪切过去。
  * 所有 `axios` 请求（增删改查）都已搬到此 Hook 中。
  * Hook `return` 出所有状态和方法，供外部组件使用。

* **地区专家 `useRegions.js`**：
  
  * 将获取 `regions` 的 `useState` 和 `useEffect` 逻辑从 `DashboardPage.jsx` 和 `LoginPage.jsx` 中抽离，形成可复用的 Hook。
  * `return { regions, loading, error }`。

* **UI 部落拆分：**
  
  * **`SearchBar.jsx`**：新建组件，包含 `HistoricalDataTable` 里的搜索框（`TextField`, `Select`, `Button`）的 JSX 和相关状态（`searchYear`, `searchRegion`）。通过 props 回调 (`onSearch`) 通知父组件执行搜索。
  * **`HistoricalDataTable.jsx`**：负责渲染 `TableContainer`。从 props 接收 `data`，并管理表格的交互状态，如 `expandedRowKeys` 和 `editingRowKey`。
  * **`TableRowDetail.jsx`**：表格展开后看到的详情（包括分类排放和编辑按钮）已抽成此组件，接收 `record` 作为 props。
  * **`ChartAnalysis.jsx`**：将整个“图表分析”的 `MotionBox` 剪切过来。接收 `selectedRecord` 和 `allData` 作为 props，自己内部管理对比模式 (`compareMode`) 和对比数据 (`comparisonData`) 的状态和逻辑。
  * **`DataEntryTab.jsx`**：一个简单的包装组件，负责渲染第一个 Tab 里的 `DataEntryForm`。

* **重组指挥官 `DashboardPage.jsx`**：
  
  * 删除了所有被移走的状态和函数。
  * 在组件顶部调用 `const { ... } = useCarbonData();` 和 `const { regions } = useRegions();`。
  * 仅管理页面级状态：`activeTab` 和 `selectedRecord`。
  * `return` 的 JSX 变得非常清晰，根据 `activeTab` 决定渲染 `DataEntryTab` 或 `HistoricalDataTable` + `ChartAnalysis` 的组合，并通过 `props` 传递数据和回调函数。

## 2. `DataScreenPage.jsx` 解耦详情：

* **数据专家 `useDataScreen.js`**：
  
  * 将 `DataScreenPage.jsx` 里的所有 `useState` 和整个 `useEffect` 都剪切过去。
  * Hook 内部完成了 `axios` 请求、数据排序、计算、转换格式等所有数据处理逻辑。
  * 最后 `return { data, loading, error }`，其中 `data` 是一个包含了所有处理好的图表数据的对象。

* **UI 部落拆分：**
  
  * **`StatCardsGrid.jsx`**：新建组件，包含了顶部的四个 `DataCard` 的 `Grid` 容器和 `Grid item`。接收 `cardData` 作为 props。
  * **`ChartsGrid.jsx`**：新建组件，包含了下面所有图表的 `Grid` 容器和 `Grid item`。接收所有图表数据作为 props。

* **重组画廊馆长 `DataScreenPage.jsx`**：
  
  * 调用 `useDataScreen()` 获取数据。
  * 处理 `loading` 和 `error` 状态。
  * 清爽地渲染 `<StatCardsGrid data={data.cardData} />` 和 `<ChartsGrid charts={data} />`。

## 3. `LoginPage.jsx` 解耦详情：

* **`LoginForm.jsx`**：
  
  * 将 `LoginPage.jsx` 中登录相关的状态 (`account`, `password`)、`handleSubmit` 函数和登录表单的 JSX 剪切过来。
  * 接收 `onLogin` 和 `onSwitchToRegister` 作为 props。

* **`RegistrationForm.jsx`**：
  
  * 将注册相关的状态 (`email`, `password`, `unitName`, `region`, `open`)、`handleRegister` 函数和注册表单的 JSX 剪切过来。
  * **`RegionSelector.jsx`**：地区选择 `<Select>` 逻辑已抽成此组件，接收 `value` 和 `onChange`，内部管理地区的展开/折叠。
  * `RegistrationForm` 调用 `useRegions()` 来获取地区数据。
  * 接收 `onRegister` 和 `onSwitchToLogin` 作为 props。

* **重组调度员 `LoginPage.jsx`**：
  
  * 只保留一个核心状态：`const [isLogin, setIsLogin] = useState(true);`。
  * 在 `return` 中，根据 `isLogin` 的值，来决定渲染 `<LoginForm />` 还是 `<RegistrationForm />`，并把对应的回调函数传给它们。

通过以上解耦，项目的结构得到了显著优化，组件职责更加单一，代码逻辑更加清晰，为未来的开发和维护奠定了良好的基础。

### 4.6. Docker 部署与服务稳定性修复

在 Docker Compose 部署过程中，我们遇到了一系列服务启动和通信问题，并通过以下步骤逐一解决，显著提升了整个应用在容器化环境中的稳定性和可用性。

- **后端服务 (backend) 模块引用错误**
  - **问题**: `backend-1` 容器启动时报告 `Error: Cannot find module '../../client/src/components/formFields'`。这是因为后端代码错误地引用了前端组件文件。
  - **修复**:
    1. 将 `client/src/components/formFields.js` 的内容复制到 `server/utils/formFields.js`。
    2. 更新 `server/controllers/reports.js` 中的导入路径为 `../utils/formFields`。
    3. 将 `server/utils/formFields.js` 中的 ES 模块导出 (`export const`) 更改为 CommonJS 导出 (`module.exports`)，以兼容 Node.js 环境。

- **AI 服务 (ai_service) Ollama 连接错误**
  - **问题**: `ai_service-1` 容器无法连接到 Ollama 服务，最初尝试的 `host.docker.internal` 方案失败，且 `ollama/ollama` 镜像拉取超时。
  - **修复**:
    1. 从 `docker-compose.yml` 中移除了 `ollama` 服务定义，因为用户已在宿主机安装 Ollama。
    2. 为 `ai_service` 服务添加了 `extra_hosts: - "host.docker.internal:host-gateway"` 配置，确保容器能够正确解析宿主机地址。
    3. 修改 `ai_service/app/main.py`，将 Ollama 的 `base_url` 设置为 `http://host.docker.internal:11434`。
    4. 指导用户在宿主机上设置 `OLLAMA_HOST=0.0.0.0` 环境变量并拉取 `qwen2:1.5b` 模型。

- **后端服务 (backend) MongoDB 连接错误**
  - **问题**: `backend-1` 容器启动时报告 `MongooseError: The \`uri\` parameter to \`openUri()\` must be a string, got "undefined".`，表明 `MONGODB_URI` 环境变量未正确加载。
  - **修复**:
    1. 从 `server/index.js` 中移除了 `require('dotenv').config({ path: '../.env' });`，因为 Docker Compose 负责注入环境变量。
    2. 在 `docker-compose.yml` 中添加了一个 `mongodb` 服务，使用 `docker.m.daocloud.io/library/mongo:6.0` 镜像（根据用户手动拉取情况调整）。
    3. 更新 `backend` 服务的 `MONGODB_URI` 环境变量为 `mongodb://mongodb:27017/carbon_platform`，并添加 `depends_on: - mongodb`。

- **`docker-compose.yml` 结构错误**
  - **问题**: `ai_service` 服务定义被错误地放置在 `volumes` 块内，导致 Docker Compose 验证失败。
  - **修复**: 将 `ai_service` 服务定义从 `volumes` 块中移回 `services` 块的正确位置。

- **前端服务 (frontend) 404 Not Found 错误**
  - **问题**: Nginx 无法找到前端路由对应的文件（如 `/login`），导致 404 错误。这是单页应用 (SPA) 在 Nginx 配置中常见的问题。
  - **修复**:
    1. 在 `client` 目录下创建了自定义 `nginx.conf` 文件，配置 Nginx 将所有未找到的请求重定向到 `index.html`。
    2. 修改 `client/Dockerfile`，将 `nginx.conf` 复制到 Nginx 容器的 `/etc/nginx/conf.d/default.conf`，替换默认配置。
    3. 在 `client/nginx.conf` 中添加了 `/api/` 路径的代理配置，将所有 `/api` 请求转发到 `http://backend:8080`。

- **后端服务 (backend) 401 Unauthorized 错误**
  - **问题**: 尝试使用 `root@root.com` 登录时，即使密码正确，也持续收到 `401 (Unauthorized)` 错误和 `Root password mismatch.` 消息。
  - **修复**:
    1. 修改 `server/controllers/auth.js`，在 `root@root.com` 登录逻辑的开头，强制删除 MongoDB 中现有的 `root@root.com` 用户记录。这确保了每次启动时都会重新创建具有正确密码哈希的 root 用户。
    2. 改进了 root 用户的密码匹配逻辑，直接使用 `bcrypt.compare(password, rootUser.password)` 进行比较。

- **AI 知识库功能完善**
  - **问题**: AI 助手聊天窗口无法正确显示，且后端 AI 服务调用路径不匹配。
  - **修复**:
    1. 确认前端 `client/src/components/AiChat.jsx` 组件的 API 调用路径 (`/api/ai/chat`) 与后端 `server/routes/ai.js` 中定义的路由匹配。
    2. 修改 `server/controllers/ai.js`，确保 `AI_SERVICE_BASE_URL` 正确拼接 `/query` 端点，以调用 `ai_service` 容器的 `/query` 接口。
    3. 修复 `client/src/components/AiChat.jsx` 的渲染逻辑，添加了聊天历史和输入框的 JSX 代码，并定义了所有缺失的样式变量 (`chatMessagesStyle`, `userMessageStyle`, `aiMessageStyle`, `chatInputContainerStyle`, `chatInputStyle`, `chatSendButtonStyle`)。
