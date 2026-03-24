// server/services/ollamaService.js
const axios = require('axios');

// Ollama 配置
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'deepseek-r1:8b';

// 连接状态
let connectionStatus = {
    connected: false,
    lastCheck: null,
    error: null,
    modelAvailable: false
};

/**
 * 检查 Ollama 服务是否可用
 */
async function checkOllamaConnection() {
    try {
        // 检查 Ollama 服务是否运行
        const tagsResponse = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
            timeout: 5000
        });
        
        // 检查模型是否已安装
        const models = tagsResponse.data?.models || [];
        const modelNameBase = OLLAMA_MODEL.split(':')[0];
        const modelExists = models.some(model => {
            const modelName = model.name || '';
            // 精确匹配或基础名称匹配
            return modelName === OLLAMA_MODEL || 
                   modelName === modelNameBase || 
                   modelName.startsWith(modelNameBase + ':');
        });
        
        connectionStatus = {
            connected: true,
            lastCheck: new Date(),
            error: null,
            modelAvailable: modelExists,
            availableModels: models.map(m => m.name)
        };
        
        if (!modelExists) {
            const availableModelNames = models.map(m => m.name).join(', ') || '无';
            console.warn(`警告: 模型 ${OLLAMA_MODEL} 未找到。可用模型: ${availableModelNames}`);
            console.warn(`提示: 请运行 'ollama pull ${OLLAMA_MODEL}' 安装模型`);
            connectionStatus.error = `模型 ${OLLAMA_MODEL} 未安装。可用模型: ${availableModelNames}`;
        } else {
            console.log(`✓ Ollama 服务连接成功，模型 ${OLLAMA_MODEL} 可用`);
        }
        
        return connectionStatus;
    } catch (error) {
        connectionStatus = {
            connected: false,
            lastCheck: new Date(),
            error: error.message,
            modelAvailable: false
        };
        
        if (error.code === 'ECONNREFUSED') {
            const errorMsg = `无法连接到 Ollama 服务 (${OLLAMA_BASE_URL})，请确保 Ollama 正在运行`;
            console.error(`✗ ${errorMsg}`);
            if (OLLAMA_BASE_URL.includes('host.docker.internal')) {
                console.error('提示: 在 Docker 环境中，请确保宿主机上的 Ollama 服务正在运行，并且设置了 OLLAMA_HOST=0.0.0.0');
            }
            connectionStatus.error = errorMsg;
        } else if (error.code === 'ETIMEDOUT') {
            const errorMsg = `Ollama 服务连接超时 (${OLLAMA_BASE_URL})`;
            console.error(`✗ ${errorMsg}`);
            connectionStatus.error = errorMsg;
        } else if (error.code === 'ENOTFOUND' || error.message?.includes('getaddrinfo')) {
            const errorMsg = `无法解析 Ollama 服务地址 (${OLLAMA_BASE_URL})`;
            console.error(`✗ ${errorMsg}`);
            connectionStatus.error = errorMsg;
        } else {
            const errorMsg = `Ollama 服务检查失败: ${error.message}`;
            console.error(`✗ ${errorMsg}`);
            connectionStatus.error = errorMsg;
        }
        
        return connectionStatus;
    }
}

/**
 * 自动连接 Ollama 服务（带重试机制）
 */
