import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const LineChart = ({ data }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    const chart = echarts.init(chartRef.current);
    const option = {
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: data.years,
        axisLabel: { // 确保X轴标签文字颜色为白色
          color: '#fff'
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: '{value}%',
          color: '#fff'
        }
      },
      series: [
        {
          data: data.changeRates,
          type: 'line',
          markLine: {
            data: [{ type: 'average', name: '平均值' }],
            label: { // 确保markLine标签文字颜色为白色
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
