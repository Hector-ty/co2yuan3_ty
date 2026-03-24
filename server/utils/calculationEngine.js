const EmissionFactor = require('../models/EmissionFactor');
const defaultFactors = require('./emissionFactors');
const { canonicalizeFactorName } = require('./factorNameHelper');

const cloneDefaultFactors = () => JSON.parse(JSON.stringify(defaultFactors));

const normalizeCategory = (category) => {
  switch (category) {
    case 'indirectEmissions':
      return 'indirect';
    default:
      return category;
  }
};

// 辅助函数：从数据库获取并格式化排放因子
async function getFormattedEmissionFactors() {
  const factors = cloneDefaultFactors();
  const dbFactors = await EmissionFactor.find({});

  dbFactors.forEach(factor => {
    const category = normalizeCategory(factor.category);
    if (!category) return;

    const canonicalName = canonicalizeFactorName(factor.name);
    if (!canonicalName) return;

    // 跳过已弃用的mobile类别
    if (category === 'mobile') {
      return; // 跳过mobile类别，不再处理
    }
    
      if (!factors[category]) {
        factors[category] = {};
      }
      factors[category][canonicalName] = factor.value;
  });
  return factors;
}

async function calculateEmissions(activityData) {
  try {
    const { fossilFuels, fugitiveEmissions, mobileSources, indirectEmissions, intensityMetrics, greenSink: rawGreenSink } = activityData;
    // 旧数据兼容：无绿地碳汇时置零
    const greenSink = rawGreenSink && typeof rawGreenSink === 'object'
      ? { tree: Number(rawGreenSink.tree) || 0, shrub: Number(rawGreenSink.shrub) || 0, herb: Number(rawGreenSink.herb) || 0 }
      : { tree: 0, shrub: 0, herb: 0 };

    const dbFactors = await getFormattedEmissionFactors(); // 从数据库获取最新排放因子

    // 检查排放因子是否存在
    if (!dbFactors || Object.keys(dbFactors).length === 0) {
      throw new Error('排放因子数据未找到，请先在排放因子管理页面添加排放因子');
    }

    const breakdown = {
      fossilFuels: 0,
      fugitiveEmissions: 0,
      airConditioning: 0,
      fireSuppression: 0,
      mobileSources: 0,
      electricity: 0,
      heat: 0,
      // 供前端“排放源细分构成图”使用的更细分字段
      anthraciteGroup: 0,   // 无烟煤及同级固体燃料
      fuelOilGroup: 0,      // 燃料油及同级液体燃料
      naturalGasGroup: 0,   // 天然气及同级气体燃料
      hcfc22Group: 0,       // HCFC-22 及同级制冷剂
      co2Group: 0,          // CO₂ 及同级灭火系统气体
      totalGreenSink: 0   // 绿地碳汇量（用于扣减）
    };

    // 详细数据项排放量（23个数据项）- 用于前端环状图外层显示
    const detailedBreakdown = {
      // 固体燃料
      anthracite: 0,        // 无烟煤
      bituminousCoal: 0,    // 烟煤
      lignite: 0,           // 褐煤
      // 液体燃料
      fuelOil: 0,           // 燃料油
      gasoline: 0,          // 汽油
      diesel: 0,            // 柴油
      kerosene: 0,          // 煤油
      lpg: 0,               // 液化石油气
      lng: 0,               // 液化天然气
      // 气体燃料
      naturalGas: 0,        // 天然气
      cokeOvenGas: 0,       // 焦炉煤气
      pipelineGas: 0,       // 管道煤气
      // 空调系统逸散排放
      'HCFC-22': 0,
      'HFC-32': 0,
      'HFC-125': 0,
      'HFC-134a': 0,
      'HFC-143a': 0,
      'HFC-227a': 0,
      'HFC-245fa': 0,
      // 灭火系统逸散排放
      'CO2': 0,
      'HFC-227ea': 0,
      // 间接排放
      purchasedElectricity: 0,  // 净外购电量
      purchasedHeat: 0          // 净外购热力
    };

    // --- Direct Emissions ---
    // 为固体 / 液体 / 气体燃料分别单独累计，便于前端细分展示
    let solidFuelTotal = 0;
    let liquidFuelTotal = 0;
    let gasFuelTotal = 0;

    // Solid fuels
    if (fossilFuels?.solid) {
      if (!dbFactors.solid) {
        throw new Error('缺少固体燃料排放因子数据，请先在排放因子管理页面添加');
      }
      // 已弃用的燃料类型列表（用于兼容旧数据）
      const deprecatedFuels = ['cokingCoal', 'briquettes', 'coke', 'otherCokingProducts'];
      for (const fuel in fossilFuels.solid) {
        // 跳过已弃用的燃料类型（兼容旧数据）
        if (deprecatedFuels.includes(fuel)) {
          continue;
        }
        const factor = dbFactors.solid[fuel];
        if (factor === undefined || factor === null) {
          throw new Error(`缺少燃料 "${fuel}" 的排放因子，请先在排放因子管理页面添加`);
        }
        const emission = (fossilFuels.solid[fuel] || 0) * factor;  //固体燃料排放计算 : 排放量 = 燃料消耗量(t) × 排放因子(tCO₂/t)
        solidFuelTotal += emission;
        // 记录详细数据项的排放量
        if (detailedBreakdown.hasOwnProperty(fuel)) {
          detailedBreakdown[fuel] = emission;
        }
      }
    }
    // Liquid fuels
    if (fossilFuels?.liquid) {
      if (!dbFactors.liquid) {
        throw new Error('缺少液体燃料排放因子数据，请先在排放因子管理页面添加');
      }
      // 已弃用的液体燃料类型列表（用于兼容旧数据）
      const deprecatedLiquidFuels = ['crudeOil', 'naphtha', 'asphalt', 'lubricants', 'petroleumCoke', 'petrochemicalFeedstock', 'otherOils'];
      for (const fuel in fossilFuels.liquid) {
        // 跳过已弃用的燃料类型（兼容旧数据）
        if (deprecatedLiquidFuels.includes(fuel)) {
          continue;
        }
        const factor = dbFactors.liquid[fuel];
        if (factor === undefined || factor === null) {
          throw new Error(`缺少燃料 "${fuel}" 的排放因子，请先在排放因子管理页面添加`);
        }
        const emission = (fossilFuels.liquid[fuel] || 0) * factor;   //液体燃料排放计算 : 排放量 = 燃料消耗量(t) × 排放因子(tCO₂/t)
        liquidFuelTotal += emission;
        // 记录详细数据项的排放量
        if (detailedBreakdown.hasOwnProperty(fuel)) {
          detailedBreakdown[fuel] = emission;
        }
      }
    }
    // Gaseous fuels (unit conversion)
    if (fossilFuels?.gas) {
      if (!dbFactors.gas) {
        throw new Error('缺少气体燃料排放因子数据，请先在排放因子管理页面添加');
      }
      // 已弃用的气体燃料类型列表（用于兼容旧数据）
      const deprecatedGasFuels = ['refineryGas'];
      for (const fuel in fossilFuels.gas) {
        // 跳过已弃用的燃料类型（兼容旧数据）
        if (deprecatedGasFuels.includes(fuel)) {
          continue;
        }
        const factor = dbFactors.gas[fuel];
        if (factor === undefined || factor === null) {
          throw new Error(`缺少燃料 "${fuel}" 的排放因子，请先在排放因子管理页面添加`);
        }
        const emission = ((fossilFuels.gas[fuel] || 0) / 10000) * factor;  //气体燃料排放计算（含单位换算）: 排放量 = (燃料消耗量(m³) / 10000) × 排放因子(tCO₂/万Nm³)
        gasFuelTotal += emission;
        // 记录详细数据项的排放量
        if (detailedBreakdown.hasOwnProperty(fuel)) {
          detailedBreakdown[fuel] = emission;
        }
      }
    }

    // 将细分燃料汇总到总的 fossilFuels，同时为前端提供单独分组
    breakdown.fossilFuels = solidFuelTotal + liquidFuelTotal + gasFuelTotal;
    breakdown.anthraciteGroup = solidFuelTotal;
    breakdown.fuelOilGroup = liquidFuelTotal;
    breakdown.naturalGasGroup = gasFuelTotal;

    // Mobile Sources - 已弃用，跳过计算（兼容旧数据）
    // 移动源排放因子已被弃用，不再进行计算
    // 如果旧数据中存在mobileSources，将被忽略

    // --- Fugitive Emissions (逸散排放) ---
    if (fugitiveEmissions) {
      if (!dbFactors.fugitive) {
        throw new Error('缺少逸散排放因子数据，请先在排放因子管理页面添加');
      }

      // 逸散排放阈值（小于阈值时该部分排放取零）
      const fugitiveThresholds = {
        'HCFC-22': 1.29,
        'HFC-32': 3.27,
        'HFC-125': 0.67,
        'HFC-143a': 0.43,
        'HFC-245fa': 2.62,
        'CO2': 2.52,
        'HFC-227ea': 23.33
      };

      // 空调系统逸散排放
      const airConditioningGases = ['HCFC-22', 'HFC-32', 'HFC-125', 'HFC-134a', 'HFC-143a', 'HFC-227a', 'HFC-245fa'];
      if (fugitiveEmissions.airConditioning) {
        let airConditioningTotal = 0;
        airConditioningGases.forEach(gas => {
          const inputValue = fugitiveEmissions.airConditioning[gas] || 0;
          const threshold = fugitiveThresholds[gas];
          
          // 如果值小于阈值，该部分排放取零
          if (threshold !== undefined && inputValue < threshold) {
            // 记录详细数据项（即使为0）
            if (detailedBreakdown.hasOwnProperty(gas)) {
              detailedBreakdown[gas] = 0;
            }
            return; // 跳过该气体
          }
          
          const factor = dbFactors.fugitive[gas];
          if (factor === undefined || factor === null) {
            // 如果缺少排放因子，记录为0而不是抛出错误（兼容性处理）
            if (detailedBreakdown.hasOwnProperty(gas)) {
              detailedBreakdown[gas] = 0;
            }
            return;
          }
          const emission = inputValue * factor;  //空调系统逸散排放计算: 空调系统逸散排放 = Σ(用户输入值 × 排放因子)（仅当输入值 ≥ 阈值时计入）
          airConditioningTotal += emission;
          // 记录详细数据项的排放量
          if (detailedBreakdown.hasOwnProperty(gas)) {
            detailedBreakdown[gas] = emission;
          }
        });
        breakdown.airConditioning = airConditioningTotal;
        // “HCFC-22 以及同级数据”分组：这里用全部空调系统逸散排放汇总
        breakdown.hcfc22Group = airConditioningTotal;
      }

      // 灭火系统逸散排放
      const fireSuppressionGases = ['CO2', 'HFC-227ea'];
      if (fugitiveEmissions.fireSuppression) {
        let fireSuppressionTotal = 0;
        fireSuppressionGases.forEach(gas => {
          const inputValue = fugitiveEmissions.fireSuppression[gas] || 0;
          const threshold = fugitiveThresholds[gas];
          
          // 如果值小于阈值，该部分排放取零
          if (threshold !== undefined && inputValue < threshold) {
            // 记录详细数据项（即使为0）
            if (detailedBreakdown.hasOwnProperty(gas)) {
              detailedBreakdown[gas] = 0;
            }
            return; // 跳过该气体
          }
          
          const factor = dbFactors.fugitive[gas];
          if (factor === undefined || factor === null) {
            throw new Error(`缺少逸散排放因子 "${gas}" 的排放因子，请先在排放因子管理页面添加`);
          }
          const emission = inputValue * factor;  //灭火系统逸散排放: 灭火系统逸散排放 = Σ(用户输入值 × 排放因子)（仅当输入值 ≥ 阈值时计入）
          fireSuppressionTotal += emission;
          // 记录详细数据项的排放量
          if (detailedBreakdown.hasOwnProperty(gas)) {
            detailedBreakdown[gas] = emission;
          }
        });
        breakdown.fireSuppression = fireSuppressionTotal;
        // “CO2 以及同级数据”分组：这里用全部灭火系统逸散排放汇总
        breakdown.co2Group = fireSuppressionTotal;
      }

      // 总逸散排放 = 空调系统逸散排放 + 灭火系统逸散排放
      breakdown.fugitiveEmissions = breakdown.airConditioning + breakdown.fireSuppression;
    }

    // --- Indirect Emissions ---
    // Purchased Electricity (unit conversion)
    if (indirectEmissions?.purchasedElectricity !== undefined) {
      if (!dbFactors.indirect?.electricity) {
        throw new Error('缺少电力排放因子数据，请先在排放因子管理页面添加 electricity 因子');
      }
      const electricityEmission = (indirectEmissions.purchasedElectricity || 0) * 10 * dbFactors.indirect.electricity;  //间接排放计算（含单位换算）: 电力排放公式 : 排放量 = 净外购电量(10⁴kWh) × 10 × 排放因子(tCO₂/MWh)
      breakdown.electricity = electricityEmission;
      detailedBreakdown.purchasedElectricity = electricityEmission;
    }
    // Purchased Heat (unit conversion)
    if (indirectEmissions?.purchasedHeat !== undefined) {
      if (!dbFactors.indirect?.heat) {
        throw new Error('缺少热力排放因子数据，请先在排放因子管理页面添加 heat 因子');
      }
      const heatEmission = (indirectEmissions.purchasedHeat || 0) * dbFactors.indirect.heat;  //间接排放计算（含单位换算）: 热力排放公式 : 排放量 = 净外购热力(GJ) × 排放因子(tCO₂e/GJ)
      breakdown.heat = heatEmission;
      detailedBreakdown.purchasedHeat = heatEmission;
    }

    // --- 绿地碳汇（扣减项）---
    const greenSinkFactors = dbFactors.greenSink || { tree: 0.25, shrub: 0.1, herb: 0.05 };
    const totalGreenSink = (greenSink.tree || 0) * (greenSinkFactors.tree ?? 0.25)
      + (greenSink.shrub || 0) * (greenSinkFactors.shrub ?? 0.1)
      + (greenSink.herb || 0) * (greenSinkFactors.herb ?? 0.05);
    breakdown.totalGreenSink = totalGreenSink;

    // --- Totals ---
    const totalDirect = breakdown.fossilFuels + breakdown.fugitiveEmissions;  // 直接排放总值 = 燃料燃烧总值 + 逸散排放总值
    const totalIndirect = breakdown.electricity + breakdown.heat;  // 间接排放总值 = 电力排放总值 + 热力排放总值
    const totalEmissions = Math.max(0, totalDirect + totalIndirect - totalGreenSink);  // 总排放量 = 直接排放量 + 间接排放量 - 总绿地碳汇量

    // --- Intensity ---
    const emissionIntensityByArea = intensityMetrics?.buildingArea > 0 
      ? totalEmissions / intensityMetrics.buildingArea 
      : 0;  // 单位建筑面积碳排放量 = 总排放量 / 机关单位建筑面积
    const emissionIntensityByPerson = intensityMetrics?.personnelCount > 0 
      ? totalEmissions / intensityMetrics.personnelCount 
      : 0;  // 人均碳排放量 = 总排放量 / 机关人员数量

    // 调试信息：检查 detailedBreakdown 是否有数据
    const hasData = Object.values(detailedBreakdown).some(val => val > 0);
    if (!hasData) {
      console.warn('calculationEngine - detailedBreakdown 所有值都为0或未定义');
      console.log('calculationEngine - detailedBreakdown:', detailedBreakdown);
      console.log('calculationEngine - activityData:', JSON.stringify(activityData, null, 2));
    }

    return {
      breakdown, // Detailed breakdown for charts
      detailedBreakdown, // 23个详细数据项的排放量（tCO₂）
      totalDirect,
      totalIndirect,
      totalGreenSink,
      totalEmissions,
      emissionIntensityByArea,
      emissionIntensityByPerson
    };
  } catch (error) {
    console.error('Calculate Emissions Error:', error);
    throw new Error(`计算排放量失败: ${error.message}`);
  }
}

module.exports = { calculateEmissions };
