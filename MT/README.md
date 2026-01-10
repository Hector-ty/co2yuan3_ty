# 移动端碳排放分析应用

这是公共机构碳排放核算系统的移动端适配版本，包含所有图表功能，并针对移动设备进行了优化。

## 🎉 新功能：PWA 支持 - 可下载安装为 App！

现在这个应用是一个 **PWA（渐进式 Web 应用）**，可以像原生 App 一样安装到手机上！

### ✨ PWA 特性

- ✅ **可安装**：添加到手机主屏幕，像原生 App 一样使用
- ✅ **离线访问**：支持 Service Worker 缓存，可离线使用
- ✅ **全屏体验**：无浏览器地址栏，沉浸式体验
- ✅ **自动更新**：有新版本时自动提示更新

### 📱 快速安装

1. 启动应用：`docker-compose up -d mobile`
2. 获取电脑 IP：`ipconfig | findstr IPv4` (Windows)
3. 在手机上访问：`http://[你的IP]:81`
4. 按照提示安装到主屏幕

**详细安装说明请查看：**
- [快速安装App指南.md](./快速安装App指南.md)
- [如何下载安装App.md](./如何下载安装App.md)

---

## 功能特性

- 📊 包含所有现有图表组件
- 📱 完全移动端适配和响应式设计
- 🎨 优化的触摸交互
- ⚡ 性能优化，流畅的滚动体验
- 🔄 实时数据同步
- 📲 **PWA 支持，可下载安装**

## 包含的图表

1. **排放源占比** (DonutChart)
2. **近5年排放源结构变化** (StackedAreaChart)
3. **单位建筑面积/人均碳排放** (DualAxisChart)
4. **碳排放总量年均变化率** (LineChart)
5. **年度排放量构成** (StackedBarChart)
6. **排放地图** (EmissionMapChart)
7. **排放构成饼图** (EmissionPieChart)
8. **排放强度柱状图** (IntensityBarChart)
9. **年度排放量柱状图** (YearlyEmissionBarChart)
10. **年均变化率折线图** (AnnualChangeLineChart)

## 安装和运行

```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 技术栈

- React 18
- ECharts (图表库)
- Material-UI (UI组件库)
- React Router (路由)
- Axios (HTTP客户端)
- Vite (构建工具)

## 项目结构

```
MT/
├── src/
│   ├── components/          # 组件目录
│   │   ├── charts/         # 图表组件
│   │   └── common/         # 通用组件
│   ├── pages/              # 页面组件
│   ├── hooks/              # 自定义Hooks
│   ├── utils/              # 工具函数
│   ├── App.jsx            # 主应用组件
│   └── main.jsx           # 入口文件
├── public/                 # 静态资源
├── package.json           # 依赖配置
└── vite.config.js        # Vite配置
```

## API接口

应用使用与主应用相同的后端API：
- `/api/carbon-data` - 获取碳排放数据
- `/api/regions` - 获取地区数据
- `/api/reports/compare` - 获取对比数据

## 移动端优化

- 响应式布局，适配各种屏幕尺寸
- 触摸友好的交互设计
- 优化的图表显示，适合小屏幕查看
- 流畅的滚动和动画效果
- 减少数据加载，提升性能

## 开发说明

确保后端服务运行在 `http://localhost:3000`，或者修改 `vite.config.js` 中的代理配置。
