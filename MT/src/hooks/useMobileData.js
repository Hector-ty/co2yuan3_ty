import { useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosConfig';

export const useMobileData = (selectedRegionCode) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        // 获取未过滤的原始数据用于地图
        const rawRes = await axiosInstance.get('/api/carbon-data');
        const rawData = rawRes.data?.data || [];
        
        // 获取过滤后的数据用于其他图表
        const params = selectedRegionCode ? { regionCode: selectedRegionCode } : {};
        const res = await axiosInstance.get('/api/carbon-data', { params });
        let allData = res.data?.data || [];

        if (!Array.isArray(allData)) {
          allData = [];
        }

        // 前端过滤（作为备用）
        if (selectedRegionCode) {
          const isCity = selectedRegionCode.endsWith('00') && selectedRegionCode.length === 6;
          const isDistrict = selectedRegionCode.length === 6 && !isCity;

          if (isCity) {
            const cityPrefix = selectedRegionCode.substring(0, 4);
            allData = allData.filter(d => d && d.regionCode && d.regionCode.startsWith(cityPrefix));
          } else if (isDistrict) {
            allData = allData.filter(d => d && d.regionCode === selectedRegionCode);
          }
        }

        // 过滤有效数据
        allData = allData.filter(d => d && d.calculatedEmissions);

        if (allData.length > 1) {
          const sortedData = allData.sort((a, b) => (b.year || 0) - (a.year || 0));
          const latestData = sortedData[0];
          const previousData = sortedData[1];

          // Card Data
          const latestEmissions = latestData?.calculatedEmissions || {};
          const previousEmissions = previousData?.calculatedEmissions || {};

          const totalEmissionsChange = ((latestEmissions?.totalEmissions || 0) - (previousEmissions?.totalEmissions || 0)) / (previousEmissions?.totalEmissions || 1) * 100;
          const perCapitaChange = ((latestEmissions?.intensity?.perPerson || 0) - (previousEmissions?.intensity?.perPerson || 0)) / (previousEmissions?.intensity?.perPerson || 1) * 100;
          const perAreaChange = ((latestEmissions?.intensity?.perArea || 0) - (previousEmissions?.intensity?.perArea || 0)) / (previousEmissions?.intensity?.perArea || 1) * 100;

          const cardData = {
            totalEmissions: { 
              value: (latestEmissions?.totalEmissions || 0).toFixed(2), 
              change: Math.abs(totalEmissionsChange).toFixed(2), 
              isPositive: totalEmissionsChange > 0 
            },
            perCapitaEmissions: { 
              value: (latestEmissions?.intensity?.perPerson || 0).toFixed(2), 
              change: Math.abs(perCapitaChange).toFixed(2), 
              isPositive: perCapitaChange > 0 
            },
            perAreaEmissions: { 
              value: (latestEmissions?.intensity?.perArea || 0).toFixed(2), 
              change: Math.abs(perAreaChange).toFixed(2), 
              isPositive: perAreaChange > 0 
            },
            targetCompletion: { value: 68, change: 32, isPositive: false },
          };

          // Donut Chart
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

          const stackedAreaChartData = { 
            years, 
            fossilFuels: fossilFuelsData, 
            mobileSources: mobileSourcesData, 
            electricity: electricityData, 
            heat: heatData 
          };
          
          const stackedBarChartData = { 
            years, 
            fossilFuels: fossilFuelsData, 
            mobileSources: mobileSourcesData, 
            electricity: electricityData, 
            heat: heatData 
          };

          const areaIntensity = last5YearsData.map(d => d?.calculatedEmissions?.intensity?.perArea || 0);
          const perCapitaIntensity = last5YearsData.map(d => d?.calculatedEmissions?.intensity?.perPerson || 0);
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
            rawData,
          });
        } else {
          setData({
            rawData,
          });
        }
      } catch (err) {
        const errorMessage = err.message || '无法加载图表数据，请检查网络连接';
        setError(errorMessage);
        console.error('加载数据失败:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedRegionCode]);

  return { data, loading, error };
};
