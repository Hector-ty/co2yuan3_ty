import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { formatNumber } from '../../utils/formatNumber';

const DonutChart = ({ data }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);
    const pieData = Array.isArray(data) ? data : [];
    const option = {
      tooltip: {
        trigger: 'item',
        formatter: (params) => `${params.name}<br/>${formatNumber(params.value)} tCO₂<br/>${formatNumber(params.percent ?? 0)}%`
      },
      legend: {
        top: '5%',
        left: 'center',
        textStyle: {
          color: '#fff'
        }
      },
      series: [
        {
          name: '排放源',
          type: 'pie',
          radius: ['40%', '65%'],
          center: ['50%', '55%'],
          avoidLabelOverlap: true,
          // 去除圆角，保持纯色扇区
          itemStyle: {
            borderRadius: 0,
            borderColor: '#fff',
            borderWidth: 1
          },
          label: {
            show: true,
            position: 'inside',
            formatter: ({ percent }) => `${formatNumber(percent ?? 0)}%`,
            color: '#fff',
            fontSize: 12,
            fontWeight: 'bold'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '20',
              fontWeight: 'bold',
              color: '#fff'
            }
          },
          labelLine: {
            show: false
          },
          data: pieData
        },
        {
          name: '排放源标签',
          type: 'pie',
          radius: ['72%', '72%'],
          center: ['50%', '55%'],
          avoidLabelOverlap: false,
          silent: true,
          itemStyle: {
            color: 'transparent'
          },
          label: {
            show: true,
            position: 'outside',
            formatter: '{b}',
            color: '#fff',
            fontSize: 12,
            fontWeight: 'bold'
          },
          labelLine: {
            show: true,
            length: 10,
            length2: 6,
            lineStyle: {
              color: '#fff'
            }
          },
          data: pieData.map(item => ({
            ...item,
            tooltip: { show: false }
          }))
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
  }, [data]); // Re-run effect if data changes

  return <div ref={chartRef} style={{ width: '100%', height: '100%' }} />;
};

export default DonutChart;
