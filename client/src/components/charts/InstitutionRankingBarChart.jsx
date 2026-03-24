import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Box, Typography } from '@mui/material';
import { formatNumber } from '../../utils/formatNumber';

/**
 * 同级机构强度排名图（条形排名图）
 * - 仅区县内机构按人均碳排放 (tCO2e/人) 升序排名，从上到下为从低到高
 * - 机构用户可高亮显示自身机构
 * - 显示逻辑：初始化/未选城市 → 不显示图表，显示「请选择城市」；未选区县 → 「请选择区县」；已选区县无数据 → 「请该区县的机构用户添加碳排放数据」
 */
const InstitutionRankingBarChart = ({ data, highlightUnitName, selectedCity = '', selectedDistrict = '' }) => {
  const list = data && Array.isArray(data) ? data : [];
  // 统一转字符串并判空，避免 number/undefined 导致判断错误
  const cityStr = String(selectedCity ?? '').trim();
  const districtStr = String(selectedDistrict ?? '').trim();
  const hasCity = cityStr !== '';
  const hasDistrict = districtStr !== '';

  const renderPlaceholder = (text) => (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        minHeight: 140,
        width: '100%',
      }}
    >
      <Typography variant="body1" sx={{ color: 'text.secondary' }}>{text}</Typography>
    </Box>
  );

  // 初始化/未选择城市：不显示图表，显示「请选择城市」
  if (!hasCity) {
    return renderPlaceholder('请选择城市');
  }
  // 未选择区县：不显示图表，显示「请选择区县」
  if (!hasDistrict) {
    return renderPlaceholder('请选择区县');
  }
  // 已选城市和区县但该区县无机构数据：不显示图表
  if (list.length === 0) {
    return renderPlaceholder('请该区县的机构用户添加碳排放数据');
  }

  // 已按人均碳排放升序，Y 轴从上到下：第 1 名（最低）到第 N 名（最高）
  const yAxisData = list.map((item, index) => `${index + 1}. ${item.unitName || '未知机构'}`);
  const values = list.map(item => Number(item.emissionIntensityByPerson) || 0);
  const maxVal = Math.max(...values, 0);
  const xMax = maxVal < 0.01 ? 0.02 : undefined;

  const barColors = list.map((item, index) => {
    const isHighlight = highlightUnitName && (item.unitName === highlightUnitName);
    if (isHighlight) return '#66bb6a'; // 选中机构：绿色高亮
    const t = values.length <= 1 ? 0 : index / (values.length - 1);
    const r = Math.round(33 + t * 122);
    const g = Math.round(150 - t * 80);
    const b = Math.round(243 - t * 93);
    return `rgb(${r},${g},${b})`;
  });

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#fff',
      borderColor: '#ccc',
      borderWidth: 1,
      formatter: function (params) {
        if (!params || !Array.isArray(params) || params.length === 0) return '';
        const param = params[0];
        if (!param) return '';
        const name = param.name || '';
        const idx = param.dataIndex;
        const value = values[idx];
        const unitName = list[idx]?.unitName || name.replace(/^\d+\.\s*/, '');
        return `${unitName}<br/>人均碳排放: ${formatNumber(value)} tCO₂e/人`;
      },
      textStyle: { color: '#333', fontSize: 12 }
    },
    grid: {
      containLabel: true,
      left: '1%',
      right: '8%',
      top: '8%',
      bottom: '12%'
    },
    xAxis: {
      type: 'value',
      name: '人均碳排放 (tCO2e/人)',
      nameLocation: 'middle',
      nameGap: 28,
      nameTextStyle: { color: '#fff', fontWeight: 'bold' },
      min: 0,
      max: xMax,
      axisLabel: {
        color: '#fff',
        formatter: value => formatNumber(value)
      },
      axisLine: { lineStyle: { color: '#fff' } },
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } }
    },
    yAxis: {
      type: 'category',
      data: yAxisData,
      axisLabel: {
        color: '#fff',
        interval: 0,
        fontSize: 12,
        formatter: (value) => {
          const index = yAxisData.indexOf(value);
          if (index === -1) return value;
          const isHighlight = highlightUnitName && list[index]?.unitName === highlightUnitName;
          if (isHighlight) return '{highlight|' + value + '}';
          return value;
        },
        rich: {
          highlight: {
            fontWeight: 'bold',
            color: '#fff'
          }
        }
      },
      axisLine: { lineStyle: { color: '#fff' } },
      axisTick: { show: false },
      inverse: true
    },
    series: [
      {
        name: '人均碳排放',
        type: 'bar',
        barWidth: '60%',
        data: values.map((val, index) => {
          const isHighlight = highlightUnitName && list[index]?.unitName === highlightUnitName;
          return {
            value: val,
            itemStyle: {
              color: barColors[index],
              borderColor: isHighlight ? '#fff' : undefined,
              borderWidth: isHighlight ? 3 : 0,
              shadowBlur: isHighlight ? 8 : 0,
              shadowColor: isHighlight ? 'rgba(102, 187, 106, 0.6)' : undefined
            }
          };
        }),
        label: {
          show: true,
          position: 'right',
          formatter: params => formatNumber(params.value),
          color: '#fff',
          backgroundColor: 'transparent',
          padding: [2, 6],
          borderRadius: 2
        }
      }
    ]
  };

  return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />;
};

export default InstitutionRankingBarChart;
