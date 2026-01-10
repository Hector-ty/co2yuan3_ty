import React from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import DonutChart from './charts/DonutChart';
import StackedAreaChart from './charts/StackedAreaChart';
import DualAxisChart from './charts/DualAxisChart';
import LineChart from './charts/LineChart';
import StackedBarChart from './charts/StackedBarChart';
import EmissionMapChart from './charts/EmissionMapChart';

const ChartsGrid = ({ charts }) => {
  if (!charts) return null;

  return (
    <Grid container spacing={{ xs: 2, sm: 3 }}>
      {/* 第一行：排放源占比、近5年排放源结构变化、单位建筑面积/人均碳排放 */}
      <Grid item xs={12} sm={6} md={4}>
        <Paper sx={{ 
          p: { xs: 1.5, sm: 2 }, // 移动端增加padding，给内部组件更多空间
          display: 'flex', 
          flexDirection: 'column',
          width: '100%',
          aspectRatio: '1', // 所有尺寸下保持正方形
          minHeight: { xs: '320px', sm: '300px', md: '400px' } // 移动端放大图表模块
        }}>
          <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' }, flexShrink: 0 }}>排放源占比</Typography>
          <Box sx={{ flex: 1, width: '100%', minHeight: 0 }}>
            <DonutChart data={charts.donutData} />
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <Paper sx={{ 
          p: { xs: 1.5, sm: 2 }, // 移动端增加padding，给内部组件更多空间
          display: 'flex', 
          flexDirection: 'column',
          width: '100%',
          aspectRatio: '1', // 所有尺寸下保持正方形
          minHeight: { xs: '320px', sm: '300px', md: '400px' } // 移动端放大图表模块
        }}>
          <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' }, flexShrink: 0 }}>近5年排放源结构变化</Typography>
          <Box sx={{ flex: 1, width: '100%', minHeight: 0 }}>
            <StackedAreaChart data={charts.stackedAreaChartData} />
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <Paper sx={{ 
          p: { xs: 1.5, sm: 2 }, // 移动端增加padding，给内部组件更多空间
          display: 'flex', 
          flexDirection: 'column',
          width: '100%',
          aspectRatio: '1', // 所有尺寸下保持正方形
          minHeight: { xs: '320px', sm: '300px', md: '400px' } // 移动端放大图表模块
        }}>
          <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' }, flexShrink: 0 }}>单位建筑面积/人均碳排放</Typography>
          <Box sx={{ flex: 1, width: '100%', minHeight: 0 }}>
            <DualAxisChart data={charts.dualAxisChartData} />
          </Box>
        </Paper>
      </Grid>
      {/* 第二行：碳排放总量年均变化率、年度排放量构成 */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ 
          p: { xs: 1.5, sm: 2 }, // 移动端增加padding，给内部组件更多空间
          display: 'flex', 
          flexDirection: 'column',
          width: '100%',
          aspectRatio: '1', // 所有尺寸下保持正方形
          minHeight: { xs: '320px', sm: '300px', md: '400px' } // 移动端放大图表模块
        }}>
          <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' }, flexShrink: 0 }}>碳排放总量年均变化率</Typography>
          <Box sx={{ flex: 1, width: '100%', minHeight: 0 }}>
            <LineChart data={charts.lineChartData} />
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper sx={{ 
          p: { xs: 1.5, sm: 2 }, // 移动端增加padding，给内部组件更多空间
          display: 'flex', 
          flexDirection: 'column',
          width: '100%',
          aspectRatio: '1', // 所有尺寸下保持正方形
          minHeight: { xs: '320px', sm: '300px', md: '400px' } // 移动端放大图表模块
        }}>
          <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' }, flexShrink: 0 }}>年度排放量构成</Typography>
          <Box sx={{ flex: 1, width: '100%', minHeight: 0 }}>
            <StackedBarChart data={charts.stackedBarChartData} />
          </Box>
        </Paper>
      </Grid>
      {/* 新增：在"年度排放量构成"后面添加"排放地图"模块，尺寸与颜色风格保持一致 */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ 
          p: { xs: 1.5, sm: 2 }, // 移动端增加padding，给内部组件更多空间
          pb: { xs: 2, sm: 2 }, // 确保底部有足够的padding
          display: 'flex', 
          flexDirection: 'column',
          width: '100%',
          aspectRatio: '1', // 所有尺寸下保持正方形
          minHeight: { xs: '320px', sm: '300px', md: '400px' }, // 移动端放大图表模块
          mb: { xs: 2, sm: 0 }, // 移动端添加底部边距
          overflow: 'hidden' // 防止内容溢出
        }}>
          <Typography variant="h6" sx={{ mb: 2, fontSize: { xs: '1rem', sm: '1.25rem' }, flexShrink: 0 }}>排放地图</Typography>
          <Box sx={{ flex: 1, width: '100%', minHeight: 0, position: 'relative', overflow: 'hidden' }}>
            <EmissionMapChart data={charts.rawData} />
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default ChartsGrid;
