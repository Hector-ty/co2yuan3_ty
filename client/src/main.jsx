import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AppProvider } from './context/AppContext.jsx';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const theme = createTheme({
  palette: {
    mode: 'dark', // Use dark mode for better contrast with video background
    primary: {
      main: '#66bb6a', // A slightly lighter green for dark mode
    },
    secondary: {
      main: '#ffc400',
    },
    background: {
      paper: 'rgba(0, 0, 0, 0.5)', // Darker semi-transparent background
      default: 'transparent',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        body {
          background-color: transparent !important;
        }
        /* 全局（普通文本）选中：半透明白底+黑字，避免遮挡笔画 */
        ::selection { background: rgba(255,255,255,0.35); color: #000; }
        ::-moz-selection { background: rgba(255,255,255,0.35); color: #000; }
        /* 输入/文本域默认填充颜色，避免渲染差异 */
        input, textarea, .MuiInputBase-input { WebkitTextFillColor: '#fff' }
        /* 输入/文本域选中：半透明白底+黑字，并强制文字填充为黑色，防止被高亮遮盖 */
        input::selection,
        textarea::selection,
        .MuiInputBase-input::selection,
        .MuiOutlinedInput-input::selection {
          background: rgba(255,255,255,0.35) !important;
          color: #000 !important;
          WebkitTextFillColor: '#000 !important'
        }
      `,
    },
    /* 默认输入未选中：黑底白字；选中：白底（半透明）黑字 */
    MuiInputBase: {
      styleOverrides: {
        root: {
          backgroundColor: '#000',
          '&.Mui-focused': {
            backgroundColor: '#000', // 保持与非焦点时相同的背景颜色
            boxShadow: 'none', // 移除阴影
          },
        },
        input: {
          color: '#fff', // 默认文字颜色保持白色
          // 移除浏览器默认焦点轮廓，并设置光标颜色
          outline: 'none',
          caretColor: '#fff', // 默认光标颜色为白色
          '&.Mui-focused': {
            color: '#000', // 焦点时文字变为黑色
            'WebkitTextFillColor': '#000', // 强制填充颜色为黑色
            caretColor: '#000', // 焦点时光标颜色为黑色
          },
          '::selection': {
            background: 'rgba(255,255,255,0.35)',
            color: '#000',
            WebkitTextFillColor: '#000',
          },
          // 尝试覆盖浏览器自动填充的背景色
          '&:-webkit-autofill': {
            WebkitBoxShadow: '0 0 0 1000px #000 inset', // 强制背景为黑色
            WebkitTextFillColor: '#fff', // 自动填充时文字为白色
          },
          '&:-webkit-autofill:focus': {
            WebkitBoxShadow: '0 0 0 1000px #000 inset', // 焦点自动填充时背景为黑色
            WebkitTextFillColor: '#000', // 焦点自动填充时文字为黑色
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#000',
          // 移除焦点高亮效果
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,0.3)', // 保持与非焦点时相同的边框颜色
            boxShadow: 'none', // 移除阴影
          },
        },
        input: {
          color: '#fff', // 默认文字颜色保持白色
          '&.Mui-focused': {
            color: '#000', // 焦点时文字变为黑色
            'WebkitTextFillColor': '#000', // 强制填充颜色为黑色
          },
          '::selection': {
            background: 'rgba(255,255,255,0.35)',
            color: '#000',
            WebkitTextFillColor: '#000',
          },
        },
        notchedOutline: {
          borderColor: 'rgba(255,255,255,0.3)',
        },
      },
    },
    MuiFilledInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#000',
          // 移除焦点高亮效果
          '&.Mui-focused': {
            backgroundColor: '#000', // 保持与非焦点时相同的背景颜色
            boxShadow: 'none', // 移除阴影
          },
        },
        input: {
          color: '#fff', // 默认文字颜色保持白色
          '&.Mui-focused': {
            color: '#000', // 焦点时文字变为黑色
            'WebkitTextFillColor': '#000', // 强制填充颜色为黑色
          },
          '::selection': {
            background: 'rgba(255,255,255,0.35)',
            color: '#000',
            WebkitTextFillColor: '#000',
          },
        },
      },
    },
    MuiAppBar: {
        styleOverrides: {
            root: {
                backgroundColor: 'rgba(0, 0, 0, 0.3)', // Darker semi-transparent AppBar
                backdropFilter: 'blur(10px)',
            }
        }
    },
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider>
        <App />
      </AppProvider>
    </ThemeProvider>
  </React.StrictMode>
);
