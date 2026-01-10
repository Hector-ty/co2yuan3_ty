/**
 * 迁移脚本：将 EmissionFactor 新系统的种子数据导入到现有 MongoDB 系统
 * 这个脚本会将新系统的详细分类数据（化石燃料、逸散排放、间接排放）转换为现有系统的格式
 */

const EmissionFactor = require('../models/EmissionFactor');
const { canonicalizeFactorName } = require('./factorNameHelper');

// 新系统的种子数据（来自 EmissionFactor/server/db.ts）
const newSystemSeedData = {
  // 化石燃料排放因子
  fossilFuels: [
    { fuelTypeCn: "无烟煤", fuelTypeEn: "anthracite", emissionFactor: "2.09", unit: "tCO₂/t", gwp: "-" },
    { fuelTypeCn: "烟煤", fuelTypeEn: "bituminousCoal", emissionFactor: "1.79", unit: "tCO₂/t", gwp: "-" },
    { fuelTypeCn: "褐煤", fuelTypeEn: "lignite", emissionFactor: "1.21", unit: "tCO₂/t", gwp: "-" },
    { fuelTypeCn: "焦炉煤气", fuelTypeEn: "cokeOvenGas", emissionFactor: "8.57", unit: "tCO₂/10⁴Nm³", gwp: "-" },
    { fuelTypeCn: "管道煤气", fuelTypeEn: "pipelineGas", emissionFactor: "7.00", unit: "tCO₂/10⁴Nm³", gwp: "-" },
    { fuelTypeCn: "天然气", fuelTypeEn: "naturalGas", emissionFactor: "21.62", unit: "tCO₂/10⁴Nm³", gwp: "-" },
    { fuelTypeCn: "汽油", fuelTypeEn: "gasoline", emissionFactor: "3.04", unit: "tCO₂/t", gwp: "-" },
    { fuelTypeCn: "柴油", fuelTypeEn: "diesel", emissionFactor: "3.14", unit: "tCO₂/t", gwp: "-" },
    { fuelTypeCn: "燃料油", fuelTypeEn: "fuelOil", emissionFactor: "3.05", unit: "tCO₂/t", gwp: "-" },
    { fuelTypeCn: "一般煤油", fuelTypeEn: "kerosene", emissionFactor: "3.16", unit: "tCO₂/t", gwp: "-" },
    { fuelTypeCn: "液化石油气", fuelTypeEn: "lpg", emissionFactor: "2.92", unit: "tCO₂/t", gwp: "-" },
    { fuelTypeCn: "液化天然气", fuelTypeEn: "lng", emissionFactor: "2.59", unit: "tCO₂/t", gwp: "-" },
  ],
  // 逸散排放因子
  fugitiveEmissions: [
    { gasNameCn: "HCFC-22", gasNameEn: "HCFC-22", gwpValue: 1960, emissionFactor: "100%", unit: "tCO₂e/t", category: "airConditioning" },
    { gasNameCn: "HFC-32", gasNameEn: "HFC-32", gwpValue: 771, emissionFactor: "100%", unit: "tCO₂e/t", category: "airConditioning" },
    { gasNameCn: "HFC-125", gasNameEn: "HFC-125", gwpValue: 3740, emissionFactor: "100%", unit: "tCO₂e/t", category: "airConditioning" },
    { gasNameCn: "HFC-134a", gasNameEn: "HFC-134a", gwpValue: 1530, emissionFactor: "100%", unit: "tCO₂e/t", category: "airConditioning" },
    { gasNameCn: "HFC-143a", gasNameEn: "HFC-143a", gwpValue: 5810, emissionFactor: "100%", unit: "tCO₂e/t", category: "airConditioning" },
    { gasNameCn: "HFC-227a", gasNameEn: "HFC-227a", gwpValue: 3600, emissionFactor: "100%", unit: "tCO₂e/t", category: "airConditioning" },
    { gasNameCn: "HFC-245fa", gasNameEn: "HFC-245fa", gwpValue: 962, emissionFactor: "100%", unit: "tCO₂e/t", category: "airConditioning" },
    { gasNameCn: "CO₂灭火器", gasNameEn: "CO2_ext", gwpValue: 1, emissionFactor: "4%", unit: "tCO₂e/t", category: "fireSuppression" },
    { gasNameCn: "FM200", gasNameEn: "FM200", gwpValue: 3600, emissionFactor: "2%", unit: "tCO₂e/t", category: "fireSuppression" },
  ],
  // 间接排放因子
  indirectEmissions: [
    { emissionTypeCn: "外购电力", emissionTypeEn: "electricity", emissionFactor: "0.6849", unit: "tCO₂e/MWh", remarks: "可更新" },
    { emissionTypeCn: "外购热力", emissionTypeEn: "heat", emissionFactor: "0.11", unit: "tCO₂e/GJ", remarks: "-" },
  ]
};

/**
 * 将新系统的数据转换为现有系统的格式
 */
