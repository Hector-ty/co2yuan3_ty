import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const StackedBarChart = ({ data }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !data) return;
    
    const chart = echarts.init(chartRef.current);
    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        data: ['化石燃料', '移动源', '外购电力', '外购热力'],
        textStyle: {
          color: '#fff',
          fontSize: 11
        },
        bottom: 0,
        itemWidth: 12,
        itemHeight: 12
      },
      grid: {
        left: '15%',
        right: '4%',
        bottom: '18%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          color: '#fff',
          fontSize: 10
        }
      },
      yAxis: {
        type: 'category',
        data: data.years || [],
        axisLabel: {
          color: '#fff',
          fontSize: 10
        }
      },
      series: [
        {
          name: '化石燃料',
          type: 'bar',
          stack: '总量',
          emphasis: {
            focus: 'series'
          },
          data: data.fossilFuels || []
        },
        {
          name: '移动源',
          type: 'bar',
          stack: '总量',
          emphasis: {
            focus: 'series'
          },
          data: data.mobileSources || []
        },
        {
          name: '外购电力',
          type: 'bar',
          stack: '总量',
          emphasis: {
            focus: 'series'
          },
          data: data.electricity || []
        },
        {
          name: '外购热力',
          type: 'bar',
          stack: '总量',
          emphasis: {
            focus: 'series'
          },
          data: data.heat || []
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

export default StackedBarChart;
