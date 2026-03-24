const mongoose = require('mongoose');
const DataMappingTemplate = require('../models/DataMappingTemplate');
const CarbonData = require('../models/CarbonData'); // 用于获取 CarbonData 模型的结构

// 数据库字段中文标签映射
const fieldLabels = {
  // 基础字段
  'year': '年份',
  'regionCode': '行政区划代码',
  
  // 强度指标
  'activityData.intensityMetrics.buildingArea': '建筑面积 (平方米)',
  'activityData.intensityMetrics.landArea': '用地面积 (平方米)',
  'activityData.intensityMetrics.personnelCount': '用能人数 (人)',
  'activityData.intensityMetrics.staffCount': '编制人数 (人)',
  
  // 间接排放
  'activityData.indirectEmissions.purchasedElectricity': '外购电力 (万千瓦时)',
  'activityData.indirectEmissions.purchasedHeat': '外购热力 (吉焦)',
  
  // 化石燃料 - 固体
  'activityData.fossilFuels.solid.anthracite': '无烟煤 (吨)',
  'activityData.fossilFuels.solid.bituminousCoal': '烟煤 (吨)',
  'activityData.fossilFuels.solid.lignite': '褐煤 (吨)',
  
  // 化石燃料 - 液体
  'activityData.fossilFuels.liquid.fuelOil': '燃料油 (吨)',
  'activityData.fossilFuels.liquid.gasoline': '汽油(非车辆) (吨)',
  'activityData.fossilFuels.liquid.diesel': '柴油(非车辆) (吨)',
  'activityData.fossilFuels.liquid.kerosene': '煤油 (吨)',
  'activityData.fossilFuels.liquid.lpg': '液化石油气 (吨)',
  'activityData.fossilFuels.liquid.lng': '液化天然气 (吨)',
  
  // 化石燃料 - 气体
  'activityData.fossilFuels.gas.naturalGas': '天然气 (万立方米)',
  'activityData.fossilFuels.gas.cokeOvenGas': '焦炉煤气 (万立方米)',
  'activityData.fossilFuels.gas.pipelineGas': '管道煤气 (万立方米)',
  
  // 逸散排放 - 空调系统
  'activityData.fugitiveEmissions.airConditioning.HCFC-22': 'HCFC-22',
  'activityData.fugitiveEmissions.airConditioning.HFC-32': 'HFC-32',
  'activityData.fugitiveEmissions.airConditioning.HFC-125': 'HFC-125',
  'activityData.fugitiveEmissions.airConditioning.HFC-134a': 'HFC-134a',
  'activityData.fugitiveEmissions.airConditioning.HFC-143a': 'HFC-143a',
  'activityData.fugitiveEmissions.airConditioning.HFC-227a': 'HFC-227a',
  'activityData.fugitiveEmissions.airConditioning.HFC-245fa': 'HFC-245fa',
  
  // 逸散排放 - 灭火系统
  'activityData.fugitiveEmissions.fireSuppression.CO2': 'CO2',
  'activityData.fugitiveEmissions.fireSuppression.HFC-227ea': 'HFC-227ea',
  
  // 移动源 - 燃料
  'activityData.mobileSources.fuel.gasoline': '汽油 (千克)',
  'activityData.mobileSources.fuel.diesel': '柴油 (千克)',
  
  // 移动源 - 里程
  'activityData.mobileSources.mileage.gasolineCar': '汽油车 (公里)',
  'activityData.mobileSources.mileage.dieselCar': '柴油车 (公里)',
  
  // 车辆信息
  'activityData.vehicles.total': '车辆总数 (辆)',
  'activityData.vehicles.gasoline': '汽油车数量 (辆)',
  'activityData.vehicles.diesel': '柴油车数量 (辆)',
  'activityData.vehicles.newEnergy': '新能源汽车数量 (辆)',
  
  // 水消费
  'activityData.waterConsumption.volume': '水消费量 (立方米)',
  
  // 移动源详细分类
  'activityData.mobileSourcesDetail.gasoline.vehicle': '汽油-车辆用油量 (升)',
  'activityData.mobileSourcesDetail.gasoline.other': '汽油-其他用油量 (升)',
  'activityData.mobileSourcesDetail.diesel.vehicle': '柴油-车辆用油量 (升)',
  'activityData.mobileSourcesDetail.diesel.other': '柴油-其他用油量 (升)',
  
  // 其他能源
  'activityData.otherEnergy.consumption': '其他能源消费量 (吨标准煤)',
  
  // 充电桩
  'activityData.chargingStations.count': '充电桩数量 (个)',
};

