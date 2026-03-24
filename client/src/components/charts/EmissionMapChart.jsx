import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import axios from 'axios';
import geoJson from '../../../public/geo/region_150000.json'; // Direct import
import { formatNumber } from '../../utils/formatNumber';

const EmissionMapChart = ({ data: carbonDataProp, isDataScreen = false, selectedRegionCode = '' }) => {
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const hasZoomedRef = useRef(false); // 跟踪是否已经进行过缩放

    useEffect(() => {
        const renderMap = async () => {
            try {
                if (!chartRef.current) return;

                // 获取当前用户信息
                const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
                const userRole = currentUser?.role;
                const userRegion = currentUser?.region;

                let carbonData = carbonDataProp;
                if (!carbonData || !Array.isArray(carbonData) || carbonData.length === 0) {
                    // 获取所有数据用于地图显示，不进行分页限制
                    // 对于超级管理员和省级管理员，需要获取所有数据以确保地图完整显示
                    const dataResponse = await axios.get('/api/carbon-data', {
                        params: {
                            limit: 10000, // 设置一个足够大的limit值，确保获取所有数据
                            page: 1
                        }
                    });
                    carbonData = dataResponse.data?.data || [];
                    
                    // 如果返回的数据数量等于limit，说明可能还有更多数据，需要获取所有页
                    const total = dataResponse.data?.total || 0;
                    if (total > 10000) {
                        // 如果总数超过10000，需要分页获取所有数据
                        const allData = [...carbonData];
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
                        carbonData = allData;
                    }
                }

                // 确保数据是数组并过滤有效数据
                if (!Array.isArray(carbonData)) {
                    carbonData = [];
                }

                // 数据大屏：按城市、区县筛选：城市=regionCode 前4位匹配，区县=regionCode 精确匹配
                if (isDataScreen && selectedRegionCode) {
                    const isCity = selectedRegionCode.endsWith('00') && selectedRegionCode.length === 6;
                    const isDistrict = selectedRegionCode.length === 6 && !isCity;
                    if (isCity) {
                        const cityPrefix = selectedRegionCode.substring(0, 4);
                        carbonData = carbonData.filter(d => d && d.regionCode && String(d.regionCode).trim().startsWith(cityPrefix));
                    } else if (isDistrict) {
                        carbonData = carbonData.filter(d => d && d.regionCode && String(d.regionCode).trim() === selectedRegionCode);
                    }
                }

                // 根据用户角色过滤数据
                // 注意：后端已经根据用户角色过滤了数据，这里的前端过滤是额外的安全措施
                // 关键：根据用户角色判断权限范围，而不是根据regionCode的格式
                let filteredData = carbonData;
                
                // 超级管理员和省级管理员：后端已经返回了所有权限范围内的数据，前端不需要再次过滤
                // 直接使用后端返回的数据，确保数据完整显示
                if (userRole === 'superadmin' || userRole === 'province_admin') {
                    // 超级管理员和省级管理员：显示后端返回的所有数据，不进行前端过滤
                    filteredData = carbonData;
                } else if (userRole === 'city_admin' && userRegion) {
                    // 市级管理员：无论regionCode是什么，都可以查看全市数据
                    const userRegionStr = String(userRegion);
                    const cityPrefix = userRegionStr.substring(0, 4);
                    filteredData = carbonData.filter(item => {
                        if (!item || !item.regionCode) return false;
                        const itemRegionCode = String(item.regionCode).trim();
                        return itemRegionCode.startsWith(cityPrefix);
                    });
                } else if (userRole === 'district_admin' && userRegion) {
                    // 区县级管理员：只显示本区县数据
                    const userRegionStr = String(userRegion);
                    filteredData = carbonData.filter(item => {
                        if (!item || !item.regionCode) return false;
                        const itemRegionCode = String(item.regionCode).trim();
                        return itemRegionCode === userRegionStr;
                    });
                }
                // 其他角色（如organization_user）使用后端返回的数据，不进行前端过滤

                // 构建 adcode->行政区名称 的映射，保证图层名称与 GeoJSON 匹配
                // 同时构建反向映射（名称->代码），用于备用匹配
                const adcodeNameMap = new Map();
                const nameToCodeMap = new Map();
                if (geoJson.features && Array.isArray(geoJson.features)) {
                    geoJson.features.forEach(f => {
                        // 统一转换为字符串并去除空格，确保格式一致
                        const code = f.properties?.adcode ? String(f.properties.adcode).trim() : '';
                        const name = f.properties?.name || f.properties?.NAME || '';
                        if (code && name) {
                            adcodeNameMap.set(code, name);
                            nameToCodeMap.set(name, code);
                        }
                    });
                }

                // 调试：打印过滤后的数据和GeoJSON映射
                console.log('[地图调试] ========== 地图数据调试开始 ==========');
                console.log('[地图调试] 用户角色:', userRole, '用户地区:', userRegion);
                console.log('[地图调试] 原始数据数量:', carbonData.length);
                console.log('[地图调试] 过滤后的数据数量:', filteredData.length);
                console.log('[地图调试] 过滤后的数据样本:', filteredData.slice(0, 10).map(d => ({
                    regionCode: d.regionCode,
                    regionCodeType: typeof d.regionCode,
                    regionCodeString: String(d.regionCode),
                    regionName: d.regionName,
                    totalEmissions: d.calculatedEmissions?.totalEmissions
                })));
                console.log('[地图调试] GeoJSON区域数量:', adcodeNameMap.size);
                console.log('[地图调试] GeoJSON区域样本:', Array.from(adcodeNameMap.entries()).slice(0, 20));
                
                // 检查数据中的regionCode是否都能在GeoJSON中找到
                const uniqueRegionCodes = [...new Set(filteredData.map(d => String(d.regionCode).trim()))];
                const missingCodes = uniqueRegionCodes.filter(code => !adcodeNameMap.has(code));
                if (missingCodes.length > 0) {
                    console.warn('[地图警告] 以下regionCode在GeoJSON中找不到:', missingCodes);
                } else {
                    console.log('[地图调试] 所有regionCode都能在GeoJSON中找到');
                }

                // 按地区聚合数据（汇总同一地区的所有机构数据）
                // 注意：地图GeoJSON包含的是区县级数据，所以所有角色都按区县聚合
                const regionEmissionsMap = {};
                filteredData.forEach(item => {
                    // 只检查regionCode是否存在，不检查totalEmissions，因为即使为0也应该显示
                    if (!item || !item.regionCode) {
                        return;
                    }
                    // 统一转换为字符串，确保格式一致
                    const mapKey = String(item.regionCode).trim();
                    // 即使totalEmissions为0或不存在，也应该聚合（显示为0）
                    const totalEmissions = Number(item.calculatedEmissions?.totalEmissions) || 0;

                    // 优先用 GeoJSON 的标准名称，避免只有赛罕区显示的情况（名称不匹配会导致区域无法着色）
                    const geoName = adcodeNameMap.get(mapKey);
                    const regionNameParts = (item.regionName || '').split('/');
                    const fallbackName = regionNameParts.length > 1 ? regionNameParts[1] : (regionNameParts[0] || mapKey);
                    const mapName = geoName || fallbackName;
                    
                    // 如果找不到GeoJSON名称，尝试查找（可能是格式问题）
                    if (!geoName) {
                        // 尝试查找：可能是数字格式不一致
                        for (const [code, name] of adcodeNameMap.entries()) {
                            if (code === mapKey || String(code) === String(mapKey)) {
                                console.log(`[地图调试] 找到匹配: ${mapKey} -> ${name}`);
                                break;
                            }
                        }
                    }
                    
                    if (!regionEmissionsMap[mapKey]) {
                        regionEmissionsMap[mapKey] = {
                            regionCode: mapKey,
                            regionName: mapName,
                            totalEmissions: 0
                        };
                    }
                    regionEmissionsMap[mapKey].totalEmissions += totalEmissions;
                });

                // 调试：打印聚合后的数据
                console.log('[地图调试] 聚合后的区域数量:', Object.keys(regionEmissionsMap).length);
                console.log('[地图调试] 聚合后的区域:', Object.values(regionEmissionsMap).map(d => ({
                    regionCode: d.regionCode,
                    regionName: d.regionName,
                    totalEmissions: d.totalEmissions
                })));

                // 判断区域是否需要添加黑色轮廓
                const shouldAddBorder = (regionCode, regionName) => {
                    // 统一转换为字符串进行比较
                    const regionCodeStr = String(regionCode || '');
                    const userRegionStr = String(userRegion || '');
                    
                    if (userRole === 'district_admin' && userRegion) {
                        // 区县级管理员：只有自己的区县添加黑色轮廓
                        const match = regionCodeStr === userRegionStr;
                        if (match) {
                            console.log(`[边框判断] 区县级管理员：区域 ${regionName} (${regionCodeStr}) 匹配用户地区 ${userRegionStr}`);
                        }
                        return match;
                    } else if (userRole === 'city_admin' && userRegion) {
                        // 市级管理员：自己市中所有区县添加黑色轮廓
                        const cityPrefix = userRegionStr.substring(0, 4);
                        const match = regionCodeStr && regionCodeStr.startsWith(cityPrefix);
                        if (match) {
                            console.log(`[边框判断] 市级管理员：区域 ${regionName} (${regionCodeStr}) 匹配城市前缀 ${cityPrefix}`);
                        }
                        return match;
                    }
                    // 省级管理员和超级管理员不需要添加轮廓
                    return false;
                };

                // 转换为地图数据格式（只包含有数据的区域）
                // 关键：必须使用GeoJSON中的标准名称，否则ECharts无法匹配并着色
                const mapSeriesData = Object.values(regionEmissionsMap)
                    .map(item => {
                        // 首先尝试通过regionCode匹配
                        let geoName = adcodeNameMap.get(item.regionCode);
                        
                        // 如果通过代码找不到，尝试通过名称匹配（备用方案）
                        if (!geoName && item.regionName) {
                            // 尝试精确匹配
                            if (nameToCodeMap.has(item.regionName)) {
                                const matchedCode = nameToCodeMap.get(item.regionName);
                                geoName = adcodeNameMap.get(matchedCode);
                                console.log(`[地图匹配] 通过名称匹配: ${item.regionName} -> ${matchedCode} -> ${geoName}`);
                            } else {
                                // 尝试部分匹配（处理"城市/区县"格式）
                                const regionNameParts = item.regionName.split('/');
                                const districtName = regionNameParts.length > 1 ? regionNameParts[1] : regionNameParts[0];
                                if (nameToCodeMap.has(districtName)) {
                                    const matchedCode = nameToCodeMap.get(districtName);
                                    geoName = adcodeNameMap.get(matchedCode);
                                    console.log(`[地图匹配] 通过区县名匹配: ${districtName} -> ${matchedCode} -> ${geoName}`);
                                }
                            }
                        }
                        
                        if (!geoName) {
                            console.warn(`[地图警告] 区域代码 ${item.regionCode} (名称: ${item.regionName}) 在GeoJSON中找不到对应名称，跳过该区域`);
                            return null;
                        }
                        
                        return {
                            name: geoName, // 必须使用GeoJSON中的标准名称
                            value: item.totalEmissions, // 使用碳排放总量
                            regionCode: item.regionCode // 保留regionCode用于判断是否需要添加轮廓
                        };
                    })
                    .filter(item => item !== null); // 过滤掉无法匹配的区域

                // 为需要添加黑色轮廓但没有数据的区域创建数据项
                // 遍历GeoJSON中的所有区域，找到需要添加轮廓但不在mapSeriesData中的区域
                if (geoJson.features && (userRole === 'district_admin' || userRole === 'city_admin')) {
                    geoJson.features.forEach(feature => {
                        const geoRegionName = feature.properties?.name || feature.properties?.NAME || '';
                        const geoRegionCode = feature.properties?.adcode ? String(feature.properties.adcode) : '';
                        
                        if (!geoRegionName || !geoRegionCode) return;
                        
                        // 检查这个区域是否需要添加黑色轮廓
                        if (shouldAddBorder(geoRegionCode, geoRegionName)) {
                            // 检查这个区域是否已经在mapSeriesData中（使用名称和代码双重匹配）
                            const existingItem = mapSeriesData.find(item => {
                                // 名称完全匹配
                                if (item.name === geoRegionName) return true;
                                // 代码匹配（统一转为字符串比较）
                                if (String(item.regionCode) === geoRegionCode) return true;
                                return false;
                            });
                            
                            // 如果不在mapSeriesData中，添加一个value为0的数据项
                            if (!existingItem) {
                                mapSeriesData.push({
                                    name: geoRegionName,
                                    value: 0, // 没有数据，设为0
                                    regionCode: geoRegionCode
                                });
                                console.log(`[添加缺失区域] 为区域 ${geoRegionName} (${geoRegionCode}) 添加数据项（用于显示轮廓）`);
                            } else {
                                // 如果已存在，确保regionCode正确
                                if (String(existingItem.regionCode) !== geoRegionCode && existingItem.name === geoRegionName) {
                                    existingItem.regionCode = geoRegionCode;
                                    console.log(`[更新区域代码] 更新区域 ${geoRegionName} 的代码为 ${geoRegionCode}`);
                                }
                            }
                        }
                    });
                }

                // 调试信息：打印地图数据和GeoJSON中的区域名称
                console.log('用户角色:', userRole, '用户地区:', userRegion);
                console.log('地图数据:', mapSeriesData);
                if (geoJson.features && geoJson.features.length > 0) {
                    const geoJsonNames = geoJson.features.slice(0, 10).map(f => ({
                        name: f.properties?.name || f.properties?.NAME || '未知',
                        code: f.properties?.adcode || '未知'
                    }));
                    console.log('GeoJSON中的前10个区域:', geoJsonNames);
                    console.log('数据中的区域名称:', mapSeriesData.map(d => ({ name: d.name, code: d.regionCode })));
                    
                    // 找出需要添加边框的区域
                    if (userRole === 'district_admin' || userRole === 'city_admin') {
                        const regionsNeedBorder = geoJson.features
                            .filter(f => {
                                const code = f.properties?.adcode ? String(f.properties.adcode) : '';
                                return shouldAddBorder(code, f.properties?.name || '');
                            })
                            .map(f => ({
                                name: f.properties?.name || '未知',
                                code: f.properties?.adcode || '未知'
                            }));
                        console.log('需要添加黑色轮廓的区域:', regionsNeedBorder);
                    }
                }

                chartInstanceRef.current = echarts.init(chartRef.current);
                const mapName = 'region_150000';
                echarts.registerMap(mapName, geoJson);

                // 辅助函数：从feature中提取边界框
                const extractBoundsFromFeature = (feature) => {
                    const bounds = {
                        minLon: Infinity,
                        maxLon: -Infinity,
                        minLat: Infinity,
                        maxLat: -Infinity
                    };
                    
                    const geometry = feature.geometry;
                    if (geometry.type === 'Polygon' && geometry.coordinates) {
                        geometry.coordinates[0].forEach(coord => {
                            if (coord && coord.length >= 2) {
                                const [lon, lat] = coord;
                                bounds.minLon = Math.min(bounds.minLon, lon);
                                bounds.maxLon = Math.max(bounds.maxLon, lon);
                                bounds.minLat = Math.min(bounds.minLat, lat);
                                bounds.maxLat = Math.max(bounds.maxLat, lat);
                            }
                        });
                    } else if (geometry.type === 'MultiPolygon' && geometry.coordinates) {
                        geometry.coordinates.forEach(polygon => {
                            if (polygon[0]) {
                                polygon[0].forEach(coord => {
                                    if (coord && coord.length >= 2) {
                                        const [lon, lat] = coord;
                                        bounds.minLon = Math.min(bounds.minLon, lon);
                                        bounds.maxLon = Math.max(bounds.maxLon, lon);
                                        bounds.minLat = Math.min(bounds.minLat, lat);
                                        bounds.maxLat = Math.max(bounds.maxLat, lat);
                                    }
                                });
                            }
                        });
                    }
                    
                    return bounds;
                };
                
                // 辅助函数：计算地图的边界框（用于计算合适的缩放级别）
                const calculateMapBounds = () => {
                    let minLon = Infinity, maxLon = -Infinity;
                    let minLat = Infinity, maxLat = -Infinity;
                    
                    if (geoJson.features && geoJson.features.length > 0) {
                        geoJson.features.forEach(feature => {
                            const bounds = extractBoundsFromFeature(feature);
                            minLon = Math.min(minLon, bounds.minLon);
                            maxLon = Math.max(maxLon, bounds.maxLon);
                            minLat = Math.min(minLat, bounds.minLat);
                            maxLat = Math.max(maxLat, bounds.maxLat);
                        });
                    }
                    
                    if (minLon !== Infinity && maxLon !== -Infinity && 
                        minLat !== Infinity && maxLat !== -Infinity) {
                        return {
                            minLon, maxLon, minLat, maxLat,
                            width: maxLon - minLon,
                            height: maxLat - minLat,
                            center: [(minLon + maxLon) / 2, (minLat + maxLat) / 2]
                        };
                    }
                    return null;
                };
                
                // 获取地图整体边界框
                const mapBounds = calculateMapBounds();
                
                // 根据用户角色或数据大屏选定区域计算地图的中心点和缩放级别
                let targetCenter = null;
                let targetZoom = 1;
                
                // 数据大屏：按选定的城市/区县自动缩放，使选定区域居中并显示全貌
                if (isDataScreen && selectedRegionCode && mapBounds) {
                    const selIsCity = selectedRegionCode.endsWith('00') && selectedRegionCode.length === 6;
                    const selIsDistrict = selectedRegionCode.length === 6 && !selIsCity;
                    
                    if (selIsDistrict) {
                        const districtCode = String(selectedRegionCode);
                        const districtFeature = geoJson.features?.find(f => String(f.properties?.adcode) === districtCode);
                        if (districtFeature) {
                            const districtBounds = extractBoundsFromFeature(districtFeature);
                            const center = districtFeature.properties?.center || districtFeature.properties?.centroid;
                            if (center && center.length >= 2) {
                                const [lon, lat] = center;
                                districtBounds.minLon = Math.min(districtBounds.minLon, lon);
                                districtBounds.maxLon = Math.max(districtBounds.maxLon, lon);
                                districtBounds.minLat = Math.min(districtBounds.minLat, lat);
                                districtBounds.maxLat = Math.max(districtBounds.maxLat, lat);
                            }
                            if (districtBounds.minLon !== Infinity && districtBounds.maxLon !== -Infinity &&
                                districtBounds.minLat !== Infinity && districtBounds.maxLat !== -Infinity) {
                                targetCenter = [(districtBounds.minLon + districtBounds.maxLon) / 2, (districtBounds.minLat + districtBounds.maxLat) / 2];
                                const districtWidth = districtBounds.maxLon - districtBounds.minLon;
                                const districtHeight = districtBounds.maxLat - districtBounds.minLat;
                                const containerWidth = chartRef.current?.clientWidth || 800;
                                const containerHeight = chartRef.current?.clientHeight || 600;
                                const mapWidth = mapBounds.width;
                                const mapHeight = mapBounds.height;
                                const margin = 0.1;
                                let scaleX = mapWidth / (districtWidth * (1 + margin * 2));
                                let scaleY = mapHeight / (districtHeight * (1 + margin * 2));
                                let calculatedZoom = Math.min(scaleX, scaleY);
                                calculatedZoom = Math.max(0.5, Math.min(10, calculatedZoom));
                                calculatedZoom = calculatedZoom * 0.5;
                                calculatedZoom = Math.max(0.5, Math.min(10, calculatedZoom));
                                targetZoom = calculatedZoom;
                            }
                        }
                    } else if (selIsCity) {
                        const cityPrefix = selectedRegionCode.substring(0, 4);
                        const cityFeatures = geoJson.features?.filter(f => {
                            const code = String(f.properties?.adcode || '');
                            return code.startsWith(cityPrefix);
                        }) || [];
                        if (cityFeatures.length > 0) {
                            let cityMinLon = Infinity, cityMaxLon = -Infinity, cityMinLat = Infinity, cityMaxLat = -Infinity;
                            cityFeatures.forEach(feature => {
                                const bounds = extractBoundsFromFeature(feature);
                                cityMinLon = Math.min(cityMinLon, bounds.minLon);
                                cityMaxLon = Math.max(cityMaxLon, bounds.maxLon);
                                cityMinLat = Math.min(cityMinLat, bounds.minLat);
                                cityMaxLat = Math.max(cityMaxLat, bounds.maxLat);
                                const c = feature.properties?.center || feature.properties?.centroid;
                                if (c && c.length >= 2) {
                                    cityMinLon = Math.min(cityMinLon, c[0]);
                                    cityMaxLon = Math.max(cityMaxLon, c[0]);
                                    cityMinLat = Math.min(cityMinLat, c[1]);
                                    cityMaxLat = Math.max(cityMaxLat, c[1]);
                                }
                            });
                            if (cityMinLon !== Infinity && cityMaxLon !== -Infinity && cityMinLat !== Infinity && cityMaxLat !== -Infinity) {
                                targetCenter = [(cityMinLon + cityMaxLon) / 2, (cityMinLat + cityMaxLat) / 2];
                                const cityWidth = cityMaxLon - cityMinLon;
                                const cityHeight = cityMaxLat - cityMinLat;
                                const containerWidth = chartRef.current?.clientWidth || 800;
                                const containerHeight = chartRef.current?.clientHeight || 600;
                                const mapWidth = mapBounds.width;
                                const mapHeight = mapBounds.height;
                                const margin = 0.1;
                                let scaleX = mapWidth / (cityWidth * (1 + margin * 2));
                                let scaleY = mapHeight / (cityHeight * (1 + margin * 2));
                                let calculatedZoom = Math.min(scaleX, scaleY);
                                calculatedZoom = Math.max(0.5, Math.min(8, calculatedZoom));
                                calculatedZoom = calculatedZoom * 0.5;
                                calculatedZoom = Math.max(0.5, Math.min(8, calculatedZoom));
                                targetZoom = calculatedZoom;
                            }
                        }
                    }
                } else if (userRole === 'district_admin' && userRegion) {
                    // 区县级管理员：动态计算缩放级别，使全区县都能在视野内，并将区县定位在中心
                    const districtCode = String(userRegion);
                    const districtFeature = geoJson.features?.find(f => 
                        String(f.properties?.adcode) === districtCode
                    );
                    
                    if (districtFeature && mapBounds) {
                        // 计算该区县的边界框
                        const districtBounds = extractBoundsFromFeature(districtFeature);
                        
                        // 如果有center或centroid，也考虑它们
                        const center = districtFeature.properties?.center || districtFeature.properties?.centroid;
                        if (center && center.length >= 2) {
                            const [lon, lat] = center;
                            districtBounds.minLon = Math.min(districtBounds.minLon, lon);
                            districtBounds.maxLon = Math.max(districtBounds.maxLon, lon);
                            districtBounds.minLat = Math.min(districtBounds.minLat, lat);
                            districtBounds.maxLat = Math.max(districtBounds.maxLat, lat);
                        }
                        
                        if (districtBounds.minLon !== Infinity && districtBounds.maxLon !== -Infinity && 
                            districtBounds.minLat !== Infinity && districtBounds.maxLat !== -Infinity) {
                            // 计算区县中心点
                            targetCenter = [
                                (districtBounds.minLon + districtBounds.maxLon) / 2, 
                                (districtBounds.minLat + districtBounds.maxLat) / 2
                            ];
                            
                            // 计算区县边界框的宽度和高度
                            const districtWidth = districtBounds.maxLon - districtBounds.minLon;
                            const districtHeight = districtBounds.maxLat - districtBounds.minLat;
                            
                            // 获取容器尺寸（考虑数据大屏的正方形比例）
                            const containerWidth = chartRef.current?.clientWidth || 800;
                            const containerHeight = chartRef.current?.clientHeight || 600;
                            
                            // 计算合适的缩放级别
                            const mapWidth = mapBounds.width;
                            const mapHeight = mapBounds.height;
                            
                            // 计算需要的缩放比例（留10%的边距）
                            const margin = 0.1;
                            let scaleX = mapWidth / (districtWidth * (1 + margin * 2));
                            let scaleY = mapHeight / (districtHeight * (1 + margin * 2));
                            
                            // 取较小的缩放比例，确保两个方向都能完全显示
                            let calculatedZoom = Math.min(scaleX, scaleY);
                            
                            // 限制缩放范围在合理区间（0.5 到 10）
                            calculatedZoom = Math.max(0.5, Math.min(10, calculatedZoom));
                            
                            // 如果是数据大屏（正方形），需要缩小一点以适应正方形容器
                            if (isDataScreen) {
                                calculatedZoom = calculatedZoom * 0.5;
                                calculatedZoom = Math.max(0.5, Math.min(10, calculatedZoom));
                            }
                            
                            targetZoom = calculatedZoom;
                            
                            console.log(`[区县定位] 区县 ${districtFeature.properties?.name} (${districtCode})`);
                            console.log(`[区县定位] 中心点:`, targetCenter);
                            console.log(`[区县定位] 边界: 经度[${districtBounds.minLon.toFixed(4)}, ${districtBounds.maxLon.toFixed(4)}], 纬度[${districtBounds.minLat.toFixed(4)}, ${districtBounds.maxLat.toFixed(4)}]`);
                            console.log(`[区县定位] 区县尺寸: 宽度=${districtWidth.toFixed(4)}, 高度=${districtHeight.toFixed(4)}`);
                            console.log(`[区县定位] 容器尺寸: 宽度=${containerWidth}, 高度=${containerHeight}`);
                            console.log(`[区县定位] 计算缩放级别: ${targetZoom.toFixed(2)}`);
                        }
                    }
                } else if (userRole === 'city_admin' && userRegion) {
                    // 市级管理员：动态计算缩放级别，使全市所有区县都能在视野内
                    const cityPrefix = String(userRegion).substring(0, 4);
                    const cityFeatures = geoJson.features?.filter(f => {
                        const code = String(f.properties?.adcode || '');
                        return code.startsWith(cityPrefix);
                    }) || [];
                    
                    if (cityFeatures.length > 0 && mapBounds) {
                        // 计算该市所有区县的边界框
                        let cityMinLon = Infinity, cityMaxLon = -Infinity;
                        let cityMinLat = Infinity, cityMaxLat = -Infinity;
                        
                        cityFeatures.forEach(feature => {
                            const bounds = extractBoundsFromFeature(feature);
                            cityMinLon = Math.min(cityMinLon, bounds.minLon);
                            cityMaxLon = Math.max(cityMaxLon, bounds.maxLon);
                            cityMinLat = Math.min(cityMinLat, bounds.minLat);
                            cityMaxLat = Math.max(cityMaxLat, bounds.maxLat);
                            
                            // 如果有center或centroid，也考虑它们
                            const center = feature.properties?.center || feature.properties?.centroid;
                            if (center && center.length >= 2) {
                                const [lon, lat] = center;
                                cityMinLon = Math.min(cityMinLon, lon);
                                cityMaxLon = Math.max(cityMaxLon, lon);
                                cityMinLat = Math.min(cityMinLat, lat);
                                cityMaxLat = Math.max(cityMaxLat, lat);
                            }
                        });
                        
                        if (cityMinLon !== Infinity && cityMaxLon !== -Infinity && 
                            cityMinLat !== Infinity && cityMaxLat !== -Infinity) {
                            // 计算整体中心点
                            targetCenter = [(cityMinLon + cityMaxLon) / 2, (cityMinLat + cityMaxLat) / 2];
                            
                            // 计算城市边界框的宽度和高度
                            const cityWidth = cityMaxLon - cityMinLon;
                            const cityHeight = cityMaxLat - cityMinLat;
                            
                            // 获取容器尺寸（考虑数据大屏的正方形比例）
                            // 数据大屏是正方形，数据地图模块可能是矩形
                            const containerWidth = chartRef.current?.clientWidth || 800;
                            const containerHeight = chartRef.current?.clientHeight || 600;
                            
                            // 计算合适的缩放级别
                            // 使用地图整体边界框作为参考，计算需要缩小多少倍才能让城市边界框完全显示
                            const mapWidth = mapBounds.width;
                            const mapHeight = mapBounds.height;
                            
                            // 考虑容器的宽高比和城市边界框的宽高比
                            const containerAspect = containerWidth / containerHeight;
                            const cityAspect = cityWidth / cityHeight;
                            
                            // 计算需要的缩放比例（留10%的边距）
                            const margin = 0.1;
                            let scaleX = mapWidth / (cityWidth * (1 + margin * 2));
                            let scaleY = mapHeight / (cityHeight * (1 + margin * 2));
                            
                            // 取较小的缩放比例，确保两个方向都能完全显示
                            let calculatedZoom = Math.min(scaleX, scaleY);
                            
                            // 限制缩放范围在合理区间（0.5 到 8）
                            calculatedZoom = Math.max(0.5, Math.min(8, calculatedZoom));
                            
                            // 如果是数据大屏（正方形），需要缩小一点以适应正方形容器
                            if (isDataScreen) {
                                // 数据大屏是正方形，缩小缩放级别以显示更多区域
                                calculatedZoom = calculatedZoom * 0.5;
                                calculatedZoom = Math.max(0.5, Math.min(8, calculatedZoom));
                            }
                            
                            targetZoom = calculatedZoom;
                            
                            console.log(`[市级定位] 城市 ${cityPrefix} 包含 ${cityFeatures.length} 个区县`);
                            console.log(`[市级定位] 整体中心点:`, targetCenter);
                            console.log(`[市级定位] 城市边界: 经度[${cityMinLon.toFixed(4)}, ${cityMaxLon.toFixed(4)}], 纬度[${cityMinLat.toFixed(4)}, ${cityMaxLat.toFixed(4)}]`);
                            console.log(`[市级定位] 城市尺寸: 宽度=${cityWidth.toFixed(4)}, 高度=${cityHeight.toFixed(4)}`);
                            console.log(`[市级定位] 容器尺寸: 宽度=${containerWidth}, 高度=${containerHeight}`);
                            console.log(`[市级定位] 计算缩放级别: ${targetZoom.toFixed(2)}`);
                        }
                    }
                }
                
                // 计算地图中心点（用于初始居中显示）
                // 使用 calculateMapBounds() 的结果，如果没有则使用默认值
                const mapCenter = mapBounds ? mapBounds.center : [111.5, 45.5]; // 内蒙古大致中心
                
                // 5个区间的固定颜色（不变）
                const FIXED_COLORS = [
                    'rgb(214, 231, 193)',
                    'rgb(157, 197, 127)',
                    'rgb(246, 164, 110)',
                    'rgb(224, 94, 64)',
                    'rgb(133, 4, 26)'
                ];
                
                // 根据所有数据的碳总排放量动态计算5个区间
                const emissionValues = mapSeriesData.map(d => parseFloat(d.value) || 0).filter(v => !isNaN(v));
                const dataMin = emissionValues.length > 0 ? Math.min(...emissionValues) : 0;
                const dataMax = emissionValues.length > 0 ? Math.max(...emissionValues) : 0;
                // 当所有值相同时，使用小范围避免除零（基于最大值1%或至少1）
                const range = dataMax - dataMin;
                const effectiveRange = range <= 0 ? Math.max(Math.abs(dataMax) * 0.01, 1) : range;
                const step = effectiveRange / 5;
                
                const colorRanges = FIXED_COLORS.map((color, i) => {
                    const baseMin = dataMin;
                    const baseMax = range > 0 ? dataMax : dataMin + effectiveRange;
                    const min = i === 0 ? baseMin : baseMin + i * step;
                    const max = i === 4 ? (baseMax + 0.01) : baseMin + (i + 1) * step; // 最后一档含最大值
                    return { min, max, color };
                });

                // 根据值获取颜色（使用动态区间）
                const getColorByValue = (value) => {
                    const numVal = parseFloat(value) || 0;
                    for (const range of colorRanges) {
                        if (numVal >= range.min && numVal < range.max) {
                            return range.color;
                        }
                    }
                    if (numVal >= colorRanges[colorRanges.length - 1].min) {
                        return colorRanges[colorRanges.length - 1].color;
                    }
                    return colorRanges[0].color;
                };

                // 为每个数据点设置颜色和边框
                // 注意：当两个相邻区域边框重合时，边框会叠加。为了在叠加时只显示一个边框的宽度，
                // 我们将默认边框宽度设置为目标宽度的一半（0.25px），这样两个相邻区域叠加后显示为0.5px
                const mapSeriesDataWithColor = mapSeriesData.map(item => {
                    const needsHighlightBorder = shouldAddBorder(item.regionCode, item.name);
                    
                    const itemStyle = {
                        areaColor: getColorByValue(item.value),
                        // 所有区域默认使用黑色边框
                        borderColor: '#000000', // 默认黑色边框
                        // 设置为0.25px，这样两个相邻区域叠加后显示为0.5px（单个边框宽度）
                        borderWidth: needsHighlightBorder ? 2 : 0.25 // 突出显示区域2px，普通区域0.25px
                    };
                    
                    // 如果需要突出显示（区县级管理员自己的区县、市级管理员自己市的区县），使用更粗的边框
                    if (needsHighlightBorder) {
                        itemStyle.borderWidth = 2; // 突出显示的边框宽度（2px，与普通边框叠加时效果适中）
                        console.log(`[边框设置] 为区域 ${item.name} (${item.regionCode}) 添加突出显示的黑色轮廓（2px）`);
                    }
                    
                    return {
                        ...item,
                        itemStyle
                    };
                });
                
                // 调试：打印最终的数据项
                const itemsWithBorder = mapSeriesDataWithColor.filter(item => 
                    shouldAddBorder(item.regionCode, item.name)
                );
                console.log('[边框调试] 应该添加突出显示黑色轮廓的数据项:', itemsWithBorder.map(d => ({
                    name: d.name,
                    code: d.regionCode,
                    borderColor: d.itemStyle?.borderColor,
                    borderWidth: d.itemStyle?.borderWidth
                })));

                const option = {
                    tooltip: { 
                        trigger: 'item', 
                        formatter: (params) => {
                            const value = params.value || 0;
                            return `${params.name}<br/>碳排放总量: ${formatNumber(value)} (tCO₂e)`;
                        }
                    },
                    visualMap: {
                        min: dataMin,
                        max: dataMax,
                        calculable: true,
                        orient: 'vertical',
                        // 数据大屏适配：在正方形容器中，调整visualMap的位置和尺寸，确保完全显示
                        left: isDataScreen ? 2 : 6,
                        top: isDataScreen ? '10%' : 'auto', // 数据大屏中向上移动（10%位置）
                        bottom: isDataScreen ? 'auto' : 68, // 数据大屏中不使用bottom定位
                        itemWidth: isDataScreen ? 30 : 60, // 进一步减小宽度
                        itemHeight: isDataScreen ? 15 : 30, // 进一步减小高度，确保完全显示
                        textGap: isDataScreen ? 1 : 6, // 进一步减小文字间距
                        // 使用分段式视觉映射（动态区间）
                        type: 'piecewise',
                        pieces: colorRanges.map((r, i) => {
                            const formatVal = (v) => {
                                if (v >= 10000) return `${(v / 10000).toFixed(1)}万`;
                                if (v >= 1 || v === 0) return Number.isInteger(v) ? String(v) : v.toFixed(2);
                                return v.toFixed(2);
                            };
                            const label = i === 0
                                ? `< ${formatVal(r.max)}`
                                : i === 4
                                    ? `≥ ${formatVal(r.min)}`
                                    : `${formatVal(r.min)}-${formatVal(r.max)}`;
                            return i === 4
                                ? { min: r.min, color: r.color, label }
                                : { min: r.min, max: r.max, color: r.color, label };
                        }),
                        // 为每个小模块添加黑色边框和黑色文字
                        itemStyle: {
                            borderColor: '#000000',
                            borderWidth: 2  // 增加边框宽度确保可见
                        },
                        textStyle: { 
                            color: '#000', 
                            fontSize: isDataScreen ? 7 : 10 // 数据大屏中字体更小，确保完全显示
                        },
                        // 数据大屏中调整内边距，确保内容不溢出
                        padding: isDataScreen ? [2, 2] : [10, 10]
                    },
                    series: [{
                        name: '碳排放总量',
                        type: 'map',
                        map: mapName,
                        roam: true,
                        // 设置地图布局
                        // 数据大屏中地图向上偏移，其他情况稍微向下偏移
                        layoutCenter: isDataScreen
                            ? ['50%', '40%']  // 数据大屏中地图偏上显示
                            : ['50%', '55%'], // 其他情况稍微向下偏移
                        layoutSize: '100%', // 地图占满容器
                        // 设置缩放限制，允许缩小到最小级别
                        scaleLimit: {
                            min: 0.05, // 进一步降低最小值，允许缩小到非常小的级别
                            max: 10    // 增加最大值，允许放大到更大的级别
                        },
                        // 初始缩放级别和中心点
                        // 如果用户是区县级或市级管理员，使用计算的目标中心点和最大缩放
                        // 省级管理员和超级管理员在数据大屏中使用地图整体中心点，并设置合适的缩放级别以显示全省全貌
                        zoom: targetCenter ? targetZoom : (
                            ((userRole === 'province_admin' || userRole === 'superadmin') && isDataScreen)
                                ? 0.5  // 数据大屏中缩小以显示全省全貌
                                : 1    // 其他情况使用默认值
                        ),
                        center: targetCenter || (
                            ((userRole === 'province_admin' || userRole === 'superadmin') && isDataScreen && mapCenter)
                                ? mapCenter  // 数据大屏中使用地图整体中心
                                : (mapCenter ? [mapCenter[0], mapCenter[1] + 0.5] : [111.5, 46.0])  // 其他情况使用默认中心
                        ),
                        // 移除 boundingCoords，因为它可能会限制缩放
                        // 如果需要限制移动范围，可以通过其他方式实现
                        // boundingCoords: mapBounds,
                        // 设置默认样式（所有区域都会应用，除非在data中被覆盖）
                        // 注意：由于相邻区域的边框会叠加，设置为0.25px，这样两个叠加后显示为0.5px
                        itemStyle: {
                            borderColor: '#000000', // 默认黑色边框（所有用户可见）
                            borderWidth: 0.25 // 默认边框宽度（0.25px，叠加后约0.5px）
                        },
                        label: { show: false, formatter: '{b}', color: '#fff', fontSize: 10 }, // 初始不显示标签
                        emphasis: { 
                            label: { show: true }, 
                            itemStyle: { 
                                areaColor: '#FFD700',
                                // 高亮时保持边框样式
                                borderColor: '#000000',
                                borderWidth: 2
                            } 
                        },
                        data: mapSeriesDataWithColor
                    }]
                };

                chartInstanceRef.current.setOption(option);
                
                // 应用visualMap图例项的黑色边框和黑色文字样式
                const applyVisualMapStyles = () => {
                    if (chartRef.current) {
                        const svg = chartRef.current.querySelector('svg');
                        if (svg) {
                            // 查找所有visualMap相关的rect元素并添加黑色边框
                            const rects = svg.querySelectorAll('rect');
                            rects.forEach(rect => {
                                const parent = rect.parentElement;
                                if (parent && (
                                    parent.getAttribute('class')?.includes('visual-map') ||
                                    parent.getAttribute('class')?.includes('piecewise') ||
                                    parent.closest('[class*="visual-map"]') ||
                                    parent.closest('[class*="piecewise"]')
                                )) {
                                    rect.setAttribute('stroke', '#000000');
                                    rect.setAttribute('stroke-width', '1');
                                }
                            });
                            
                            // 查找所有visualMap相关的text元素并设置黑色
                            const texts = svg.querySelectorAll('text');
                            texts.forEach(text => {
                                const parent = text.parentElement;
                                if (parent && (
                                    parent.getAttribute('class')?.includes('visual-map') ||
                                    parent.getAttribute('class')?.includes('piecewise') ||
                                    parent.closest('[class*="visual-map"]') ||
                                    parent.closest('[class*="piecewise"]')
                                )) {
                                    text.setAttribute('fill', '#000000');
                                }
                            });
                        }
                    }
                };
                
                // 延迟应用样式，确保图表已完全渲染
                setTimeout(applyVisualMapStyles, 100);
                
                // 如果是区县级或市级管理员，地图已经定位到目标区域，标记为已缩放
                if (targetCenter) {
                    hasZoomedRef.current = true;
                }
                
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
                    if (chartInstanceRef.current && chartRef.current) {
                        // 重新调整大小，确保地图完整显示
                        chartInstanceRef.current.resize();
                        
                        // 对于区县级和市级管理员，在容器尺寸确定后重新计算缩放级别
                        // 对于省级管理员和超级管理员，在数据大屏中确保地图居中
                        let finalCenter = targetCenter || (mapCenter ? [mapCenter[0], mapCenter[1] + 0.5] : [111.5, 46.0]);
                        let finalZoom = targetCenter ? targetZoom : 1;
                        let finalLayoutCenter = isDataScreen ? ['50%', '40%'] : ['50%', '55%']; // 数据大屏偏上，其他默认
                        
                        // 数据大屏选定区域：用当前容器尺寸重新计算缩放与中心，使选定城市/区县居中并显示全貌
                        if (isDataScreen && selectedRegionCode && targetCenter && mapBounds) {
                            const selIsCity = selectedRegionCode.endsWith('00') && selectedRegionCode.length === 6;
                            const selIsDistrict = selectedRegionCode.length === 6 && !selIsCity;
                            
                            if (selIsDistrict) {
                                const districtCode = String(selectedRegionCode);
                                const districtFeature = geoJson.features?.find(f => String(f.properties?.adcode) === districtCode);
                                if (districtFeature) {
                                    const districtBounds = extractBoundsFromFeature(districtFeature);
                                    const center = districtFeature.properties?.center || districtFeature.properties?.centroid;
                                    if (center && center.length >= 2) {
                                        const [lon, lat] = center;
                                        districtBounds.minLon = Math.min(districtBounds.minLon, lon);
                                        districtBounds.maxLon = Math.max(districtBounds.maxLon, lon);
                                        districtBounds.minLat = Math.min(districtBounds.minLat, lat);
                                        districtBounds.maxLat = Math.max(districtBounds.maxLat, lat);
                                    }
                                    if (districtBounds.minLon !== Infinity && districtBounds.maxLon !== -Infinity &&
                                        districtBounds.minLat !== Infinity && districtBounds.maxLat !== -Infinity) {
                                        finalCenter = [(districtBounds.minLon + districtBounds.maxLon) / 2, (districtBounds.minLat + districtBounds.maxLat) / 2];
                                        const districtWidth = districtBounds.maxLon - districtBounds.minLon;
                                        const districtHeight = districtBounds.maxLat - districtBounds.minLat;
                                        const containerWidth = chartRef.current.clientWidth || 800;
                                        const containerHeight = chartRef.current.clientHeight || 600;
                                        const mapWidth = mapBounds.width;
                                        const mapHeight = mapBounds.height;
                                        const margin = 0.1;
                                        let scaleX = mapWidth / (districtWidth * (1 + margin * 2));
                                        let scaleY = mapHeight / (districtHeight * (1 + margin * 2));
                                        let calculatedZoom = Math.min(scaleX, scaleY) * 0.5;
                                        calculatedZoom = Math.max(0.5, Math.min(10, calculatedZoom));
                                        finalZoom = calculatedZoom;
                                        finalLayoutCenter = isDataScreen ? ['50%', '40%'] : ['50%', '50%'];
                                    }
                                }
                            } else if (selIsCity) {
                                const cityPrefix = selectedRegionCode.substring(0, 4);
                                const cityFeatures = geoJson.features?.filter(f => {
                                    const code = String(f.properties?.adcode || '');
                                    return code.startsWith(cityPrefix);
                                }) || [];
                                if (cityFeatures.length > 0) {
                                    let cityMinLon = Infinity, cityMaxLon = -Infinity, cityMinLat = Infinity, cityMaxLat = -Infinity;
                                    cityFeatures.forEach(feature => {
                                        const bounds = extractBoundsFromFeature(feature);
                                        cityMinLon = Math.min(cityMinLon, bounds.minLon);
                                        cityMaxLon = Math.max(cityMaxLon, bounds.maxLon);
                                        cityMinLat = Math.min(cityMinLat, bounds.minLat);
                                        cityMaxLat = Math.max(cityMaxLat, bounds.maxLat);
                                        const c = feature.properties?.center || feature.properties?.centroid;
                                        if (c && c.length >= 2) {
                                            cityMinLon = Math.min(cityMinLon, c[0]);
                                            cityMaxLon = Math.max(cityMaxLon, c[0]);
                                            cityMinLat = Math.min(cityMinLat, c[1]);
                                            cityMaxLat = Math.max(cityMaxLat, c[1]);
                                        }
                                    });
                                    if (cityMinLon !== Infinity && cityMaxLon !== -Infinity && cityMinLat !== Infinity && cityMaxLat !== -Infinity) {
                                        finalCenter = [(cityMinLon + cityMaxLon) / 2, (cityMinLat + cityMaxLat) / 2];
                                        const cityWidth = cityMaxLon - cityMinLon;
                                        const cityHeight = cityMaxLat - cityMinLat;
                                        const containerWidth = chartRef.current.clientWidth || 800;
                                        const containerHeight = chartRef.current.clientHeight || 600;
                                        const mapWidth = mapBounds.width;
                                        const mapHeight = mapBounds.height;
                                        const margin = 0.1;
                                        let scaleX = mapWidth / (cityWidth * (1 + margin * 2));
                                        let scaleY = mapHeight / (cityHeight * (1 + margin * 2));
                                        let calculatedZoom = Math.min(scaleX, scaleY) * 0.5;
                                        calculatedZoom = Math.max(0.5, Math.min(8, calculatedZoom));
                                        finalZoom = calculatedZoom;
                                        finalLayoutCenter = isDataScreen ? ['50%', '40%'] : ['50%', '50%'];
                                    }
                                }
                            }
                        }
                        
                        // 省级管理员和超级管理员在数据大屏中，地图完全居中并显示全省全貌（仅当未按选定区域缩放时）
                        if ((userRole === 'province_admin' || userRole === 'superadmin') && isDataScreen && mapBounds && !targetCenter) {
                            finalCenter = mapCenter; // 使用地图整体中心点
                            finalLayoutCenter = ['50%', '40%']; // 数据大屏中地图偏上显示
                            
                            // 计算合适的缩放级别，确保全省全貌可见
                            if (mapBounds && chartRef.current) {
                                const containerWidth = chartRef.current.clientWidth || 800;
                                const containerHeight = chartRef.current.clientHeight || 600;
                                
                                // 获取地图边界框的宽度和高度
                                const mapWidth = mapBounds.width;
                                const mapHeight = mapBounds.height;
                                
                                // 计算合适的缩放级别，确保整个地图边界框都能在容器内显示
                                // 使用与市级管理员类似的逻辑，但针对整个地图边界框
                                const margin = 0.1; // 10%边距
                                
                                // 计算缩放比例
                                // 需要确保地图边界框（加上边距）能完全显示在容器内
                                // 考虑容器的宽高比和地图边界框的宽高比
                                const containerAspect = containerWidth / containerHeight;
                                const mapAspect = mapWidth / mapHeight;
                                
                                // 计算需要的缩放比例
                                // 如果地图边界框的宽高比和容器宽高比不匹配，需要选择较小的缩放比例
                                let scaleX = 1.0; // 默认值
                                let scaleY = 1.0; // 默认值
                                
                                // 基于地图边界框和容器的尺寸比例计算
                                // 这里使用经验值，确保能看到全省全貌
                                let calculatedZoom = 0.6; // 默认使用0.6，确保能看到全省全貌
                                
                                // 如果是数据大屏（正方形），使用更小的缩放值
                                if (isDataScreen) {
                                    calculatedZoom = 0.5; // 数据大屏中缩小更多，确保完全显示
                                }
                                
                                // 限制缩放范围在合理区间（0.3 到 1.2）
                                calculatedZoom = Math.max(0.3, Math.min(1.2, calculatedZoom));
                                
                                finalZoom = calculatedZoom;
                                
                                console.log(`[省级定位] 数据大屏中地图居中，中心点:`, finalCenter);
                                console.log(`[省级定位] 地图边界: 宽度=${mapWidth.toFixed(4)}, 高度=${mapHeight.toFixed(4)}`);
                                console.log(`[省级定位] 容器尺寸: 宽度=${containerWidth}, 高度=${containerHeight}`);
                                console.log(`[省级定位] 计算缩放级别: ${finalZoom.toFixed(2)}`);
                            }
                        }
                        
                        if (userRole === 'district_admin' && userRegion && targetCenter && mapBounds) {
                            // 重新计算缩放级别（此时容器尺寸已确定）
                            const districtCode = String(userRegion);
                            const districtFeature = geoJson.features?.find(f => 
                                String(f.properties?.adcode) === districtCode
                            );
                            
                            if (districtFeature) {
                                // 重新计算区县边界框
                                const districtBounds = extractBoundsFromFeature(districtFeature);
                                
                                // 如果有center或centroid，也考虑它们
                                const center = districtFeature.properties?.center || districtFeature.properties?.centroid;
                                if (center && center.length >= 2) {
                                    const [lon, lat] = center;
                                    districtBounds.minLon = Math.min(districtBounds.minLon, lon);
                                    districtBounds.maxLon = Math.max(districtBounds.maxLon, lon);
                                    districtBounds.minLat = Math.min(districtBounds.minLat, lat);
                                    districtBounds.maxLat = Math.max(districtBounds.maxLat, lat);
                                }
                                
                                if (districtBounds.minLon !== Infinity && districtBounds.maxLon !== -Infinity && 
                                    districtBounds.minLat !== Infinity && districtBounds.maxLat !== -Infinity) {
                                    const districtWidth = districtBounds.maxLon - districtBounds.minLon;
                                    const districtHeight = districtBounds.maxLat - districtBounds.minLat;
                                    
                                    // 获取实际容器尺寸
                                    const containerWidth = chartRef.current.clientWidth || 800;
                                    const containerHeight = chartRef.current.clientHeight || 600;
                                    
                                    // 重新计算缩放级别
                                    const mapWidth = mapBounds.width;
                                    const mapHeight = mapBounds.height;
                                    
                                    const margin = 0.1; // 10%边距
                                    let scaleX = mapWidth / (districtWidth * (1 + margin * 2));
                                    let scaleY = mapHeight / (districtHeight * (1 + margin * 2));
                                    
                                    let calculatedZoom = Math.min(scaleX, scaleY);
                                    
                                    // 如果是数据大屏（正方形），需要缩小一点以适应正方形容器
                                    if (isDataScreen) {
                                        calculatedZoom = calculatedZoom * 0.5;
                                    }
                                    
                                    // 限制缩放范围
                                    calculatedZoom = Math.max(0.5, Math.min(10, calculatedZoom));
                                    finalZoom = calculatedZoom;
                                    
                                    // 重新计算中心点
                                    finalCenter = [
                                        (districtBounds.minLon + districtBounds.maxLon) / 2, 
                                        (districtBounds.minLat + districtBounds.maxLat) / 2
                                    ];
                                    
                                    console.log(`[区县定位-重新计算] 容器尺寸: ${containerWidth}x${containerHeight}, 缩放级别: ${finalZoom.toFixed(2)}`);
                                }
                            }
                        } else if (userRole === 'city_admin' && userRegion && targetCenter && mapBounds) {
                            // 重新计算缩放级别（此时容器尺寸已确定）
                            const cityPrefix = String(userRegion).substring(0, 4);
                            const cityFeatures = geoJson.features?.filter(f => {
                                const code = String(f.properties?.adcode || '');
                                return code.startsWith(cityPrefix);
                            }) || [];
                            
                            if (cityFeatures.length > 0) {
                                // 重新计算城市边界框
                                let cityMinLon = Infinity, cityMaxLon = -Infinity;
                                let cityMinLat = Infinity, cityMaxLat = -Infinity;
                                
                                cityFeatures.forEach(feature => {
                                    const bounds = extractBoundsFromFeature(feature);
                                    cityMinLon = Math.min(cityMinLon, bounds.minLon);
                                    cityMaxLon = Math.max(cityMaxLon, bounds.maxLon);
                                    cityMinLat = Math.min(cityMinLat, bounds.minLat);
                                    cityMaxLat = Math.max(cityMaxLat, bounds.maxLat);
                                });
                                
                                if (cityMinLon !== Infinity && cityMaxLon !== -Infinity && 
                                    cityMinLat !== Infinity && cityMaxLat !== -Infinity) {
                                    const cityWidth = cityMaxLon - cityMinLon;
                                    const cityHeight = cityMaxLat - cityMinLat;
                                    
                                    // 获取实际容器尺寸
                                    const containerWidth = chartRef.current.clientWidth || 800;
                                    const containerHeight = chartRef.current.clientHeight || 600;
                                    
                                    // 重新计算缩放级别
                                    const mapWidth = mapBounds.width;
                                    const mapHeight = mapBounds.height;
                                    
                                    const margin = 0.1; // 10%边距
                                    let scaleX = mapWidth / (cityWidth * (1 + margin * 2));
                                    let scaleY = mapHeight / (cityHeight * (1 + margin * 2));
                                    
                                    let calculatedZoom = Math.min(scaleX, scaleY);
                                    
                                    // 如果是数据大屏（正方形），需要缩小一点以适应正方形容器
                                    if (isDataScreen) {
                                        calculatedZoom = calculatedZoom * 0.5;
                                    }
                                    
                                    // 限制缩放范围
                                    calculatedZoom = Math.max(0.5, Math.min(8, calculatedZoom));
                                    finalZoom = calculatedZoom;
                                    
                                    // 重新计算中心点
                                    finalCenter = [(cityMinLon + cityMaxLon) / 2, (cityMinLat + cityMaxLat) / 2];
                                    
                                    console.log(`[市级定位-重新计算] 容器尺寸: ${containerWidth}x${containerHeight}, 缩放级别: ${finalZoom.toFixed(2)}`);
                                }
                            }
                        }
                        
                        chartInstanceRef.current.setOption({
                            series: [{
                                layoutCenter: finalLayoutCenter, // 使用计算后的布局中心
                                layoutSize: '100%',
                                center: finalCenter,
                                zoom: finalZoom,
                                label: { show: false } // 确保初始不显示标签
                            }]
                        }, { notMerge: false });
                        
                        // 再次调整大小以确保居中生效
                        chartInstanceRef.current.resize();
                        
                        // 如果不是区县/市级管理员（没有目标中心点），重置地图视图到初始状态
                        // 如果是区县/市级管理员，已经定位到目标区域，不需要重置
                        if (!targetCenter) {
                            chartInstanceRef.current.dispatchAction({
                                type: 'restore'
                            });
                        }
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
    }, [carbonDataProp, isDataScreen, selectedRegionCode]);

    if (error) {
        return <p style={{ color: '#ff6b6b' }}>{error}</p>;
    }

    // 添加CSS样式来为visualMap图例项添加黑色边框和黑色文字
    useEffect(() => {
        const styleId = 'emission-map-visualmap-style';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                /* 为visualMap图例项添加黑色边框 - 使用更通用的选择器 */
                .echarts-visual-map-piecewise rect,
                .echarts-visual-map-piecewise .visual-map-piece rect {
                    stroke: #000000 !important;
                    stroke-width: 1px !important;
                }
                /* 为visualMap文字设置黑色 */
                .echarts-visual-map-piecewise text,
                .echarts-visual-map-piecewise .visual-map-piece text {
                    fill: #000000 !important;
                }
                /* 更通用的选择器，针对所有visualMap相关的rect元素 */
                [class*="visual-map"] rect {
                    stroke: #000000 !important;
                    stroke-width: 1px !important;
                }
                [class*="visual-map"] text {
                    fill: #000000 !important;
                }
            `;
            document.head.appendChild(style);
        }
        
        // 在图表渲染后，通过DOM操作确保边框和文字颜色正确
        const applyVisualMapStyles = () => {
            if (chartInstanceRef.current && chartRef.current) {
                const svg = chartRef.current.querySelector('svg');
                if (svg) {
                    // 查找所有visualMap相关的rect元素并添加边框
                    const rects = svg.querySelectorAll('rect');
                    rects.forEach(rect => {
                        const parent = rect.parentElement;
                        if (parent && (
                            parent.getAttribute('class')?.includes('visual-map') ||
                            parent.getAttribute('class')?.includes('piecewise') ||
                            parent.closest('[class*="visual-map"]')
                        )) {
                            rect.setAttribute('stroke', '#000000');
                            rect.setAttribute('stroke-width', '1');
                        }
                    });
                    
                    // 查找所有visualMap相关的text元素并设置颜色
                    const texts = svg.querySelectorAll('text');
                    texts.forEach(text => {
                        const parent = text.parentElement;
                        if (parent && (
                            parent.getAttribute('class')?.includes('visual-map') ||
                            parent.getAttribute('class')?.includes('piecewise') ||
                            parent.closest('[class*="visual-map"]')
                        )) {
                            text.setAttribute('fill', '#000000');
                        }
                    });
                }
            }
        };
        
        // 延迟执行，确保图表已渲染
        const timer = setTimeout(applyVisualMapStyles, 500);
        
        return () => {
            clearTimeout(timer);
            const style = document.getElementById(styleId);
            if (style) {
                style.remove();
            }
        };
    }, [carbonDataProp]);

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
