import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DataScreenPage from './pages/DataScreenPage';
import EmissionFactorManagementPage from './pages/EmissionFactorManagementPage'; // 导入排放因子管理页面
import NewEmissionFactorManagementPage from './pages/NewEmissionFactorManagementPage'; // 导入新系统排放因子管理页面
import EmissionFactorLoginPage from './pages/EmissionFactorLoginPage'; // 导入排放因子管理系统登录页面
import DataUploadPage from './pages/DataUploadPage'; // 导入数据上传页面
import axios from 'axios';
import { Box, CircularProgress } from '@mui/material';
import VideoBackground from './components/VideoBackground';
import AiChat from './components/AiChat'; // 导入新组件

// 权限保护组件
const ProtectedRoute = ({ children, requiredRole = null }) => {
    const token = localStorage.getItem('token');
    if (!token) {
        return <Navigate to="/login" />;
    }
    
    if (requiredRole) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role !== requiredRole) {
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
                // 验证用户角色是否为管理员
                if (user.role === 'admin') {
                    console.log('EmissionFactorManagementRoute - 管理员已登录，进入管理页面');
                    setIsAuthenticated(true);
                    setIsAdmin(true);
                } else {
                    // 如果不是管理员，清除无效数据并显示登录界面
                    console.log('EmissionFactorManagementRoute - 非管理员，清除数据并显示登录界面');
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
        return <EmissionFactorLoginPage 
            onLoginSuccess={(token, user) => {
                // 登录成功后，保存到专门的存储
                localStorage.setItem(EMISSION_FACTOR_TOKEN_KEY, token);
                localStorage.setItem(EMISSION_FACTOR_USER_KEY, JSON.stringify(user));
                // 同时更新主系统的存储（如果需要）
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
                // 重新检查状态
                setIsAuthenticated(true);
                setIsAdmin(user.role === 'admin');
            }}
        />;
    }

    if (!isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <ProtectedRoute requiredRole="admin">
            <NewEmissionFactorManagementPage />
        </ProtectedRoute>
    );
};

function App() {
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            setToken(storedToken);
        }
        setLoading(false);
    }, []);

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
        // 请求拦截器：添加 token
        const requestInterceptor = axios.interceptors.request.use(
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
        const responseInterceptor = axios.interceptors.response.use(
            response => response,
            error => {
                // 统一处理错误，防止未捕获的错误导致崩溃
                if (error.response) {
                    // 服务器返回了错误响应
                    const { status, data } = error.response;
                    console.error('API 错误响应:', status, data);
                    
                    // 401 未授权，清除 token 并跳转到登录页
                    if (status === 401) {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        window.location.href = '/login';
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

        return () => {
            axios.interceptors.request.eject(requestInterceptor);
            axios.interceptors.response.eject(responseInterceptor);
        };
    }, []);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Router>
            <VideoBackground />
            <Routes>
                {/* 根路径：根据登录状态智能重定向 */}
                <Route 
                    path="/" 
                    element={
                        token ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
                    } 
                />
                <Route path="/login" element={!token ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={token ? <DashboardPage onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
                <Route path="/data-screen" element={token ? <DataScreenPage /> : <Navigate to="/login" replace />} />
                <Route 
                  path="/emission-factors" 
                  element={
                    token ? (
                      <ProtectedRoute requiredRole="admin">
                        <EmissionFactorManagementPage />
                      </ProtectedRoute>
                    ) : (
                      <Navigate to="/login" replace />
                    )
                  } 
                /> {/* 排放因子管理路由 - 仅admin可访问 */}
                <Route path="/upload-data" element={token ? <DataUploadPage /> : <Navigate to="/login" replace />} /> {/* 数据上传路由 */}
                <Route 
                  path="/EmissionFactorManagement" 
                  element={<EmissionFactorManagementRoute />}
                /> {/* 新系统排放因子管理路由 - 仅admin可访问，未登录时显示专门的登录页面 */}
                <Route path="*" element={<Navigate to={token ? "/dashboard" : "/login"} replace />} />
            </Routes>
            {/* 在所有页面的底部渲染AI助手 */}
            <AiChat />
        </Router>
    );
}

export default App;
