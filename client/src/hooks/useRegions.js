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
    fetchRegions();
  }, []);

  return { regions, loading, error };
};
