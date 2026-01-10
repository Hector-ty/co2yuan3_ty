import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Box, Typography } from '@mui/material'; // 使用MUI组件

const YearlyEmissionBarChart = ({ yearlyData, comparisonData, compareMode, currentYear }) => {
  if (!yearlyData || yearlyData.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Typography variant="body1" color="textSecondary">无年度排放数据</Typography></Box>;

  const renderYearlyTrendChart = () => {
    // 过滤并验证数据
    const validData = yearlyData.filter(d => d && d.calculatedEmissions);
    if (validData.length === 0) {
      return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography variant="body1" color="textSecondary">无有效的年度排放数据</Typography>
      </Box>;
    }
    
    const sortedData = [...validData].sort((a, b) => (a.year || 0) - (b.year || 0));
    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: { top: 'bottom' },
      grid: { 
        left: '10%', 
        right: '10%', 
        top: '10%',
        bottom: '15%', 
        containLabel: true 
      },
      xAxis: { 
        type: 'category', 
        data: sortedData.map(d => `${d.regionName || d.regionCode || ''}/${d.year || ''}`), 
        axisLabel: { interval: 0, rotate: 30 } 
      },
      yAxis: { type: 'value', name: 'tCO₂' },
      series: [
        {
          name: '直接排放',
          type: 'bar',
          stack: 'total',
          emphasis: { focus: 'series' },
          data: sortedData.map(d => {
            const breakdown = d.calculatedEmissions?.breakdown || {};
            const fossilFuels = breakdown.fossilFuels || 0;
            const mobileSources = breakdown.mobileSources || 0;
            return (fossilFuels + mobileSources).toFixed(2);
          })
        },
        {
          name: '间接排放',
          type: 'bar',
          stack: 'total',
          emphasis: { focus: 'series' },
          data: sortedData.map(d => {
            const breakdown = d.calculatedEmissions?.breakdown || {};
            const electricity = breakdown.electricity || 0;
            const heat = breakdown.heat || 0;
            return (electricity + heat).toFixed(2);
          })
        },
        {
            name: '总排放',
            type: 'line',
            yAxisIndex: 0,
            data: sortedData.map(d => {
              const total = d.calculatedEmissions?.totalEmissions || 0;
              return total.toFixed(2);
            }),
        }
      ]
    };
    return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />;
  };

  const renderComparisonChart = () => {
    const currentYearData = yearlyData.find(d => d && d.year === currentYear);
    if (!currentYearData || !currentYearData.calculatedEmissions) {
      return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography variant="body1" color="textSecondary">{`无 ${currentYear} 年的数据`}</Typography>
      </Box>;
    }

    // 过滤有效的对比数据
    const validComparisonData = (comparisonData || []).filter(d => d && d.calculatedEmissions);
    const allData = [{ ...currentYearData, regionName: currentYearData.regionName || '本单位' }, ...validComparisonData];
    
    if (allData.length === 0) {
      return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography variant="body1" color="textSecondary">无对比数据</Typography>
      </Box>;
    }
    
    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: { top: 'bottom' },
      grid: { 
        left: '10%', 
        right: '10%', 
        top: '10%',
        bottom: '15%', 
        containLabel: true 
      },
      xAxis: {
        type: 'category',
        data: allData.map(d => d.regionName || d.regionCode || '未知区域'),
        axisLabel: { interval: 0, rotate: 30 }
      },
      yAxis: { type: 'value', name: 'tCO₂' },
      series: [
        {
          name: '直接排放',
          type: 'bar',
          stack: 'total',
          emphasis: { focus: 'series' },
          data: allData.map(d => {
            const breakdown = d.calculatedEmissions?.breakdown || {};
            const fossilFuels = breakdown.fossilFuels || 0;
            const mobileSources = breakdown.mobileSources || 0;
            return (fossilFuels + mobileSources).toFixed(2);
          })
        },
        {
          name: '间接排放',
          type: 'bar',
          stack: 'total',
          emphasis: { focus: 'series' },
          data: allData.map(d => {
            const breakdown = d.calculatedEmissions?.breakdown || {};
            const electricity = breakdown.electricity || 0;
            const heat = breakdown.heat || 0;
            return (electricity + heat).toFixed(2);
          })
        },
        {
          name: '总排放',
          type: 'bar',
          emphasis: { focus: 'series' },
          data: allData.map(d => {
            const total = d.calculatedEmissions?.totalEmissions || 0;
            return total.toFixed(2);
          })
        }
      ]
    };
    return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />;
  };

  return (
    <div style={{ height: '100%', width: '100%' }}>
      {compareMode ? renderComparisonChart() : renderYearlyTrendChart()}
    </div>
  );
};

export default YearlyEmissionBarChart;
