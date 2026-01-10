import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
} from '@mui/material';
import { useMobileData } from '../hooks/useMobileData';
import { useRegions } from '../hooks/useRegions';
import StatCards from '../components/common/StatCards';
import ChartGrid from '../components/common/ChartGrid';
import '../pages/MobileDashboard.css';

const MobileDashboard = () => {
  const [selectedRegionCode, setSelectedRegionCode] = useState('');
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const navigate = useNavigate();
  const { data, loading, error } = useMobileData(selectedRegionCode);
  const { regions, loading: regionsLoading } = useRegions();

  // 添加加载超时检测
  useEffect(() => {
    if (loading || regionsLoading) {
      const timeoutId = setTimeout(() => {
        if (loading || regionsLoading) {
          setLoadingTimeout(true);
        }
      }, 20000); // 20秒后显示超时提示
      
      return () => clearTimeout(timeoutId);
    } else {
      setLoadingTimeout(false);
    }
  }, [loading, regionsLoading]);

  const handleRegionChange = (event) => {
    setSelectedRegionCode(event.target.value);
  };

  const handleChartClick = (chartType) => {
    navigate(`/chart/${chartType}`, { 
      state: { 
        data, 
        selectedRegionCode 
      } 
    });
  };

  if (loading || regionsLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', gap: 2 }}>
        <CircularProgress />
        {loadingTimeout && (
          <Alert severity="warning" sx={{ maxWidth: '80%', textAlign: 'center' }}>
            加载时间较长，请检查网络连接。如果持续无法加载，请刷新页面重试。
          </Alert>
        )}
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Box className="mobile-dashboard" sx={{ minHeight: '100vh', pb: 4 }}>
      <Container maxWidth="lg" sx={{ py: 2 }}>
        {/* 标题和地区选择 */}
        <Box sx={{ mb: 3, px: 2 }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold', textAlign: 'center' }}>
            碳排放分析
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel id="region-select-label">选择地区</InputLabel>
            <Select
              labelId="region-select-label"
              value={selectedRegionCode}
              label="选择地区"
              onChange={handleRegionChange}
            >
              <MenuItem value="">全部地区</MenuItem>
              {regions.map((region) => (
                <MenuItem key={region.code} value={region.code}>
                  {region.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* 统计卡片 */}
        {data?.cardData && (
          <Box sx={{ mb: 3, px: 2 }}>
            <StatCards cardData={data.cardData} />
          </Box>
        )}

        {/* 图表网格 */}
        {data && (
          <Box sx={{ px: 2 }}>
            <ChartGrid 
              charts={data} 
              onChartClick={handleChartClick}
            />
          </Box>
        )}

        {/* 空状态 */}
        {!data && !loading && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" color="text.secondary">
              暂无数据，请先添加碳排放数据
            </Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default MobileDashboard;
