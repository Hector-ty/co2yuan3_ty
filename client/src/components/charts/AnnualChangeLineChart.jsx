import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Box, Typography } from '@mui/material'; // 使用MUI组件
import { formatNumber } from '../../utils/formatNumber';

const AnnualChangeLineChart = ({ yearlyData, compareMode }) => {
  if (compareMode) {
    return (
      <Box sx={{ textAlign: 'center', p: 5, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body1" color="textSecondary">年变化率对比功能需要获取所有对比单位连续两年的数据，当前暂不支持。</Typography>
      </Box>
    );
  }
  
  if (!yearlyData || yearlyData.length < 2) {
    return (
        <Box sx={{ textAlign: 'center', p: 5, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body1" color="textSecondary">提交至少两年的数据后，将在此处显示年变化率图表。</Typography>
        </Box>
    );
  }

  // 过滤并验证数据
  const validData = yearlyData.filter(d => d && d.calculatedEmissions && d.calculatedEmissions.totalEmissions !== undefined);
  if (validData.length < 2) {
    return (
      <Box sx={{ textAlign: 'center', p: 5, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body1" color="textSecondary">提交至少两年的有效数据后，将在此处显示年变化率图表。</Typography>
      </Box>
    );
  }

  const sortedData = [...validData].sort((a, b) => {
    const yearA = Number(a.year) || 0;
    const yearB = Number(b.year) || 0;
    return yearA - yearB;
  });

  const chartData = [];
  for (let i = 1; i < sortedData.length; i++) {
    const currentYearData = sortedData[i];
    const previousYearData = sortedData[i - 1];
    
    // 确保数据是数值类型，处理null、undefined等情况
    const currentEmissions = Number(currentYearData?.calculatedEmissions?.totalEmissions) || 0;
    const previousEmissions = Number(previousYearData?.calculatedEmissions?.totalEmissions) || 0;

    let changeRate = 0;
    
    // 处理各种情况：
    // 1. 如果前一年为0，当前年不为0，变化率设为100%（表示从无到有）
    // 2. 如果前一年不为0，当前年为0，变化率设为-100%（表示完全减少）
    // 3. 如果两年都为0，变化率为0
    // 4. 如果前一年不为0，正常计算变化率
    if (previousEmissions === 0 && currentEmissions > 0) {
      changeRate = 100; // 从0到有值，设为100%增长
    } else if (previousEmissions > 0 && currentEmissions === 0) {
      changeRate = -100; // 从有值到0，设为-100%减少
    } else if (previousEmissions > 0) {
      changeRate = ((currentEmissions - previousEmissions) / previousEmissions) * 100;
    } else {
      changeRate = 0; // 两年都为0
    }

    // 确保变化率是有效数值
    const finalChangeRate = isFinite(changeRate) ? Number(changeRate.toFixed(2)) : 0;

    chartData.push({
      year: currentYearData?.year || '',
      changeRate: finalChangeRate
    });
  }

  if (chartData.length === 0) {
    return (
        <Box sx={{ textAlign: 'center', p: 5, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body1" color="textSecondary">无法计算年变化率。</Typography>
        </Box>
    );
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#ccc',
      borderWidth: 1,
      formatter: function(params) {
        try {
          if (!params || !Array.isArray(params) || params.length === 0) {
            return '';
          }
          const param = params[0];
          if (!param) return '';
          const name = param.name || '';
          let value = 0;
          if (typeof param.value === 'number') {
            value = param.value;
          } else if (param.value !== null && param.value !== undefined) {
            value = Number(param.value) || 0;
          }
          return `${name}年<br/>变化率: ${formatNumber(value)}%`;
        } catch (error) {
          console.error('[Tooltip] 格式化错误:', error);
          return '';
        }
      },
      textStyle: { // tooltip文字颜色为深色
        color: '#333',
        fontSize: 12
      }
    },
    grid: { // 设置正方形布局的grid边距
      left: '10%',
      right: '10%',
      top: '10%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: chartData.map(d => d.year),
      axisLabel: { // 确保X轴标签文字颜色为白色
        color: '#fff'
      }
    },
    yAxis: {
      type: 'value',
      name: '变化率 (%)',
      nameTextStyle: { // 确保Y轴名称文字颜色为白色
        color: '#fff'
      },
      axisLabel: {
        formatter: '{value} %',
        color: '#fff' // 确保Y轴标签文字颜色为白色
      },
      // 不设置min和max，让ECharts自动调整，这样可以显示所有变化率
      // 但如果变化率都是0，可能需要特殊处理
      scale: chartData.some(d => d.changeRate !== 0) ? false : true // 如果所有值都是0，使用scale模式
    },
    series: [
      {
        name: '变化率',
        data: chartData.map(d => {
          const value = Number(d.changeRate);
          // 确保返回的是有效数值，不是NaN或Infinity
          return isFinite(value) ? value : 0;
        }), // 确保是数值类型
        type: 'line',
        smooth: true, // 平滑曲线
        label: {
          show: true,
          formatter: function(params) {
            const value = params.value;
            if (!isFinite(value)) return formatNumber(0) + '%';
            return formatNumber(value) + '%'; // 格式化显示
          },
          color: '#fff' // 确保数据标签文字颜色为白色
        },
        itemStyle: { // 确保数据点颜色
          color: '#66bb6a' // 使用主题primary color
        },
        lineStyle: { // 确保线条颜色
          color: '#66bb6a', // 使用主题primary color
          width: 2
        },
        areaStyle: { // 添加区域填充（可选）
          opacity: 0.1,
          color: '#66bb6a'
        },
        markPoint: { // 添加标记点，突出显示变化
          data: [
            { type: 'max', name: '最大增长' },
            { type: 'min', name: '最大减少' }
          ],
          label: {
            color: '#fff'
          }
        }
      }
    ]
  };

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
    </div>
  );
};

export default AnnualChangeLineChart;