async function autoConnectOllama(maxRetries = 5, retryDelay = 3000) {
    console.log(`正在尝试连接到 Ollama 服务 (${OLLAMA_BASE_URL})...`);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`尝试连接 (${attempt}/${maxRetries})...`);
        
        const status = await checkOllamaConnection();
        
        if (status.connected && status.modelAvailable) {
            console.log(`✓ Ollama 服务连接成功！`);
            return status;
        }
        
        if (attempt < maxRetries) {
            console.log(`等待 ${retryDelay / 1000} 秒后重试...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }
    
    console.warn(`⚠ Ollama 服务连接失败，将在后台继续重试...`);
    // 启动后台重试
    startBackgroundRetry();
    
    return connectionStatus;
}

/**
 * 后台重试连接（每30秒检查一次）
 */
let backgroundRetryInterval = null;

function startBackgroundRetry() {
    if (backgroundRetryInterval) {
        return; // 已经在运行
    }
    
    console.log('启动后台重试机制，每30秒检查一次 Ollama 服务...');
    
    backgroundRetryInterval = setInterval(async () => {
        const status = await checkOllamaConnection();
        if (status.connected && status.modelAvailable) {
            console.log('✓ Ollama 服务已恢复连接！');
            // 可以选择停止后台重试，或者继续监控
            // clearInterval(backgroundRetryInterval);
            // backgroundRetryInterval = null;
        }
    }, 30000); // 每30秒检查一次
}

/**
 * 停止后台重试
 */
function stopBackgroundRetry() {
    if (backgroundRetryInterval) {
        clearInterval(backgroundRetryInterval);
        backgroundRetryInterval = null;
        console.log('已停止后台重试机制');
    }
}

/**
 * 获取当前连接状态
 */
function getConnectionStatus() {
    return { ...connectionStatus };
}

/**
 * 获取系统提示词（System Prompt）
 */
function getSystemPrompt() {
    return `你是一个专业的碳排放管理助手，专门提供碳排放相关的咨询和问答服务。

【核心职责】
1. 提供准确的碳排放知识科普
2. 解释碳排放相关的概念、标准和计算方法
3. 说明碳排放监测、报告和核查（MRV）流程
4. 提供碳排放减排建议和最佳实践
5. 解释碳排放因子、碳足迹等专业术语
6. 协助理解碳排放数据填报和管理

【专业知识领域】
- 碳排放核算方法学（如IPCC指南、ISO 14064标准）
- 碳排放因子数据库和应用
- 直接排放和间接排放的区分
- 范围1、范围2、范围3排放
- 碳排放监测和报告要求
- 碳减排技术和措施
- 碳交易和碳市场
- 碳中和和净零排放

【回答规范】
- 基于权威的碳排放标准和指南
- 语言通俗易懂，避免过度专业术语
- 明确说明信息来源的可靠性
- 对于不确定的内容要明确说明
- 提供实用的建议和示例

【注意事项】
- 如果问题与碳排放无关，请礼貌地说明你主要回答碳排放相关问题
- 对于涉及具体政策法规的问题，建议用户查阅最新的官方文件
- 对于复杂的技术问题，建议咨询专业的碳排放咨询机构

请始终以专业、准确、友好的方式回答用户的问题。`;
}

/**
 * 调用 Ollama API 进行聊天（非流式）
 * @param {Array} messages - 消息数组
 * @param {Object} options - 可选，{ timeout: 毫秒 }
 */
async function chatWithOllama(messages, options = {}) {
    // 如果未连接，先尝试连接
    if (!connectionStatus.connected) {
        await checkOllamaConnection();
    }

    const timeout = options.timeout ?? 120000;

    try {
        const ollamaChatUrl = `${OLLAMA_BASE_URL}/api/chat`;
        
        // 构建完整的消息列表，包含系统提示词
        const fullMessages = [
            {
                role: 'system',
                content: getSystemPrompt()
            },
            ...messages
        ];
        
        const requestData = {
            model: OLLAMA_MODEL,
            messages: fullMessages,
            stream: false
        };
        
        const response = await axios.post(ollamaChatUrl, requestData, {
            timeout
        });
        
        // 更新连接状态为成功
        if (!connectionStatus.connected) {
            connectionStatus.connected = true;
            connectionStatus.error = null;
        }
        
        return response.data;
    } catch (error) {
        // 如果连接失败，更新状态
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            connectionStatus.connected = false;
            connectionStatus.error = error.message;
        }
        throw error;
    }
}

/**
 * 调用 Ollama API 进行流式聊天
 * @param {Array} messages - 消息数组
 * @param {Function} onChunk - 接收数据块的回调函数 (chunk) => void
 */
async function chatWithOllamaStream(messages, onChunk) {
    // 如果未连接，先尝试连接
    if (!connectionStatus.connected) {
        await checkOllamaConnection();
    }
    
    try {
        const ollamaChatUrl = `${OLLAMA_BASE_URL}/api/chat`;
        
        // 构建完整的消息列表，包含系统提示词
        const fullMessages = [
            {
                role: 'system',
                content: getSystemPrompt()
            },
            ...messages
        ];
        
        const requestData = {
            model: OLLAMA_MODEL,
            messages: fullMessages,
            stream: true
        };
        
        const response = await axios.post(ollamaChatUrl, requestData, {
            timeout: 120000, // 120秒超时
            responseType: 'stream'
        });
        
        // 更新连接状态为成功
        if (!connectionStatus.connected) {
            connectionStatus.connected = true;
            connectionStatus.error = null;
        }
        
        let buffer = '';
        
        return new Promise((resolve, reject) => {
            response.data.on('data', (chunk) => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // 保留最后一个不完整的行
                
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const data = JSON.parse(line);
                            if (data.message && data.message.content) {
                                onChunk(data.message.content);
                            }
                            if (data.done) {
                                resolve();
                                return;
                            }
                        } catch (e) {
                            // 忽略解析错误
                        }
                    }
                }
            });
            
            response.data.on('end', () => {
                // 处理剩余的buffer
                if (buffer.trim()) {
                    try {
                        const data = JSON.parse(buffer);
                        if (data.message && data.message.content) {
                            onChunk(data.message.content);
                        }
                    } catch (e) {
                        // 忽略解析错误
                    }
                }
                resolve();
            });
            
            response.data.on('error', (error) => {
                reject(error);
            });
        });
    } catch (error) {
        // 如果连接失败，更新状态
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            connectionStatus.connected = false;
            connectionStatus.error = error.message;
        }
        throw error;
    }
}

module.exports = {
    checkOllamaConnection,
    autoConnectOllama,
    getConnectionStatus,
    chatWithOllama,
    chatWithOllamaStream,
    startBackgroundRetry,
    stopBackgroundRetry,
    OLLAMA_BASE_URL,
    OLLAMA_MODEL
};

