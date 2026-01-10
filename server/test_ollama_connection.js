// 测试 Ollama 连接脚本
const axios = require('axios');

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'deepseek-r1:8b';

async function testOllamaConnection() {
    console.log('=== 测试 Ollama 连接 ===\n');
    
    // 1. 测试 Ollama 服务是否运行
    console.log('1. 测试 Ollama 服务连接...');
    try {
        const tagsResponse = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
            timeout: 5000
        });
        console.log('✓ Ollama 服务连接成功');
        console.log('  可用模型:', tagsResponse.data?.models?.map(m => m.name).join(', ') || '无');
        
        // 2. 检查模型是否存在
        const models = tagsResponse.data?.models || [];
        const modelExists = models.some(model => 
            model.name === OLLAMA_MODEL || model.name.includes(OLLAMA_MODEL.split(':')[0])
        );
        
        if (modelExists) {
            console.log(`✓ 模型 ${OLLAMA_MODEL} 已安装`);
        } else {
            console.log(`✗ 模型 ${OLLAMA_MODEL} 未找到`);
            console.log('  请运行: ollama pull ' + OLLAMA_MODEL);
        }
        
        // 3. 测试聊天功能
        console.log('\n2. 测试聊天功能...');
        try {
            const chatResponse = await axios.post(`${OLLAMA_BASE_URL}/api/chat`, {
                model: OLLAMA_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: '你是一个专业的碳排放管理助手。'
                    },
                    {
                        role: 'user',
                        content: '你好'
                    }
                ],
                stream: false
            }, {
                timeout: 30000
            });
            
            console.log('✓ 聊天功能正常');
            console.log('  响应:', chatResponse.data.message?.content?.substring(0, 50) || '无内容');
        } catch (error) {
            console.log('✗ 聊天功能测试失败:', error.message);
        }
        
    } catch (error) {
        console.log('✗ Ollama 服务连接失败');
        if (error.code === 'ECONNREFUSED') {
            console.log('  错误: 无法连接到 Ollama 服务');
            console.log('  请确保 Ollama 正在运行: ollama serve');
        } else if (error.code === 'ETIMEDOUT') {
            console.log('  错误: 连接超时');
        } else {
            console.log('  错误:', error.message);
        }
    }
    
    // 4. 测试后端健康检查端点
    console.log('\n3. 测试后端健康检查端点...');
    try {
        const healthResponse = await axios.get('http://localhost:5000/api/ai/health', {
            timeout: 5000
        });
        console.log('✓ 后端健康检查端点正常');
        console.log('  连接状态:', JSON.stringify(healthResponse.data, null, 2));
    } catch (error) {
        console.log('✗ 后端健康检查端点失败');
        if (error.code === 'ECONNREFUSED') {
            console.log('  错误: 无法连接到后端服务器');
            console.log('  请确保后端服务器正在运行 (端口 5000)');
        } else {
            console.log('  错误:', error.message);
            if (error.response) {
                console.log('  响应状态:', error.response.status);
                console.log('  响应数据:', error.response.data);
            }
        }
    }
    
    console.log('\n=== 测试完成 ===');
}

testOllamaConnection().catch(console.error);

















