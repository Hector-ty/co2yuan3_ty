import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import axios from 'axios';
import geoJson from '../../../public/geo/region_150000.json'; // Direct import

const EmissionMapChart = ({ data: carbonDataProp }) => {
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const hasZoomedRef = useRef(false); // 跟踪是否已经进行过缩放

    useEffect(() => {
        const renderMap = async () => {
            try {
                if (!chartRef.current) return;

                let carbonData = carbonDataProp;
                if (!carbonData || !Array.isArray(carbonData) || carbonData.length === 0) {
                    const dataResponse = await axios.get('/api/carbon-data');
                    carbonData = dataResponse.data?.data || [];
                }

                // 确保数据是数组并过滤有效数据
                if (!Array.isArray(carbonData)) {
                    carbonData = [];
                }

                chartInstanceRef.current = echarts.init(chartRef.current);
                const mapName = 'region_150000';
                echarts.registerMap(mapName, geoJson);

                const mapSeriesData = carbonData
                    .filter(item => item && item.regionName)
                    .map(item => ({
                        name: item.regionName.split('/')[0],
                        value: (item.calculatedEmissions?.emissionIntensityByPerson || 0).toFixed(2)
                    }));

                // 计算地图边界（从geoJson的features中提取）
                let mapBounds = null;
                if (geoJson.features && geoJson.features.length > 0) {
                    // 尝试从第一个feature的geometry中获取边界
                    const firstFeature = geoJson.features[0];
                    if (firstFeature.geometry && firstFeature.geometry.coordinates) {
                        // 简单的边界计算：遍历所有坐标点找到最小最大值
                        const coords = [];
                        const extractCoords = (geometry) => {
                            if (Array.isArray(geometry[0])) {
                                geometry.forEach(g => extractCoords(g));
                            } else if (geometry.length >= 2) {
                                coords.push([geometry[0], geometry[1]]);
                            }
                        };
                        extractCoords(firstFeature.geometry.coordinates);
                        if (coords.length > 0) {
                            const lons = coords.map(c => c[0]);
                            const lats = coords.map(c => c[1]);
                            mapBounds = [
                                [Math.min(...lons), Math.min(...lats)],
                                [Math.max(...lons), Math.max(...lats)]
                            ];
                        }
                    }
                }
                
                // 如果没有找到边界，使用内蒙古的大致边界
                if (!mapBounds) {
                    mapBounds = [
                        [97.17, 37.42], // 左下角
                        [126.05, 53.33]  // 右上角
                    ];
                }
                
                // 计算地图中心点（用于初始居中显示）
                const mapCenter = mapBounds ? [
                    (mapBounds[0][0] + mapBounds[1][0]) / 2, // 经度中心
                    (mapBounds[0][1] + mapBounds[1][1]) / 2  // 纬度中心
                ] : [111.5, 45.5]; // 内蒙古大致中心
                
                const option = {
                    tooltip: { trigger: 'item', formatter: '{b}<br/>人均排放强度: {c} (tCO₂/人)' },
                    visualMap: {
                        min: 0,
                        max: Math.max(...mapSeriesData.map(d => parseFloat(d.value) || 0), 1),
                        calculable: true,
                        orient: 'vertical',
                        left: 6,
                        bottom: 68,
                        itemWidth: 10,
                        itemHeight: 100,
                        textGap: 6,
                        inRange: { color: ['#E0F3F8', '#ABD9E9', '#74ADD1', '#4575B4', '#313695'].reverse() },
                        textStyle: { color: '#fff', fontSize: 10 }
                    },
                    series: [{
                        name: '人均排放强度',
                        type: 'map',
                        map: mapName,
                        roam: true,
                        // 设置地图布局，稍微向下偏移
                        layoutCenter: ['50%', '55%'], // 地图在容器中水平居中，垂直方向稍微向下
                        layoutSize: '100%', // 地图占满容器
                        // 设置缩放限制，允许缩小到最小级别
                        scaleLimit: {
                            min: 0.05, // 进一步降低最小值，允许缩小到非常小的级别
                            max: 10    // 增加最大值，允许放大到更大的级别
                        },
                        // 初始缩放级别，设置为1确保完整显示
                        zoom: 1,
                        // 设置地图中心点，稍微向下偏移（纬度增加）
                        center: mapCenter ? [mapCenter[0], mapCenter[1] + 0.5] : [111.5, 46.0],
                        // 移除 boundingCoords，因为它可能会限制缩放
                        // 如果需要限制移动范围，可以通过其他方式实现
                        // boundingCoords: mapBounds,
                        label: { show: false, formatter: '{b}', color: '#fff', fontSize: 10 }, // 初始不显示标签
                        emphasis: { label: { show: true }, itemStyle: { areaColor: '#FFD700' } },
                        data: mapSeriesData
                    }]
                };

                chartInstanceRef.current.setOption(option);
                
                // 监听地图事件，当用户进行缩放时显示标签
                if (chartInstanceRef.current) {
                    chartInstanceRef.current.on('georoam', (params) => {
                        // georoam 事件在用户交互地图时触发（包括缩放和平移）
                        // 检测是否是缩放操作
                        if (params.componentType === 'series' && params.seriesType === 'map') {
                            // 如果还没有显示过标签，则显示标签
                            if (!hasZoomedRef.current) {
                                hasZoomedRef.current = true;
                                // 更新配置，显示标签
                                chartInstanceRef.current.setOption({
                                    series: [{
                                        label: { show: true, formatter: '{b}', color: '#fff', fontSize: 10 }
                                    }]
                                }, { notMerge: false });
                            }
                        }
                    });
                }
                
                // 确保地图在初始加载时完整显示并居中
                // 延迟执行以确保容器尺寸已确定
                setTimeout(() => {
                    if (chartInstanceRef.current) {
                        // 重新调整大小，确保地图完整显示
                        chartInstanceRef.current.resize();
                        
                        // 确保地图居中显示并稍微向下 - 重新设置布局参数
                        chartInstanceRef.current.setOption({
                            series: [{
                                layoutCenter: ['50%', '55%'], // 垂直方向稍微向下
                                layoutSize: '100%',
                                center: mapCenter ? [mapCenter[0], mapCenter[1] + 0.5] : [111.5, 46.0], // 纬度增加，地图向下
                                zoom: 1,
                                label: { show: false } // 确保初始不显示标签
                            }]
                        }, { notMerge: false });
                        
                        // 再次调整大小以确保居中生效
                        chartInstanceRef.current.resize();
                        
                        // 重置地图视图到初始状态，确保完整显示并居中
                        chartInstanceRef.current.dispatchAction({
                            type: 'restore'
                        });
                    }
                }, 300);
                
                setLoading(false);

            } catch (err) {
                console.error("Failed to render map:", err);
                setError("无法加载地图数据，请稍后重试。");
                setLoading(false);
            }
        };

        renderMap();

        const handleResize = () => {
            chartInstanceRef.current?.resize();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chartInstanceRef.current?.dispose();
        };
    }, [carbonDataProp]);

    if (error) {
        return <p style={{ color: '#ff6b6b' }}>{error}</p>;
    }

    return (
        <div style={{ 
            position: 'relative', 
            width: '100%', 
            height: '100%', 
            minHeight: '500px',
            paddingBottom: '16px', // 增加底部内边距，确保下边界可见
            overflow: 'hidden' // 防止地图内容超出容器
        }}>
            {loading && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#fff', zIndex: 10 }}>地图加载中...</div>}
            <div ref={chartRef} style={{ 
                width: '100%', 
                height: '100%', 
                boxSizing: 'border-box',
                paddingBottom: '16px' // 为地图添加底部padding，防止地图移动超出下边界
            }}></div>
        </div>
    );
};

export default EmissionMapChart;
