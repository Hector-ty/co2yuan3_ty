import { useState, useEffect } from 'react';
import axios from 'axios';
import { formatNumber } from '../utils/formatNumber';

const LAST_5_YEARS_VALUE = '近5年';
const ALL_YEARS_VALUE = '全部年份';

export const useDataScreen = (selectedRegionCode, selectedOrganizationName = null, selectedYear = '') => { // 接受 selectedRegionCode、selectedOrganizationName、selectedYear 作为参数
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [availableYears, setAvailableYears] = useState([]);

  useEffect(() => {
    // 检查是否有 token，如果没有则不发起请求
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      setError('未登录');
      return;
    }

    // 将同一年份的多条记录聚合，避免城市维度下 X 轴重复年份
    const aggregateDataByYear = (records) => {
      const yearMap = new Map();

      records.forEach(item => {
        if (!item || item.year === undefined || item.year === null) return;
        const yearKey = item.year.toString();
        const emissions = item.calculatedEmissions || {};
        const breakdown = emissions.breakdown || {};
        const intensityMetrics = item.activityData?.intensityMetrics || {};
        const buildingArea = Number(intensityMetrics.buildingArea) || 0;
        const personnelCount = Number(intensityMetrics.personnelCount) || 0;

        const detailedBreakdown = emissions.detailedBreakdown || {};
        
        const existing = yearMap.get(yearKey) || {
          year: item.year,
          totalEmissions: 0,
          totalDirect: 0,
          totalIndirect: 0,
          breakdown: {
            fossilFuels: 0,
            fugitiveEmissions: 0,
            electricity: 0,
            heat: 0,
            totalGreenSink: 0,
            anthraciteGroup: 0,
            fuelOilGroup: 0,
            naturalGasGroup: 0,
            hcfc22Group: 0,
            co2Group: 0
          },
          detailedBreakdown: {
            anthracite: 0,
            bituminousCoal: 0,
            lignite: 0,
            fuelOil: 0,
            gasoline: 0,
            diesel: 0,
            kerosene: 0,
            lpg: 0,
            lng: 0,
            naturalGas: 0,
            cokeOvenGas: 0,
            pipelineGas: 0,
            'HCFC-22': 0,
            'HFC-32': 0,
            'HFC-125': 0,
            'HFC-134a': 0,
            'HFC-143a': 0,
            'HFC-227a': 0,
            'HFC-245fa': 0,
            'CO2': 0,
            'HFC-227ea': 0,
            purchasedElectricity: 0,
            purchasedHeat: 0
          },
          buildingArea: 0,
          personnelCount: 0,
          sample: item
        };

        existing.totalEmissions += Number(emissions.totalEmissions) || 0;
        existing.totalDirect += Number(emissions.totalDirect) || 0;
        existing.totalIndirect += Number(emissions.totalIndirect) || 0;
        existing.breakdown.fossilFuels += Number(breakdown.fossilFuels) || 0;
        existing.breakdown.fugitiveEmissions += Number(breakdown.fugitiveEmissions) || 0;
        existing.breakdown.electricity += Number(breakdown.electricity) || 0;
        existing.breakdown.heat += Number(breakdown.heat) || 0;
        existing.breakdown.totalGreenSink += Number(breakdown.totalGreenSink) || 0;
        existing.breakdown.anthraciteGroup += Number(breakdown.anthraciteGroup) || 0;
        existing.breakdown.fuelOilGroup += Number(breakdown.fuelOilGroup) || 0;
        existing.breakdown.naturalGasGroup += Number(breakdown.naturalGasGroup) || 0;
        existing.breakdown.hcfc22Group += Number(breakdown.hcfc22Group) || 0;
        existing.breakdown.co2Group += Number(breakdown.co2Group) || 0;
        
        // 聚合 detailedBreakdown
        Object.keys(existing.detailedBreakdown).forEach(key => {
          existing.detailedBreakdown[key] += Number(detailedBreakdown[key]) || 0;
        });
        
        existing.buildingArea += buildingArea;
        existing.personnelCount += personnelCount;

        yearMap.set(yearKey, existing);
      });

      return Array.from(yearMap.values()).map(entry => {
        const emissionIntensityByArea = entry.buildingArea > 0
          ? entry.totalEmissions / entry.buildingArea
          : entry.sample?.calculatedEmissions?.emissionIntensityByArea || 0;
        const emissionIntensityByPerson = entry.personnelCount > 0
          ? entry.totalEmissions / entry.personnelCount
          : entry.sample?.calculatedEmissions?.emissionIntensityByPerson || 0;

        // 确保 detailedBreakdown 被正确传递
        const result = {
          ...entry.sample,
          year: entry.year,
          calculatedEmissions: {
            ...entry.sample.calculatedEmissions,
            totalEmissions: entry.totalEmissions,
            totalDirect: entry.totalDirect,
            totalIndirect: entry.totalIndirect,
            breakdown: {
              fossilFuels: entry.breakdown.fossilFuels,
              fugitiveEmissions: entry.breakdown.fugitiveEmissions,
              electricity: entry.breakdown.electricity,
              heat: entry.breakdown.heat,
              totalGreenSink: entry.breakdown.totalGreenSink,
              anthraciteGroup: entry.breakdown.anthraciteGroup,
              fuelOilGroup: entry.breakdown.fuelOilGroup,
              naturalGasGroup: entry.breakdown.naturalGasGroup,
              hcfc22Group: entry.breakdown.hcfc22Group,
              co2Group: entry.breakdown.co2Group
            },
            detailedBreakdown: entry.detailedBreakdown,  // 包含聚合后的详细数据项
            emissionIntensityByArea,
            emissionIntensityByPerson
          },
          activityData: {
            ...(entry.sample.activityData || {}),
            intensityMetrics: {
              ...(entry.sample.activityData?.intensityMetrics || {}),
              buildingArea: entry.buildingArea,
              personnelCount: entry.personnelCount
            }
          }
        };
        
        // 调试信息：检查聚合后的数据
        if (process.env.NODE_ENV === 'development') {
          console.log('aggregateDataByYear - entry.detailedBreakdown:', entry.detailedBreakdown);
          console.log('aggregateDataByYear - result.calculatedEmissions.detailedBreakdown:', result.calculatedEmissions.detailedBreakdown);
        }
        
        return result;
      });
    };

    // 延迟加载数据，避免阻塞页面初始渲染
    const fetchData = async () => {
      setLoading(true); // 开始加载时设置loading为true
      setError(''); // 清除之前的错误
      try {
        const regionCodeStr = String(selectedRegionCode ?? '');
        // 获取未过滤的原始数据用于地图（总是获取全部数据）
        // 需要获取所有数据，不进行分页限制
        const rawRes = await axios.get('/api/carbon-data', {
            params: {
                limit: 10000, // 设置一个足够大的limit值，确保获取所有数据
                page: 1
            }
        });
        let rawData = rawRes.data?.data || [];
        
        // 如果返回的数据数量等于limit，说明可能还有更多数据，需要获取所有页
        const total = rawRes.data?.total || 0;
        if (total > 10000) {
            // 如果总数超过10000，需要分页获取所有数据
            const allData = [...rawData];
            const totalPages = Math.ceil(total / 10000);
            
            for (let page = 2; page <= totalPages; page++) {
                const pageResponse = await axios.get('/api/carbon-data', {
                    params: {
                        limit: 10000,
                        page: page
                    }
                });
                allData.push(...(pageResponse.data?.data || []));
            }
            rawData = allData;
        }
        
        // 获取过滤后的数据用于其他图表
        // 需要获取所有数据，不进行分页限制，确保数据完整
        const params = regionCodeStr ? { regionCode: regionCodeStr } : {}; // 如果有选择地区，则添加查询参数
        params.limit = 10000; // 设置一个足够大的limit值，确保获取所有数据
        params.page = 1;
        
        const res = await axios.get('/api/carbon-data', { params }); // 将参数传递给后端
        let allData = res.data?.data || [];
        
        // 如果返回的数据数量等于limit，说明可能还有更多数据，需要获取所有页
        const filteredTotal = res.data?.total || 0;
        if (filteredTotal > 10000) {
            // 如果总数超过10000，需要分页获取所有数据
            const allDataPages = [...allData];
            const totalPages = Math.ceil(filteredTotal / 10000);
            
            for (let page = 2; page <= totalPages; page++) {
                const pageParams = { ...params, page: page };
                const pageResponse = await axios.get('/api/carbon-data', { params: pageParams });
                allDataPages.push(...(pageResponse.data?.data || []));
            }
            allData = allDataPages;
        }

        // 同级机构强度排名：仅在区县维度下，用当前区域内的全部机构（过滤机构前）计算
        let institutionRankingData = [];
        const isDistrict = regionCodeStr.length === 6 && !regionCodeStr.endsWith('00');
        if (isDistrict && Array.isArray(allData) && allData.length > 0) {
          const byInstitution = new Map();
          allData.forEach(item => {
            if (!item || !item.calculatedEmissions) return;
            const acc = item.account;
            const key = (acc && typeof acc === 'object' && acc.unitName)
              ? acc.unitName
              : (acc && typeof acc === 'object' && acc._id ? acc._id.toString() : String(acc || ''));
            const unitName = (acc && typeof acc === 'object' && acc.unitName) ? acc.unitName : key;
            const existing = byInstitution.get(key);
            if (!existing || (Number(item.year) > Number(existing.year))) {
              byInstitution.set(key, { ...item, unitName });
            }
          });
          institutionRankingData = Array.from(byInstitution.values())
            .map(item => ({
              unitName: item.unitName || '未知机构',
              emissionIntensityByPerson: Number(item.calculatedEmissions?.emissionIntensityByPerson) || 0
            }))
            .filter(item => (item.unitName || '').toLowerCase() !== 'root') // 排除超级管理员 Root，不作为机构参与排名
            .sort((a, b) => a.emissionIntensityByPerson - b.emissionIntensityByPerson);
        }
        
        // 如果选择了机构，根据机构名称（unitName）过滤数据
        if (selectedOrganizationName) {
          allData = allData.filter(d => {
            if (!d || !d.account) return false;
            // account可能是对象（populated）或ID字符串
            const accountUnitName = typeof d.account === 'object' && d.account !== null 
              ? d.account.unitName 
              : null;
            return accountUnitName === selectedOrganizationName;
          });
          
          // 合并相同机构名称下相同年份的数据
          const mergedDataMap = new Map();
          allData.forEach(item => {
            const year = item.year;
            const key = `${year}`;
            
            if (!mergedDataMap.has(key)) {
              // 创建合并后的数据对象，深拷贝避免修改原对象
              mergedDataMap.set(key, JSON.parse(JSON.stringify({
                ...item,
                // 保留第一个数据的account信息
                account: item.account
              })));
            } else {
              // 合并相同年份的数据
              const existing = mergedDataMap.get(key);
              const existingEmissions = existing.calculatedEmissions || {};
              const itemEmissions = item.calculatedEmissions || {};
              
              // 合并排放数据（累加）
              const mergedEmissions = {
                totalEmissions: (existingEmissions.totalEmissions || 0) + (itemEmissions.totalEmissions || 0),
                totalDirect: (existingEmissions.totalDirect || 0) + (itemEmissions.totalDirect || 0),
                totalIndirect: (existingEmissions.totalIndirect || 0) + (itemEmissions.totalIndirect || 0),
                breakdown: {
                  fossilFuels: (existingEmissions.breakdown?.fossilFuels || 0) + (itemEmissions.breakdown?.fossilFuels || 0),
                  fugitiveEmissions: (existingEmissions.breakdown?.fugitiveEmissions || 0) + (itemEmissions.breakdown?.fugitiveEmissions || 0),
                  mobileSources: (existingEmissions.breakdown?.mobileSources || 0) + (itemEmissions.breakdown?.mobileSources || 0),
                  electricity: (existingEmissions.breakdown?.electricity || 0) + (itemEmissions.breakdown?.electricity || 0),
                  heat: (existingEmissions.breakdown?.heat || 0) + (itemEmissions.breakdown?.heat || 0),
                  totalGreenSink: (existingEmissions.breakdown?.totalGreenSink || 0) + (itemEmissions.breakdown?.totalGreenSink || 0)
                }
              };
              
              // 重新计算强度指标（基于合并后的总量）
              // 使用第一个数据的activityData来计算强度
              const activityData = existing.activityData || {};
              const intensityMetrics = activityData.intensityMetrics || {};
              const buildingArea = intensityMetrics.buildingArea || 0;
              const personnelCount = intensityMetrics.personnelCount || 0;
              
              if (buildingArea > 0) {
                mergedEmissions.emissionIntensityByArea = mergedEmissions.totalEmissions / buildingArea;
              } else {
                mergedEmissions.emissionIntensityByArea = existingEmissions.emissionIntensityByArea || itemEmissions.emissionIntensityByArea || 0;
              }
              
              if (personnelCount > 0) {
                mergedEmissions.emissionIntensityByPerson = mergedEmissions.totalEmissions / personnelCount;
              } else {
                mergedEmissions.emissionIntensityByPerson = existingEmissions.emissionIntensityByPerson || itemEmissions.emissionIntensityByPerson || 0;
              }
              
              mergedDataMap.set(key, {
                ...existing,
                calculatedEmissions: mergedEmissions
              });
            }
          });
          
          // 将合并后的数据转换回数组
          allData = Array.from(mergedDataMap.values());
        }

        // 同类型机构强度对比：当已选机构时，拉取省内数据计算同类型机构人均碳排放平均值
        let provinceData = [];
        if (selectedOrganizationName && regionCodeStr.length >= 2) {
          const provinceCode = regionCodeStr.slice(0, 2) + '0000';
          try {
            const provinceRes = await axios.get('/api/carbon-data', {
              params: { regionCode: provinceCode, limit: 10000, page: 1 }
            });
            provinceData = provinceRes.data?.data || [];
            const provinceTotal = provinceRes.data?.total || 0;
            if (provinceTotal > 10000) {
              const totalPages = Math.ceil(provinceTotal / 10000);
              for (let page = 2; page <= totalPages; page++) {
                const pageRes = await axios.get('/api/carbon-data', {
                  params: { regionCode: provinceCode, limit: 10000, page }
                });
                provinceData = provinceData.concat(pageRes.data?.data || []);
              }
            }
          } catch (e) {
            console.warn('Fetch province data for benchmark failed', e);
          }
        }

        // 确保 allData 是数组
        if (!Array.isArray(allData)) {
          allData = [];
        }

        // 如果后端没有过滤，前端进行过滤（作为备用或补充）
        if (regionCodeStr) {
          const isCity = regionCodeStr.endsWith('00') && regionCodeStr.length === 6; // e.g., 150100
          const isDistrictCode = regionCodeStr.length === 6 && !isCity; // e.g., 150102

          if (isCity) {
            const cityPrefix = regionCodeStr.substring(0, 4); // e.g., '1501'
            allData = allData.filter(d => d && d.regionCode && String(d.regionCode).startsWith(cityPrefix));
          } else if (isDistrictCode) {
            allData = allData.filter(d => d && String(d.regionCode) === regionCodeStr);
          }
        }

        // 过滤有效数据（必须有 calculatedEmissions）
        allData = allData.filter(d => d && d.calculatedEmissions);

        // 按年份聚合，保证同一年只有一条记录用于图表
        const aggregatedByYear = aggregateDataByYear(allData);

        // 当前筛选条件下的所有数据年份（降序），用于「数据年份」下拉框
        const years = [...new Set(aggregatedByYear.map(d => d?.year))].filter(y => y != null).sort((a, b) => Number(b) - Number(a)).map(String);
        setAvailableYears(years);

        if (aggregatedByYear.length >= 1) {
          const sortedData = aggregatedByYear.sort((a, b) => (b.year || 0) - (a.year || 0));
          // 按「数据年份」筛选：未选或选「近5年」「全部年份」时卡片/环形图用最新一年；选了具体年份则用该年
          const isLast5Years = selectedYear === LAST_5_YEARS_VALUE;
          const isAllYears = selectedYear === ALL_YEARS_VALUE;
          const yearFiltered = selectedYear && !isLast5Years && !isAllYears
            ? sortedData.filter(d => String(d?.year) === String(selectedYear))
            : sortedData;
          const latestData = yearFiltered.length >= 1 ? yearFiltered[0] : sortedData[0];
          const previousData = yearFiltered.length >= 2 ? yearFiltered[1] : (sortedData.length > 1 ? sortedData[1] : null);

          // Card Data
          const latestEmissions = latestData?.calculatedEmissions || {};
          const previousEmissions = previousData?.calculatedEmissions || {};

          // 计算变化率，如果没有前一年数据，变化率为 0
          const totalEmissionsChange = previousData 
            ? ((latestEmissions?.totalEmissions || 0) - (previousEmissions?.totalEmissions || 0)) / (previousEmissions?.totalEmissions || 1) * 100
            : 0;
          const perCapitaChange = previousData
            ? ((latestEmissions?.emissionIntensityByPerson || 0) - (previousEmissions?.emissionIntensityByPerson || 0)) / (previousEmissions?.emissionIntensityByPerson || 1) * 100
            : 0;
          const perAreaChange = previousData
            ? ((latestEmissions?.emissionIntensityByArea || 0) - (previousEmissions?.emissionIntensityByArea || 0)) / (previousEmissions?.emissionIntensityByArea || 1) * 100
            : 0;

          const cardData = {
            totalEmissions: { value: formatNumber(latestEmissions?.totalEmissions || 0), change: formatNumber(Math.abs(totalEmissionsChange)), isPositive: totalEmissionsChange > 0 },
            perCapitaEmissions: { value: formatNumber(latestEmissions?.emissionIntensityByPerson || 0), change: formatNumber(Math.abs(perCapitaChange)), isPositive: perCapitaChange > 0 },
            perAreaEmissions: { value: formatNumber(latestEmissions?.emissionIntensityByArea || 0), change: formatNumber(Math.abs(perAreaChange)), isPositive: perAreaChange > 0 },
            targetCompletion: { value: formatNumber(68), change: formatNumber(32), isPositive: false }, // Mock data
          };

          // Donut Chart - 安全访问 breakdown
          const breakdown = latestEmissions?.breakdown || {};
          const {
            fossilFuels = 0,
            fugitiveEmissions = 0,
            electricity = 0,
            heat = 0,
            totalGreenSink = 0,
            anthraciteGroup = 0,
            fuelOilGroup = 0,
            naturalGasGroup = 0,
            hcfc22Group = 0,
            co2Group = 0
          } = breakdown;

          // 单层环形图按大类展示（总量 totalEmissions 已为净排放 = 直接+间接−绿地碳汇）
          const donutData = [
            { value: fossilFuels || 0, name: '化石燃料' },
            { value: fugitiveEmissions || 0, name: '逸散排放' },
            { value: electricity || 0, name: '外购电力' },
            { value: heat || 0, name: '外购热力' },
          ];

          // Double Donut Chart - 双层圆盘图数据
          // 双层圆盘图外层显示23个详细数据项的排放量（tCO₂）
          const detailedBreakdown = latestEmissions?.detailedBreakdown || {};
          
          // 调试信息
          console.log('useDataScreen - latestEmissions:', latestEmissions);
          console.log('useDataScreen - detailedBreakdown:', detailedBreakdown);
          console.log('useDataScreen - detailedBreakdown 键:', Object.keys(detailedBreakdown));
          
          const doubleDonutData = {
            totalDirect: latestEmissions?.totalDirect || 0,
            totalIndirect: latestEmissions?.totalIndirect || 0,
            detailedBreakdown: detailedBreakdown  // 23个详细数据项的排放量（tCO₂）
          };
          
          console.log('useDataScreen - doubleDonutData:', doubleDonutData);

          // 选择「近5年」时填充近5年图表数据，选择「全部年份」时填充全部年份图表数据
          const showMultiYearCharts = isLast5Years || isAllYears;
          const multiYearData = isLast5Years
            ? sortedData.slice(0, 5).reverse()
            : (isAllYears ? sortedData.slice().reverse() : []);
          const multiYearLabels = multiYearData.map(d => d?.year?.toString() || '');
          const fossilFuelsData = multiYearData.map(d => d?.calculatedEmissions?.breakdown?.fossilFuels || 0);
          const fugitiveEmissionsData = multiYearData.map(d => d?.calculatedEmissions?.breakdown?.fugitiveEmissions || 0);
          const electricityData = multiYearData.map(d => d?.calculatedEmissions?.breakdown?.electricity || 0);
          const heatData = multiYearData.map(d => d?.calculatedEmissions?.breakdown?.heat || 0);

          const stackedAreaChartData = showMultiYearCharts
            ? { years: multiYearLabels, fossilFuels: fossilFuelsData, fugitiveEmissions: fugitiveEmissionsData, electricity: electricityData, heat: heatData }
            : { years: [], fossilFuels: [], fugitiveEmissions: [], electricity: [], heat: [] };
          const stackedBarChartData = showMultiYearCharts
            ? { years: multiYearLabels, fossilFuels: fossilFuelsData, fugitiveEmissions: fugitiveEmissionsData, electricity: electricityData, heat: heatData }
            : { years: [], fossilFuels: [], fugitiveEmissions: [], electricity: [], heat: [] };

          const areaIntensity = multiYearData.map(d => d?.calculatedEmissions?.emissionIntensityByArea || 0);
          const perCapitaIntensity = multiYearData.map(d => d?.calculatedEmissions?.emissionIntensityByPerson || 0);
          const dualAxisChartData = showMultiYearCharts
            ? { years: multiYearLabels, areaIntensity, perCapitaIntensity }
            : { years: [], areaIntensity: [], perCapitaIntensity: [] };

          // 计算碳排放总量和变化率（近5年/全部年份时）
          const totalEmissions = multiYearData.map(d => d?.calculatedEmissions?.totalEmissions || 0);
          const changeRates = [];
          if (multiYearData.length > 1) {
            for (let i = 1; i < multiYearData.length; i++) {
              const prev = multiYearData[i - 1]?.calculatedEmissions?.totalEmissions || 0;
              const curr = multiYearData[i]?.calculatedEmissions?.totalEmissions || 0;
              if (prev > 0) {
                changeRates.push(formatNumber((curr - prev) / prev * 100));
              } else if (prev === 0 && curr > 0) {
                changeRates.push(formatNumber(100));
              } else if (prev > 0 && curr === 0) {
                changeRates.push(formatNumber(-100));
              } else {
                changeRates.push(formatNumber(0));
              }
            }
            changeRates.unshift(null);
          } else if (multiYearData.length === 1) {
            changeRates.push(null);
          }

          const lineChartData = showMultiYearCharts
            ? { years: multiYearLabels, totalEmissions, changeRates }
            : { years: [], totalEmissions: [], changeRates: [] };

          // 排放强度（条形图：人均/单位面积）——给数据大屏复用
          const intensityBarData = {
            perCapita: latestEmissions?.emissionIntensityByPerson || 0,
            perArea: latestEmissions?.emissionIntensityByArea || 0,
          };

          // 同类型机构强度对比图：当前机构 vs 省内同单位类型机构人均碳排放平均值
          let benchmarkBarData = null;
          if (selectedOrganizationName && aggregatedByYear.length >= 1 && Array.isArray(provinceData)) {
            const currentOrgUnitType = (allData[0]?.account && typeof allData[0].account === 'object' && allData[0].account.unitType) ? allData[0].account.unitType : '默认单位类型';
            const currentOrgName = (allData[0]?.account && typeof allData[0].account === 'object' && allData[0].account.unitName) ? allData[0].account.unitName : selectedOrganizationName;
            const currentCR = latestEmissions?.emissionIntensityByPerson ?? 0;
            const byInstitution = new Map();
            provinceData.forEach(item => {
              if (!item || !item.calculatedEmissions) return;
              const acc = item.account;
              const unitName = (acc && typeof acc === 'object' && acc.unitName) ? acc.unitName : (acc && typeof acc === 'object' && acc._id ? acc._id.toString() : String(acc || ''));
              const unitType = (acc && typeof acc === 'object' && acc.unitType) ? acc.unitType : '默认单位类型';
              const cr = Number(item.calculatedEmissions?.emissionIntensityByPerson) || 0;
              const existing = byInstitution.get(unitName);
              if (!existing || Number(item.year) > Number(existing.year)) {
                byInstitution.set(unitName, { unitName, unitType, year: item.year, emissionIntensityByPerson: cr });
              }
            });
            const sameTypePeers = Array.from(byInstitution.values())
              .filter(o => o.unitType === currentOrgUnitType && o.unitName !== selectedOrganizationName);
            const peerCRs = sameTypePeers.map(o => o.emissionIntensityByPerson);
            const peerAverageCR = peerCRs.length > 0 ? peerCRs.reduce((a, b) => a + b, 0) / peerCRs.length : 0;
            benchmarkBarData = { currentCR, peerAverageCR, currentOrgName };
          }
          
          setData({
            cardData,
            donutData,
            doubleDonutData,
            stackedAreaChartData,
            stackedBarChartData,
            dualAxisChartData,
            lineChartData,
            intensityBarData,
            institutionRankingData,
            benchmarkBarData,
            rawData, // 添加原始数据用于地图
            showLast5YearsCharts: showMultiYearCharts, // 选择「近5年」或「全部年份」时展示多年度图表
          });
        } else {
          setAvailableYears([]);
          // 如果没有足够的数据，设置默认的空数据结构，避免组件报错
          setData({
            cardData: {
              totalEmissions: { value: '0.00', change: '0.00', isPositive: false },
              perCapitaEmissions: { value: '0.00', change: '0.00', isPositive: false },
              perAreaEmissions: { value: '0.00', change: '0.00', isPositive: false },
              targetCompletion: { value: '0', change: '0', isPositive: false },
            },
            donutData: [],
            doubleDonutData: { totalDirect: 0, totalIndirect: 0, detailedBreakdown: {} },
            stackedAreaChartData: { years: [], fossilFuels: [], fugitiveEmissions: [], electricity: [], heat: [] },
            stackedBarChartData: { years: [], fossilFuels: [], fugitiveEmissions: [], electricity: [], heat: [] },
            dualAxisChartData: { years: [], areaIntensity: [], perCapitaIntensity: [] },
            lineChartData: { years: [], changeRates: [] },
            intensityBarData: { perCapita: 0, perArea: 0 },
            institutionRankingData: [],
            benchmarkBarData: null,
            rawData, // 提供原始数据用于地图
            showLast5YearsCharts: false,
          });
        }
      } catch (err) {
        setError('无法加载图表数据');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    // 使用 requestIdleCallback 在浏览器空闲时加载，不阻塞渲染
    const loadData = () => fetchData();
    
    let cleanup;
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = window.requestIdleCallback(loadData, { timeout: 200 });
      cleanup = () => window.cancelIdleCallback(id);
    } else {
      // 使用 setTimeout(0) 在下一个事件循环执行
      const timeoutId = setTimeout(loadData, 0);
      cleanup = () => clearTimeout(timeoutId);
    }

    return cleanup;
  }, [selectedRegionCode, selectedOrganizationName, selectedYear]); // 当 region、机构或数据年份变化时重新获取数据

  return { data, loading, error, availableYears };
};
