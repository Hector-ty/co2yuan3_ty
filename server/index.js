require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const aiRoutes = require('./routes/ai');
const emissionFactorsRoutes = require('./routes/emissionFactors'); // 导入排放因子路由
const uploadRoutes = require('./routes/upload'); // 导入上传路由
const dataMappingRoutes = require('./routes/dataMapping'); // 导入数据映射路由
const ollamaService = require('./services/ollamaService'); // 导入 Ollama 服务

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/regions', require('./routes/regions'));
app.use('/api/carbon-data', require('./routes/carbonData'));
app.use('/api/mobile', require('./routes/mobile')); // 移动端公开API
app.use('/api/reports', require('./routes/reports'));
app.use('/api/ai', aiRoutes); // 添加 AI 路由
app.use('/api/emission-factors', emissionFactorsRoutes); // 添加排放因子路由
app.use('/api/upload', uploadRoutes); // 添加上传路由
app.use('/api/data-mapping', dataMappingRoutes); // 添加数据映射路由

// 全局错误处理中间件（必须在所有路由之后）
app.use((err, req, res, next) => {
  console.error('=== 全局错误处理 ===');
  console.error('错误类型:', err.name);
  console.error('错误信息:', err.message);
  console.error('错误堆栈:', err.stack);
  console.error('请求路径:', req.path);
  console.error('请求方法:', req.method);
  console.error('请求体:', JSON.stringify(req.body, null, 2));
  console.error('==================');
  
  // 根据错误类型返回适当的响应
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      success: false, 
      error: err.message 
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid data format' 
    });
  }
  
  // 默认返回 500 错误
  res.status(500).json({ 
    success: false, 
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    app.listen(PORT, async () => {
      console.log(`Server running on port ${PORT}`);
      
      // 自动连接 Ollama 服务
      console.log('\n=== 初始化 Ollama 服务连接 ===');
      await ollamaService.autoConnectOllama();
      console.log('================================\n');
    });
  })
  .catch(err => console.error('MongoDB connection error:', err));
