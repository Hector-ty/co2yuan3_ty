import React, { useState } from 'react';
import axios from 'axios';
import {
  Container, Typography, Card, CardContent, CardHeader
} from '@mui/material';
// 移除 framer-motion 导入，减少首次加载体积，立即显示登录页面
import LoginForm from '../components/LoginForm';
import RegistrationForm from '../components/RegistrationForm';

const LoginPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);

  const handleLogin = async (credentials) => {
    const res = await axios.post('/api/auth/login', credentials);
    if (res.data.success) {
      localStorage.setItem('user', JSON.stringify(res.data.user));
      onLogin(res.data.token);
    }
  };

  const handleRegister = async (userData) => {
    const res = await axios.post('/api/auth/register', userData);
    if (res.data.success) {
      alert('注册成功');
      setIsLogin(true);
    }
  };

  return (
    <Container component="main" maxWidth={isLogin ? "xs" : "md"} sx={{ px: { xs: 2, sm: 3 } }}>
      <Card sx={{ 
        mt: { xs: 4, sm: 8 }, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        p: { xs: 1.5, sm: 2 } 
      }}>
        <CardHeader 
          title={
            <Typography component="h1" variant="h5" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
              {isLogin ? '碳排放管理平台登录' : '碳排放管理平台注册'}
            </Typography>
          }
          sx={{ textAlign: 'center', width: '100%' }}
        />
        <CardContent sx={{ width: '100%', px: { xs: 1, sm: 2 }, maxWidth: '100%' }}>
          {isLogin ? (
            <LoginForm
              onLogin={handleLogin}
              onSwitchToRegister={() => setIsLogin(false)}
            />
          ) : (
            <RegistrationForm
              onRegister={handleRegister}
              onSwitchToLogin={() => setIsLogin(true)}
            />
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default LoginPage;
