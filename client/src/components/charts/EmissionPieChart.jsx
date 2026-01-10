import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Box, Typography, Grid } from '@mui/material'; // 使用MUI组件

const emissionTypes = {
  fossilFuels: '化石燃料燃烧',
  mobileSources: '移动源燃烧',
  electricity: '外购电力',
  heat: '外购热力',
};

const EmissionPieChart = ({ data, comparisonData, compareMode }) => {
  if (!data) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Typography variant="body1" color="textSecondary">无排放构成数据</Typography></Box>;

  const generatePieOption = (title, chartDataSource) => {
    const chartData = Object.entries(emissionTypes).map(([key, name]) => ({
      name,
      value: chartDataSource[key] || 0,
    })).filter(d => d.value > 0);

    if (chartData.length === 0) {
      return null; // ECharts will render an empty chart if data is empty, or we can handle it in render functions
    }

    return {
      title: {
        text: title,
        left: 'center',
        top: 'bottom'
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} tCO₂ ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left',
      },
      series: [{
        name: '排放来源',
        type: 'pie',
        radius: ['30%', '70%'], // 使用环形图，确保在正方形容器中正确显示
        center: ['50%', '50%'], // 确保饼图居中
        data: chartData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    };
  };

  const renderComparisonChart = () => {
    if (!comparisonData || comparisonData.length === 0) {
      return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Typography variant="body1" color="textSecondary">无同级别单位对比数据</Typography></Box>;
    }

    // 过滤有效的对比数据
    const validComparisonData = (comparisonData || []).filter(item => item && item.calculatedEmissions && item.calculatedEmissions.breakdown);
    if (validComparisonData.length === 0) {
      return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography variant="body1" color="textSecondary">无有效的同级别单位对比数据</Typography>
      </Box>;
    }

    // Calculate average for comparison data
    const avgBreakdown = {
      fossilFuels: 0,
      mobileSources: 0,
      electricity: 0,
      heat: 0,
    };
    
    validComparisonData.forEach(item => {
        const breakdown = item.calculatedEmissions?.breakdown || {};
        avgBreakdown.fossilFuels += breakdown.fossilFuels || 0;
        avgBreakdown.mobileSources += breakdown.mobileSources || 0;
        avgBreakdown.electricity += breakdown.electricity || 0;
        avgBreakdown.heat += breakdown.heat || 0;
    });

    const count = validComparisonData.length;
    if (count > 0) {
      Object.keys(avgBreakdown).forEach(key => {
        avgBreakdown[key] = (avgBreakdown[key] / count);
      });
    }

    const ownOption = generatePieOption('本单位', data);
    const avgOption = generatePieOption('同级别单位平均', avgBreakdown);

    return (
      <Grid container spacing={2} sx={{ height: '100%' }}> {/* 使用MUI Grid */}
        <Grid item xs={12} md={6} sx={{ height: '100%' }}>
          {ownOption ? <ReactECharts option={ownOption} style={{ height: '100%', width: '100%' }} /> : <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Typography variant="body1" color="textSecondary">无本单位数据</Typography></Box>}
        </Grid>
        <Grid item xs={12} md={6} sx={{ height: '100%' }}>
          {avgOption ? <ReactECharts option={avgOption} style={{ height: '100%', width: '100%' }} /> : <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Typography variant="body1" color="textSecondary">无对比数据</Typography></Box>}
        </Grid>
      </Grid>
    );
  };

  const renderSingleChart = () => {
    const option = generatePieOption('本单位排放构成', data);
    if (!option) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Typography variant="body1" color="textSecondary">无排放构成数据</Typography></Box>;
    return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />;
  };

  return (
    <div style={{ height: '100%', width: '100%' }}>
      {compareMode ? renderComparisonChart() : renderSingleChart()}
    </div>
  );
};

export default EmissionPieChart;
