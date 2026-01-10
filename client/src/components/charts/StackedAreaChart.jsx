import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const StackedAreaChart = ({ data }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    const chart = echarts.init(chartRef.current);
    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985'
          }
        }
      },
      legend: {
        data: ['化石燃料', '移动源', '外购电力', '外购热力'],
        textStyle: {
          color: '#fff'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: [
        {
          type: 'category',
          boundaryGap: false,
          data: data.years,
          axisLabel: { // 确保X轴标签文字颜色为白色
            color: '#fff'
          }
        }
      ],
      yAxis: [
        {
          type: 'value',
          axisLabel: { // 确保Y轴标签文字颜色为白色
            color: '#fff'
          }
        }
      ],
      series: [
        {
          name: '化石燃料',
          type: 'line',
          stack: '总量',
          areaStyle: {},
          emphasis: {
            focus: 'series'
          },
          data: data.fossilFuels
        },
        {
          name: '移动源',
          type: 'line',
          stack: '总量',
          areaStyle: {},
          emphasis: {
            focus: 'series'
          },
          data: data.mobileSources
        },
        {
          name: '外购电力',
          type: 'line',
          stack: '总量',
          areaStyle: {},
          emphasis: {
            focus: 'series'
          },
          data: data.electricity
        },
        {
          name: '外购热力',
          type: 'line',
          stack: '总量',
          areaStyle: {},
          emphasis: {
            focus: 'series'
          },
          data: data.heat
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

export default StackedAreaChart;