// 获取字段的中文标签，如果没有则返回路径本身
function getFieldLabel(path) {
  return fieldLabels[path] || path;
}

// 辅助函数：递归遍历 Mongoose Schema，提取所有字段路径
function getSchemaPaths(schema, prefix = '') {
  let paths = [];
  
  // 遍历 schema 的所有路径
  schema.eachPath((pathName, schemaType) => {
    const fullPath = prefix ? `${prefix}.${pathName}` : pathName;
    
    // 检查是否是嵌套对象（有子 schema）
    if (schemaType.schema) {
      // 递归处理嵌套 schema
      paths = paths.concat(getSchemaPaths(schemaType.schema, fullPath));
    } else {
      // 普通字段，直接添加路径
      paths.push(fullPath);
    }
  });
  
  return paths;
}

// 获取所有可用的 CarbonData 数据库字段路径
exports.getCarbonDataFields = async (req, res) => {
  try {
    if (!CarbonData || !CarbonData.schema) {
      throw new Error('CarbonData 模型未正确加载');
    }
    
    const schemaPaths = getSchemaPaths(CarbonData.schema);
    
    // 过滤掉一些内部字段或不需要映射的字段
    const filteredPaths = schemaPaths.filter(path => 
      !path.startsWith('_') && 
      !path.startsWith('account') && // account 字段通常由系统自动处理
      !path.startsWith('createdAt') && 
      !path.startsWith('calculatedEmissions') // 计算结果字段不需要用户导入
    );
    
    // 返回包含路径和中文标签的对象数组
    const fieldsWithLabels = filteredPaths.map(path => ({
      path: path,
      label: getFieldLabel(path)
    }));
    
    res.status(200).json(fieldsWithLabels);
  } catch (error) {
    console.error('获取 CarbonData 字段失败:', error);
    res.status(500).json({ 
      message: '获取 CarbonData 字段失败', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// 获取所有数据映射模板
exports.getAllMappingTemplates = async (req, res) => {
  try {
    const templates = await DataMappingTemplate.find({ account: req.user.id });
    res.status(200).json(templates);
  } catch (error) {
    res.status(500).json({ message: '获取映射模板失败', error: error.message });
  }
};

// 根据ID获取单个数据映射模板
exports.getMappingTemplateById = async (req, res) => {
  try {
    const template = await DataMappingTemplate.findById(req.params.id);
    if (!template || template.account.toString() !== req.user.id) {
      return res.status(404).json({ message: '未找到映射模板' });
    }
    res.status(200).json(template);
  } catch (error) {
    res.status(500).json({ message: '获取映射模板失败', error: error.message });
  }
};

// 创建新的数据映射模板
exports.createMappingTemplate = async (req, res) => {
  try {
    const { templateName, mappings } = req.body;
    const newTemplate = new DataMappingTemplate({
      account: req.user.id,
      templateName,
      mappings
    });
    await newTemplate.save();
    res.status(201).json(newTemplate);
  } catch (error) {
    if (error.code === 11000) { // Duplicate key error
      return res.status(400).json({ message: '映射模板名称已存在', error: error.message });
    }
    res.status(500).json({ message: '创建映射模板失败', error: error.message });
  }
};

// 更新现有数据映射模板
exports.updateMappingTemplate = async (req, res) => {
  try {
    const { templateName, mappings } = req.body;
    const updatedTemplate = await DataMappingTemplate.findOneAndUpdate(
      { _id: req.params.id, account: req.user.id },
      { templateName, mappings, lastUpdated: Date.now() },
      { new: true, runValidators: true }
    );
    if (!updatedTemplate) {
      return res.status(404).json({ message: '未找到映射模板' });
    }
    res.status(200).json(updatedTemplate);
  } catch (error) {
    if (error.code === 11000) { // Duplicate key error
      return res.status(400).json({ message: '映射模板名称已存在', error: error.message });
    }
    res.status(500).json({ message: '更新映射模板失败', error: error.message });
  }
};

// 删除数据映射模板
exports.deleteMappingTemplate = async (req, res) => {
  try {
    const deletedTemplate = await DataMappingTemplate.findOneAndDelete({ _id: req.params.id, account: req.user.id });
    if (!deletedTemplate) {
      return res.status(404).json({ message: '未找到映射模板' });
    }
    res.status(200).json({ message: '映射模板删除成功' });
  } catch (error) {
    res.status(500).json({ message: '删除映射模板失败', error: error.message });
  }
};
