import React, { useState, useEffect } from 'react';
import { Box, Button, Paper, Typography, IconButton, Snackbar, Alert } from '@mui/material';
import { Close as CloseIcon, Download as DownloadIcon } from '@mui/icons-material';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // 检测是否为移动设备
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      const isMobileViewport = window.innerWidth <= 768;
      return isMobileDevice || isMobileViewport;
    };
    
    const mobile = checkMobile();
    setIsMobile(mobile);

    // 检查是否已安装
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // 监听 beforeinstallprompt 事件（仅 Android Chrome）
    const handleBeforeInstallPrompt = (e) => {
      console.log('beforeinstallprompt 事件触发');
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 监听应用安装完成事件
    window.addEventListener('appinstalled', () => {
      console.log('应用已安装');
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setSnackbarMessage('应用已成功安装到主屏幕！');
      setSnackbarOpen(true);
    });

    // 延迟检查：如果 3 秒后还没有触发 beforeinstallprompt，且是移动设备，则显示手动安装提示
    const checkTimer = setTimeout(() => {
      setShowInstallPrompt((prev) => {
        if (!prev && mobile && !window.matchMedia('(display-mode: standalone)').matches) {
          console.log('未检测到自动安装提示，显示手动安装选项');
          // 检查是否满足 PWA 条件
          const hasManifest = document.querySelector('link[rel="manifest"]');
          const hasServiceWorker = 'serviceWorker' in navigator;
          
          if (hasManifest || hasServiceWorker) {
            return true;
          }
        }
        return prev;
      });
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(checkTimer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // 如果不支持自动安装，显示手动安装提示
      showManualInstallInstructions();
      return;
    }

    try {
      // 显示安装提示
      await deferredPrompt.prompt();

      // 等待用户响应
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setSnackbarMessage('正在安装应用...');
        setSnackbarOpen(true);
      } else {
        setSnackbarMessage('安装已取消');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('安装提示错误:', error);
      // 如果自动安装失败，显示手动安装提示
      showManualInstallInstructions();
    }

    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const showManualInstallInstructions = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge|OPR/.test(navigator.userAgent);

    let instructions = '';

    if (isIOS) {
      instructions = 'iOS 安装步骤：\n1. 点击浏览器底部的分享按钮（⬆️）\n2. 向下滚动找到"添加到主屏幕"\n3. 点击"添加"即可';
    } else if (isAndroid) {
      if (isChrome) {
        instructions = 'Android Chrome 安装：\n1. 点击浏览器右上角菜单（三个点）\n2. 选择"安装应用"或"添加到主屏幕"\n3. 确认安装';
      } else {
        instructions = 'Android 安装：\n1. 点击浏览器菜单（三个点）\n2. 选择"添加到主屏幕"\n3. 确认添加';
      }
    } else {
      instructions = '请使用移动设备访问此页面，然后按照浏览器提示添加到主屏幕';
    }

    setSnackbarMessage(instructions);
    setSnackbarOpen(true);
  };

  const handleClose = () => {
    setShowInstallPrompt(false);
  };

  // 如果已安装，不显示提示
  if (isInstalled) {
    return null;
  }

  // 如果不显示安装提示，不渲染组件
  if (!showInstallPrompt) {
    return null;
  }

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1300,
          p: 2,
          pb: 3,
        }}
      >
        <Paper
          elevation={6}
          sx={{
            p: 2,
            background: 'linear-gradient(135deg, #1a1f3a 0%, #0a0e27 100%)',
            border: '1px solid rgba(102, 187, 106, 0.3)',
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                安装应用到手机
              </Typography>
              <Typography variant="body2" color="text.secondary">
                添加到主屏幕，像原生 App 一样使用，支持离线访问
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={handleClose}
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<DownloadIcon />}
              onClick={handleInstallClick}
              sx={{
                background: 'linear-gradient(135deg, #66bb6a 0%, #4caf50 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                },
              }}
            >
              {deferredPrompt ? '安装应用' : '查看安装说明'}
            </Button>
          </Box>
        </Paper>
      </Box>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="info"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default InstallPrompt;



