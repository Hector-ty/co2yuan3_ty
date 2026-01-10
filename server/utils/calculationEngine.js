const EmissionFactor = require('../models/EmissionFactor');
const defaultFactors = require('./emissionFactors');
const { canonicalizeFactorName } = require('./factorNameHelper');

const cloneDefaultFactors = () => JSON.parse(JSON.stringify(defaultFactors));

const normalizeCategory = (category) => {
  switch (category) {
    case 'mobileSources':
      return 'mobile';
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

    // 处理嵌套结构，例如 mobile.fuel 和 mobile.mileage
    if (category === 'mobile' && (factor.type === 'fuel' || factor.type === 'mileage')) {
      if (!factors[category]) {
        factors[category] = {};
      }
      if (!factors[category][factor.type]) {
        factors[category][factor.type] = {};
      }
      factors[category][factor.type][canonicalName] = factor.value;
    } else {
      if (!factors[category]) {
        factors[category] = {};
      }
      factors[category][canonicalName] = factor.value;
    }
  });
  return factors;
}

async function calculateEmissions(activityData) {
  try {
    const { fossilFuels, mobileSources, indirectEmissions, intensityMetrics } = activityData;

    const dbFactors = await getFormattedEmissionFactors(); // 从数据库获取最新排放因子

    // 检查排放因子是否存在
    if (!dbFactors || Object.keys(dbFactors).length === 0) {
      throw new Error('排放因子数据未找到，请先在排放因子管理页面添加排放因子');
    }

    const breakdown = {
      fossilFuels: 0,
      mobileSources: 0,
      electricity: 0,
      heat: 0,
    };

    // --- Direct Emissions ---
    // Solid fuels
    if (fossilFuels?.solid) {
      if (!dbFactors.solid) {
        throw new Error('缺少固体燃料排放因子数据，请先在排放因子管理页面添加');
      }
      for (const fuel in fossilFuels.solid) {
        const factor = dbFactors.solid[fuel];
        if (factor === undefined || factor === null) {
          throw new Error(`缺少燃料 "${fuel}" 的排放因子，请先在排放因子管理页面添加`);
        }
        breakdown.fossilFuels += (fossilFuels.solid[fuel] || 0) * factor;
      }
    }
    // Liquid fuels
    if (fossilFuels?.liquid) {
      if (!dbFactors.liquid) {
        throw new Error('缺少液体燃料排放因子数据，请先在排放因子管理页面添加');
      }
      for (const fuel in fossilFuels.liquid) {
        const factor = dbFactors.liquid[fuel];
        if (factor === undefined || factor === null) {
          throw new Error(`缺少燃料 "${fuel}" 的排放因子，请先在排放因子管理页面添加`);
        }
        breakdown.fossilFuels += (fossilFuels.liquid[fuel] || 0) * factor;
      }
    }
    // Gaseous fuels (unit conversion)
    if (fossilFuels?.gas) {
      if (!dbFactors.gas) {
        throw new Error('缺少气体燃料排放因子数据，请先在排放因子管理页面添加');
      }
      for (const fuel in fossilFuels.gas) {
        const factor = dbFactors.gas[fuel];
        if (factor === undefined || factor === null) {
          throw new Error(`缺少燃料 "${fuel}" 的排放因子，请先在排放因子管理页面添加`);
        }
        breakdown.fossilFuels += ((fossilFuels.gas[fuel] || 0) / 10000) * factor;
      }
    }

    // Mobile Sources (unit conversion from kg to t)
    if (mobileSources) {
      if (mobileSources.fuel && dbFactors.mobile?.fuel) {
        for (const type in mobileSources.fuel) {
          const factor = dbFactors.mobile.fuel[type];
          if (factor !== undefined && factor !== null) {
            breakdown.mobileSources += (mobileSources.fuel[type] || 0) * (factor / 1000);
          }
        }
      }
      if (mobileSources.mileage && dbFactors.mobile?.mileage) {
        for (const type in mobileSources.mileage) {
          const factor = dbFactors.mobile.mileage[type];
          if (factor !== undefined && factor !== null) {
            breakdown.mobileSources += (mobileSources.mileage[type] || 0) * (factor / 1000);
          }
        }
      }
    }

    // --- Indirect Emissions ---
    // Purchased Electricity (unit conversion)
    if (indirectEmissions?.purchasedElectricity !== undefined) {
      if (!dbFactors.indirect?.electricity) {
        throw new Error('缺少电力排放因子数据，请先在排放因子管理页面添加 electricity 因子');
      }
      breakdown.electricity = (indirectEmissions.purchasedElectricity || 0) * 10 * dbFactors.indirect.electricity;
    }
    // Purchased Heat (unit conversion)
    if (indirectEmissions?.purchasedHeat !== undefined) {
      if (!dbFactors.indirect?.heat) {
        throw new Error('缺少热力排放因子数据，请先在排放因子管理页面添加 heat 因子');
      }
      breakdown.heat = (indirectEmissions.purchasedHeat || 0) * (dbFactors.indirect.heat / 1000);
    }

    // --- Totals ---
    const totalDirect = breakdown.fossilFuels + breakdown.mobileSources;
    const totalIndirect = breakdown.electricity + breakdown.heat;
    const totalEmissions = totalDirect + totalIndirect;

    // --- Intensity ---
    const emissionIntensityByArea = intensityMetrics?.buildingArea > 0 
      ? totalEmissions / intensityMetrics.buildingArea 
      : 0;
    const emissionIntensityByPerson = intensityMetrics?.personnelCount > 0 
      ? totalEmissions / intensityMetrics.personnelCount 
      : 0;

    return {
      breakdown, // Detailed breakdown for charts
      totalDirect,
      totalIndirect,
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
