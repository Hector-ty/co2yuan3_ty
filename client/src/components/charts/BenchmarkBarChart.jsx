import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Box, Typography } from '@mui/material';
import { formatNumber } from '../../utils/formatNumber';

/**
 * 同类型机构强度指标对比图（Benchmark Bar Chart）
 * - 对比当前机构与省内同单位类型机构的人均碳排放强度
 * - 显示逻辑：未选城市 → 请选择城市；未选区县 → 请选择区县；未选机构 → 请选择机构；已选机构 → 加载图表
 */
const BenchmarkBarChart = ({
  data,
  selectedCity = '',
  selectedDistrict = '',
  selectedOrganizationName = null
}) => {
  const cityStr = String(selectedCity ?? '').trim();
  const districtStr = String(selectedDistrict ?? '').trim();
  const orgName = selectedOrganizationName || '';
  const hasCity = cityStr !== '';
  const hasDistrict = districtStr !== '';
  const hasOrg = String(orgName).trim() !== '';

  const renderPlaceholder = (text) => (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        minHeight: 140,
        width: '100%'
      }}
    >
      <Typography variant="body1" sx={{ color: 'text.secondary' }}>{text}</Typography>
    </Box>
  );

  if (!hasCity) return renderPlaceholder('请选择城市');
  if (!hasDistrict) return renderPlaceholder('请选择区县');
  if (!hasOrg) return renderPlaceholder('请选择机构');

  const bench = data && typeof data === 'object' ? data : null;
  const currentCR = bench && (bench.currentCR !== undefined && bench.currentCR !== null) ? Number(bench.currentCR) : 0;
  const peerAverageCR = bench && (bench.peerAverageCR !== undefined && bench.peerAverageCR !== null) ? Number(bench.peerAverageCR) : 0;
  const currentOrgName = (bench && bench.currentOrgName) ? String(bench.currentOrgName) : '当前机构';

  const xLabels = [
    `当前机构（${currentOrgName}）`,
    '同类型机构平均值'
  ];
  const values = [currentCR, peerAverageCR];
  const yMax = Math.max(...values, 0.001);
  const yAxisMax = yMax < 0.01 ? 0.02 : undefined;

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
        const idx = param.dataIndex;
        const name = xLabels[idx] || '';
        const val = values[idx];
        return `${name}<br/>人均碳排放: ${formatNumber(val)} tCO₂e/人`;
      },
      textStyle: { color: '#333', fontSize: 12 }
    },
    grid: {
      containLabel: true,
      left: '8%',
      right: '12%',
      top: '18%',
      bottom: '14%'
    },
    xAxis: {
      type: 'category',
      data: xLabels,
      axisLabel: {
        color: '#fff',
        interval: 0,
        fontSize: 11,
        rotate: xLabels[0].length > 12 ? 15 : 0
      },
      axisLine: { lineStyle: { color: '#fff' } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      name: '人均碳排放 (tCO₂e/人)',
      nameLocation: 'middle',
      nameGap: 38,
      nameTextStyle: { color: '#fff', fontWeight: 'bold' },
      min: 0,
      max: yAxisMax,
      axisLabel: {
        color: '#fff',
        formatter: value => formatNumber(value)
      },
      axisLine: { lineStyle: { color: '#fff' } },
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } }
    },
    series: [
      {
        name: '人均碳排放',
        type: 'bar',
        barWidth: '50%',
        data: [
          {
            value: currentCR,
            itemStyle: { color: '#66bb6a' }
          },
          {
            value: peerAverageCR,
            itemStyle: { color: '#81c784' }
          }
        ],
        label: {
          show: true,
          position: 'top',
          formatter: params => formatNumber(params.value),
          color: '#fff',
          fontSize: 11
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { type: 'dashed', color: 'rgba(255,255,255,0.6)', width: 1 },
          label: { show: false },
          data: [{ yAxis: peerAverageCR }]
        }
      }
    ]
  };

  const isBetterThanPeer = currentCR > 0 && peerAverageCR > 0 && currentCR < peerAverageCR;

  return (
    <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
      {isBetterThanPeer && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: '#66bb6a',
            fontSize: 12,
            zIndex: 10
          }}
        >
          <Typography component="span" sx={{ color: '#66bb6a', fontSize: 14 }}>✓</Typography>
          <Typography component="span" sx={{ color: '#66bb6a', fontSize: 12 }}>当前机构优于同类型平均</Typography>
        </Box>
      )}
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
    </Box>
  );
};

export default BenchmarkBarChart;
