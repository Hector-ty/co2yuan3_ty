import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { formatNumber } from '../../utils/formatNumber';

const DoubleDonutChart = ({ data }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);
    
    // 数据格式：
    // {
    //   totalDirect,
    //   totalIndirect,
    //   detailedBreakdown: {
    //     // 23个详细数据项的排放量（tCO₂）
    //     anthracite, bituminousCoal, lignite,
    //     fuelOil, gasoline, diesel, kerosene, lpg, lng,
    //     naturalGas, cokeOvenGas, pipelineGas,
    //     'HCFC-22', 'HFC-32', 'HFC-125', 'HFC-134a', 'HFC-143a', 'HFC-227a', 'HFC-245fa',
    //     'CO2', 'HFC-227ea',
    //     purchasedElectricity, purchasedHeat
    //   }
    // }
    if (!data || (data.totalDirect === 0 && data.totalIndirect === 0)) {
      chart.setOption({
        graphic: {
          type: 'text',
          left: 'center',
          top: 'center',
          style: {
            text: '暂无数据',
            fontSize: 14,
            fill: '#fff'
          }
        }
      });
      return;
    }

    const { totalDirect = 0, totalIndirect = 0, detailedBreakdown = {} } = data;

    // 从中心引出的两条分隔线：在内环 直接/间接 分界处，长度为最外环半径(65%)
    const buildSeparatorLines = (w, h) => {
      if (!(totalDirect > 0 && totalIndirect > 0)) return [];
      const r = (Math.min(w, h) / 2) * 0.65;
      const cx = w / 2;
      const cy = h * 0.55;
      const ang2 = 90 + (360 * totalDirect) / (totalDirect + totalIndirect);
      const rad = ((ang2 - 90) * Math.PI) / 180;
      return [
        { type: 'line', shape: { x1: cx, y1: cy, x2: cx, y2: cy - r }, style: { stroke: '#fff', lineWidth: 2 }, z: 100 },
        { type: 'line', shape: { x1: cx, y1: cy, x2: cx + r * Math.sin(rad), y2: cy - r * Math.cos(rad) }, style: { stroke: '#fff', lineWidth: 2 }, z: 100 }
      ];
    };

    // 内层数据：直接排放和间接排放
    const innerData = [
      { value: totalDirect, name: '直接排放' },
      { value: totalIndirect, name: '间接排放' }
    ].filter(item => item.value > 0);

    // 外层数据：根据需求细分到“无烟煤/燃料油/天然气/HCFC-22/CO2 及同级数据”以及外购电力/热力
    // 23个详细数据项的标签映射
    const labelMap = {
      anthracite: '无烟煤',
      bituminousCoal: '烟煤',
      lignite: '褐煤',
      fuelOil: '燃料油',
      gasoline: '汽油',
      diesel: '柴油',
      kerosene: '煤油',
      lpg: '液化石油气',
      lng: '液化天然气',
      naturalGas: '天然气',
      cokeOvenGas: '焦炉煤气',
      pipelineGas: '管道煤气',
      fugitiveEmissions: '逸散排放',  // 合并后的逸散排放
      purchasedElectricity: '电力',  // 更名
      purchasedHeat: '热力'  // 更名
    };

    // 逸散排放的所有数据项键
    const fugitiveEmissionKeys = [
      'HCFC-22', 'HFC-32', 'HFC-125', 'HFC-134a', 'HFC-143a', 'HFC-227a', 'HFC-245fa',
      'CO2', 'HFC-227ea'
    ];

    // 外层数据：处理数据，合并逸散排放
    // 确保 detailedBreakdown 是对象且不为空
    const breakdownObj = detailedBreakdown && typeof detailedBreakdown === 'object' ? detailedBreakdown : {};
    
    // 处理数据：合并逸散排放，保留其他数据项
    const processedData = {};
    let fugitiveEmissionsTotal = 0;
    
    Object.entries(breakdownObj).forEach(([key, value]) => {
      const numValue = Number(value) || 0;
      if (fugitiveEmissionKeys.includes(key)) {
        // 累加逸散排放
        fugitiveEmissionsTotal += numValue;
      } else {
        // 保留其他数据项
        processedData[key] = numValue;
      }
    });
    
    // 如果有逸散排放，添加合并后的"逸散排放"项
    if (fugitiveEmissionsTotal > 0) {
      processedData['fugitiveEmissions'] = fugitiveEmissionsTotal;
    }
    
    // 构建外层数据，并按照 parent 分组以确保与内层对应
    const directEmissions = [];
    const indirectEmissions = [];
    
    Object.entries(processedData).forEach(([key, value]) => {
      const numValue = Number(value) || 0;
      if (numValue > 0) {
        const item = {
          value: numValue,
          name: labelMap[key] || key,
          parent: (key === 'purchasedElectricity' || key === 'purchasedHeat') ? '间接排放' : '直接排放'
        };
        
        // 按照 parent 分组
        if (item.parent === '直接排放') {
          directEmissions.push(item);
        } else {
          indirectEmissions.push(item);
        }
      }
    });
    
    // 外层数据顺序：先所有"直接排放"项，后所有"间接排放"项，以匹配内层顺序
    const outerData = [...directEmissions, ...indirectEmissions];
    

    // 定义颜色方案
    const colors = {
      '直接排放': '#4CAF50',
      '间接排放': '#E64A19',       // 橙红色
      '无烟煤': '#81C784',
      '烟煤': '#81C784',
      '褐煤': '#81C784',
      '燃料油': '#64B5F6',
      '汽油': '#64B5F6',
      '柴油': '#64B5F6',
      '煤油': '#64B5F6',
      '液化石油气': '#64B5F6',
      '液化天然气': '#64B5F6',
      '天然气': '#4DD0E1',
      '焦炉煤气': '#4DD0E1',
      '管道煤气': '#4DD0E1',
      '逸散排放': '#9C27B0',       // 紫色
      '电力': '#FFB74D',           // 橙黄色
      '热力': '#FFB74D'            // 橙黄色
    };

    // 生成颜色函数，如果颜色未定义则使用默认颜色
    const getColor = (name) => colors[name] || '#999';

    const w = chartRef.current.offsetWidth || 400;
    const h = chartRef.current.offsetHeight || 400;

    const option = {
      graphic: buildSeparatorLines(w, h),
      tooltip: {
        trigger: 'item',
        formatter: (params) => `${params.name}<br/>${formatNumber(params.value)} tCO₂<br/>${formatNumber(params.percent ?? 0)}%`
      },
      legend: {
        show: false  // 隐藏图例，因为外层有23个数据项，图例会太拥挤
      },
      series: [
        // 内层圆盘：直接排放和间接排放
        {
          name: '排放类型',
          type: 'pie',
          radius: ['25%', '40%'],
          center: ['50%', '55%'],
          avoidLabelOverlap: true,
          // 去除圆角，保持纯色扇区
          itemStyle: {
            borderRadius: 0,
            borderColor: '#fff',
            borderWidth: 1
          },
          label: {
            show: true,
            position: 'inside',
            formatter: (params) => {
              const name = params.name;
              const percent = formatNumber(params.percent ?? 0);
              return `${name}\n${percent}%`;
            },
            color: '#fff',
            fontSize: 12,
            fontWeight: 'bold',
            lineHeight: 16
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '16',
              fontWeight: 'bold',
              color: '#fff'
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          labelLine: {
            show: false
          },
          data: innerData.map(item => ({
            ...item,
            itemStyle: {
              color: getColor(item.name)
            }
          }))
        },
        // 外层圆盘：直接排放和间接排放的细分
        {
          name: '排放源细分',
          type: 'pie',
          radius: ['45%', '65%'],
          center: ['50%', '55%'],
          avoidLabelOverlap: true,
          // 去除圆角，保持纯色扇区
          itemStyle: {
            borderRadius: 0,
            borderColor: '#fff',
            borderWidth: 1
          },
          label: {
            show: false,  // 隐藏外层标签，因为数据项太多，标签会重叠
            position: 'inside',
            formatter: ({ percent }) => `${formatNumber(percent ?? 0)}%`,
            color: '#fff',
            fontSize: 10,
            fontWeight: 'bold'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '16',
              fontWeight: 'bold',
              color: '#fff'
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          labelLine: {
            show: false
          },
          data: outerData.map(item => ({
            ...item,
            itemStyle: {
              color: getColor(item.name)
            }
          }))
        },
        // 外层标签：显示名称（仅显示有值的数据项）
        {
          name: '排放源标签',
          type: 'pie',
          radius: ['72%', '72%'],
          center: ['50%', '55%'],
          avoidLabelOverlap: true,  // 启用标签避让
          silent: true,
          itemStyle: {
            color: 'transparent'
          },
          label: {
            show: true,
            position: 'outside',
            formatter: '{b}',
            color: '#fff',
            fontSize: 10,  // 减小字体以适应更多标签
            fontWeight: 'bold',
            rotate: 0,  // 不旋转标签
            overflow: 'truncate',  // 标签过长时截断
            width: 60  // 限制标签宽度
          },
          labelLine: {
            show: true,
            length: 8,  // 缩短标签线
            length2: 4,
            lineStyle: {
              color: '#fff',
              width: 1
            }
          },
          data: outerData.map(item => ({
            ...item,
            tooltip: { show: false }
          }))
        }
      ]
    };

    chart.setOption(option);

    const handleResize = () => {
      chart.resize();
      const nw = chart.getWidth();
      const nh = chart.getHeight();
      if (nw && nh) chart.setOption({ graphic: buildSeparatorLines(nw, nh) });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [data]);

  return <div ref={chartRef} style={{ width: '100%', height: '100%' }} />;
};

export default DoubleDonutChart;
