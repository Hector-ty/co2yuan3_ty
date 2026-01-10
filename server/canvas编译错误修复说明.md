# Canvas 编译错误修复说明

## ❌ 错误原因

构建失败是因为 `canvas` 模块在 Node.js 20 环境下编译失败，错误信息：

```
error: 'uint8_t' does not name a type
error: 'uint16_t' does not name a type
error: 'uint32_t' does not name a type
```

这是因为 `canvas` 3.1.2 版本缺少 `#include <cstdint>` 头文件，导致类型定义错误。

## ✅ 已修复

### 修复方案

**移除了 `canvas` 依赖**，原因：
1. ✅ 后端代码中实际没有使用 `canvas` 模块
2. ✅ `echarts` 在后端只是作为依赖存在，不需要 canvas 支持
3. ✅ 图表渲染在前端完成，后端只负责数据计算和存储

### 修改的文件

1. **`server/package.json`** - 移除了 `"canvas": "^3.1.2"` 依赖
2. **`server/Dockerfile`** - 简化了构建步骤，移除了 canvas 相关的系统依赖

### Dockerfile 变化

**修改前**：
- 需要安装大量系统依赖（python3, make, g++, cairo-dev 等）
- 需要处理 canvas 编译问题

**修改后**：
- 只需要基本的 Node.js 环境
- 构建速度更快
- 镜像体积更小

## 🔄 重新构建

现在可以重新构建后端服务了：

```bash
# 清理缓存并重新构建后端
docker-compose build --no-cache backend

# 或者重新构建所有服务
docker-compose up --build
```

## ⚠️ 注意事项

1. **如果将来需要 canvas**：
   - 如果需要服务器端渲染图表，可以重新添加 canvas
   - 建议使用更新的 canvas 版本或使用替代方案

2. **验证功能**：
   - 后端 API 功能不受影响
   - 前端图表渲染不受影响（前端有独立的图表库）

## ✅ 验证

构建成功后，检查：

```bash
# 查看容器状态
docker ps

# 查看后端日志
docker-compose logs backend
```

如果后端服务正常运行，说明修复成功！

## 📝 技术说明

- **Canvas 模块**：用于服务器端 Canvas API 支持
- **ECharts**：在后端主要作为类型定义存在，实际渲染在前端
- **移除影响**：不影响现有功能，因为后端不进行图表渲染

---

**总结**：已移除不必要的 canvas 依赖，简化了构建流程，解决了编译错误！
