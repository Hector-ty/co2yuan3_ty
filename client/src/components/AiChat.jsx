// client/src/components/AiChat.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const chatHeaderStyle = {
    padding: '10px',
    backgroundColor: 'rgba(20, 20, 20, 0.75)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
    cursor: 'pointer',
    color: '#ffffff',
    borderTopLeftRadius: '10px',
    borderTopRightRadius: '10px',
};

const chatMessagesStyle = {
    flexGrow: 1,
    overflowY: 'auto',
    padding: '10px',
    backgroundColor: 'rgba(20, 20, 20, 0.7)',
    backdropFilter: 'blur(10px)',
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
};

const userMessageStyle = {
    textAlign: 'right',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    borderRadius: '15px',
    padding: '8px 12px',
    margin: '5px 0',
    minWidth: '60px',
    maxWidth: '85%',
    width: 'fit-content',
    marginLeft: 'auto',
    wordWrap: 'break-word',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
    display: 'inline-block',
};

const aiMessageStyle = {
    textAlign: 'left',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    borderRadius: '15px',
    padding: '8px 12px',
    margin: '5px 0',
    minWidth: '60px',
    maxWidth: '85%',
    width: 'fit-content',
    marginRight: 'auto',
    wordWrap: 'break-word',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
    display: 'inline-block',
};

const chatInputContainerStyle = {
    display: 'flex',
    borderTop: '1px solid rgba(255, 255, 255, 0.3)',
    padding: '10px',
    backgroundColor: 'rgba(20, 20, 20, 0.75)',
    backdropFilter: 'blur(10px)',
    borderBottomLeftRadius: '10px',
    borderBottomRightRadius: '10px',
};

const chatInputStyle = {
    flexGrow: 1,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '10px',
    padding: '8px',
    marginRight: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
};

const chatSendButtonStyle = {
    backgroundColor: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '8px 15px',
    cursor: 'pointer',
};

/**
 * 清理文本中多余的空行（将3个或更多连续换行替换为2个换行）
 * 同时清理行尾的空格和制表符
 */
function cleanExtraBlankLines(text) {
    if (!text) return text;
    // 将3个或更多连续换行替换为2个换行
    let cleaned = text.replace(/\n{3,}/g, '\n\n');
    // 清理每行末尾的空格和制表符（但保留换行）
    cleaned = cleaned.replace(/[ \t]+$/gm, '');
    return cleaned;
}

