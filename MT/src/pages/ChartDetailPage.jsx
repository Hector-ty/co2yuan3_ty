import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, Container, IconButton, Typography, Paper, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DonutChart from '../components/charts/DonutChart';
import StackedAreaChart from '../components/charts/StackedAreaChart';
import DualAxisChart from '../components/charts/DualAxisChart';
import LineChart from '../components/charts/LineChart';
import StackedBarChart from '../components/charts/StackedBarChart';
import EmissionMapChart from '../components/charts/EmissionMapChart';

const ChartDetailPage = () => {
  const { chartType } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { data } = location.state || {};

  const renderChart = () => {
    if (!data) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      );
    }

    switch (chartType) {
      case 'donut':
        return <DonutChart data={data.donutData} />;
      case 'stackedArea':
        return <StackedAreaChart data={data.stackedAreaChartData} />;
      case 'dualAxis':
        return <DualAxisChart data={data.dualAxisChartData} />;
      case 'line':
        return <LineChart data={data.lineChartData} />;
      case 'stackedBar':
        return <StackedBarChart data={data.stackedBarChartData} />;
      case 'map':
        return <EmissionMapChart data={data.rawData} />;
      default:
        return <Typography>未知的图表类型</Typography>;
    }
  };

  const getChartTitle = () => {
    const titles = {
      donut: '排放源占比',
      stackedArea: '近5年排放源结构变化',
      dualAxis: '单位建筑面积/人均碳排放',
      line: '碳排放总量年均变化率',
      stackedBar: '年度排放量构成',
      map: '排放地图',
    };
    return titles[chartType] || '图表详情';
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#0a0e27', pb: 4 }}>
      <Container maxWidth="lg" sx={{ py: 2 }}>
        {/* 头部 */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, px: 2 }}>
          <IconButton 
            onClick={() => navigate(-1)} 
            sx={{ color: '#fff', mr: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flex: 1, fontWeight: 'bold' }}>
            {getChartTitle()}
          </Typography>
        </Box>

        {/* 图表容器 */}
        <Paper 
          sx={{ 
            p: 2, 
            backgroundColor: 'rgba(26, 31, 58, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 2,
            minHeight: '60vh',
          }}
        >
          <Box sx={{ width: '100%', height: '60vh' }}>
            {renderChart()}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default ChartDetailPage;
