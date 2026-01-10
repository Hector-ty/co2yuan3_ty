import axios from 'axios';

// 配置 axios 默认设置
const axiosInstance = axios.create({
  timeout: 15000, // 15秒超时，适合移动端网络
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
axiosInstance.interceptors.request.use(
  (config) => {
    // 可以在这里添加 token 等
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 统一错误处理
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      // 超时错误
      console.error('请求超时，请检查网络连接');
      error.message = '请求超时，请检查网络连接后重试';
    } else if (error.response) {
      // 服务器返回了错误响应
      const { status, data } = error.response;
      if (status === 500) {
        error.message = '服务器错误，请稍后重试';
      } else if (status === 404) {
        error.message = '请求的资源不存在';
      } else if (status === 403) {
        error.message = '没有权限访问';
      } else {
        error.message = data?.error || data?.message || '请求失败，请稍后重试';
      }
    } else if (error.request) {
      // 请求已发出但没有收到响应
      error.message = '网络连接失败，请检查网络设置';
    } else {
      // 其他错误
      error.message = error.message || '未知错误，请稍后重试';
    }
    return Promise.reject(error);
  }
);

// 导出配置好的 axios 实例
export default axiosInstance;






























