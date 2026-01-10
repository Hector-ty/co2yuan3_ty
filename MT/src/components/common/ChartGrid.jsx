import React from 'react';
import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import DonutChartIcon from '@mui/icons-material/PieChart';
import AreaChartIcon from '@mui/icons-material/ShowChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import MapIcon from '@mui/icons-material/Map';
import TimelineIcon from '@mui/icons-material/Timeline';
import AnalyticsIcon from '@mui/icons-material/Analytics';

const ChartGrid = ({ charts, onChartClick }) => {
  if (!charts) return null;

  const chartConfigs = [
    {
      id: 'donut',
      title: '排放源占比',
      icon: <DonutChartIcon />,
      available: !!charts.donutData && charts.donutData.length > 0,
    },
    {
      id: 'stackedArea',
      title: '近5年排放源结构变化',
      icon: <AreaChartIcon />,
      available: !!charts.stackedAreaChartData && charts.stackedAreaChartData.years?.length > 0,
    },
    {
      id: 'dualAxis',
      title: '单位建筑面积/人均碳排放',
      icon: <AnalyticsIcon />,
      available: !!charts.dualAxisChartData && charts.dualAxisChartData.years?.length > 0,
    },
    {
      id: 'line',
      title: '碳排放总量年均变化率',
      icon: <TimelineIcon />,
      available: !!charts.lineChartData && charts.lineChartData.years?.length > 0,
    },
    {
      id: 'stackedBar',
      title: '年度排放量构成',
      icon: <BarChartIcon />,
      available: !!charts.stackedBarChartData && charts.stackedBarChartData.years?.length > 0,
    },
    {
      id: 'map',
      title: '排放地图',
      icon: <MapIcon />,
      available: !!charts.rawData && charts.rawData.length > 0,
    },
  ];

  return (
    <Grid container spacing={2}>
      {chartConfigs.map((config) => (
        <Grid item xs={6} sm={4} key={config.id}>
          <Card
            onClick={() => config.available && onChartClick(config.id)}
            sx={{
              background: 'rgba(26, 31, 58, 0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 2,
              height: '140px',
              cursor: config.available ? 'pointer' : 'default',
              opacity: config.available ? 1 : 0.5,
              transition: 'all 0.3s ease',
              '&:hover': config.available ? {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)',
                borderColor: 'rgba(102, 187, 106, 0.5)',
              } : {},
            }}
          >
            <CardContent sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              p: 2,
            }}>
              <Box sx={{ 
                color: config.available ? '#66bb6a' : '#666',
                mb: 1,
                fontSize: '2rem'
              }}>
                {config.icon}
              </Box>
              <Typography 
                variant="body2" 
                align="center"
                sx={{ 
                  fontSize: '0.875rem',
                  color: config.available ? '#fff' : '#666',
                  lineHeight: 1.2,
                }}
              >
                {config.title}
              </Typography>
              {!config.available && (
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ fontSize: '0.7rem', mt: 0.5 }}
                >
                  暂无数据
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default ChartGrid;
