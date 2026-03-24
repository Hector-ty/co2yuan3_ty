## CO2 碳排放管理微信小程序

本目录说明如何在现有项目基础上运行微信小程序前端，实现与 Web 端共享同一套后端接口与账号体系。

### 1. 目录结构

- `miniapp/`
  - `app.js` / `app.json` / `app.wxss`：小程序入口与全局样式
  - `project.config.json`：微信开发者工具项目配置
  - `sitemap.json`：站点地图
  - `config/env.js`：后端 API 地址与前缀配置
  - `utils/`：请求封装与基础工具
  - `services/`：与后端接口对应的服务封装（认证、碳数据等）
  - `pages/`：功能页面
    - `login/`：登录页
    - `dashboard/`：数据概览页（基础 KPI + 最近记录）
    - `dataEntry/`：基础数据填报页（POST `/api/carbon-data`）
    - `reports/`：报表导出页（下载并打开 `/api/reports/excel`）
    - `video/`：教学视频页（播放后端静态视频 `/Video/*.mp4`）
    - `account/`：个人账号信息与退出登录

### 2. 后端接口与环境配置

1. 确认后端已经按照原有 Web 端要求启动（例如 `http://localhost:3000`），并暴露 `/api` 路径。
2. 打开 `miniapp/config/env.js`，根据实际后端地址修改：

```js
const ENV = {
  baseUrl: "http://localhost:3000", // 修改为你的后端地址
  apiPrefix: "/api"
};

module.exports = ENV;
```

3. 在微信小程序管理后台配置「request 合法域名」，填入 `baseUrl` 对应域名（如 `http://localhost:3000` 在真机需要使用可访问的域名/HTTPS）。

### 3. 在微信开发者工具中运行

1. 打开微信开发者工具，选择「导入项目」。
2. 选择本仓库根目录下的 `miniapp/` 作为项目目录。
3. 使用你的实际小程序 AppID 替换 `miniapp/project.config.json` 中的 `appid` 字段。
4. 导入后即可在工具中预览和调试：
   - 默认首页为 `pages/login/index`；
   - 登录成功后跳转到 `pages/dashboard/index`。

### 4. 已实现的主要功能

- **登录与会话**
  - 使用现有 `/api/auth/login` 接口，提交 `{ email, password }`。
  - 登录成功后，将 `user` 与 `token` 存入 `wx` 本地存储，并同步到 `App.globalData`。
  - 所有通过 `utils/request.js` 发起的接口请求自动附带 `Authorization: Bearer <token>`。
  - 接口返回 `401` 时自动清除会话并跳转登录页。

- **Dashboard 数据概览**
  - 调用 `/api/carbon-data` 获取最新一批数据。
  - 计算总排放、人均排放、单位面积排放等基础 KPI，并在 `dashboard` 页展示。
  - 展示最近若干条记录的简要列表。

- **数据填报**
  - 在 `dataEntry` 页可填写年份、行政区划代码，并以 JSON 文本形式提供 `activityData`，POST 至 `/api/carbon-data`。
  - 失败时给出错误提示，成功后清空输入并提示「数据提交成功」。

- **报表导出**
  - 在 `reports` 页点击按钮，通过 `wx.downloadFile` 调用 `/api/reports/excel`。
  - 下载成功后使用 `wx.openDocument` 打开 Excel 报告。

- **教学视频**
  - 在 `video` 页通过 `<video>` 组件播放静态视频：
    - 假设后端静态目录与 Web 端一致：`/Video/bj.mp4`、`/Video/图片转动图.mp4` 等。
  - 具体路径可根据实际部署修改 `pages/video/index.js` 中的 URL。

- **个人账号**
  - 在 `account` 页展示当前登录用户的邮箱、角色、单位名称等基础信息。
  - 支持退出登录（清除本地会话并跳转回登录页）。

### 5. 后续可扩展方向

- 使用 ECharts 小程序版或其他图表库，补齐 Dashboard 和数据大屏的丰富图表展示。
- 将 Web 端复杂的数据填报表单逐步迁移到小程序（按业务优先级拆分多步表单）。
- 为不同角色（管理员、机构用户等）定制小程序端入口和权限控制。

