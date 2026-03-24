import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Box, CircularProgress } from '@mui/material';
import VideoBackground from './components/VideoBackground';
// 登录页同步导入，因为首次访问通常是登录页，需要立即显示
import LoginPage from './pages/LoginPage';
// AI 助手入口（右下角按钮，跳转到 /ai-assistant）；仅在非 AI 助手页显示
import AIAssistantEntry from './components/AIAssistantEntry';

function AIAssistantEntryWhenNotOnPage() {
  const { pathname } = useLocation();
  if (pathname === '/ai-assistant') return null;
  return <AIAssistantEntry />;
}

// 其他页面懒加载，减少首次加载时间
const AIAssistantPage = lazy(() => import('./pages/AIAssistantPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const DataScreenPage = lazy(() => import('./pages/DataScreenPage'));
const NewEmissionFactorManagementPage = lazy(() => import('./pages/NewEmissionFactorManagementPage'));
const EmissionFactorLoginPage = lazy(() => import('./pages/EmissionFactorLoginPage'));
const DataUploadPage = lazy(() => import('./pages/DataUploadPage'));

// 权限保护组件
const ProtectedRoute = ({ children, requiredRole = null }) => {
    const token = localStorage.getItem('token');
    if (!token) {
        return <Navigate to="/login" />;
    }
    
    if (requiredRole) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        // 支持单个角色或角色数组
        const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        if (!allowedRoles.includes(user.role)) {
            return <Navigate to="/dashboard" />;
        }
    }
    
    return children;
};

// 排放因子管理路由组件 - 独立检查认证状态
// 使用独立的存储键来管理这个页面的登录状态
const EMISSION_FACTOR_TOKEN_KEY = 'emissionFactorToken';
const EMISSION_FACTOR_USER_KEY = 'emissionFactorUser';

const EmissionFactorManagementRoute = () => {
    const [checking, setChecking] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    const checkAuth = useCallback(() => {
        // 只检查专门的排放因子管理系统登录状态
        // 不依赖主系统的登录状态，确保这个页面有独立的登录流程
        const emissionFactorToken = localStorage.getItem(EMISSION_FACTOR_TOKEN_KEY);
        const emissionFactorUser = localStorage.getItem(EMISSION_FACTOR_USER_KEY);
        
        console.log('EmissionFactorManagementRoute - 检查认证状态:', {
            hasToken: !!emissionFactorToken,
            hasUser: !!emissionFactorUser
        });
        
        // 只有专门存储的 token 存在时，才认为已登录
        if (emissionFactorToken && emissionFactorUser) {
            try {
                const user = JSON.parse(emissionFactorUser);
                console.log('EmissionFactorManagementRoute - 用户信息:', user);
                // 仅允许超级管理员访问排放因子管理系统
                if (user.role === 'superadmin') {
                    console.log('EmissionFactorManagementRoute - 超级管理员已登录，进入管理页面');
                    setIsAuthenticated(true);
                    setIsAdmin(true);
                } else {
                    // 如果不是超级管理员，清除无效数据并显示登录界面
                    console.log('EmissionFactorManagementRoute - 非超级管理员，清除数据并显示登录界面');
                    localStorage.removeItem(EMISSION_FACTOR_TOKEN_KEY);
                    localStorage.removeItem(EMISSION_FACTOR_USER_KEY);
                    setIsAuthenticated(false);
                    setIsAdmin(false);
                }
            } catch (error) {
                // 解析失败，清除无效数据
                console.error('EmissionFactorManagementRoute - 解析用户数据失败:', error);
                localStorage.removeItem(EMISSION_FACTOR_TOKEN_KEY);
                localStorage.removeItem(EMISSION_FACTOR_USER_KEY);
                setIsAuthenticated(false);
                setIsAdmin(false);
            }
        } else {
            // 没有专门的 token，显示登录界面
            console.log('EmissionFactorManagementRoute - 未找到专门的登录信息，显示登录界面');
            setIsAuthenticated(false);
            setIsAdmin(false);
        }
        
        setChecking(false);
    }, []);

    useEffect(() => {
        checkAuth();
        
        // 监听 localStorage 变化事件（用于跨标签页同步）
        const handleStorageChange = (e) => {
            if (e.key === EMISSION_FACTOR_TOKEN_KEY || e.key === EMISSION_FACTOR_USER_KEY) {
                checkAuth();
            }
        };
        
        window.addEventListener('storage', handleStorageChange);
        
        // 监听自定义事件（用于同标签页内同步）
        const handleCustomStorageChange = () => {
            checkAuth();
        };
        
        window.addEventListener('emissionFactorAuthChange', handleCustomStorageChange);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('emissionFactorAuthChange', handleCustomStorageChange);
        };
    }, [checkAuth]);

    if (checking) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!isAuthenticated) {
        return (
            <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>}>
                <EmissionFactorLoginPage 
                    onLoginSuccess={(token, user) => {
                        // 登录成功后，保存到专门的存储
                        localStorage.setItem(EMISSION_FACTOR_TOKEN_KEY, token);
                        localStorage.setItem(EMISSION_FACTOR_USER_KEY, JSON.stringify(user));
                        // 同时更新主系统的存储（如果需要）
                        localStorage.setItem('token', token);
                        localStorage.setItem('user', JSON.stringify(user));
                        // 重新检查状态（仅允许超级管理员）
                        setIsAuthenticated(true);
                        setIsAdmin(user.role === 'superadmin');
                    }}
                />
            </Suspense>
        );
    }

    if (!isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>}>
            <ProtectedRoute requiredRole="superadmin">
                <NewEmissionFactorManagementPage />
            </ProtectedRoute>
        </Suspense>
    );
};

