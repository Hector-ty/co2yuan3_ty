import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 允许局域网访问（手机可通过电脑 IP 访问）
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
    fs: {
      strict: false,
    },
  },
  build: {
    // 启用代码分割，优化首次加载
    rollupOptions: {
      output: {
        manualChunks: {
          // 将大型库分离到单独的 chunk
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mui-vendor': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'chart-vendor': ['echarts', 'echarts-for-react', 'recharts'],
        },
      },
    },
    // 减少 chunk 大小警告阈值（可选）
    chunkSizeWarningLimit: 1000,
  },
})
