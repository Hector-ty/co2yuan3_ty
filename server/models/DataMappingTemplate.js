const mongoose = require('mongoose');

const DataMappingTemplateSchema = new mongoose.Schema({
  account: {
    type: mongoose.Schema.ObjectId,
    ref: 'Account',
    required: true
  },
  templateName: {
    type: String,
    required: [true, '请为映射模板命名'],
    unique: true // 确保模板名称唯一
  },
  mappings: {
    type: Map, // 使用 Map 类型存储键值对，键为文件列名，值为数据库字段路径
    of: String, // 值为字符串类型
    required: [true, '请定义数据映射规则']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('DataMappingTemplate', DataMappingTemplateSchema);
