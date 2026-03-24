import { useState, useEffect } from 'react';
import axios from 'axios';

export const useRegions = () => {
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRegions = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/regions');
        setRegions(res.data.data);
        setError(null);
      } catch (err) {
        setError("获取行政区划数据失败");
        console.error("Failed to fetch regions", err);
      } finally {
        setLoading(false);
      }
    };
    
    // 使用 requestIdleCallback 在浏览器空闲时加载，不阻塞渲染
    const loadRegions = () => fetchRegions();
    
    let cleanup;
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = window.requestIdleCallback(loadRegions, { timeout: 200 });
      cleanup = () => window.cancelIdleCallback(id);
    } else {
      // 使用 setTimeout(0) 在下一个事件循环执行
      const timeoutId = setTimeout(loadRegions, 0);
      cleanup = () => clearTimeout(timeoutId);
    }
    
    return cleanup;
  }, []);

  return { regions, loading, error };
};
