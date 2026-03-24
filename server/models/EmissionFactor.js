const mongoose = require('mongoose');

const emissionFactorSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['solid', 'liquid', 'gas', 'indirect', 'mobile', 'fossil', 'fugitive', 'greenSink'] // 排放因子类别；greenSink=绿地碳汇因子
  },
  type: {
    type: String,
    required: true // 具体燃料类型或排放源
  },
  name: {
    type: String,
    required: true,
    unique: true // 排放因子的名称，例如 'anthracite', 'gasoline', 'electricity'
  },
  value: {
    type: Number,
    required: true // 排放因子值（数值类型，保持向后兼容）
  },
  // 新增：字符串类型的排放因子值（用于支持 "100%" 这样的值）
  emissionFactor: {
    type: String // 排放因子值（字符串格式，如 "100%", "2.09"）
  },
  unit: {
    type: String,
    required: true // 排放因子单位，例如 'tCO2/t', 'tCO2/L', 'tCO2/MWh'
  },
  description: {
    type: String
  },
  // 新增字段：支持新系统的详细分类
  fuelTypeCn: {
    type: String // 燃料类型（中文）- 用于化石燃料
  },
  fuelTypeEn: {
    type: String // 燃料类型（英文）- 用于化石燃料
  },
  gasNameCn: {
    type: String // 气体名称（中文）- 用于逸散排放
  },
  gasNameEn: {
    type: String // 气体名称（英文）- 用于逸散排放
  },
  gwpValue: {
    type: Number // GWP值 - 用于逸散排放
  },
  emissionTypeCn: {
    type: String // 排放类型（中文）- 用于间接排放
  },
  emissionTypeEn: {
    type: String // 排放类型（英文）- 用于间接排放
  },
  gwp: {
    type: String // GWP - 用于化石燃料
  },
  remarks: {
    type: String // 备注 - 用于间接排放
  },
  fugitiveCategory: {
    type: String,
    enum: ['airConditioning', 'fireSuppression'] // 逸散排放的子分类
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('EmissionFactor', emissionFactorSchema);