function convertToExistingFormat(data, category, type) {
  const result = [];
  
  if (category === 'fossil') {
    // 化石燃料：根据燃料类型判断属于 solid, liquid 还是 gas
    data.forEach(item => {
      const fuelType = item.fuelTypeEn;
      let mappedCategory = 'solid';
      let mappedType = 'fossil';
      
      // 判断燃料类型
      if (['anthracite', 'bituminousCoal', 'lignite'].includes(fuelType)) {
        mappedCategory = 'solid';
      } else if (['gasoline', 'diesel', 'fuelOil', 'kerosene', 'lpg', 'lng'].includes(fuelType)) {
        mappedCategory = 'liquid';
      } else if (['cokeOvenGas', 'pipelineGas', 'naturalGas'].includes(fuelType)) {
        mappedCategory = 'gas';
      }
      
      // 尝试解析排放因子值（如果是数字字符串）
      const emissionFactorValue = parseFloat(item.emissionFactor);
      const value = isNaN(emissionFactorValue) ? 0 : emissionFactorValue;
      
      result.push({
        category: 'fossil', // 使用 'fossil' 作为主分类
        type: mappedCategory, // 使用映射后的分类作为 type
        name: canonicalizeFactorName(fuelType),
        value: value,
        unit: item.unit,
        description: `${item.fuelTypeCn} (${item.fuelTypeEn})`,
        // 新系统字段
        fuelTypeCn: item.fuelTypeCn,
        fuelTypeEn: item.fuelTypeEn,
        emissionFactor: item.emissionFactor,
        gwp: item.gwp
      });
    });
  } else if (category === 'fugitive') {
    // 逸散排放
    data.forEach(item => {
      // 尝试解析排放因子值
      const emissionFactorValue = parseFloat(item.emissionFactor.replace('%', ''));
      const value = isNaN(emissionFactorValue) ? 0 : emissionFactorValue;
      
      result.push({
        category: 'fugitive',
        type: item.category, // airConditioning 或 fireSuppression
        name: canonicalizeFactorName(item.gasNameEn),
        value: value,
        unit: item.unit,
        description: `${item.gasNameCn} (${item.gasNameEn})`,
        // 新系统字段
        gasNameCn: item.gasNameCn,
        gasNameEn: item.gasNameEn,
        gwpValue: item.gwpValue,
        emissionFactor: item.emissionFactor,
        fugitiveCategory: item.category
      });
    });
  } else if (category === 'indirect') {
    // 间接排放
    data.forEach(item => {
      const emissionFactorValue = parseFloat(item.emissionFactor);
      const value = isNaN(emissionFactorValue) ? 0 : emissionFactorValue;
      
      result.push({
        category: 'indirect',
        type: item.emissionTypeEn,
        name: canonicalizeFactorName(item.emissionTypeEn),
        value: value,
        unit: item.unit,
        description: `${item.emissionTypeCn} (${item.emissionTypeEn})`,
        // 新系统字段
        emissionTypeCn: item.emissionTypeCn,
        emissionTypeEn: item.emissionTypeEn,
        emissionFactor: item.emissionFactor,
        remarks: item.remarks
      });
    });
  }
  
  return result;
}

/**
 * 迁移新系统的种子数据
 */
async function migrateNewSystemData() {
  try {
    console.log('开始迁移新系统的排放因子数据...');
    
    const operations = [];
    
    // 处理化石燃料
    const fossilFactors = convertToExistingFormat(newSystemSeedData.fossilFuels, 'fossil');
    fossilFactors.forEach(factor => {
      operations.push({
        updateOne: {
          filter: { name: factor.name, category: 'fossil' },
          update: {
            $setOnInsert: factor
          },
          upsert: true
        }
      });
    });
    
    // 处理逸散排放
    const fugitiveFactors = convertToExistingFormat(newSystemSeedData.fugitiveEmissions, 'fugitive');
    fugitiveFactors.forEach(factor => {
      operations.push({
        updateOne: {
          filter: { name: factor.name, category: 'fugitive' },
          update: {
            $setOnInsert: factor
          },
          upsert: true
        }
      });
    });
    
    // 处理间接排放
    const indirectFactors = convertToExistingFormat(newSystemSeedData.indirectEmissions, 'indirect');
    indirectFactors.forEach(factor => {
      operations.push({
        updateOne: {
          filter: { name: factor.name, category: 'indirect' },
          update: {
            $setOnInsert: factor
          },
          upsert: true
        }
      });
    });
    
    if (operations.length > 0) {
      const result = await EmissionFactor.bulkWrite(operations, { ordered: false });
      console.log(`迁移完成！新增 ${result.upsertedCount || 0} 条记录`);
      return {
        success: true,
        insertedCount: result.upsertedCount || 0,
        message: `迁移完成，新增 ${result.upsertedCount || 0} 条记录`
      };
    } else {
      return {
        success: true,
        insertedCount: 0,
        message: '没有需要迁移的数据'
      };
    }
  } catch (error) {
    console.error('迁移数据时出错:', error);
    throw error;
  }
}

module.exports = {
  migrateNewSystemData,
  newSystemSeedData
};

