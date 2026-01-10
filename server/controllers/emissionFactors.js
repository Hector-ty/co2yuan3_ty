const EmissionFactor = require('../models/EmissionFactor');
const defaultFactors = require('../utils/emissionFactors');
const { canonicalizeFactorName } = require('../utils/factorNameHelper');
const { migrateNewSystemData } = require('../utils/migrateEmissionFactors');

// 获取所有排放因子
exports.getAllFactors = async (req, res) => {
  try {
    const factors = await EmissionFactor.find({});
    res.status(200).json(factors);
  } catch (error) {
    res.status(500).json({ message: '获取排放因子失败', error: error.message });
  }
};

// 根据ID获取单个排放因子
exports.getFactorById = async (req, res) => {
  try {
    const factor = await EmissionFactor.findById(req.params.id);
    if (!factor) {
      return res.status(404).json({ message: '未找到排放因子' });
    }
    res.status(200).json(factor);
  } catch (error) {
    res.status(500).json({ message: '获取排放因子失败', error: error.message });
  }
};

// 创建新的排放因子
exports.createFactor = async (req, res) => {
  try {
    const { category, type, name, value, unit, description } = req.body;
    
    // 数据验证
    if (!category || !name || value === undefined || value === null || value === '' || !unit) {
      return res.status(400).json({ 
        message: '缺少必需字段：category, name, value, unit 都是必需的',
        error: 'Missing required fields'
      });
    }
    
    // 验证 value 是数字
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return res.status(400).json({ 
        message: '值必须是有效的数字',
        error: 'Invalid value format'
      });
    }
    
    // 验证 category 是否在允许的枚举值中
    const allowedCategories = ['solid', 'liquid', 'gas', 'indirect', 'mobile'];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ 
        message: `类别必须是以下之一：${allowedCategories.join(', ')}`,
        error: 'Invalid category'
      });
    }
    
    // 对于非 mobile 类别，type 可以为空或使用 category 作为默认值
    const finalType = type || category;
    const canonicalName = canonicalizeFactorName(name);
    
    console.log('创建排放因子:', { category, type: finalType, name: canonicalName, value: numValue, unit, description });
    
    const newFactor = new EmissionFactor({ 
      category, 
      type: finalType, 
      name: canonicalName, 
      value: numValue, // 确保是数字
      unit, 
      description: description || ''
    });
    await newFactor.save();
    res.status(201).json(newFactor);
  } catch (error) {
    console.error('创建排放因子错误:', error);
    if (error.code === 11000) { // Duplicate key error
      return res.status(400).json({ message: '排放因子名称已存在', error: error.message });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: '数据验证失败', error: error.message });
    }
    res.status(500).json({ message: '创建排放因子失败', error: error.message });
  }
};

// 更新现有排放因子
exports.updateFactor = async (req, res) => {
  try {
    const { category, type, name, value, unit, description } = req.body;
    
    // 数据验证
    if (!category || !name || value === undefined || value === null || value === '' || !unit) {
      return res.status(400).json({ 
        message: '缺少必需字段：category, name, value, unit 都是必需的',
        error: 'Missing required fields'
      });
    }
    
    // 验证 value 是数字
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return res.status(400).json({ 
        message: '值必须是有效的数字',
        error: 'Invalid value format'
      });
    }
    
    // 验证 category 是否在允许的枚举值中
    const allowedCategories = ['solid', 'liquid', 'gas', 'indirect', 'mobile'];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ 
        message: `类别必须是以下之一：${allowedCategories.join(', ')}`,
        error: 'Invalid category'
      });
    }
    
    // 对于非 mobile 类别，type 可以为空或使用 category 作为默认值
    const finalType = type || category;
    const canonicalName = canonicalizeFactorName(name);
    
    console.log('更新排放因子:', req.params.id, { category, type: finalType, name: canonicalName, value: numValue, unit, description });
    
    const updatedFactor = await EmissionFactor.findByIdAndUpdate(
      req.params.id,
      { 
        category, 
        type: finalType, 
        name: canonicalName, 
        value: numValue, // 确保是数字
        unit, 
        description: description || '',
        lastUpdated: Date.now() 
      },
      { new: true, runValidators: true }
    );
    if (!updatedFactor) {
      return res.status(404).json({ message: '未找到排放因子' });
    }
    res.status(200).json(updatedFactor);
  } catch (error) {
    console.error('更新排放因子错误:', error);
    if (error.code === 11000) { // Duplicate key error
      return res.status(400).json({ message: '排放因子名称已存在', error: error.message });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: '数据验证失败', error: error.message });
    }
    res.status(500).json({ message: '更新排放因子失败', error: error.message });
  }
};

