// server/routes/ai.js
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai');
const { protect } = require('../middleware/auth'); // 复用你已有的认证中间件

// GET /api/ai/health - 健康检查（不需要认证）
router.get('/health', aiController.checkHealth);

// POST /api/ai/chat - 普通聊天（非流式）
router.post('/chat', protect, aiController.handleChat);

// POST /api/ai/chat/stream - 流式聊天
router.post('/chat/stream', protect, aiController.handleChatStream);

module.exports = router;
