import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import { motion } from 'framer-motion';
import { 
  Storage as DatabaseIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';

const EmissionFactorLoginPage = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 统一的输入框样式 - 科技感设计
  const textFieldStyles = {
    position: 'relative',
    '& .MuiOutlinedInput-root': {
      borderRadius: 2,
      backgroundColor: 'rgba(15, 15, 30, 0.9) !important',
      transition: 'all 0.3s ease',
      border: '1px solid rgba(102, 126, 234, 0.3)',
      boxShadow: '0 0 10px rgba(102, 126, 234, 0.1), inset 0 0 20px rgba(102, 126, 234, 0.05)',
      '& .MuiOutlinedInput-input': {
        color: '#fff !important',
        backgroundColor: 'transparent !important',
        WebkitTextFillColor: '#fff !important',
        textShadow: '0 0 10px rgba(102, 126, 234, 0.5)',
        '&:focus': {
          backgroundColor: 'transparent !important',
          WebkitTextFillColor: '#fff !important'
        },
        '&::placeholder': {
          color: 'rgba(255, 255, 255, 0.5) !important',
          opacity: 1
        },
        '&:-webkit-autofill': {
          WebkitBoxShadow: '0 0 0 1000px rgba(15, 15, 30, 0.9) inset !important',
          WebkitTextFillColor: '#fff !important',
          backgroundColor: 'rgba(15, 15, 30, 0.9) !important'
        },
        '&:-webkit-autofill:hover': {
          WebkitBoxShadow: '0 0 0 1000px rgba(20, 20, 35, 0.95) inset !important',
          WebkitTextFillColor: '#fff !important'
        },
        '&:-webkit-autofill:focus': {
          WebkitBoxShadow: '0 0 0 1000px rgba(15, 15, 30, 0.9) inset !important',
          WebkitTextFillColor: '#fff !important'
        }
      },
      '&:hover': {
        backgroundColor: 'rgba(20, 20, 35, 0.95) !important',
        borderColor: 'rgba(102, 126, 234, 0.6)',
        boxShadow: '0 0 20px rgba(102, 126, 234, 0.3), inset 0 0 30px rgba(102, 126, 234, 0.1)',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: 'rgba(102, 126, 234, 0.6)',
          borderWidth: '2px'
        }
      },
      '&.Mui-focused': {
        backgroundColor: 'rgba(15, 15, 30, 0.9) !important',
        borderColor: 'rgba(102, 126, 234, 1)',
        boxShadow: '0 0 30px rgba(102, 126, 234, 0.6), inset 0 0 40px rgba(102, 126, 234, 0.15)',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: 'rgba(102, 126, 234, 1)',
          borderWidth: '2px'
        },
        '& .MuiOutlinedInput-input': {
          backgroundColor: 'transparent !important',
          WebkitTextFillColor: '#fff !important'
        }
      }
    },
    '& .MuiInputBase-root': {
      backgroundColor: 'rgba(15, 15, 30, 0.9) !important',
      '&:hover': {
        backgroundColor: 'rgba(20, 20, 35, 0.95) !important'
      },
      '&.Mui-focused': {
        backgroundColor: 'rgba(15, 15, 30, 0.9) !important'
      },
      '& fieldset': {
        borderColor: 'rgba(102, 126, 234, 0.3) !important'
      },
      '&:hover fieldset': {
        borderColor: 'rgba(102, 126, 234, 0.6) !important'
      },
      '&.Mui-focused fieldset': {
        borderColor: 'rgba(102, 126, 234, 1) !important'
      }
    },
    '& .MuiInputLabel-root': {
      color: 'rgba(139, 154, 255, 0.8) !important',
      backgroundColor: 'transparent !important',
      textShadow: '0 0 10px rgba(102, 126, 234, 0.5)'
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: 'rgba(139, 154, 255, 1) !important',
      textShadow: '0 0 15px rgba(102, 126, 234, 0.8)'
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: 'rgba(102, 126, 234, 0.3) !important'
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/login', { email, password });
      
      if (response.data.success) {
        // 仅允许超级管理员登录排放因子管理系统
        const user = response.data.user;
        if (user.role !== 'superadmin') {
          setError('此页面仅限超级管理员访问');
          setLoading(false);
          return;
        }

        // 如果提供了 onLoginSuccess 回调，调用它
        if (onLoginSuccess) {
          onLoginSuccess(response.data.token, user);
        } else {
          // 否则使用默认行为：保存登录信息并跳转
          // 为了与排放因子管理路由的独立认证保持一致，同时写入专用和主系统的存储键
          localStorage.setItem('emissionFactorToken', response.data.token);
          localStorage.setItem('emissionFactorUser', JSON.stringify(user));
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(user));
          // 触发自定义事件，通知路由组件重新检查认证状态
          window.dispatchEvent(new Event('emissionFactorAuthChange'));
          navigate('/EmissionFactorManagement', { replace: true });
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || '登录失败，请检查邮箱和密码');
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at center, #0a0e27 0%, #1a1a2e 50%, #16213e 100%)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 50%, rgba(240, 147, 251, 0.15) 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradientMove 10s ease infinite',
          '@keyframes gradientMove': {
            '0%': { backgroundPosition: '0% 50%' },
            '50%': { backgroundPosition: '100% 50%' },
            '100%': { backgroundPosition: '0% 50%' }
          },
          pointerEvents: 'none',
          zIndex: 0
        },
      }}
    >
      
      {/* 动态光点特效 - 超复杂版 */}
      {[...Array(50)].map((_, i) => {
        // 随机分散分布
        const topPos = (i * 137.5) % 100; // 使用黄金角度分布
        const leftPos = (i * 223.6) % 100;
        return (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              top: `${Math.max(2, Math.min(98, topPos))}%`,
              left: `${Math.max(2, Math.min(98, leftPos))}%`,
              width: `${5 + (i % 4) * 2}px`,
              height: `${5 + (i % 4) * 2}px`,
              borderRadius: '50%',
              background: i % 3 === 0 
                ? 'radial-gradient(circle, rgba(102, 126, 234, 1) 0%, rgba(102, 126, 234, 0.5) 50%, transparent 80%)'
                : i % 3 === 1
                ? 'radial-gradient(circle, rgba(240, 147, 251, 1) 0%, rgba(240, 147, 251, 0.5) 50%, transparent 80%)'
                : 'radial-gradient(circle, rgba(118, 75, 162, 1) 0%, rgba(118, 75, 162, 0.5) 50%, transparent 80%)',
              boxShadow: i % 3 === 0
                ? '0 0 30px rgba(102, 126, 234, 1), 0 0 60px rgba(102, 126, 234, 0.6), 0 0 90px rgba(102, 126, 234, 0.4)'
                : i % 3 === 1
                ? '0 0 30px rgba(240, 147, 251, 1), 0 0 60px rgba(240, 147, 251, 0.6), 0 0 90px rgba(240, 147, 251, 0.4)'
                : '0 0 30px rgba(118, 75, 162, 1), 0 0 60px rgba(118, 75, 162, 0.6), 0 0 90px rgba(118, 75, 162, 0.4)',
              animation: `twinkleFast${i % 4} ${1.5 + (i % 3) * 0.8}s ease-in-out infinite, floatFast${i % 3} ${5 + i * 0.3}s ease-in-out infinite, rotate${i % 2} ${10 + i * 0.5}s linear infinite`,
              opacity: 0.6,
              '@keyframes twinkleFast0': {
                '0%, 100%': { opacity: 0.4, transform: 'scale(0.7) rotate(0deg)' },
                '50%': { opacity: 1, transform: 'scale(1.4) rotate(180deg)' }
              },
              '@keyframes twinkleFast1': {
                '0%, 100%': { opacity: 0.5, transform: 'scale(0.8) rotate(0deg)' },
                '50%': { opacity: 1, transform: 'scale(1.5) rotate(-180deg)' }
              },
              '@keyframes twinkleFast2': {
                '0%, 100%': { opacity: 0.45, transform: 'scale(0.75) rotate(0deg)' },
                '50%': { opacity: 1, transform: 'scale(1.3) rotate(90deg)' }
              },
              '@keyframes twinkleFast3': {
                '0%, 100%': { opacity: 0.5, transform: 'scale(0.85) rotate(0deg)' },
                '50%': { opacity: 1, transform: 'scale(1.6) rotate(-90deg)' }
              },
              '@keyframes floatFast0': {
                '0%, 100%': { transform: 'translate(0, 0)' },
                '25%': { transform: 'translate(30px, -25px)' },
                '50%': { transform: 'translate(-20px, 30px)' },
                '75%': { transform: 'translate(25px, 15px)' }
              },
              '@keyframes floatFast1': {
                '0%, 100%': { transform: 'translate(0, 0)' },
                '33%': { transform: 'translate(-25px, 25px)' },
                '66%': { transform: 'translate(20px, -30px)' }
              },
              '@keyframes floatFast2': {
                '0%, 100%': { transform: 'translate(0, 0)' },
                '20%': { transform: 'translate(35px, 20px)' },
                '40%': { transform: 'translate(-30px, -25px)' },
                '60%': { transform: 'translate(15px, 35px)' },
                '80%': { transform: 'translate(-20px, -15px)' }
              },
              '@keyframes rotate0': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' }
              },
              '@keyframes rotate1': {
                '0%': { transform: 'rotate(360deg)' },
                '100%': { transform: 'rotate(0deg)' }
              },
              zIndex: 0,
              pointerEvents: 'none'
            }}
          />
        );
      })}
      
      {/* 大型脉冲光点 - 超复杂版 */}
      {[...Array(10)].map((_, i) => (
        <Box
          key={`large-${i}`}
          sx={{
            position: 'absolute',
            top: `${[15, 65, 8, 72, 35, 88, 25, 55, 12, 78][i]}%`,
            left: `${[20, 75, 5, 80, 30, 88, 18, 68, 10, 82][i]}%`,
            width: `${100 + i * 30}px`,
            height: `${100 + i * 30}px`,
            borderRadius: '50%',
            background: i % 2 === 0
              ? 'radial-gradient(circle, rgba(102, 126, 234, 0.35) 0%, rgba(102, 126, 234, 0.2) 40%, transparent 70%)'
              : 'radial-gradient(circle, rgba(240, 147, 251, 0.35) 0%, rgba(240, 147, 251, 0.2) 40%, transparent 70%)',
            filter: 'blur(30px)',
            animation: `pulseLargeFast${i} ${2.5 + i * 0.5}s ease-in-out infinite, moveLarge${i} ${12 + i * 2}s ease-in-out infinite`,
            opacity: 0.5,
            '@keyframes pulseLargeFast0': {
              '0%, 100%': { opacity: 0.4, transform: 'scale(0.9)' },
              '50%': { opacity: 0.9, transform: 'scale(1.4)' }
            },
            '@keyframes pulseLargeFast1': {
              '0%, 100%': { opacity: 0.45, transform: 'scale(0.85)' },
              '50%': { opacity: 0.95, transform: 'scale(1.5)' }
            },
            '@keyframes pulseLargeFast2': {
              '0%, 100%': { opacity: 0.4, transform: 'scale(0.95)' },
              '50%': { opacity: 0.85, transform: 'scale(1.35)' }
            },
            '@keyframes pulseLargeFast3': {
              '0%, 100%': { opacity: 0.5, transform: 'scale(0.9)' },
              '50%': { opacity: 1, transform: 'scale(1.45)' }
            },
            '@keyframes moveLarge0': {
              '0%, 100%': { transform: 'translate(0, 0)' },
              '25%': { transform: 'translate(40px, -30px)' },
              '50%': { transform: 'translate(-30px, 40px)' },
              '75%': { transform: 'translate(30px, 30px)' }
            },
            '@keyframes moveLarge1': {
              '0%, 100%': { transform: 'translate(0, 0)' },
              '33%': { transform: 'translate(-40px, 30px)' },
              '66%': { transform: 'translate(35px, -40px)' }
            },
            '@keyframes moveLarge2': {
              '0%, 100%': { transform: 'translate(0, 0)' },
              '20%': { transform: 'translate(50px, 25px)' },
              '40%': { transform: 'translate(-35px, -30px)' },
              '60%': { transform: 'translate(25px, 45px)' },
              '80%': { transform: 'translate(-30px, -20px)' }
            },
            '@keyframes moveLarge3': {
              '0%, 100%': { transform: 'translate(0, 0)' },
              '25%': { transform: 'translate(-35px, 35px)' },
              '50%': { transform: 'translate(40px, -25px)' },
              '75%': { transform: 'translate(-25px, -35px)' }
            },
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />
      ))}
      
      {/* 快速闪烁的小光点 */}
      {[...Array(25)].map((_, i) => {
        const topPos = (i * 144.7) % 100;
        const leftPos = (i * 233.1) % 100;
        return (
          <Box
            key={`quick-${i}`}
            sx={{
              position: 'absolute',
              top: `${Math.max(3, Math.min(97, topPos))}%`,
              left: `${Math.max(3, Math.min(97, leftPos))}%`,
              width: '3px',
              height: '3px',
              borderRadius: '50%',
              background: i % 2 === 0
                ? 'radial-gradient(circle, rgba(102, 126, 234, 1) 0%, transparent 80%)'
                : 'radial-gradient(circle, rgba(240, 147, 251, 1) 0%, transparent 80%)',
              boxShadow: i % 2 === 0
                ? '0 0 15px rgba(102, 126, 234, 1), 0 0 30px rgba(102, 126, 234, 0.7), 0 0 45px rgba(102, 126, 234, 0.4)'
                : '0 0 15px rgba(240, 147, 251, 1), 0 0 30px rgba(240, 147, 251, 0.7), 0 0 45px rgba(240, 147, 251, 0.4)',
              animation: `quickFlash${i % 2} ${0.8 + i * 0.1}s ease-in-out infinite`,
              opacity: 0.5,
              '@keyframes quickFlash0': {
                '0%, 100%': { opacity: 0.3, transform: 'scale(0.5)' },
                '50%': { opacity: 1, transform: 'scale(1.5)' }
              },
              '@keyframes quickFlash1': {
                '0%, 100%': { opacity: 0.4, transform: 'scale(0.6)' },
                '50%': { opacity: 1, transform: 'scale(1.8)' }
              },
              zIndex: 0,
              pointerEvents: 'none'
            }}
          />
        );
      })}
      
      {/* 中型脉冲光点 */}
      {[...Array(18)].map((_, i) => {
        const topPos = (i * 152.3) % 100;
        const leftPos = (i * 241.7) % 100;
        return (
          <Box
            key={`medium-${i}`}
            sx={{
              position: 'absolute',
              top: `${Math.max(5, Math.min(95, topPos))}%`,
              left: `${Math.max(5, Math.min(95, leftPos))}%`,
              width: `${40 + (i % 3) * 20}px`,
              height: `${40 + (i % 3) * 20}px`,
              borderRadius: '50%',
              background: i % 2 === 0
                ? 'radial-gradient(circle, rgba(102, 126, 234, 0.4) 0%, rgba(102, 126, 234, 0.2) 50%, transparent 80%)'
                : 'radial-gradient(circle, rgba(240, 147, 251, 0.4) 0%, rgba(240, 147, 251, 0.2) 50%, transparent 80%)',
              filter: 'blur(15px)',
              animation: `pulseMedium${i % 3} ${2 + i * 0.3}s ease-in-out infinite, drift${i % 2} ${8 + i * 0.5}s ease-in-out infinite`,
              opacity: 0.4,
              '@keyframes pulseMedium0': {
                '0%, 100%': { opacity: 0.3, transform: 'scale(0.8)' },
                '50%': { opacity: 0.7, transform: 'scale(1.3)' }
              },
              '@keyframes pulseMedium1': {
                '0%, 100%': { opacity: 0.35, transform: 'scale(0.85)' },
                '50%': { opacity: 0.75, transform: 'scale(1.4)' }
              },
              '@keyframes pulseMedium2': {
                '0%, 100%': { opacity: 0.32, transform: 'scale(0.9)' },
                '50%': { opacity: 0.68, transform: 'scale(1.25)' }
              },
              '@keyframes drift0': {
                '0%, 100%': { transform: 'translate(0, 0)' },
                '25%': { transform: 'translate(25px, -20px)' },
                '50%': { transform: 'translate(-20px, 25px)' },
                '75%': { transform: 'translate(20px, 20px)' }
              },
              '@keyframes drift1': {
                '0%, 100%': { transform: 'translate(0, 0)' },
                '33%': { transform: 'translate(-25px, 20px)' },
                '66%': { transform: 'translate(20px, -25px)' }
              },
              zIndex: 0,
              pointerEvents: 'none'
            }}
          />
        );
      })}
      
      {/* 流动光带效果 */}
      {[...Array(6)].map((_, i) => {
        const topPos = [18, 45, 72, 25, 58, 85][i];
        return (
          <Box
          key={`flow-${i}`}
          sx={{
            position: 'absolute',
            top: `${topPos}%`,
            left: '-100%',
            width: '300px',
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${
              i === 0 ? 'rgba(102, 126, 234, 0.9)' : i === 1 ? 'rgba(240, 147, 251, 0.9)' : 'rgba(118, 75, 162, 0.9)'
            }, transparent)`,
            boxShadow: i === 0
              ? '0 0 20px rgba(102, 126, 234, 1), 0 0 40px rgba(102, 126, 234, 0.6), 0 0 60px rgba(102, 126, 234, 0.3)'
              : i === 1
              ? '0 0 20px rgba(240, 147, 251, 1), 0 0 40px rgba(240, 147, 251, 0.6), 0 0 60px rgba(240, 147, 251, 0.3)'
              : '0 0 20px rgba(118, 75, 162, 1), 0 0 40px rgba(118, 75, 162, 0.6), 0 0 60px rgba(118, 75, 162, 0.3)',
            animation: `flow${i} ${12 + i * 2}s linear infinite`,
            opacity: 0.8,
            '@keyframes flow0': {
              '0%': { left: '-100%', opacity: 0 },
              '10%': { opacity: 1 },
              '90%': { opacity: 1 },
              '100%': { left: '100%', opacity: 0 }
            },
            '@keyframes flow1': {
              '0%': { left: '-100%', opacity: 0 },
              '10%': { opacity: 1 },
              '90%': { opacity: 1 },
              '100%': { left: '100%', opacity: 0 }
            },
            '@keyframes flow2': {
              '0%': { left: '-100%', opacity: 0 },
              '10%': { opacity: 1 },
              '90%': { opacity: 1 },
              '100%': { left: '100%', opacity: 0 }
            },
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />
        );
      })}
      
      {/* 旋转光环 */}
      {[...Array(8)].map((_, i) => {
        const topPos = [12, 58, 28, 75, 42, 88, 18, 65][i];
        const leftPos = [22, 68, 12, 78, 35, 85, 8, 72][i];
        return (
          <Box
          key={`ring-${i}`}
          sx={{
            position: 'absolute',
            top: `${topPos}%`,
            left: `${leftPos}%`,
            width: `${150 + i * 50}px`,
            height: `${150 + i * 50}px`,
            borderRadius: '50%',
            border: `2px solid ${i % 2 === 0 ? 'rgba(102, 126, 234, 0.4)' : 'rgba(240, 147, 251, 0.4)'}`,
            borderTopColor: i % 2 === 0 ? 'rgba(102, 126, 234, 1)' : 'rgba(240, 147, 251, 1)',
            borderRightColor: i % 2 === 0 ? 'rgba(102, 126, 234, 0.8)' : 'rgba(240, 147, 251, 0.8)',
            animation: `rotateRing${i % 2} ${8 + i * 2}s linear infinite`,
            opacity: 0.4,
            '@keyframes rotateRing0': {
              '0%': { transform: 'rotate(0deg) scale(1)' },
              '50%': { transform: 'rotate(180deg) scale(1.1)' },
              '100%': { transform: 'rotate(360deg) scale(1)' }
            },
            '@keyframes rotateRing1': {
              '0%': { transform: 'rotate(360deg) scale(1)' },
              '50%': { transform: 'rotate(180deg) scale(0.9)' },
              '100%': { transform: 'rotate(0deg) scale(1)' }
            },
            zIndex: 0,
            pointerEvents: 'none',
            filter: 'blur(1px)'
          }}
        />
        );
      })}
      
      {/* 多层背景光晕 */}
      {[...Array(5)].map((_, i) => {
        const topPos = [50, 28, 72, 18, 82][i];
        const leftPos = [50, 18, 78, 8, 88][i];
        return (
          <Box
          key={`glow-${i}`}
          sx={{
            position: 'absolute',
            top: `${topPos}%`,
            left: `${leftPos}%`,
            width: `${600 + i * 100}px`,
            height: `${600 + i * 100}px`,
            transform: 'translate(-50%, -50%)',
            background: i % 2 === 0
              ? 'radial-gradient(circle, rgba(102, 126, 234, 0.2) 0%, rgba(102, 126, 234, 0.1) 30%, transparent 70%)'
              : 'radial-gradient(circle, rgba(240, 147, 251, 0.2) 0%, rgba(240, 147, 251, 0.1) 30%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(60px)',
            animation: `breathe${i} ${5 + i * 0.8}s ease-in-out infinite`,
            opacity: 0.6,
            '@keyframes breathe0': {
              '0%, 100%': { opacity: 0.6, transform: 'translate(-50%, -50%) scale(1)' },
              '50%': { opacity: 0.9, transform: 'translate(-50%, -50%) scale(1.3)' }
            },
            '@keyframes breathe1': {
              '0%, 100%': { opacity: 0.5, transform: 'translate(-50%, -50%) scale(0.9)' },
              '50%': { opacity: 0.85, transform: 'translate(-50%, -50%) scale(1.4)' }
            },
            '@keyframes breathe2': {
              '0%, 100%': { opacity: 0.55, transform: 'translate(-50%, -50%) scale(1.1)' },
              '50%': { opacity: 0.9, transform: 'translate(-50%, -50%) scale(1.2)' }
            },
            '@keyframes breathe3': {
              '0%, 100%': { opacity: 0.6, transform: 'translate(-50%, -50%) scale(0.95)' },
              '50%': { opacity: 0.95, transform: 'translate(-50%, -50%) scale(1.35)' }
            },
            '@keyframes breathe4': {
              '0%, 100%': { opacity: 0.5, transform: 'translate(-50%, -50%) scale(1.05)' },
              '50%': { opacity: 0.85, transform: 'translate(-50%, -50%) scale(1.25)' }
            },
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />
        );
      })}
      
      {/* 星形光点 */}
      {[...Array(12)].map((_, i) => {
        const topPos = (i * 159.4) % 100;
        const leftPos = (i * 251.2) % 100;
        return (
          <Box
          key={`star-${i}`}
          sx={{
            position: 'absolute',
            top: `${Math.max(5, Math.min(95, topPos))}%`,
            left: `${Math.max(5, Math.min(95, leftPos))}%`,
            width: `${6 + (i % 3) * 3}px`,
            height: `${6 + (i % 3) * 3}px`,
            background: i % 2 === 0
              ? 'radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(102, 126, 234, 0.6) 50%, transparent 80%)'
              : 'radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(240, 147, 251, 0.6) 50%, transparent 80%)',
            clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
            animation: `starTwinkle${i % 3} ${1.2 + i * 0.15}s ease-in-out infinite, starRotate${i % 2} ${4 + i * 0.5}s linear infinite`,
            opacity: 0.5,
            '@keyframes starTwinkle0': {
              '0%, 100%': { opacity: 0.3, transform: 'scale(0.6)' },
              '50%': { opacity: 1, transform: 'scale(1.2)' }
            },
            '@keyframes starTwinkle1': {
              '0%, 100%': { opacity: 0.4, transform: 'scale(0.7)' },
              '50%': { opacity: 1, transform: 'scale(1.3)' }
            },
            '@keyframes starTwinkle2': {
              '0%, 100%': { opacity: 0.35, transform: 'scale(0.65)' },
              '50%': { opacity: 0.95, transform: 'scale(1.25)' }
            },
            '@keyframes starRotate0': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' }
            },
            '@keyframes starRotate1': {
              '0%': { transform: 'rotate(360deg)' },
              '100%': { transform: 'rotate(0deg)' }
            },
            zIndex: 0,
            pointerEvents: 'none',
            filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))'
          }}
        />
        );
      })}
      
      {/* 粒子轨迹线 */}
      {[...Array(15)].map((_, i) => {
        const topPos = (i * 166.5) % 100;
        const leftPos = (i * 262.8) % 100;
        return (
          <Box
          key={`trail-${i}`}
          sx={{
            position: 'absolute',
            top: `${Math.max(3, Math.min(97, topPos))}%`,
            left: `${Math.max(3, Math.min(97, leftPos))}%`,
            width: '2px',
            height: `${30 + (i % 4) * 15}px`,
            background: `linear-gradient(180deg, ${
              i % 3 === 0 
                ? 'rgba(102, 126, 234, 0.8) 0%, rgba(102, 126, 234, 0.4) 50%, transparent 100%'
                : i % 3 === 1
                ? 'rgba(240, 147, 251, 0.8) 0%, rgba(240, 147, 251, 0.4) 50%, transparent 100%'
                : 'rgba(118, 75, 162, 0.8) 0%, rgba(118, 75, 162, 0.4) 50%, transparent 100%'
            })`,
            boxShadow: i % 3 === 0
              ? '0 0 8px rgba(102, 126, 234, 0.6)'
              : i % 3 === 1
              ? '0 0 8px rgba(240, 147, 251, 0.6)'
              : '0 0 8px rgba(118, 75, 162, 0.6)',
            animation: `trailMove${i % 3} ${3 + i * 0.2}s ease-in-out infinite`,
            opacity: 0.3,
            '@keyframes trailMove0': {
              '0%, 100%': { opacity: 0.2, transform: 'translateY(0) rotate(0deg)' },
              '50%': { opacity: 0.8, transform: 'translateY(-20px) rotate(180deg)' }
            },
            '@keyframes trailMove1': {
              '0%, 100%': { opacity: 0.3, transform: 'translateY(0) rotate(0deg)' },
              '50%': { opacity: 0.9, transform: 'translateY(20px) rotate(-180deg)' }
            },
            '@keyframes trailMove2': {
              '0%, 100%': { opacity: 0.25, transform: 'translateY(0) rotate(0deg)' },
              '50%': { opacity: 0.85, transform: 'translateY(-15px) rotate(90deg)' }
            },
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />
        );
      })}
      
      {/* 六边形网格 */}
      {[...Array(20)].map((_, i) => {
        const topPos = (i * 173.6) % 100;
        const leftPos = (i * 274.4) % 100;
        return (
          <Box
            key={`hex-${i}`}
            sx={{
              position: 'absolute',
              top: `${Math.max(5, Math.min(95, topPos))}%`,
              left: `${Math.max(5, Math.min(95, leftPos))}%`,
              width: '40px',
              height: '40px',
              clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
              border: `1px solid ${i % 2 === 0 ? 'rgba(102, 126, 234, 0.15)' : 'rgba(240, 147, 251, 0.15)'}`,
              animation: `hexPulse${i % 2} ${4 + i * 0.3}s ease-in-out infinite`,
              opacity: 0.15,
              '@keyframes hexPulse0': {
                '0%, 100%': { opacity: 0.1, transform: 'scale(0.8) rotate(0deg)' },
                '50%': { opacity: 0.3, transform: 'scale(1.1) rotate(60deg)' }
              },
              '@keyframes hexPulse1': {
                '0%, 100%': { opacity: 0.15, transform: 'scale(0.9) rotate(0deg)' },
                '50%': { opacity: 0.35, transform: 'scale(1.15) rotate(-60deg)' }
              },
              zIndex: 0,
              pointerEvents: 'none'
            }}
          />
        );
      })}
      
      {/* 波浪光效 */}
      {[...Array(5)].map((_, i) => (
        <Box
          key={`wave-${i}`}
          sx={{
            position: 'absolute',
            top: `${15 + i * 18}%`,
            left: 0,
            right: 0,
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${
              i % 2 === 0 
                ? 'rgba(102, 126, 234, 0.4)' 
                : 'rgba(240, 147, 251, 0.4)'
            }, transparent)`,
            boxShadow: i % 2 === 0
              ? '0 0 15px rgba(102, 126, 234, 0.5)'
              : '0 0 15px rgba(240, 147, 251, 0.5)',
            animation: `wave${i} ${6 + i * 0.5}s ease-in-out infinite`,
            opacity: 0.3,
            '@keyframes wave0': {
              '0%, 100%': { opacity: 0.2, transform: 'scaleX(0.5)' },
              '50%': { opacity: 0.6, transform: 'scaleX(1.2)' }
            },
            '@keyframes wave1': {
              '0%, 100%': { opacity: 0.25, transform: 'scaleX(0.6)' },
              '50%': { opacity: 0.65, transform: 'scaleX(1.3)' }
            },
            '@keyframes wave2': {
              '0%, 100%': { opacity: 0.2, transform: 'scaleX(0.55)' },
              '50%': { opacity: 0.6, transform: 'scaleX(1.25)' }
            },
            '@keyframes wave3': {
              '0%, 100%': { opacity: 0.3, transform: 'scaleX(0.5)' },
              '50%': { opacity: 0.7, transform: 'scaleX(1.3)' }
            },
            '@keyframes wave4': {
              '0%, 100%': { opacity: 0.25, transform: 'scaleX(0.6)' },
              '50%': { opacity: 0.65, transform: 'scaleX(1.2)' }
            },
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />
      ))}
      
      {/* 三角形装饰 */}
      {[...Array(15)].map((_, i) => {
        const topPos = (i * 180.7) % 100;
        const leftPos = (i * 286) % 100;
        return (
          <Box
          key={`triangle-${i}`}
          sx={{
            position: 'absolute',
            top: `${Math.max(3, Math.min(97, topPos))}%`,
            left: `${Math.max(3, Math.min(97, leftPos))}%`,
            width: 0,
            height: 0,
            borderLeft: `${20 + (i % 3) * 10}px solid transparent`,
            borderRight: `${20 + (i % 3) * 10}px solid transparent`,
            borderBottom: `${35 + (i % 3) * 15}px solid ${
              i % 3 === 0 
                ? 'rgba(102, 126, 234, 0.3)' 
                : i % 3 === 1
                ? 'rgba(240, 147, 251, 0.3)'
                : 'rgba(118, 75, 162, 0.3)'
            }`,
            filter: 'blur(2px)',
            animation: `triangleFloat${i % 3} ${4 + i * 0.3}s ease-in-out infinite, triangleRotate${i % 2} ${8 + i * 0.5}s linear infinite`,
            opacity: 0.3,
            '@keyframes triangleFloat0': {
              '0%, 100%': { opacity: 0.2, transform: 'translateY(0)' },
              '50%': { opacity: 0.5, transform: 'translateY(-15px)' }
            },
            '@keyframes triangleFloat1': {
              '0%, 100%': { opacity: 0.25, transform: 'translateY(0)' },
              '50%': { opacity: 0.55, transform: 'translateY(15px)' }
            },
            '@keyframes triangleFloat2': {
              '0%, 100%': { opacity: 0.22, transform: 'translateY(0)' },
              '50%': { opacity: 0.52, transform: 'translateY(-10px)' }
            },
            '@keyframes triangleRotate0': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' }
            },
            '@keyframes triangleRotate1': {
              '0%': { transform: 'rotate(360deg)' },
              '100%': { transform: 'rotate(0deg)' }
            },
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />
        );
      })}
      
      {/* 菱形装饰 */}
      {[...Array(12)].map((_, i) => {
        const topPos = (i * 187.8) % 100;
        const leftPos = (i * 297.6) % 100;
        return (
          <Box
          key={`diamond-${i}`}
          sx={{
            position: 'absolute',
            top: `${Math.max(4, Math.min(96, topPos))}%`,
            left: `${Math.max(4, Math.min(96, leftPos))}%`,
            width: `${30 + (i % 3) * 15}px`,
            height: `${30 + (i % 3) * 15}px`,
            background: i % 2 === 0
              ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.25) 0%, rgba(102, 126, 234, 0.1) 100%)'
              : 'linear-gradient(135deg, rgba(240, 147, 251, 0.25) 0%, rgba(240, 147, 251, 0.1) 100%)',
            border: `1px solid ${i % 2 === 0 ? 'rgba(102, 126, 234, 0.4)' : 'rgba(240, 147, 251, 0.4)'}`,
            transform: 'rotate(45deg)',
            animation: `diamondPulse${i % 2} ${3 + i * 0.25}s ease-in-out infinite`,
            opacity: 0.3,
            '@keyframes diamondPulse0': {
              '0%, 100%': { opacity: 0.2, transform: 'rotate(45deg) scale(0.8)' },
              '50%': { opacity: 0.5, transform: 'rotate(45deg) scale(1.2)' }
            },
            '@keyframes diamondPulse1': {
              '0%, 100%': { opacity: 0.25, transform: 'rotate(45deg) scale(0.85)' },
              '50%': { opacity: 0.55, transform: 'rotate(45deg) scale(1.25)' }
            },
            zIndex: 0,
            pointerEvents: 'none',
            filter: 'blur(1px)'
          }}
        />
        );
      })}
      
      {/* 圆形渐变环 */}
      {[...Array(10)].map((_, i) => {
        const topPos = (i * 194.9) % 100;
        const leftPos = (i * 309.2) % 100;
        return (
          <Box
          key={`circle-ring-${i}`}
          sx={{
            position: 'absolute',
            top: `${Math.max(5, Math.min(95, topPos))}%`,
            left: `${Math.max(5, Math.min(95, leftPos))}%`,
            width: `${60 + (i % 4) * 20}px`,
            height: `${60 + (i % 4) * 20}px`,
            borderRadius: '50%',
            border: `3px solid ${i % 2 === 0 ? 'rgba(102, 126, 234, 0.3)' : 'rgba(240, 147, 251, 0.3)'}`,
            borderTopColor: i % 2 === 0 ? 'rgba(102, 126, 234, 0.9)' : 'rgba(240, 147, 251, 0.9)',
            borderRightColor: i % 2 === 0 ? 'rgba(102, 126, 234, 0.6)' : 'rgba(240, 147, 251, 0.6)',
            background: 'transparent',
            animation: `circleRingRotate${i % 2} ${6 + i * 0.4}s linear infinite, circleRingPulse${i % 2} ${4 + i * 0.3}s ease-in-out infinite`,
            opacity: 0.4,
            '@keyframes circleRingRotate0': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' }
            },
            '@keyframes circleRingRotate1': {
              '0%': { transform: 'rotate(360deg)' },
              '100%': { transform: 'rotate(0deg)' }
            },
            '@keyframes circleRingPulse0': {
              '0%, 100%': { opacity: 0.3, transform: 'scale(1)' },
              '50%': { opacity: 0.7, transform: 'scale(1.15)' }
            },
            '@keyframes circleRingPulse1': {
              '0%, 100%': { opacity: 0.35, transform: 'scale(1)' },
              '50%': { opacity: 0.75, transform: 'scale(1.2)' }
            },
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />
        );
      })}
      
      {/* 多边形装饰 */}
      {[...Array(8)].map((_, i) => {
        const topPos = (i * 202) % 100;
        const leftPos = (i * 320.8) % 100;
        const sides = 5 + (i % 3);
        const angle = 360 / sides;
        const points = Array.from({ length: sides }, (_, j) => {
          const a = (angle * j - 90) * (Math.PI / 180);
          const x = 50 + 40 * Math.cos(a);
          const y = 50 + 40 * Math.sin(a);
          return `${x}% ${y}%`;
        }).join(', ');
        
        return (
          <Box
            key={`polygon-${i}`}
            sx={{
              position: 'absolute',
              top: `${Math.max(6, Math.min(94, topPos))}%`,
              left: `${Math.max(6, Math.min(94, leftPos))}%`,
              width: `${50 + (i % 3) * 20}px`,
              height: `${50 + (i % 3) * 20}px`,
              clipPath: `polygon(${points})`,
              background: i % 2 === 0
                ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(102, 126, 234, 0.05) 100%)'
                : 'linear-gradient(135deg, rgba(240, 147, 251, 0.2) 0%, rgba(240, 147, 251, 0.05) 100%)',
              border: `1px solid ${i % 2 === 0 ? 'rgba(102, 126, 234, 0.3)' : 'rgba(240, 147, 251, 0.3)'}`,
              animation: `polygonRotate${i % 2} ${10 + i * 0.5}s linear infinite, polygonPulse${i % 2} ${5 + i * 0.3}s ease-in-out infinite`,
              opacity: 0.2,
              '@keyframes polygonRotate0': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' }
              },
              '@keyframes polygonRotate1': {
                '0%': { transform: 'rotate(360deg)' },
                '100%': { transform: 'rotate(0deg)' }
              },
              '@keyframes polygonPulse0': {
                '0%, 100%': { opacity: 0.15, transform: 'scale(0.9)' },
                '50%': { opacity: 0.4, transform: 'scale(1.1)' }
              },
              '@keyframes polygonPulse1': {
                '0%, 100%': { opacity: 0.2, transform: 'scale(0.95)' },
                '50%': { opacity: 0.45, transform: 'scale(1.15)' }
              },
              zIndex: 0,
              pointerEvents: 'none',
              filter: 'blur(1px)'
            }}
          />
        );
      })}
      
      {/* 静态网格线 */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            linear-gradient(rgba(102, 126, 234, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(102, 126, 234, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px',
          opacity: 0.3,
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />
      
      {/* 对角线装饰 */}
      {[...Array(12)].map((_, i) => {
        const topPos = [5, 15, 25, 35, 45, 55, 65, 75, 85, 12, 28, 68][i];
        const isLeft = i % 2 === 0;
        return (
          <Box
          key={`diagonal-${i}`}
          sx={{
            position: 'absolute',
            top: `${topPos}%`,
            left: isLeft ? '0%' : 'auto',
            right: !isLeft ? '0%' : 'auto',
            width: '200px',
            height: '1px',
            background: `linear-gradient(${i % 2 === 0 ? '135deg' : '45deg'}, transparent, ${
              i % 3 === 0 
                ? 'rgba(102, 126, 234, 0.3)' 
                : i % 3 === 1
                ? 'rgba(240, 147, 251, 0.3)'
                : 'rgba(118, 75, 162, 0.3)'
            }, transparent)`,
            transform: `rotate(${i % 2 === 0 ? '45deg' : '-45deg'})`,
            transformOrigin: i % 2 === 0 ? 'top left' : 'top right',
            animation: `diagonalFade${i % 3} ${4 + i * 0.3}s ease-in-out infinite`,
            opacity: 0.2,
            '@keyframes diagonalFade0': {
              '0%, 100%': { opacity: 0.1 },
              '50%': { opacity: 0.4 }
            },
            '@keyframes diagonalFade1': {
              '0%, 100%': { opacity: 0.15 },
              '50%': { opacity: 0.45 }
            },
            '@keyframes diagonalFade2': {
              '0%, 100%': { opacity: 0.12 },
              '50%': { opacity: 0.42 }
            },
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />
        );
      })}
      
      {/* 矩形框装饰 */}
      {[...Array(10)].map((_, i) => {
        const topPos = (i * 209.1) % 100;
        const leftPos = (i * 331.9) % 100;
        return (
          <Box
          key={`rect-${i}`}
          sx={{
            position: 'absolute',
            top: `${Math.max(4, Math.min(96, topPos))}%`,
            left: `${Math.max(4, Math.min(96, leftPos))}%`,
            width: `${80 + (i % 3) * 40}px`,
            height: `${50 + (i % 3) * 30}px`,
            border: `2px solid ${i % 2 === 0 ? 'rgba(102, 126, 234, 0.25)' : 'rgba(240, 147, 251, 0.25)'}`,
            borderRadius: '4px',
            background: 'transparent',
            boxShadow: i % 2 === 0
              ? 'inset 0 0 20px rgba(102, 126, 234, 0.1)'
              : 'inset 0 0 20px rgba(240, 147, 251, 0.1)',
            animation: `rectPulse${i % 2} ${5 + i * 0.3}s ease-in-out infinite, rectRotate${i % 2} ${12 + i * 0.5}s linear infinite`,
            opacity: 0.2,
            '@keyframes rectPulse0': {
              '0%, 100%': { opacity: 0.15, transform: 'scale(0.95)' },
              '50%': { opacity: 0.4, transform: 'scale(1.05)' }
            },
            '@keyframes rectPulse1': {
              '0%, 100%': { opacity: 0.2, transform: 'scale(0.9)' },
              '50%': { opacity: 0.45, transform: 'scale(1.1)' }
            },
            '@keyframes rectRotate0': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' }
            },
            '@keyframes rectRotate1': {
              '0%': { transform: 'rotate(360deg)' },
              '100%': { transform: 'rotate(0deg)' }
            },
            zIndex: 0,
            pointerEvents: 'none',
            filter: 'blur(0.5px)'
          }}
        />
        );
      })}
      
      {/* 椭圆装饰 */}
      {[...Array(8)].map((_, i) => {
        const topPos = (i * 216.2) % 100;
        const leftPos = (i * 343) % 100;
        return (
          <Box
          key={`ellipse-${i}`}
          sx={{
            position: 'absolute',
            top: `${Math.max(5, Math.min(95, topPos))}%`,
            left: `${Math.max(5, Math.min(95, leftPos))}%`,
            width: `${100 + (i % 3) * 50}px`,
            height: `${60 + (i % 3) * 30}px`,
            borderRadius: '50%',
            border: `2px solid ${i % 2 === 0 ? 'rgba(102, 126, 234, 0.2)' : 'rgba(240, 147, 251, 0.2)'}`,
            background: 'transparent',
            animation: `ellipsePulse${i % 2} ${4 + i * 0.3}s ease-in-out infinite`,
            opacity: 0.3,
            '@keyframes ellipsePulse0': {
              '0%, 100%': { opacity: 0.2, transform: 'scaleX(0.9) scaleY(0.9)' },
              '50%': { opacity: 0.5, transform: 'scaleX(1.1) scaleY(1.1)' }
            },
            '@keyframes ellipsePulse1': {
              '0%, 100%': { opacity: 0.25, transform: 'scaleX(0.95) scaleY(0.95)' },
              '50%': { opacity: 0.55, transform: 'scaleX(1.15) scaleY(1.15)' }
            },
            zIndex: 0,
            pointerEvents: 'none',
            filter: 'blur(1px)'
          }}
        />
        );
      })}
      
      <Container 
        component="main" 
        maxWidth="sm"
        sx={{ 
          position: 'relative',
          zIndex: 1,
          px: { xs: 2, sm: 3 },
          py: 4
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ width: '100%' }}
        >
          <Box
            sx={{
              p: { xs: 3, sm: 5 },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              zIndex: 2,
              width: '100%',
              maxWidth: 500
            }}
          >
            {/* 图标和标题区域 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Box
                sx={{
                  mb: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2
                }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      width: 100,
                      height: 100,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
                      animation: 'pulse 2s ease-in-out infinite',
                      '@keyframes pulse': {
                        '0%, 100%': { transform: 'scale(1)', opacity: 0.7 },
                        '50%': { transform: 'scale(1.1)', opacity: 0.4 }
                      }
                    }}
                  />
                  <DatabaseIcon 
                    sx={{ 
                      fontSize: 72,
                      position: 'relative',
                      zIndex: 3,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      filter: 'drop-shadow(0 0 20px rgba(102, 126, 234, 0.8)) drop-shadow(0 4px 8px rgba(102, 126, 234, 0.5))',
                      animation: 'iconGlow 2s ease-in-out infinite',
                      '@keyframes iconGlow': {
                        '0%, 100%': { filter: 'drop-shadow(0 0 20px rgba(102, 126, 234, 0.8)) drop-shadow(0 4px 8px rgba(102, 126, 234, 0.5))' },
                        '50%': { filter: 'drop-shadow(0 0 30px rgba(102, 126, 234, 1)) drop-shadow(0 4px 8px rgba(102, 126, 234, 0.7))' }
                      }
                    }} 
                  />
                </Box>
                <Typography 
                  component="h1" 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #8b9aff 0%, #b794f6 50%, #f093fb 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textAlign: 'center',
                    mb: 0.5,
                    color: '#fff',
                    position: 'relative',
                    zIndex: 3,
                    textShadow: '0 0 30px rgba(139, 154, 255, 0.5)',
                    letterSpacing: '2px',
                    animation: 'textShimmer 3s ease-in-out infinite',
                    '@keyframes textShimmer': {
                      '0%, 100%': { filter: 'brightness(1)' },
                      '50%': { filter: 'brightness(1.2)' }
                    }
                  }}
                >
                  排放因子管理系统
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 2,
                    py: 0.5,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
                    border: '1px solid rgba(139, 154, 255, 0.4)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <AdminIcon sx={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.7)' }} />
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#b794f6',
                      fontWeight: 600,
                      fontSize: '0.875rem'
                    }}
                  >
                    管理员登录
                  </Typography>
                </Box>
              </Box>
            </motion.div>

            <Divider sx={{ width: '100%', mb: 3, borderColor: 'rgba(102, 126, 234, 0.2)' }} />

            {/* 登录表单 */}
            <Box 
              component="form" 
              onSubmit={handleSubmit} 
              sx={{ 
                width: '100%',
                maxWidth: 400
              }}
            >
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Alert 
                    severity="error" 
                    sx={{ 
                      mb: 3,
                      borderRadius: 2,
                      boxShadow: '0 2px 8px rgba(211, 47, 47, 0.2)'
                    }}
                  >
                    {error}
                  </Alert>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="管理员邮箱"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  sx={textFieldStyles}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="密码"
                  type="password"
                  id="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  sx={textFieldStyles}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={{
                    mt: 4,
                    mb: 2,
                    py: 1.75,
                    borderRadius: 2,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    position: 'relative',
                    overflow: 'hidden',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4), 0 0 20px rgba(102, 126, 234, 0.3)',
                    transition: 'all 0.3s ease',
                    textShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: '-100%',
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                      transition: 'left 0.5s'
                    },
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                      boxShadow: '0 12px 32px rgba(102, 126, 234, 0.6), 0 0 30px rgba(102, 126, 234, 0.5)',
                      transform: 'translateY(-2px)',
                      '&::before': {
                        left: '100%'
                      }
                    },
                    '&:active': {
                      transform: 'translateY(0)',
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4), 0 0 15px rgba(102, 126, 234, 0.3)'
                    },
                    '&:disabled': {
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      opacity: 0.7
                    }
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    '登录'
                  )}
                </Button>
              </motion.div>

              <Typography 
                variant="body2" 
                align="center" 
                sx={{ 
                  mt: 3,
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5
                }}
              >
                <AdminIcon sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.5)' }} />
                仅限超级管理员账号登录
              </Typography>
            </Box>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
};

export default EmissionFactorLoginPage;

