import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Box, Typography, Grid } from '@mui/material'; // 使用MUI组件
import { formatNumber } from '../../utils/formatNumber';

const IntensityBarChart = ({ recordData, comparisonData, compareMode }) => {
  if (!recordData) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Typography variant="body1" color="textSecondary">无排放强度数据</Typography></Box>;

  const { perCapita, perArea } = recordData;

  const renderSingleChart = () => {
    // 确保数据是数值类型，而不是字符串
    const perCapitaValue = perCapita !== undefined && perCapita !== null ? Number(perCapita) : 0;
    const perAreaValue = perArea !== undefined && perArea !== null ? Number(perArea) : 0;
    
    const chartData = [
      { value: perAreaValue, name: '单位建筑面积碳排放量' },
      { value: perCapitaValue, name: '人均排放量' },
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
            const seriesName = param.seriesName || '数据';
            let value = 0;
            if (typeof param.value === 'number') {
              value = param.value;
            } else if (param.value !== null && param.value !== undefined) {
              value = Number(param.value) || 0;
            }
            // 悬停显示全称：CM (单位建筑面积碳排放量)、CR (人均排放量)
            const tooltipName = name === 'CM' ? 'CM (单位建筑面积碳排放量)' : (name === 'CR' ? 'CR (人均排放量)' : name);
            const unit =
              name.startsWith('CR') || name.includes('人均')
                ? 'tCO₂/人'
                : (name.startsWith('CM') || name.includes('面积'))
                  ? 'tCO₂/m²'
                  : '';
            return `${tooltipName}<br/>${seriesName}: ${formatNumber(value)} ${unit}`;
          } catch (error) {
            console.error('[Tooltip] 格式化错误:', error);
            return '';
          }
        },
        textStyle: {
          color: '#333',
          fontSize: 12
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
        name: '指标类型',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: {
          color: '#fff',
          fontWeight: 'bold'
        },
        axisLabel: {
          interval: 0,
          color: '#fff',
          fontWeight: 'bold'
        },
        axisLine: {
          lineStyle: {
            color: '#fff'
          }
        }
      },
      yAxis: { 
        type: 'value',
        min: 0, // 确保Y轴从0开始
        name: '碳排放强度 (tCO2e)',
        // 参考碳排放总量趋势图，y轴名称横向展示在轴末端
        nameLocation: 'end',
        nameGap: 20,
        nameTextStyle: {
          color: '#fff',
          fontWeight: 'bold'
        },
        axisLabel: {
          color: '#fff',
          formatter: function(value) {
            return formatNumber(value); // 整数保持整数，非整数保留2位小数
          }
        },
        axisLine: {
          lineStyle: {
            color: '#fff'
          }
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.1)'
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
            // 根据dataIndex获取对应的名称，判断单位
            const dataIndex = params.dataIndex;
            const itemName = chartData[dataIndex]?.name || '';
            const value = formatNumber(params.value);
            // 根据名称判断单位
            if (itemName.startsWith('CR') || itemName.includes('人均')) {
              return value + ' tCO₂/人';
            } else if (itemName.startsWith('CM') || itemName.includes('面积')) {
              return value + ' tCO₂/m²';
            }
            return value; // 默认不显示单位
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
      title: { 
        text: '人均排放对比', 
        left: 'center', 
        textStyle: { 
          fontSize: 14,
          color: '#fff'
        } 
      },
      tooltip: { 
        trigger: 'axis', 
        axisPointer: { type: 'shadow' },
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
            const marker = param.marker || '';
            const seriesName = param.seriesName || '数据';
            let value = 0;
            if (typeof param.value === 'number') {
              value = param.value;
            } else if (param.value !== null && param.value !== undefined) {
              value = Number(param.value) || 0;
            }
            return name + '<br/>' + marker + seriesName + ': ' + formatNumber(value) + ' tCO₂/人';
          } catch (error) {
            console.error('[Tooltip] 格式化错误:', error);
            return '';
          }
        },
        textStyle: {
          color: '#333',
          fontSize: 12
        }
      },
      grid: { containLabel: true, left: '3%', right: '4%', bottom: '3%'},
      xAxis: { 
        type: 'category', 
        data: personIntensityData.map(d => d.name), 
        name: '指标类型',
        nameLocation: 'middle',
        nameGap: 35,
        nameTextStyle: {
          color: '#fff',
          fontWeight: 'bold'
        },
        axisLabel: { 
          interval: 0, 
          rotate: 30,
          color: '#fff'
        },
        axisLine: {
          lineStyle: {
            color: '#fff'
          }
        }
      },
      yAxis: { 
        type: 'value',
        name: '碳排放强度 (tCO2e)',
        // 参考碳排放总量趋势图，y轴名称横向展示在轴末端
        nameLocation: 'end',
        nameGap: 20,
        nameTextStyle: {
          color: '#fff',
          fontWeight: 'bold'
        },
        axisLabel: {
          color: '#fff',
          formatter: function(value) {
            return formatNumber(value) + ' tCO₂/人';
          }
        },
        axisLine: {
          lineStyle: {
            color: '#fff'
          }
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      },
      series: [{ 
        type: 'bar', 
        data: personIntensityData.map(d => d.value),
        label: {
          show: true,
          position: 'top',
          formatter: function(params) {
            return formatNumber(params.value) + ' tCO₂/人';
          },
          color: '#fff'
        }
      }]
    };

    const areaOption = {
        title: { 
          text: '单位面积排放对比', 
          left: 'center', 
          textStyle: { 
            fontSize: 14,
            color: '#fff'
          } 
        },
        tooltip: { 
          trigger: 'axis', 
          axisPointer: { type: 'shadow' },
          backgroundColor: 'rgba(50, 50, 50, 0.9)',
          borderColor: '#666',
          borderWidth: 1,
          formatter: function(params) {
            try {
              if (!params || !Array.isArray(params) || params.length === 0) {
                return '';
              }
              const param = params[0];
              if (!param) return '';
              const name = param.name || '';
              const marker = param.marker || '';
              const seriesName = param.seriesName || '数据';
              let value = 0;
              if (typeof param.value === 'number') {
                value = param.value;
              } else if (param.value !== null && param.value !== undefined) {
                value = Number(param.value) || 0;
              }
              return name + '<br/>' + marker + seriesName + ': ' + formatNumber(value) + ' tCO₂/m²';
            } catch (error) {
              console.error('[Tooltip] 格式化错误:', error);
              return '';
            }
          },
          textStyle: {
            color: '#fff',
            fontSize: 12
          }
        },
        grid: { containLabel: true, left: '3%', right: '4%', bottom: '3%' },
        xAxis: { 
          type: 'category', 
          data: areaIntensityData.map(d => d.name), 
          name: '指标类型',
          nameLocation: 'middle',
          nameGap: 35,
          nameTextStyle: {
            color: '#fff',
            fontWeight: 'bold'
          },
          axisLabel: { 
            interval: 0, 
            rotate: 30,
            color: '#fff'
          },
          axisLine: {
            lineStyle: {
              color: '#fff'
            }
          }
        },
        yAxis: { 
          type: 'value',
          name: '碳排放强度 (tCO2e)',
          // 参考碳排放总量趋势图，y轴名称横向展示在轴末端
          nameLocation: 'end',
          nameGap: 20,
          nameTextStyle: {
            color: '#fff',
            fontWeight: 'bold'
          },
          axisLabel: {
            color: '#fff',
            formatter: function(value) {
              return formatNumber(value) + ' tCO₂/m²';
            }
          },
          axisLine: {
            lineStyle: {
              color: '#fff'
            }
          },
          splitLine: {
            lineStyle: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          }
        },
        series: [{ 
          type: 'bar', 
          data: areaIntensityData.map(d => d.value),
          label: {
            show: true,
            position: 'top',
            formatter: function(params) {
              return formatNumber(params.value) + ' tCO₂/m²';
            },
            color: '#fff'
          }
        }]
      };

    return (
      <Grid container spacing={2} sx={{ height: '100%' }}> {/* 使用MUI Grid */}
        <Grid item xs={12} md={6} sx={{ height: '100%' }}>
          <ReactECharts option={areaOption} style={{ height: '100%', width: '100%' }} />
        </Grid>
        <Grid item xs={12} md={6} sx={{ height: '100%' }}>
          <ReactECharts option={personOption} style={{ height: '100%', width: '100%' }} />
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
