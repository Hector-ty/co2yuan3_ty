/**
 * 检查数据库中的排放因子与项目代码的一致性
 * 用于验证手动修改数据库后是否存在问题
 */

const EmissionFactor = require('../models/EmissionFactor');
const defaultFactors = require('./emissionFactors');
const { canonicalizeFactorName } = require('./factorNameHelper');

// 扩展名称映射，支持中文名称到规范名称的映射
const extendedNameMap = {
  '外购电力': 'electricity',
  '外购热力': 'heat',
  '净外购电量': 'electricity',
  '净外购热力': 'heat',
  '乔木': 'tree',
  '灌木': 'shrub',
  '草本': 'herb'
};

// 增强的规范名称映射函数
const enhancedCanonicalize = (name) => {
  if (!name || typeof name !== 'string') return name;
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  
  // 先检查扩展映射
  if (extendedNameMap[trimmed]) {
    return extendedNameMap[trimmed];
  }
  
  // 再使用原有的映射函数
  return canonicalizeFactorName(name);
};

// 定义期望的排放因子结构
const expectedFactors = {
  solid: ['anthracite', 'bituminousCoal', 'lignite'],
  liquid: ['fuelOil', 'gasoline', 'diesel', 'kerosene', 'lpg', 'lng'],
  gas: ['naturalGas', 'cokeOvenGas', 'pipelineGas'],
  indirect: ['electricity', 'heat'],
  greenSink: ['tree', 'shrub', 'herb']  // 绿地碳汇因子：乔木、灌木、草本
};

// 已弃用的排放因子（不应在数据库中存在）
const deprecatedFactors = {
  solid: ['cokingCoal', 'briquettes', 'coke', 'otherCokingProducts'],
  liquid: ['crudeOil', 'naphtha', 'asphalt', 'lubricants', 'petroleumCoke', 'petrochemicalFeedstock', 'otherOils'],
  gas: ['refineryGas'],
  mobile: ['gasoline', 'diesel', 'gasolineCar', 'dieselCar'] // mobile整个类别已弃用
};

