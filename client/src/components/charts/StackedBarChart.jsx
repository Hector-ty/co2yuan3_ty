import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { formatNumber } from '../../utils/formatNumber';

const StackedBarChart = ({ data }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;
    
    const chart = echarts.init(chartRef.current);
    const safeData = data || { years: [], fossilFuels: [], fugitiveEmissions: [], electricity: [], heat: [] };
    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: (params) => {
          if (!params || !params.length) return '';
          const y = params[0].axisValue || '';
          let s = y + '年<br/>';
          params.forEach(p => { s += (p.marker || '') + (p.seriesName || '') + ': ' + formatNumber(p.value) + ' tCO₂<br/>'; });
          return s;
        }
      },
      legend: {
        data: ['化石燃料', '逸散排放', '外购电力', '外购热力'],
        textStyle: {
          color: '#fff'
        },
        top: 'bottom'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '5%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          color: '#fff',
          // 将数字格式化为数字+汉字（如10000显示为1万）
          formatter: function(value) {
            const num = Number(value);
            if (isNaN(num)) return value;
            if (num >= 100000000) {
              const v = num / 100000000;
              return formatNumber(v) + '亿';
            }
            if (num >= 10000) {
              const v = num / 10000;
              return formatNumber(v) + '万';
            }
            return formatNumber(num);
          }
        }
      },
      yAxis: {
        type: 'category',
        data: safeData.years,
        axisLabel: { // 确保Y轴标签文字颜色为白色
          color: '#fff'
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
          data: safeData.fossilFuels
        },
        {
          name: '逸散排放',
          type: 'bar',
          stack: '总量',
          emphasis: {
            focus: 'series'
          },
          data: safeData.fugitiveEmissions
        },
        {
          name: '外购电力',
          type: 'bar',
          stack: '总量',
          emphasis: {
            focus: 'series'
          },
          data: safeData.electricity
        },
        {
          name: '外购热力',
          type: 'bar',
          stack: '总量',
          emphasis: {
            focus: 'series'
          },
          data: safeData.heat
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

export default StackedBarChart;
