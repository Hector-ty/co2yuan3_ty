import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { formatNumber } from '../../utils/formatNumber';

const DualAxisChart = ({ data }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;
    
    const chart = echarts.init(chartRef.current);
    const safeData = data || { years: [], areaIntensity: [], perCapitaIntensity: [] };
    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          crossStyle: {
            color: '#fff' // 确保十字准星颜色为白色
          }
        },
        formatter: (params) => {
          if (!params || !params.length) return '';
          const y = params[0].axisValue || '';
          let s = y + '年<br/>';
          params.forEach(p => {
            const unit = (p.seriesName || '').includes('建筑面积') ? ' kgCO₂/m²' : ' tCO₂/人';
            s += (p.marker || '') + (p.seriesName || '') + ': ' + formatNumber(p.value) + unit + '<br/>';
          });
          return s;
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
          data: safeData.years,
          axisPointer: {
            type: 'shadow'
          },
          axisLabel: { // 确保X轴标签文字颜色为白色
            color: '#fff'
          }
        }
      ],
      yAxis: [
        {
          type: 'value',
          name: '单位建筑面积碳排放',
          min: 0,
          axisLabel: {
            formatter: '{value} kgCO₂/m²',
            color: '#fff'
          },
          nameTextStyle: {
            color: '#fff'
          }
        },
        {
          type: 'value',
          name: '人均碳排放',
          min: 0,
          axisLabel: {
            formatter: '{value} tCO₂/人',
            color: '#fff'
          },
          nameTextStyle: {
            color: '#fff'
          }
        }
      ],
      series: [
        {
          name: '单位建筑面积碳排放',
          type: 'bar',
          data: safeData.areaIntensity
        },
        {
          name: '人均碳排放',
          type: 'line',
          yAxisIndex: 1,
          data: safeData.perCapitaIntensity
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

export default DualAxisChart;
