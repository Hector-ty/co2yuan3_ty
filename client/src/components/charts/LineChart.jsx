import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { formatNumber } from '../../utils/formatNumber';

const LineChart = ({ data }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;
    
    const chart = echarts.init(chartRef.current);
    const safeData = data || { years: [], totalEmissions: [], changeRates: [] };
    
    // 准备数据：每个点包含碳排放总量和变化率标签
    const seriesData = safeData.years.map((year, index) => {
      const value = safeData.totalEmissions[index] || 0;
      const changeRate = safeData.changeRates[index];
      return {
        value: value,
        year: year,
        changeRate: changeRate
      };
    });

    const option = {
      tooltip: {
        trigger: 'axis',
        formatter: function(params) {
          try {
            // params是一个数组，取第一个参数（对应第一个系列）
            if (!params || !Array.isArray(params) || params.length === 0) {
              return '';
            }
            const param = params[0];
            
            // 获取数据索引
            const dataIndex = param.dataIndex;
            
            // 确保dataIndex有效
            if (dataIndex === undefined || dataIndex === null || dataIndex < 0) {
              return '';
            }
            
            // 尝试从seriesData获取数据
            let year = '';
            let value = 0;
            let changeRate = null;
            
            if (seriesData && Array.isArray(seriesData) && seriesData[dataIndex]) {
              const dataPoint = seriesData[dataIndex];
              year = dataPoint.year || '';
              value = dataPoint.value || 0;
              changeRate = dataPoint.changeRate;
            } else {
              // 如果seriesData不可用，直接从safeData获取
              year = safeData.years && safeData.years[dataIndex] ? safeData.years[dataIndex] : '';
              value = param.value || (safeData.totalEmissions && safeData.totalEmissions[dataIndex] ? safeData.totalEmissions[dataIndex] : 0);
              changeRate = safeData.changeRates && safeData.changeRates[dataIndex] ? safeData.changeRates[dataIndex] : null;
            }
            
            // 构建tooltip文本 - 确保至少有年份或值
            if (!year && value === 0) {
              // 如果既没有年份也没有值，返回默认信息
              return `数据点 ${dataIndex + 1}<br/>碳排放总量: ${formatNumber(Number(value))} tCO₂e`;
            }
            
            // 确保年份有值（至少显示数据点索引）
            const displayYear = year || `数据点 ${dataIndex + 1}`;
            let tooltipText = `${displayYear}年<br/>碳排放总量: ${formatNumber(Number(value))} tCO₂e`;
            
            // 如果有变化率，添加变化率信息
            if (changeRate !== null && changeRate !== undefined && changeRate !== '') {
              tooltipText += `<br/>变化率: ${changeRate}%`;
            }
            
            return tooltipText;
          } catch (error) {
            console.error('[Tooltip] 格式化错误:', error);
            return '';
          }
        },
        axisPointer: {
          type: 'line'
        }
      },
      grid: {
        left: '7%',
        right: '10%',
        top: '15%',
        bottom: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: safeData.years,
        name: '年份',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: {
          color: '#fff',
          fontWeight: 'bold'
        },
        axisLabel: {
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
        name: '碳排放总量 (tCO₂e)',
        nameLocation: 'end',
        nameGap: 20,
        nameTextStyle: {
          color: '#fff',
          fontWeight: 'bold'
        },
        axisLabel: {
          formatter: '{value}',
          color: '#fff'
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
      series: [
        {
          name: '碳排放总量',
          type: 'line',
          data: seriesData.map(d => d.value),
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          itemStyle: {
            color: '#66bb6a'
          },
          lineStyle: {
            color: '#66bb6a',
            width: 2
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: 'rgba(102, 187, 106, 0.6)' // 绿色，顶部稍深
                },
                {
                  offset: 1,
                  color: 'rgba(102, 187, 106, 0.2)' // 绿色，底部稍浅
                }
              ]
            }
          },
          // 在每个点上方显示变化率标签
          label: {
            show: true,
            position: 'top',
            formatter: (params) => {
              const dataPoint = seriesData[params.dataIndex];
              // 如果有变化率数据，显示变化率
              if (dataPoint.changeRate !== null && dataPoint.changeRate !== undefined) {
                const changeRate = parseFloat(dataPoint.changeRate);
                const sign = changeRate >= 0 ? '+' : '';
                return `${sign}${dataPoint.changeRate}%`;
              }
              return ''; // 第一个点没有变化率，不显示标签
            },
            color: '#fff',
            fontSize: 11
          },
          // 移除平均值标记线，因为不再需要
          markLine: {
            data: [],
            label: {
              color: '#fff'
            }
          }
        }
      ]
    };
    chart.setOption(option);

    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [data]);

  return <div ref={chartRef} style={{ width: '100%', height: '100%' }} />;
};

export default LineChart;
