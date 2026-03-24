// server/controllers/ai.js
const ollamaService = require('../services/ollamaService');
const AIConversation = require('../models/AIConversation');

exports.handleChat = async (req, res) => {
    const { question } = req.body;
    if (!question) {
        return res.status(400).json({ error: '问题不能为空' });
    }
    
    try {
        console.log(`调用 Ollama 模型 (${ollamaService.OLLAMA_MODEL}): ${question}`);
        
        // 使用 ollamaService 进行聊天
        const messages = [
            {
                role: 'user',
                content: question
            }
        ];
        
        const response = await ollamaService.chatWithOllama(messages);
        
        // 打印响应数据以便调试
        console.log('Ollama 响应数据:', JSON.stringify(response, null, 2));
        
        // Ollama API 返回格式: { message: { content: "回答内容" }, ... }
        let answer = '抱歉，无法获取回答。';
        
        if (response && response.message) {
            if (typeof response.message === 'string') {
                // 某些情况下 message 可能是字符串
                answer = response.message;
            } else if (response.message.content) {
                answer = response.message.content;
            } else {
                console.warn('Ollama 响应格式异常，message 对象缺少 content 字段:', response.message);
            }
        } else {
            console.warn('Ollama 响应格式异常，缺少 message 字段:', response);
        }
        
        console.log(`Ollama 响应成功，回答长度: ${answer.length} 字符`);
        res.json({ answer });
    } catch (error) {
        console.error('Ollama 服务通信错误:', error.message);
        
        // 打印更详细的错误信息，帮助调试
        if (error.response) {
            console.error('Ollama Response Error:', error.response.status, error.response.data);
            res.status(500).json({ 
                error: `Ollama 服务错误: ${error.response.status} - ${JSON.stringify(error.response.data)}` 
            });
        } else if (error.request) {
            console.error('Ollama Request Error: No response received');
            const status = ollamaService.getConnectionStatus();
            res.status(500).json({ 
                error: '无法连接到 Ollama 服务，请确保 Ollama 正在运行并且模型已安装' 
            });
        } else if (error.code === 'ECONNREFUSED') {
            console.error('Ollama 连接被拒绝，请检查服务是否启动');
            res.status(500).json({ 
                error: `无法连接到 Ollama 服务，请确保 Ollama 正在运行在 ${ollamaService.OLLAMA_BASE_URL}` 
            });
        } else {
            console.error('Ollama Setup Error:', error.message);
            res.status(500).json({ error: `AI 助手当前不可用: ${error.message}` });
        }
    }
};

// 流式聊天端点
exports.handleChatStream = async (req, res) => {
    const { question } = req.body;
    if (!question) {
        return res.status(400).json({ error: '问题不能为空' });
    }
    
    try {
        console.log(`流式调用 Ollama 模型 (${ollamaService.OLLAMA_MODEL}): ${question}`);
        
        // 设置 SSE 响应头
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // 禁用 nginx 缓冲
        
        // 使用 ollamaService 进行流式聊天
        const messages = [
            {
                role: 'user',
                content: question
            }
        ];
        
        await ollamaService.chatWithOllamaStream(messages, (chunk) => {
            // 发送数据块到客户端
            res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        });
        
        // 发送结束标记
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        
    } catch (error) {
        console.error('Ollama 流式服务通信错误:', error.message);
        
        // 发送错误信息
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
};

// 获取当前用户的历史对话列表（按创建时间倒序，仅当前用户）
exports.listConversations = async (req, res) => {
  try {
    const list = await AIConversation.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    console.log('[AI] listConversations: user=%s, count=%d', req.user._id, list.length);
    const formatted = list.map((doc) => ({
      id: doc._id.toString(),
      conversationId: doc.conversationId || null,
      title: doc.title,
      createdAt: doc.createdAt.getTime ? doc.createdAt.getTime() : doc.createdAt,
    }));
    res.json(formatted);
  } catch (error) {
    console.error('获取 AI 对话列表失败:', error);
    res.status(500).json({ error: error.message || '获取对话列表失败' });
  }
};

// 创建新对话（仅当前用户）
exports.createConversation = async (req, res) => {
  try {
    const { title } = req.body;
    const titleText = title && String(title).trim() ? String(title).trim() : `新对话 ${new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
    const doc = await AIConversation.create({
      user: req.user._id,
      title: titleText,
    });
    console.log('[AI] createConversation: id=%s, user=%s', doc._id, req.user._id);
    res.status(201).json({
      id: doc._id.toString(),
      conversationId: doc.conversationId || null,
      title: doc.title,
      createdAt: doc.createdAt.getTime ? doc.createdAt.getTime() : doc.createdAt,
    });
  } catch (error) {
    console.error('创建 AI 对话失败:', error);
    res.status(500).json({ error: error.message || '创建对话失败' });
  }
};

// 更新对话（仅当前用户的记录）
exports.updateConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const { conversationId, title } = req.body;
    const doc = await AIConversation.findOne({ _id: id, user: req.user._id });
    if (!doc) {
      return res.status(404).json({ error: '对话不存在或无权操作' });
    }
    if (conversationId !== undefined) doc.conversationId = conversationId ? String(conversationId) : null;
    if (title !== undefined && String(title).trim()) doc.title = String(title).trim();
    await doc.save();
    res.json({
      id: doc._id.toString(),
      conversationId: doc.conversationId || null,
      title: doc.title,
      createdAt: doc.createdAt.getTime ? doc.createdAt.getTime() : doc.createdAt,
    });
  } catch (error) {
    console.error('更新 AI 对话失败:', error);
    res.status(500).json({ error: error.message || '更新对话失败' });
  }
};

// 删除对话（仅当前用户的记录）
exports.deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await AIConversation.findOneAndDelete({ _id: id, user: req.user._id });
    if (!doc) {
      return res.status(404).json({ error: '对话不存在或无权操作' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('删除 AI 对话失败:', error);
    res.status(500).json({ error: error.message || '删除对话失败' });
  }
};

// 健康检查端点
exports.checkHealth = async (req, res) => {
    try {
        // 主动检查一次连接状态（如果上次检查超过30秒）
        const status = ollamaService.getConnectionStatus();
        const now = new Date();
        const lastCheck = status.lastCheck ? new Date(status.lastCheck) : null;
        
        // 如果上次检查超过30秒，或者从未检查过，则重新检查
        if (!lastCheck || (now - lastCheck) > 30000) {
            console.log('执行 Ollama 连接检查...');
            await ollamaService.checkOllamaConnection();
        }
        
        const currentStatus = ollamaService.getConnectionStatus();
        
        // 确保返回正确的格式
        const response = {
            connected: currentStatus.connected === true,
            modelAvailable: currentStatus.modelAvailable === true,
            error: currentStatus.error || null,
            lastCheck: currentStatus.lastCheck ? new Date(currentStatus.lastCheck).toISOString() : null
        };
        
        console.log('健康检查响应:', response);
        res.json(response);
    } catch (error) {
        console.error('健康检查失败:', error);
        res.status(500).json({
            connected: false,
            modelAvailable: false,
            error: error.message || '健康检查失败',
            lastCheck: new Date().toISOString()
        });
    }
};
