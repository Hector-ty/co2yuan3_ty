import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const DonutChart = ({ data }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;
    
    const chart = echarts.init(chartRef.current);
    
    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} tCO₂ ({d}%)'
      },
      legend: {
        top: '5%',
        left: 'center',
        textStyle: {
          color: '#fff',
          fontSize: 12
        },
        itemWidth: 14,
        itemHeight: 14,
        itemGap: 8
      },
      series: [
        {
          name: '排放源',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: 'bold',
              color: '#fff'
            }
          },
          labelLine: {
            show: false
          },
          data: data || []
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

export default DonutChart;
