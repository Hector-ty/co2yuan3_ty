import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const DonutChart = ({ data }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    const chart = echarts.init(chartRef.current);
    const option = {
      tooltip: {
        trigger: 'item'
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
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center',
            textStyle: { // 确保标签文字颜色为白色
              color: '#fff'
            }
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '20',
              fontWeight: 'bold',
              color: '#fff' // 确保高亮标签文字颜色为白色
            }
          },
          labelLine: {
            show: false
          },
          data: data
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
