import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import axios from 'axios';

const EmissionMapChart = ({ data: carbonDataProp }) => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const renderMap = async () => {
      try {
        if (!chartRef.current) return;

        let carbonData = carbonDataProp;
        if (!carbonData || !Array.isArray(carbonData) || carbonData.length === 0) {
          const dataResponse = await axios.get('/api/carbon-data');
          carbonData = dataResponse.data?.data || [];
        }

        if (!Array.isArray(carbonData)) {
          carbonData = [];
        }

        // 加载地图数据（从public目录）
        let geoJson;
        try {
          const geoResponse = await fetch('/geo/region_150000.json');
          if (!geoResponse.ok) {
            throw new Error(`HTTP error! status: ${geoResponse.status}`);
          }
          geoJson = await geoResponse.json();
        } catch (geoError) {
          console.error("Failed to load map data:", geoError);
          setError("无法加载地图数据文件，请确保文件存在于 public/geo/ 目录");
          setLoading(false);
          return;
        }
        
        chartInstanceRef.current = echarts.init(chartRef.current);
        const mapName = 'region_150000';
        echarts.registerMap(mapName, geoJson);

        const mapSeriesData = carbonData
          .filter(item => item && item.regionName)
          .map(item => ({
            name: item.regionName.split('/')[0],
            value: (item.calculatedEmissions?.intensity?.perPerson || 0).toFixed(2)
          }));

        const option = {
          tooltip: { 
            trigger: 'item', 
            formatter: '{b}<br/>人均排放强度: {c} (tCO₂/人)' 
          },
          visualMap: {
            min: 0,
            max: Math.max(...mapSeriesData.map(d => parseFloat(d.value) || 0), 1),
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: 10,
            itemWidth: 20,
            itemHeight: 80,
            textStyle: { 
              color: '#fff', 
              fontSize: 11 
            }
          },
          series: [{
            name: '人均排放强度',
            type: 'map',
            map: mapName,
            roam: true,
            zoom: 0.9,
            // 设置地图布局，确保内容在容器内
            layoutCenter: ['50%', '45%'],
            layoutSize: '85%',
            label: { 
              show: false, // 初始不显示标签
              formatter: (params) => {
                // 截断过长的地名
                const name = params.name || '';
                return name.length > 6 ? name.substring(0, 6) + '...' : name;
              },
              color: '#fff', 
              fontSize: 10,
              fontWeight: 'normal',
              position: 'inside',
              align: 'center',
              verticalAlign: 'middle',
              textBorderColor: 'rgba(0, 0, 0, 0.5)',
              textBorderWidth: 1,
              textShadowColor: 'rgba(0, 0, 0, 0.5)',
              textShadowBlur: 2,
            },
            emphasis: { 
              label: { 
                show: true,
                fontSize: 12,
                formatter: '{b}',
              }, 
              itemStyle: { areaColor: '#FFD700' } 
            },
            data: mapSeriesData
          }]
        };

        chartInstanceRef.current.setOption(option);
        
        // 监听地图缩放和拖拽事件
        let hasInteracted = false; // 标记用户是否进行了交互
        
        const handleGeoRoam = () => {
          // 用户进行了缩放或拖拽操作，显示标签
          if (!hasInteracted) {
            hasInteracted = true;
            // 更新配置，显示标签
            const currentOption = chartInstanceRef.current.getOption();
            if (currentOption.series && currentOption.series[0]) {
              currentOption.series[0].label.show = true;
              chartInstanceRef.current.setOption(currentOption, { notMerge: false });
            }
          }
        };
        
        chartInstanceRef.current.on('georoam', handleGeoRoam);
        
        setLoading(false);
        
        // 返回清理函数
        return () => {
          if (chartInstanceRef.current) {
            chartInstanceRef.current.off('georoam', handleGeoRoam);
          }
        };
      } catch (err) {
        console.error("Failed to render map:", err);
        setError("无法加载地图数据，请稍后重试。");
        setLoading(false);
      }
    };

    let cleanupMap = null;
    
    renderMap().then((cleanup) => {
      if (cleanup) {
        cleanupMap = cleanup;
      }
    }).catch(() => {
      // 忽略错误
    });

    const handleResize = () => {
      chartInstanceRef.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      // 执行地图清理函数
      if (cleanupMap) {
        cleanupMap();
      }
      // 销毁图表实例
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, [carbonDataProp]);

  if (error) {
    return <p style={{ color: '#ff6b6b', padding: '20px', textAlign: 'center' }}>{error}</p>;
  }

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      height: '100%', 
      minHeight: '400px',
      overflow: 'hidden' // 确保内容不超出容器
    }}>
      {loading && (
        <div style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)', 
          color: '#fff',
          zIndex: 10
        }}>
          地图加载中...
        </div>
      )}
      <div 
        ref={chartRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          overflow: 'hidden' // 确保地图内容不超出
        }}
      ></div>
    </div>
  );
};

export default EmissionMapChart;