function AiChat() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([{ role: 'ai', content: '你好！有什么可以帮助你的吗？' }]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [ollamaStatus, setOllamaStatus] = useState({ connected: false, modelAvailable: false });
    const chatRef = useRef(null); // 用于引用AI助手容器
    const buttonRef = useRef(null); // 用于引用打开按钮
    const messagesEndRef = useRef(null); // 用于引用消息列表底部
    
    // 检查 Ollama 服务状态
    useEffect(() => {
        let isMounted = true;
        
        const checkOllamaStatus = async () => {
            try {
                console.log('检查 Ollama 服务状态...');
                const response = await axios.get('/api/ai/health', {
                    timeout: 10000 // 10秒超时
                });
                
                console.log('健康检查响应:', response.data);
                
                if (response && response.data) {
                    if (isMounted) {
                        setOllamaStatus({
                            connected: response.data.connected === true,
                            modelAvailable: response.data.modelAvailable === true,
                            error: response.data.error || null,
                            lastCheck: response.data.lastCheck || null
                        });
                    }
                } else {
                    console.warn('服务状态响应格式异常:', response);
                    if (isMounted) {
                        setOllamaStatus({
                            connected: false,
                            modelAvailable: false,
                            error: '服务状态响应格式异常'
                        });
                    }
                }
            } catch (error) {
                console.error('检查 Ollama 服务状态失败:', error);
                console.error('错误详情:', {
                    message: error.message,
                    code: error.code,
                    response: error.response?.data,
                    status: error.response?.status
                });
                
                if (isMounted) {
                    let errorMsg = '无法检查服务状态';
                    
                    if (error.response) {
                        if (error.response.status === 401) {
                            errorMsg = '需要登录';
                        } else if (error.response.status === 500) {
                            errorMsg = error.response.data?.error || '服务器错误';
                        } else {
                            errorMsg = `服务器错误 (${error.response.status})`;
                        }
                    } else if (error.code === 'ECONNABORTED') {
                        errorMsg = '请求超时，请检查后端服务';
                    } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
                        errorMsg = '无法连接到后端服务器';
                    } else {
                        errorMsg = error.message || '未知错误';
                    }
                    
                    setOllamaStatus({
                        connected: false,
                        modelAvailable: false,
                        error: errorMsg
                    });
                }
            }
        };
        
        // 初始检查
        checkOllamaStatus();
        
        // 每30秒检查一次状态
        const interval = setInterval(checkOllamaStatus, 30000);
        
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    const handleSend = async () => {
        if (!input.trim()) return;
        
        // 检查是否已登录
        const token = localStorage.getItem('token');
        if (!token) {
            const errorMessage = { role: 'ai', content: '抱歉，您需要先登录才能使用AI助手。请先登录系统。' };
            setMessages(prev => [...prev, errorMessage]);
            return;
        }
        
        const userMessage = { role: 'user', content: input };
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        // 添加用户消息和空的AI消息
        setMessages(prev => [...prev, userMessage, { role: 'ai', content: '' }]);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/ai/chat/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ question: currentInput })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            
                            if (data.error) {
                                setMessages(prev => {
                                    const newMessages = [...prev];
                                    const lastIndex = newMessages.length - 1;
                                    if (lastIndex >= 0 && newMessages[lastIndex].role === 'ai') {
                                        newMessages[lastIndex] = { 
                                            role: 'ai', 
                                            content: `抱歉，${data.error}` 
                                        };
                                    }
                                    return newMessages;
                                });
                                setIsLoading(false);
                                return;
                            }
                            
                            if (data.done) {
                                setIsLoading(false);
                                break;
                            }
                            
                            if (data.content) {
                                setMessages(prev => {
                                    const newMessages = [...prev];
                                    const lastIndex = newMessages.length - 1;
                                    if (lastIndex >= 0 && newMessages[lastIndex].role === 'ai') {
                                        const currentContent = newMessages[lastIndex].content || '';
                                        const newContent = currentContent + data.content;
                                        // 清理多余的空行
                                        newMessages[lastIndex] = { 
                                            role: 'ai', 
                                            content: cleanExtraBlankLines(newContent)
                                        };
                                    }
                                    return newMessages;
                                });
                            }
                        } catch (e) {
                            console.error('解析SSE数据失败:', e);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('AI 助手请求错误:', error);
            
            let errorContent = '抱歉，我现在有点忙，请稍后再试。';
            
            if (error.message) {
                if (error.message.includes('401')) {
                    errorContent = '抱歉，您需要先登录才能使用AI助手。请刷新页面重新登录。';
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                } else if (error.message.includes('timeout') || error.message.includes('超时')) {
                    errorContent = '抱歉，请求超时，AI助手可能需要更长时间处理，请稍后再试。';
                } else {
                    errorContent = `抱歉，发生错误：${error.message}`;
                }
            }
            
            setMessages(prev => {
                const newMessages = [...prev];
                const lastIndex = newMessages.length - 1;
                if (lastIndex >= 0 && newMessages[lastIndex].role === 'ai') {
                    newMessages[lastIndex] = { role: 'ai', content: errorContent };
                }
                return newMessages;
            });
        } finally {
            setIsLoading(false);
        }
    };

    // 自动滚动到底部
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // 点击外部区域关闭AI助手
    useEffect(() => {
        const handleClickOutside = (event) => {
            // 如果AI助手未打开，不处理
            if (!isOpen) return;
            
            // 如果点击的是AI助手容器内部或其子元素，不关闭
            if (chatRef.current && chatRef.current.contains(event.target)) {
                return;
            }
            
            // 点击外部区域，关闭AI助手
            setIsOpen(false);
        };

        // 添加事件监听器
        if (isOpen) {
            // 使用 setTimeout 确保事件监听器在下一个事件循环中添加
            // 这样可以避免立即触发关闭（因为打开按钮的点击事件会冒泡）
            const timeoutId = setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside);
            }, 100); // 增加延迟时间，确保打开按钮的点击事件完全处理完毕

            return () => {
                clearTimeout(timeoutId);
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }

        // 清理函数：移除事件监听器
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const chatWidgetStyle = {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: isMobile ? 'calc(100vw - 40px)' : '1400px',
        maxWidth: isMobile ? 'calc(100vw - 40px)' : '1600px',
        height: isMobile ? 'calc(100vh - 100px)' : '800px',
        maxHeight: isMobile ? 'calc(100vh - 100px)' : '900px',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '10px',
        backgroundColor: 'rgba(20, 20, 20, 0.8)',
        backdropFilter: 'blur(15px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
    };

    if (!isOpen) {
        return (
            <button 
                ref={buttonRef}
                style={{
                    position: 'fixed',
                    bottom: isMobile ? '10px' : '20px',
                    right: isMobile ? '10px' : '20px',
                    zIndex: 1000,
                    fontSize: isMobile ? '0.875rem' : '1rem',
                    padding: isMobile ? '8px 12px' : '10px 15px',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                    fontWeight: 500,
                    letterSpacing: '0.5px',
                    outline: 'none',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
                }}
                onMouseDown={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                }}
                onMouseUp={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
                }}
                onClick={(e) => {
                    e.stopPropagation(); // 阻止事件冒泡
                    setIsOpen(true);
                }}
            >
                AI 助手
            </button>
        );
    }

    return (
        <>
            <style>{`
                input::placeholder {
                    color: rgba(255, 255, 255, 0.5);
                }
                input::-webkit-input-placeholder {
                    color: rgba(255, 255, 255, 0.5);
                }
                input::-moz-placeholder {
                    color: rgba(255, 255, 255, 0.5);
                }
                input:-ms-input-placeholder {
                    color: rgba(255, 255, 255, 0.5);
                }
                @keyframes blink {
                    0%, 100% { opacity: 0.6; }
                    50% { opacity: 1; }
                }
                /* 限制 Markdown 段落间距 */
                .markdown-content p + p {
                    margin-top: 4px;
                }
                .markdown-content p:empty {
                    display: none;
                }
            `}</style>
            <div ref={chatRef} style={chatWidgetStyle}>
                <div style={chatHeaderStyle} onClick={() => setIsOpen(false)}>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                        <div style={{ width: '1px', flex: 1 }}></div>
                        <h4 style={{ margin: 0, fontSize: isMobile ? '1rem' : '1.25rem', color: '#ffffff', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>AI 助手</h4>
                        <div style={{ 
                            fontSize: '0.75rem', 
                            color: ollamaStatus.connected && ollamaStatus.modelAvailable ? '#4caf50' : (ollamaStatus.error ? '#f44336' : '#ff9800'),
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            flex: 1,
                            justifyContent: 'flex-end'
                        }}>
                            <span style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: ollamaStatus.connected && ollamaStatus.modelAvailable ? '#4caf50' : (ollamaStatus.error ? '#f44336' : '#ff9800'),
                                display: 'inline-block'
                            }}></span>
                            {ollamaStatus.connected && ollamaStatus.modelAvailable 
                                ? '已连接' 
                                : ollamaStatus.error 
                                ? '连接失败' 
                                : '连接中...'}
                        </div>
                    </div>
                </div>
            <div style={chatMessagesStyle}>
                {messages.map((msg, index) => (
                    <div key={index} style={msg.role === 'user' ? userMessageStyle : aiMessageStyle}>
                        {msg.role === 'ai' ? (
                            <div className="markdown-content">
                            <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    // 自定义样式
                                    p: ({node, ...props}) => <p style={{margin: '4px 0', lineHeight: '1.5', minHeight: '0'}} {...props} />,
                                    h1: ({node, ...props}) => <h1 style={{fontSize: '1.2em', margin: '8px 0 4px 0'}} {...props} />,
                                    h2: ({node, ...props}) => <h2 style={{fontSize: '1.1em', margin: '8px 0 4px 0'}} {...props} />,
                                    h3: ({node, ...props}) => <h3 style={{fontSize: '1em', margin: '6px 0 4px 0'}} {...props} />,
                                    code: ({node, inline, ...props}) => 
                                        inline ? (
                                            <code style={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                                padding: '2px 4px',
                                                borderRadius: '3px',
                                                fontSize: '0.9em'
                                            }} {...props} />
                                        ) : (
                                            <code style={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                                padding: '8px',
                                                borderRadius: '5px',
                                                display: 'block',
                                                overflowX: 'auto',
                                                fontSize: '0.85em',
                                                margin: '4px 0'
                                            }} {...props} />
                                        ),
                                    pre: ({node, ...props}) => <pre style={{margin: '4px 0', overflowX: 'auto'}} {...props} />,
                                    ul: ({node, ...props}) => <ul style={{margin: '4px 0', paddingLeft: '20px'}} {...props} />,
                                    ol: ({node, ...props}) => <ol style={{margin: '4px 0', paddingLeft: '20px'}} {...props} />,
                                    li: ({node, ...props}) => <li style={{margin: '2px 0'}} {...props} />,
                                    blockquote: ({node, ...props}) => (
                                        <blockquote style={{
                                            borderLeft: '3px solid rgba(255, 255, 255, 0.3)',
                                            paddingLeft: '10px',
                                            margin: '4px 0',
                                            fontStyle: 'italic'
                                        }} {...props} />
                                    ),
                                    table: ({node, ...props}) => (
                                        <table style={{
                                            borderCollapse: 'collapse',
                                            width: '100%',
                                            margin: '4px 0'
                                        }} {...props} />
                                    ),
                                    th: ({node, ...props}) => (
                                        <th style={{
                                            border: '1px solid rgba(255, 255, 255, 0.3)',
                                            padding: '6px',
                                            backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                        }} {...props} />
                                    ),
                                    td: ({node, ...props}) => (
                                        <td style={{
                                            border: '1px solid rgba(255, 255, 255, 0.3)',
                                            padding: '6px'
                                        }} {...props} />
                                    ),
                                    a: ({node, ...props}) => (
                                        <a style={{color: '#4da6ff', textDecoration: 'underline'}} {...props} />
                                    ),
                                }}
                            >
                                {cleanExtraBlankLines(msg.content)}
                            </ReactMarkdown>
                            </div>
                        ) : (
                            msg.content
                        )}
                    </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === 'ai' && messages[messages.length - 1]?.content === '' && (
                    <div style={aiMessageStyle}>
                        <span style={{opacity: 0.6}}>AI 助手正在思考</span>
                        <span style={{animation: 'blink 1s infinite', opacity: 0.6}}>...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div style={chatInputContainerStyle}>
                <input
                    type="text"
                    style={chatInputStyle}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                            handleSend();
                        }
                    }}
                    placeholder="输入你的问题..."
                    disabled={isLoading}
                    onFocus={(e) => {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                    }}
                    onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    }}
                />
                <button onClick={handleSend} style={chatSendButtonStyle} disabled={isLoading}>
                    发送
                </button>
            </div>
        </div>
        </>
    );
}
export default AiChat;
