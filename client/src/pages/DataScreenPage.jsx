import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert, useMediaQuery, useTheme, IconButton } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useDataScreen } from '../hooks/useDataScreen';
import { useRegions } from '../hooks/useRegions'; // 导入useRegions
import StatCardsGrid from '../components/StatCardsGrid';
import ChartsGrid from '../components/ChartsGrid';
import DataScreenRegionSelector from '../components/DataScreenRegionSelector'; // 导入DataScreenRegionSelector

const DataScreenPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  
  const [selectedRegionCode, setSelectedRegionCode] = useState(''); // 添加地区选择状态
  const { data, loading, error } = useDataScreen(selectedRegionCode); // 将selectedRegionCode传递给hook
  const { regions } = useRegions(); // 获取地区数据

  const handleRegionChange = (event) => {
    setSelectedRegionCode(event.target.value);
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  if (loading) return <CircularProgress sx={{ display: 'block', margin: '20px auto' }} />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box sx={{ p: { xs: 1, sm: 3 }, color: 'white', minHeight: '100vh' }}>
      <Box sx={{ 
        position: 'absolute',
        top: { xs: 16, sm: 24 },
        left: { xs: 16, sm: 24 },
        zIndex: 1000
      }}>
        <IconButton 
          onClick={handleBack}
          sx={{ 
            color: 'white',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)'
            }
          }}
        >
          <ArrowBack />
        </IconButton>
      </Box>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'stretch', md: 'center' }, 
        mb: { xs: 2, md: 4 },
        gap: { xs: 2, md: 0 }
      }}>
        <Typography variant="h4" sx={{ 
          flexGrow: 1, 
          textAlign: { xs: 'center', md: 'center' },
          fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
        }}>
          数据大屏
        </Typography>
        <Box sx={{ width: { xs: '100%', md: 200 } }}>
          <DataScreenRegionSelector value={selectedRegionCode} onChange={handleRegionChange} />
        </Box>
      </Box>
      <StatCardsGrid data={data?.cardData} />
      <ChartsGrid charts={data} />
    </Box>
  );
};

export default DataScreenPage;