function App() {
    // 立即从 localStorage 读取 token，避免等待 useEffect，减少首次加载延迟
    const [token, setToken] = useState(() => {
        try {
            return localStorage.getItem('token');
        } catch {
            return null;
        }
    });
    const [loading] = useState(false); // 不再需要 loading 状态，因为 token 已经同步读取
    
    // 如果访问根路径，立即重定向（在渲染前）
    React.useEffect(() => {
        const path = window.location.pathname;
        if (path === '/' || path === '') {
            if (token) {
                window.location.replace('/dashboard');
            } else {
                window.location.replace('/login');
            }
        }
    }, [token]);

    const handleLogin = (newToken) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
    };

    useEffect(() => {
        // 延迟设置 axios 拦截器，不阻塞初始渲染
        let requestInterceptor;
        let responseInterceptor;
        let cleanup;
        
        const setupInterceptors = () => {
            // 请求拦截器：添加 token
            requestInterceptor = axios.interceptors.request.use(
                config => {
                    const token = localStorage.getItem('token');
                    if (token) {
                        config.headers.Authorization = `Bearer ${token}`;
                    }
                    return config;
                },
                error => {
                    console.error('请求拦截器错误:', error);
                    return Promise.reject(error);
                }
            );

            // 响应拦截器：统一处理错误
            let isRedirecting = false; // 防止重复跳转
            responseInterceptor = axios.interceptors.response.use(
                response => response,
                error => {
                    // 统一处理错误，防止未捕获的错误导致崩溃
                    if (error.response) {
                        // 服务器返回了错误响应
                        const { status, data } = error.response;
                        console.error('API 错误响应:', status, data);
                        
                        // 401 未授权：清除 token；仅对「非 AI 助手接口」跳转登录，避免刷新 AI 助手页时直接跳转导致历史列表看不到
                        if (status === 401 && !isRedirecting) {
                            isRedirecting = true;
                            localStorage.removeItem('token');
                            localStorage.removeItem('user');
                            const isAiConversationRequest = error.config?.url?.includes?.('/api/ai/');
                            if (!isAiConversationRequest) {
                                window.location.replace('/login');
                            }
                        }
                    } else if (error.request) {
                        // 请求已发出但没有收到响应
                        console.error('网络错误: 无法连接到服务器');
                    } else {
                        // 其他错误
                        console.error('请求配置错误:', error.message);
                    }
                    
                    // 返回错误，让调用者处理
                    return Promise.reject(error);
                }
            );
        };
        
        // 立即设置拦截器，因为它们是必需的（但不会阻塞渲染）
        setupInterceptors();
        
        cleanup = () => {
            if (requestInterceptor !== undefined) {
                axios.interceptors.request.eject(requestInterceptor);
            }
            if (responseInterceptor !== undefined) {
                axios.interceptors.response.eject(responseInterceptor);
            }
        };
        
        return cleanup;
    }, []);

    // 移除 loading 检查，因为 token 已经同步读取，不需要等待

    // 加载中的占位组件
    const LoadingFallback = () => (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <CircularProgress />
        </Box>
    );

    // 延迟渲染非关键组件，让页面先显示
    const [showVideoBackground, setShowVideoBackground] = React.useState(false);
    
    React.useEffect(() => {
        // 使用 requestIdleCallback 延迟渲染 VideoBackground
        const timer = typeof window !== 'undefined' && 'requestIdleCallback' in window
            ? window.requestIdleCallback(() => setShowVideoBackground(true), { timeout: 200 })
            : setTimeout(() => setShowVideoBackground(true), 0);
        
        return () => {
            if (typeof timer === 'number') {
                clearTimeout(timer);
            } else if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
                window.cancelIdleCallback(timer);
            }
        };
    }, []);

    return (
        <Router>
            {showVideoBackground && <VideoBackground />}
            {!showVideoBackground && (
                <Box
                    sx={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        zIndex: -1,
                    }}
                />
            )}
            <Routes>
                {/* 根路径：根据登录状态智能重定向 - 使用更直接的重定向 */}
                <Route 
                    path="/" 
                    element={
                        token ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
                    } 
                />
                {/* 登录页同步渲染，立即显示 */}
                <Route path="/login" element={!token ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/dashboard" replace />} />
                {/* 其他页面懒加载 */}
                <Route path="/dashboard" element={
                    token ? (
                        <Suspense fallback={<LoadingFallback />}>
                            <DashboardPage onLogout={handleLogout} />
                        </Suspense>
                    ) : (
                        <Navigate to="/login" replace />
                    )
                } />
                <Route path="/data-screen" element={
                    token ? (
                        <Suspense fallback={<LoadingFallback />}>
                            <DataScreenPage />
                        </Suspense>
                    ) : (
                        <Navigate to="/login" replace />
                    )
                } />
                <Route path="/upload-data" element={
                    token ? (
                        <Suspense fallback={<LoadingFallback />}>
                            <DataUploadPage />
                        </Suspense>
                    ) : (
                        <Navigate to="/login" replace />
                    )
                } />
                <Route 
                  path="/EmissionFactorManagement" 
                  element={<EmissionFactorManagementRoute />}
                />
                <Route path="/ai-assistant" element={
                    token ? (
                        <Suspense fallback={<LoadingFallback />}>
                            <AIAssistantPage />
                        </Suspense>
                    ) : (
                        <Navigate to="/login" replace />
                    )
                } />
                <Route path="*" element={<Navigate to={token ? "/dashboard" : "/login"} replace />} />
            </Routes>
            {/* 登录后且在非 AI 助手页时显示入口按钮，点击跳转到 /ai-assistant */}
            {token && <AIAssistantEntryWhenNotOnPage />}
        </Router>
    );
}

export default App;
