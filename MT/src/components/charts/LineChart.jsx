import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const LineChart = ({ data }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !data) return;
    
    const chart = echarts.init(chartRef.current);
    const option = {
      tooltip: {
        trigger: 'axis',
        formatter: '{b}年<br/>变化率: {c}%'
      },
      grid: {
        left: '10%',
        right: '8%',
        bottom: '15%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: data.years || [],
        axisLabel: {
          color: '#fff',
          fontSize: 10
        }
      },
      yAxis: {
        type: 'value',
        name: '变化率 (%)',
        axisLabel: {
          formatter: '{value}%',
          color: '#fff',
          fontSize: 10
        },
        nameTextStyle: {
          color: '#fff',
          fontSize: 11
        }
      },
      series: [
        {
          data: data.changeRates || [],
          type: 'line',
          smooth: true,
          markLine: {
            data: [{ type: 'average', name: '平均值' }],
            label: {
              color: '#fff',
              fontSize: 10
            }
          },
          itemStyle: {
            color: '#66bb6a'
          },
          lineStyle: {
            color: '#66bb6a'
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

  return <div ref={chartRef} style={{ width: '100%', height: '100%', minHeight: '300px' }} />;
};

export default LineChart;
