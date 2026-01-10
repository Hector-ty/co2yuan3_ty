# 项目迁移计划：从自定义前端到 Ant Design Pro

本文档旨在规划将现有项目 (`client/`) 的核心功能迁移到新的 Ant Design Pro 模板 (`my-app/`) 的具体步骤。

**核心目标**: 迁移数据展示、分析和导出等**非数据输入**功能到新模板，以利用其成熟的架构和丰富的组件，同时保留原有的数据输入流程。

---

## 阶段一：环境准备与基础配置

1.  **初始化新项目**:
    *   确保 `my-app` 项目能正常运行 (`npm install` & `npm run start`)。
    *   清理 `my-app` 中不需要的示例页面和路由。可以从 `config/routes.ts` 开始，删除 `/dashboard`, `/form`, `/list`, `/profile`, `/result`, `/exception` 等示例路由。
    *   创建一个新的主页面路由，例如 `/data-dashboard`，作为迁移后功能的主要入口。

2.  **配置 API 代理**:
    *   在 `my-app/config/proxy.ts` 中，配置后端 API 的代理，使其指向您现有的后端服务地址（例如 `http://localhost:5000`）。这将允许新前端在开发环境中直接调用后端接口。

---

## 阶段二：用户认证迁移

1.  **创建用户页面**:
    *   利用 `my-app` 已有的 `/user/login` 页面 (`src/pages/user/login`)。
    *   根据需要，可以从旧项目 (`client/src/pages/LoginPage.jsx`) 中借鉴 UI 元素，或直接使用 Ant Design Pro 的登录表单。

2.  **对接登录/注册接口**:
    *   在 `my-app` 中创建新的 service 文件（例如 `src/services/api.ts`），用于调用后端的 `/api/auth/login` 和 `/api/auth/register` 接口。
    *   修改登录页面的逻辑，使其在用户提交表单后调用上述 service，并将获取到的 JWT token 存储起来。

3.  **实现全局用户状态**:
    *   利用 UmiJS 的 `initialState` 插件 (`src/app.tsx`)。
    *   在应用初始化时，检查本地是否存有 token，如果有，则向后端请求用户信息，并存入全局初始状态。
    *   这将为后续的权限控制和 API 请求提供用户信息。

4.  **配置请求拦截器**:
    *   在 `src/app.tsx` 的 `request` 配置中，添加请求拦截器，为每个发出的 API 请求自动附加 JWT token 到 `Authorization` header 中。

---

## 阶段三：核心功能迁移 (数据看板 & 数据大屏)

这是迁移的核心部分，建议创建一个新的页面（例如 `DataDashboardPage`）来承载这些功能。

1.  **数据获取逻辑迁移**:
    *   **重写 Hooks 为 Services**: 将旧项目中的 `useCarbonData.js` 和 `useDataScreen.js` 中的 `axios` 请求逻辑，迁移到 `my-app` 的 `services` 目录中。Ant Design Pro 提倡将所有 API 请求封装在 `services` 层。
    *   **利用 `useRequest`**: 在新的页面组件中，使用 UmiJS 提供的 `useRequest` Hook 来调用 `services` 中的函数，以获取数据。`useRequest` 提供了强大的功能，如自动管理 loading 和 error 状态、缓存、轮询等。

2.  **UI 组件迁移与重构**:
    *   **数据表格**: 使用 Ant Design Pro 的 `ProTable` 组件来替代 `HistoricalDataTable.jsx`。`ProTable` 功能强大，内置了搜索、分页、排序等功能，可以极大地简化代码。
    *   **搜索栏**: `ProTable` 自带查询表单，可以直接在其中配置年份和行政区选择器，替代 `SearchBar.jsx`。
    *   **图表组件**:
        *   将 `/client/src/components/charts/` 中的图表组件复制到 `my-app/src/components/charts/`。
        *   由于新模板使用 Ant Design Plots，您可能需要将 ECharts 的实现替换为 Ant Design Plots，或者继续在项目中使用 ECharts (需要手动安装 `echarts` 和 `echarts-for-react` 依赖)。建议逐步过渡到 Ant Design Plots 以保持技术栈统一。
    *   **导出功能**: 在 `ProTable` 的工具栏中添加一个导出按钮。按钮的点击事件将调用 `services` 中封装的导出请求 (`/api/reports/excel`)。

3.  **页面整合**:
    *   在新的 `DataDashboardPage` 中，组合 `ProTable` 和迁移后的图表组件，重现原有的数据看板和图表分析功能。
    *   可以利用 Ant Design 的 `Card`, `Grid`, `Tabs` 等布局组件来组织页面。

---

## 阶段四：保留数据输入功能 (可选方案)

根据您的要求，数据输入功能保留在原前端。这里有两种处理方式：

*   **方案 A: 保持独立**:
    *   用户需要在一个地址访问新的数据看板 (`my-app`)，在另一个地址访问旧的数据输入页面 (`client/`)。
    *   这是最简单的方案，但用户体验不统一。

*   **方案 B: 通过链接集成**:
    *   在 `my-app` 的侧边栏菜单中，添加一个“数据填报”的菜单项。
    *   该菜单项是一个外部链接，直接跳转到旧前端 (`client/`) 的数据填报页面。
    *   这样可以在新系统中提供一个入口，但仍然是两个独立的应用。

---

## 总结

通过以上步骤，您可以将项目的核心展示功能平稳地迁移到功能更强大、架构更成熟的 Ant Design Pro 模板上，同时保留了您希望保留的旧有模块。这将为项目的长期发展和维护奠定坚实的基础。
