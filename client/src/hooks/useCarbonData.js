import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export const useCarbonData = () => {
  const [submittedData, setSubmittedData] = useState([]);
  const [allSubmittedData, setAllSubmittedData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // 分页状态
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  
  // 保存当前的搜索条件，以便在分页切换时保持
  const [currentSearchYear, setCurrentSearchYear] = useState('');
  const [currentSearchRegion, setCurrentSearchRegion] = useState('');

  const refetchAllData = useCallback(async (searchYear = '', searchRegion = '', currentPage = page, currentPageSize = pageSize) => {
    // 检查是否有 token，如果没有则不发起请求
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('未找到 token，跳过数据获取');
      return;
    }

    setLoadingData(true);
    setError('');
    try {
      // 构建查询参数
      const params = {
        page: currentPage,
        limit: currentPageSize
      };
      
      if (searchYear) {
        params.year = searchYear;
      }
      if (searchRegion) {
        params.regionCode = searchRegion;
      }
      
      const res = await axios.get('/api/carbon-data', { params });
      const data = res.data?.data || [];
      const totalCount = res.data?.total || 0;
      
      // 确保数据是数组
      const allData = Array.isArray(data) ? data : [];
      
      // 更新总数
      setTotal(totalCount);
      
      // 如果使用了搜索条件，需要获取所有数据用于搜索过滤（保持向后兼容）
      // 但主要使用分页数据
      if (searchYear || searchRegion) {
        // 有搜索条件时，只使用当前页的数据
        setSubmittedData(allData);
        // 为了保持向后兼容，仍然保存所有数据（但实际只包含当前页）
        setAllSubmittedData(allData);
      } else {
        // 没有搜索条件时，使用分页数据
        setSubmittedData(allData);
        setAllSubmittedData(allData);
      }
    } catch (err) {
      console.error('获取数据失败:', err); // 详细错误日志
      console.error('错误响应:', err.response); // 响应详情
      setError(err.response?.data?.error || err.response?.data?.message || "重新获取数据失败");
      setSubmittedData([]); // 设置空数组，防止后续错误
      setAllSubmittedData([]);
      setTotal(0);
    } finally {
      setLoadingData(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    // 只有在有 token 的情况下才加载数据
    const token = localStorage.getItem('token');
    if (token) {
      // 使用 requestIdleCallback 在浏览器空闲时加载，不阻塞渲染
      // 如果浏览器不支持 requestIdleCallback，使用 setTimeout(0) 让它在下一个事件循环执行
      const loadData = () => refetchAllData('', '', page, pageSize);
      
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(loadData, { timeout: 200 });
      } else {
        // 使用 setTimeout(0) 在下一个事件循环执行，不阻塞当前渲染
        setTimeout(loadData, 0);
      }
    }
  }, [refetchAllData, page, pageSize]);

  const handleSearch = (searchYear, searchRegion) => {
    // 保存搜索条件
    setCurrentSearchYear(searchYear || '');
    setCurrentSearchRegion(searchRegion || '');
    // 搜索时重置到第一页
    setPage(1);
    // 使用新的搜索条件重新获取数据（带分页）
    refetchAllData(searchYear, searchRegion, 1, pageSize);
  };
  
  // 处理分页变化
  const handlePageChange = (event, newPage) => {
    const newPageNum = newPage + 1; // MUI的TablePagination使用0-based索引，我们需要1-based
    setPage(newPageNum);
    // 保持当前的搜索条件
    refetchAllData(currentSearchYear, currentSearchRegion, newPageNum, pageSize);
  };
  
  // 处理每页条数变化
  const handlePageSizeChange = (event) => {
    const newPageSize = parseInt(event.target.value, 10);
    setPageSize(newPageSize);
    setPage(1); // 重置到第一页
    // 保持当前的搜索条件
    refetchAllData(currentSearchYear, currentSearchRegion, 1, newPageSize);
  };

  const handleDelete = async (id) => {
    if (window.confirm("确定删除此条记录吗?")) {
      try {
        await axios.delete(`/api/carbon-data/${id}`);
        setSuccess('记录已删除');
        // 删除后重新获取当前页数据
        // 如果当前页只剩一条数据，删除后应该跳转到上一页
        const currentPageDataCount = submittedData.length;
        if (currentPageDataCount === 1 && page > 1) {
          // 如果当前页只有一条数据且不是第一页，跳转到上一页
          const newPage = page - 1;
          setPage(newPage);
          refetchAllData(currentSearchYear, currentSearchRegion, newPage, pageSize);
        } else {
          // 否则刷新当前页
          refetchAllData(currentSearchYear, currentSearchRegion, page, pageSize);
        }
      } catch (err) {
        setError(err.response?.data?.error || '删除失败');
      }
    }
  };

  // 批量删除选中的记录
  const handleBatchDelete = async (ids) => {
    if (!ids || ids.length === 0) return;
    if (!window.confirm(`确定删除选中的 ${ids.length} 条记录吗？`)) return;
    try {
      for (const id of ids) {
        await axios.delete(`/api/carbon-data/${id}`);
      }
      setSuccess(`已删除 ${ids.length} 条记录`);
      const rest = submittedData.length - ids.length;
      if (rest <= 0 && page > 1) {
        const newPage = page - 1;
        setPage(newPage);
        refetchAllData(currentSearchYear, currentSearchRegion, newPage, pageSize);
      } else {
        refetchAllData(currentSearchYear, currentSearchRegion, page, pageSize);
      }
    } catch (err) {
      setError(err.response?.data?.error || '批量删除失败');
      refetchAllData(currentSearchYear, currentSearchRegion, page, pageSize);
    }
  };

  const handleSaveEdit = (updatedRecord) => {
    // 如果提供了更新后的记录，只更新本地状态，避免重新获取所有数据
    if (updatedRecord) {
      setSubmittedData(prevData => {
        // 从现有数据中查找对应的regionName，保持一致性
        const existing = prevData.find(item => item._id === updatedRecord._id);
        const regionName = existing?.regionName || '未知区域';
        
        return prevData.map(item => 
          item._id === updatedRecord._id 
            ? { ...updatedRecord, regionName } 
            : item
        );
      });
      
      setAllSubmittedData(prevData => {
        // 从现有数据中查找对应的regionName，保持一致性
        const existing = prevData.find(item => item._id === updatedRecord._id);
        const regionName = existing?.regionName || '未知区域';
        
        return prevData.map(item => 
          item._id === updatedRecord._id 
            ? { ...updatedRecord, regionName } 
            : item
        );
      });
      
      setSuccess('数据更新成功');
    } else {
      // 如果没有提供更新后的记录，则重新获取当前页数据
      refetchAllData('', '', page, pageSize);
    }
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
      // 提交新数据后，跳转到第一页查看最新数据
      setPage(1);
      refetchAllData('', '', 1, pageSize);
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
      throw err; // 抛出以便调用方（如预览模态框）可 await 并处理关闭/重试逻辑
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
    handleBatchDelete,
    handleSaveEdit,
    handleFormSubmit,
    handleExport,
    // 分页相关
    page,
    pageSize,
    total,
    handlePageChange,
    handlePageSizeChange,
  };
};
