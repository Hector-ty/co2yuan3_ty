// server/routes/ai.js
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai');
const { protect } = require('../middleware/auth'); // 复用你已有的认证中间件

// GET /api/ai/health - 健康检查（不需要认证）
router.get('/health', aiController.checkHealth);

// 历史对话：仅登录用户，且按用户隔离
// GET /api/ai/conversations - 获取当前用户的历史对话列表
router.get('/conversations', protect, aiController.listConversations);
// POST /api/ai/conversations - 创建新对话
router.post('/conversations', protect, aiController.createConversation);
// PATCH /api/ai/conversations/:id - 更新对话（如 conversationId、title）
router.patch('/conversations/:id', protect, aiController.updateConversation);
// DELETE /api/ai/conversations/:id - 删除对话
router.delete('/conversations/:id', protect, aiController.deleteConversation);

// POST /api/ai/chat - 普通聊天（非流式）
router.post('/chat', protect, aiController.handleChat);

// POST /api/ai/chat/stream - 流式聊天
router.post('/chat/stream', protect, aiController.handleChatStream);

module.exports = router;
