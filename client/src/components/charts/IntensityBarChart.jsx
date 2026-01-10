import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Box, Typography, Grid } from '@mui/material'; // 使用MUI组件

const IntensityBarChart = ({ recordData, comparisonData, compareMode }) => {
  if (!recordData) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Typography variant="body1" color="textSecondary">无排放强度数据</Typography></Box>;

  const { perCapita, perArea } = recordData;

  const renderSingleChart = () => {
    // 确保数据是数值类型，而不是字符串
    const perCapitaValue = perCapita !== undefined && perCapita !== null ? Number(perCapita) : 0;
    const perAreaValue = perArea !== undefined && perArea !== null ? Number(perArea) : 0;
    
    const chartData = [
      { value: perCapitaValue, name: '人均排放 (tCO₂/人)' },
      { value: perAreaValue, name: '单位面积排放 (tCO₂/m²)' },
    ];

    // 如果所有值都是0，显示提示信息
    if (perCapitaValue === 0 && perAreaValue === 0) {
      return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography variant="body1" color="textSecondary">暂无排放强度数据</Typography>
      </Box>;
    }

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: function(params) {
          const param = params[0];
          return `${param.name}<br/>${param.seriesName}: ${param.value.toFixed(4)} ${param.name.includes('人均') ? 'tCO₂/人' : 'tCO₂/m²'}`;
        }
      },
      grid: { 
        containLabel: true,
        left: '10%',
        right: '10%',
        top: '15%',
        bottom: '15%'
      },
      xAxis: {
        type: 'category',
        data: chartData.map(d => d.name),
        axisLabel: {
          color: '#fff'
        }
      },
      yAxis: { 
        type: 'value',
        min: 0, // 确保Y轴从0开始
        axisLabel: {
          color: '#fff',
          formatter: function(value) {
            return value.toFixed(4); // 显示4位小数
          }
        }
      },
      series: [{
        name: '排放强度',
        type: 'bar',
        data: chartData.map(d => d.value), // 使用数值而不是字符串
        barWidth: '60%',
        itemStyle: {
          color: '#66bb6a'
        },
        label: {
          show: true,
          position: 'top',
          formatter: function(params) {
            return params.value.toFixed(4); // 在柱状图顶部显示数值
          },
          color: '#fff'
        }
      }]
    };
    return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />;
  };

  const renderComparisonChart = () => {
    if (!comparisonData || comparisonData.length === 0) {
      return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Typography variant="body1" color="textSecondary">无同级别单位对比数据</Typography></Box>;
    }
    
    // 安全地处理对比数据
    const validComparisonData = (comparisonData || []).filter(d => d && d.calculatedEmissions);
    const allData = [
      { ...recordData, regionName: recordData.regionName || '本单位' },
      ...validComparisonData.map(d => ({
        perArea: d.calculatedEmissions?.emissionIntensityByArea,
        perCapita: d.calculatedEmissions?.emissionIntensityByPerson,
        regionName: d.regionName || d.regionCode || '未知区域'
      }))
    ];

    const personIntensityData = allData.map(d => ({
      name: d.regionName,
      value: d.perCapita !== undefined && d.perCapita !== null ? Number(d.perCapita) : 0, // 确保是数值类型
    })).sort((a, b) => b.value - a.value);

    const areaIntensityData = allData.map(d => ({
        name: d.regionName,
        value: d.perArea !== undefined && d.perArea !== null ? Number(d.perArea) : 0, // 确保是数值类型
    })).sort((a, b) => b.value - a.value);

    const personOption = {
      title: { text: '人均排放对比', left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { containLabel: true, left: '3%', right: '4%', bottom: '3%'},
      xAxis: { type: 'category', data: personIntensityData.map(d => d.name), axisLabel: { interval: 0, rotate: 30 } },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: personIntensityData.map(d => d.value) }]
    };

    const areaOption = {
        title: { text: '单位面积排放对比', left: 'center', textStyle: { fontSize: 14 } },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { containLabel: true, left: '3%', right: '4%', bottom: '3%' },
        xAxis: { type: 'category', data: areaIntensityData.map(d => d.name), axisLabel: { interval: 0, rotate: 30 } },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: areaIntensityData.map(d => d.value) }]
      };

    return (
      <Grid container spacing={2} sx={{ height: '100%' }}> {/* 使用MUI Grid */}
        <Grid item xs={12} md={6} sx={{ height: '100%' }}>
          <ReactECharts option={personOption} style={{ height: '100%', width: '100%' }} />
        </Grid>
        <Grid item xs={12} md={6} sx={{ height: '100%' }}>
          <ReactECharts option={areaOption} style={{ height: '100%', width: '100%' }} />
        </Grid>
      </Grid>
    );
  };

  return (
    <div style={{ height: '100%', width: '100%' }}>
      {compareMode ? renderComparisonChart() : renderSingleChart()}
    </div>
  );
};

export default IntensityBarChart;