async function checkEmissionFactors() {
  const issues = [];
  const warnings = [];
  const info = [];

  try {
    // 1. 从数据库获取所有排放因子
    const dbFactors = await EmissionFactor.find({});
    info.push(`数据库中共有 ${dbFactors.length} 条排放因子记录`);

    // 2. 按类别分组
    const factorsByCategory = {};
    dbFactors.forEach(factor => {
      const category = factor.category;
      if (!factorsByCategory[category]) {
        factorsByCategory[category] = [];
      }
      factorsByCategory[category].push(factor);
    });

    // 3. 检查每个类别的排放因子
    for (const [category, expectedNames] of Object.entries(expectedFactors)) {
      const dbCategoryFactors = factorsByCategory[category] || [];
      const dbNames = dbCategoryFactors.map(f => enhancedCanonicalize(f.name)).filter(Boolean);

      // 检查缺失的排放因子
      for (const expectedName of expectedNames) {
        if (!dbNames.includes(expectedName)) {
          warnings.push(`⚠️  类别 "${category}" 缺少排放因子: "${expectedName}" (将使用默认值 ${defaultFactors[category]?.[expectedName] || 'N/A'})`);
        } else {
          const factor = dbCategoryFactors.find(f => enhancedCanonicalize(f.name) === expectedName);
          if (factor) {
            const defaultValue = defaultFactors[category]?.[expectedName];
            if (defaultValue !== undefined && factor.value !== defaultValue) {
              info.push(`ℹ️  类别 "${category}" 的 "${expectedName}" 已从默认值 ${defaultValue} 修改为 ${factor.value}`);
            }
          }
        }
      }

      // 检查数据库中的额外排放因子（不在预期列表中）
      for (const dbFactor of dbCategoryFactors) {
        const canonicalName = enhancedCanonicalize(dbFactor.name);
        if (canonicalName && !expectedNames.includes(canonicalName)) {
          // 检查是否是已弃用的因子
          const isDeprecated = deprecatedFactors[category]?.includes(canonicalName);
          if (isDeprecated) {
            issues.push(`❌ 类别 "${category}" 中存在已弃用的排放因子: "${canonicalName}" (ID: ${dbFactor._id})`);
          } else {
            warnings.push(`⚠️  类别 "${category}" 中存在未预期的排放因子: "${canonicalName}" (ID: ${dbFactor._id})`);
          }
        }
      }
    }

    // 4. 检查已弃用的mobile类别
    if (factorsByCategory.mobile && factorsByCategory.mobile.length > 0) {
      issues.push(`❌ 数据库中存在已弃用的 "mobile" 类别排放因子 (共 ${factorsByCategory.mobile.length} 条)`);
      factorsByCategory.mobile.forEach(factor => {
        issues.push(`   - ${factor.name} (ID: ${factor._id})`);
      });
    }

    // 5. 检查数据格式问题
    for (const factor of dbFactors) {
      // 检查value是否为数字
      if (typeof factor.value !== 'number' || isNaN(factor.value)) {
        issues.push(`❌ 排放因子 "${factor.name}" (ID: ${factor._id}) 的 value 不是有效数字: ${factor.value}`);
      }

      // 检查value是否为负数
      if (factor.value < 0) {
        warnings.push(`⚠️  排放因子 "${factor.name}" (ID: ${factor._id}) 的 value 为负数: ${factor.value}`);
      }

      // 检查unit字段是否存在
      if (!factor.unit) {
        issues.push(`❌ 排放因子 "${factor.name}" (ID: ${factor._id}) 缺少 unit 字段`);
      }

      // 检查category是否在允许的枚举值中
      const allowedCategories = ['solid', 'liquid', 'gas', 'indirect', 'mobile', 'fossil', 'fugitive', 'greenSink'];
      if (!allowedCategories.includes(factor.category)) {
        issues.push(`❌ 排放因子 "${factor.name}" (ID: ${factor._id}) 的 category "${factor.category}" 不在允许的枚举值中`);
      }
    }

    // 6. 检查名称映射问题
    for (const factor of dbFactors) {
      const canonicalName = enhancedCanonicalize(factor.name);
      if (!canonicalName || canonicalName !== factor.name) {
        info.push(`ℹ️  排放因子名称映射: "${factor.name}" -> "${canonicalName}" (ID: ${factor._id})`);
      }
    }

    // 7. 生成报告
    console.log('\n========== 排放因子一致性检查报告 ==========\n');
    
    if (info.length > 0) {
      console.log('📋 信息:');
      info.forEach(msg => console.log(`  ${msg}`));
      console.log('');
    }

    if (warnings.length > 0) {
      console.log('⚠️  警告:');
      warnings.forEach(msg => console.log(`  ${msg}`));
      console.log('');
    }

    if (issues.length > 0) {
      console.log('❌ 问题:');
      issues.forEach(msg => console.log(`  ${msg}`));
      console.log('');
    }

    if (issues.length === 0 && warnings.length === 0) {
      console.log('✅ 未发现严重问题！数据库与项目代码基本一致。\n');
    }

    // 8. 返回检查结果
    return {
      success: issues.length === 0,
      issues,
      warnings,
      info,
      summary: {
        totalFactors: dbFactors.length,
        issuesCount: issues.length,
        warningsCount: warnings.length,
        infoCount: info.length
      }
    };

  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error);
    return {
      success: false,
      error: error.message,
      issues: [`检查失败: ${error.message}`],
      warnings: [],
      info: []
    };
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const mongoose = require('mongoose');
  require('dotenv').config();

  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/carbon_platform', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
    .then(() => {
      console.log('已连接到MongoDB数据库\n');
      return checkEmissionFactors();
    })
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('连接数据库失败:', error);
      process.exit(1);
    });
}

module.exports = { checkEmissionFactors };
