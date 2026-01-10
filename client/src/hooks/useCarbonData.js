import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export const useCarbonData = () => {
  const [submittedData, setSubmittedData] = useState([]);
  const [allSubmittedData, setAllSubmittedData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const refetchAllData = useCallback(async (searchYear = '', searchRegion = '') => {
    setLoadingData(true);
    setError('');
    try {
      const res = await axios.get('/api/carbon-data');
      const data = res.data?.data || [];
      
      // 确保数据是数组
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
      console.error('获取数据失败:', err); // 详细错误日志
      console.error('错误响应:', err.response); // 响应详情
      setError(err.response?.data?.error || err.response?.data?.message || "重新获取数据失败");
      setSubmittedData([]); // 设置空数组，防止后续错误
      setAllSubmittedData([]);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    refetchAllData();
  }, [refetchAllData]);

  const handleSearch = (searchYear, searchRegion) => {
    let filteredData = [...allSubmittedData];
    if (searchYear) {
      filteredData = filteredData.filter(d => d.year.toString() === searchYear);
    }
    if (searchRegion) {
      const isProvince = searchRegion.endsWith('0000');
      const isCity = searchRegion.endsWith('00') && !isProvince;
      if (isProvince) {
        const prefix = searchRegion.substring(0, 2);
        filteredData = filteredData.filter(d => d.regionCode.startsWith(prefix));
      } else if (isCity) {
        const prefix = searchRegion.substring(0, 4);
        filteredData = filteredData.filter(d => d.regionCode.startsWith(prefix));
      } else {
        filteredData = filteredData.filter(d => d.regionCode === searchRegion);
      }
    }
    setSubmittedData(filteredData);
  };

  const handleDelete = async (id) => {
    if (window.confirm("确定删除此条记录吗?")) {
      try {
        await axios.delete(`/api/carbon-data/${id}`);
        setSuccess('记录已删除');
        refetchAllData();
      } catch (err) {
        setError(err.response?.data?.error || '删除失败');
      }
    }
  };

  const handleSaveEdit = () => {
    refetchAllData();
  };

  const handleFormSubmit = async (values) => {
    const { year, regionCode: regionCodeArray, ...activityData } = values;
    const regionCode = Array.isArray(regionCodeArray) ? regionCodeArray[regionCodeArray.length - 1] : regionCodeArray;
    const payload = { year, regionCode, activityData };
    try {
      console.log('提交数据:', payload); // 调试日志
      const response = await axios.post('/api/carbon-data', payload);
      console.log('提交成功:', response.data); // 调试日志
      setSuccess('数据提交成功!');
      localStorage.removeItem('carbon_form_data');
      refetchAllData();
    } catch (err) {
      console.error('数据提交失败:', err); // 详细错误日志
      console.error('错误响应:', err.response); // 响应详情
      
      // 根据不同的错误类型提供更详细的错误信息
      let errorMessage = '数据提交失败';
      if (err.response) {
        // 服务器返回了响应
        const status = err.response.status;
        const data = err.response.data;
        
        if (status === 401) {
          errorMessage = '未授权：请重新登录';
        } else if (status === 403) {
          errorMessage = '权限不足：您没有提交数据的权限';
        } else if (status === 400) {
          errorMessage = data?.error || '数据格式错误：请检查输入的数据';
        } else if (status === 500) {
          // 显示后端返回的具体错误信息
          errorMessage = data?.error || data?.message || '服务器错误：请稍后重试';
          // 如果是开发环境，显示更多详情
          if (process.env.NODE_ENV === 'development' && data?.details) {
            console.error('服务器错误详情:', data.details);
          }
        } else {
          errorMessage = data?.error || data?.message || `提交失败 (${status})`;
        }
      } else if (err.request) {
        // 请求已发出但没有收到响应
        errorMessage = '网络错误：无法连接到服务器，请检查后端服务是否运行';
      } else {
        // 其他错误
        errorMessage = err.message || '数据提交失败';
      }
      
      setError(errorMessage);
    }
  };

  const handleExport = async () => {
    try {
      const res = await axios.get('/api/reports/excel', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = res.headers['content-disposition']?.split('filename=')[1]?.replace(/"/g, '') || 'carbon_report.xlsx';
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('导出失败');
    }
  };

  return {
    submittedData,
    allSubmittedData,
    loadingData,
    error,
    success,
    setError,
    setSuccess,
    refetchAllData,
    handleSearch,
    handleDelete,
    handleSaveEdit,
    handleFormSubmit,
    handleExport,
  };
};
