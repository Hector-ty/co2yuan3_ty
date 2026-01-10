import { useState, useEffect } from 'react';
import axios from 'axios';

export const useDataScreen = (selectedRegionCode) => { // 接受selectedRegionCode作为参数
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); // 开始加载时设置loading为true
      setError(''); // 清除之前的错误
      try {
        // 获取未过滤的原始数据用于地图（总是获取全部数据）
        const rawRes = await axios.get('/api/carbon-data');
        const rawData = rawRes.data?.data || [];
        
        // 获取过滤后的数据用于其他图表
        const params = selectedRegionCode ? { regionCode: selectedRegionCode } : {}; // 如果有选择地区，则添加查询参数
        const res = await axios.get('/api/carbon-data', { params }); // 将参数传递给后端
        let allData = res.data?.data || [];

        // 确保 allData 是数组
        if (!Array.isArray(allData)) {
          allData = [];
        }

        // 如果后端没有过滤，前端进行过滤（作为备用或补充）
        if (selectedRegionCode) {
          const isCity = selectedRegionCode.endsWith('00') && selectedRegionCode.length === 6; // e.g., 150100
          const isDistrict = selectedRegionCode.length === 6 && !isCity; // e.g., 150102

          if (isCity) {
            const cityPrefix = selectedRegionCode.substring(0, 4); // e.g., '1501'
            allData = allData.filter(d => d && d.regionCode && d.regionCode.startsWith(cityPrefix));
          } else if (isDistrict) {
            allData = allData.filter(d => d && d.regionCode === selectedRegionCode);
          }
        }

        // 过滤有效数据（必须有 calculatedEmissions）
        allData = allData.filter(d => d && d.calculatedEmissions);

        if (allData.length > 1) {
          const sortedData = allData.sort((a, b) => (b.year || 0) - (a.year || 0));
          const latestData = sortedData[0];
          const previousData = sortedData[1];

          // Card Data
          const latestEmissions = latestData?.calculatedEmissions || {};
          const previousEmissions = previousData?.calculatedEmissions || {};

          const totalEmissionsChange = ((latestEmissions?.totalEmissions || 0) - (previousEmissions?.totalEmissions || 0)) / (previousEmissions?.totalEmissions || 1) * 100;
          const perCapitaChange = ((latestEmissions?.intensity?.perCapita || 0) - (previousEmissions?.intensity?.perCapita || 0)) / (previousEmissions?.intensity?.perCapita || 1) * 100;
          const perAreaChange = ((latestEmissions?.intensity?.perArea || 0) - (previousEmissions?.intensity?.perArea || 0)) / (previousEmissions?.intensity?.perArea || 1) * 100;

          const cardData = {
            totalEmissions: { value: (latestEmissions?.totalEmissions || 0).toFixed(2), change: Math.abs(totalEmissionsChange).toFixed(2), isPositive: totalEmissionsChange > 0 },
            perCapitaEmissions: { value: (latestEmissions?.intensity?.perCapita || 0).toFixed(2), change: Math.abs(perCapitaChange).toFixed(2), isPositive: perCapitaChange > 0 },
            perAreaEmissions: { value: (latestEmissions?.intensity?.perArea || 0).toFixed(2), change: Math.abs(perAreaChange).toFixed(2), isPositive: perAreaChange > 0 },
            targetCompletion: { value: 68, change: 32, isPositive: false }, // Mock data
          };

          // Donut Chart - 安全访问 breakdown
          const breakdown = latestEmissions?.breakdown || {};
          const { fossilFuels = 0, mobileSources = 0, electricity = 0, heat = 0 } = breakdown;
          const donutData = [
            { value: fossilFuels || 0, name: '化石燃料' },
            { value: mobileSources || 0, name: '移动源' },
            { value: electricity || 0, name: '外购电力' },
            { value: heat || 0, name: '外购热力' },
          ];

          // Other Charts (last 5 years)
          const last5YearsData = sortedData.slice(0, 5).reverse();
          const years = last5YearsData.map(d => d?.year || '');
          const fossilFuelsData = last5YearsData.map(d => d?.calculatedEmissions?.breakdown?.fossilFuels || 0);
          const mobileSourcesData = last5YearsData.map(d => d?.calculatedEmissions?.breakdown?.mobileSources || 0);
          const electricityData = last5YearsData.map(d => d?.calculatedEmissions?.breakdown?.electricity || 0);
          const heatData = last5YearsData.map(d => d?.calculatedEmissions?.breakdown?.heat || 0);

          const stackedAreaChartData = { years, fossilFuels: fossilFuelsData, mobileSources: mobileSourcesData, electricity: electricityData, heat: heatData };
          const stackedBarChartData = { years, fossilFuels: fossilFuelsData, mobileSources: mobileSourcesData, electricity: electricityData, heat: heatData };

          const areaIntensity = last5YearsData.map(d => d?.calculatedEmissions?.emissionIntensityByArea || 0);
          const perCapitaIntensity = last5YearsData.map(d => d?.calculatedEmissions?.emissionIntensityByPerson || 0);
          const dualAxisChartData = { years, areaIntensity, perCapitaIntensity };

          const changeRates = [];
          for (let i = 1; i < last5YearsData.length; i++) {
            const prev = last5YearsData[i - 1]?.calculatedEmissions?.totalEmissions || 0;
            const curr = last5YearsData[i]?.calculatedEmissions?.totalEmissions || 0;
            if (prev > 0) {
              changeRates.push(((curr - prev) / prev * 100).toFixed(2));
            } else {
              changeRates.push('0.00');
            }
          }
          const lineChartData = { years: years.slice(1), changeRates };
          
          setData({
            cardData,
            donutData,
            stackedAreaChartData,
            stackedBarChartData,
            dualAxisChartData,
            lineChartData,
            rawData, // 添加原始数据用于地图
          });
        } else {
          // 如果没有足够的数据，只设置地图数据
          setData({
            rawData, // 即使其他数据不足，也提供原始数据用于地图
          });
        }
      } catch (err) {
        setError('无法加载图表数据');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedRegionCode]); // 当selectedRegionCode变化时重新获取数据

  return { data, loading, error };
};
