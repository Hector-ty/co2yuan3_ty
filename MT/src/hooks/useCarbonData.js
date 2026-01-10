import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../utils/axiosConfig';

export const useCarbonData = () => {
  const [submittedData, setSubmittedData] = useState([]);
  const [allSubmittedData, setAllSubmittedData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');

  const refetchAllData = useCallback(async (searchYear = '', searchRegion = '') => {
    setLoadingData(true);
    setError('');
    try {
      const res = await axiosInstance.get('/api/carbon-data');
      const data = res.data?.data || [];
      
      const allData = Array.isArray(data) ? data : [];
      setAllSubmittedData(allData);
      
      let filteredData = allData;
      if (searchYear) {
        filteredData = filteredData.filter(d => d && d.year && d.year.toString() === searchYear);
      }
      if (searchRegion) {
        const isProvince = searchRegion.endsWith('0000');
        const isCity = searchRegion.endsWith('00') && !isProvince;
        if (isProvince) {
          const prefix = searchRegion.substring(0, 2);
          filteredData = filteredData.filter(d => d && d.regionCode && d.regionCode.startsWith(prefix));
        } else if (isCity) {
          const prefix = searchRegion.substring(0, 4);
          filteredData = filteredData.filter(d => d && d.regionCode && d.regionCode.startsWith(prefix));
        } else {
          filteredData = filteredData.filter(d => d && d.regionCode && d.regionCode === searchRegion);
        }
      }
      setSubmittedData(filteredData);
    } catch (err) {
      console.error('获取数据失败:', err);
      setError(err.response?.data?.error || "重新获取数据失败");
      setSubmittedData([]);
      setAllSubmittedData([]);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    refetchAllData();
  }, [refetchAllData]);

  return {
    submittedData,
    allSubmittedData,
    loadingData,
    error,
    setError,
    refetchAllData,
  };
};
