import React from 'react';
import { Link } from 'react-router-dom';
import { useMediaQuery, useTheme } from '@mui/material';

/**
 * 右下角「AI 助手」入口按钮，点击跳转到 /ai-assistant 页面。
 * 仅登录后显示。
 */
function AIAssistantEntry() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Link
      to="/ai-assistant"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        textDecoration: 'none',
      }}
    >
      <button
        type="button"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: isMobile ? 88 : 100,
          height: isMobile ? 40 : 44,
          paddingLeft: 12,
          paddingRight: 12,
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.2)',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          color: '#ffffff',
          fontSize: isMobile ? '0.875rem' : '1rem',
          fontWeight: 500,
          cursor: 'pointer',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          transition: 'background-color 0.2s, transform 0.2s, box-shadow 0.2s',
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
      >
        AI 助手
      </button>
    </Link>
  );
}

export default AIAssistantEntry;
