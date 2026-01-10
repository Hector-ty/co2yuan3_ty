import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const DualAxisChart = ({ data }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !data) return;
    
    const chart = echarts.init(chartRef.current);
    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          crossStyle: {
            color: '#fff'
          }
        }
      },
      grid: {
        left: '10%',
        right: '8%',
        bottom: '15%',
        top: '10%',
        containLabel: true
      },
      xAxis: [
        {
          type: 'category',
          data: data.years || [],
          axisPointer: {
            type: 'shadow'
          },
          axisLabel: {
            color: '#fff',
            fontSize: 10
          }
        }
      ],
      yAxis: [
        {
          type: 'value',
          name: '单位建筑面积碳排放',
          min: 0,
          axisLabel: {
            formatter: '{value}',
            color: '#fff',
            fontSize: 10
          },
          nameTextStyle: {
            color: '#fff',
            fontSize: 11
          }
        },
        {
          type: 'value',
          name: '人均碳排放',
          min: 0,
          axisLabel: {
            formatter: '{value}',
            color: '#fff',
            fontSize: 10
          },
          nameTextStyle: {
            color: '#fff',
            fontSize: 11
          }
        }
      ],
      legend: {
        data: ['单位建筑面积碳排放', '人均碳排放'],
        bottom: 0,
        textStyle: {
          color: '#fff',
          fontSize: 11
        }
      },
      series: [
        {
          name: '单位建筑面积碳排放',
          type: 'bar',
          data: data.areaIntensity || []
        },
        {
          name: '人均碳排放',
          type: 'line',
          yAxisIndex: 1,
          data: data.perCapitaIntensity || []
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

export default DualAxisChart;