// 删除排放因子
exports.deleteFactor = async (req, res) => {
  try {
    const deletedFactor = await EmissionFactor.findByIdAndDelete(req.params.id);
    if (!deletedFactor) {
      return res.status(404).json({ message: '未找到排放因子' });
    }
    res.status(200).json({ message: '排放因子删除成功' });
  } catch (error) {
    res.status(500).json({ message: '删除排放因子失败', error: error.message });
  }
};

// 初始化排放因子到数据库
exports.initializeFactors = async (req, res) => {
  try {
    const operations = buildDefaultFactorOperations();
    if (!operations.length) {
      return res.status(400).json({ message: '没有可用的默认排放因子' });
    }

    const result = await EmissionFactor.bulkWrite(operations, { ordered: false });
    const insertedCount = result.upsertedCount || 0;
    res.status(200).json({ message: `排放因子初始化完成，新增 ${insertedCount} 条记录`, insertedCount });
  } catch (error) {
    console.error('初始化排放因子错误:', error);
    res.status(500).json({ message: '初始化排放因子失败', error: error.message });
  }
};

// 迁移新系统的排放因子数据
exports.migrateNewSystemFactors = async (req, res) => {
  try {
    const result = await migrateNewSystemData();
    res.status(200).json(result);
  } catch (error) {
    console.error('迁移新系统数据错误:', error);
    res.status(500).json({ message: '迁移新系统数据失败', error: error.message });
  }
};

function buildDefaultFactorOperations() {
  const operations = [];

  Object.entries(defaultFactors).forEach(([category, data]) => {
    if (category === 'mobile') {
      Object.entries(data).forEach(([mobileType, values]) => {
        Object.entries(values).forEach(([name, value]) => {
          operations.push(createUpsertOperation({
            category: 'mobile',
            type: mobileType,
            name,
            value,
            unit: getUnitForFactor('mobile', mobileType, name),
            description: `默认 ${name} 排放因子`
          }));
        });
      });
      return;
    }

    if (category === 'indirect') {
      Object.entries(data).forEach(([name, value]) => {
        operations.push(createUpsertOperation({
          category: 'indirect',
          type: name,
          name,
          value,
          unit: getUnitForFactor('indirect', null, name),
          description: `默认 ${name} 排放因子`
        }));
      });
      return;
    }

    Object.entries(data).forEach(([name, value]) => {
      operations.push(createUpsertOperation({
        category,
        type: category,
        name,
        value,
        unit: getUnitForFactor(category),
        description: `默认 ${name} 排放因子`
      }));
    });
  });

  return operations;
}

function createUpsertOperation(factor) {
  return {
    updateOne: {
      filter: { name: factor.name },
      update: {
        $setOnInsert: {
          ...factor,
          lastUpdated: new Date()
        }
      },
      upsert: true
    }
  };
}

// 辅助函数：根据类别和类型获取单位
function getUnitForFactor(category, type, name) {
  switch (category) {
    case 'solid':
    case 'liquid':
      return 'tCO2/t';
    case 'gas':
      return 'tCO2/10^4 Nm^3';
    case 'indirect':
      if (name === 'electricity') return 'tCO2/MWh';
      if (name === 'heat') return 'kgCO2e/GJ';
      return '';
    case 'mobile':
      if (type === 'fuel') return 'kgCO2/L';
      if (type === 'mileage') return 'kgCO2/km';
      return '';
    default:
      return '';
  }
}
