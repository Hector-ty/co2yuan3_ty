/**
 * 初始化绿地碳汇因子到 MongoDB
 * 三种植被类型：乔木 0.25、灌木 0.1、草本 0.05，单位 tCO₂e/亩·年
 * 运行方式（在项目根目录）：node server/scripts/initGreenSinkFactors.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const EmissionFactor = require('../models/EmissionFactor');

const GREEN_SINK_UNIT = 'tCO₂e/亩·年';
const vegetationLabels = { tree: '乔木', shrub: '灌木', herb: '草本' };

const greenSinkDefaults = {
  tree: 0.25,
  shrub: 0.1,
  herb: 0.05
};

async function initGreenSinkFactors() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/carbon_platform';
  if (!process.env.MONGODB_URI) {
    console.log('未设置 MONGODB_URI，使用默认: ' + uri);
  }

  try {
    await mongoose.connect(uri);
    console.log('MongoDB 连接成功\n');
    console.log('正在初始化绿地碳汇因子...\n');

    const operations = Object.entries(greenSinkDefaults).map(([name, value]) => ({
      updateOne: {
        filter: { name },
        update: {
          $setOnInsert: {
            category: 'greenSink',
            type: name,
            name,
            value,
            unit: GREEN_SINK_UNIT,
            description: `绿地碳汇因子-${vegetationLabels[name] || name}`,
            lastUpdated: new Date()
          }
        },
        upsert: true
      }
    }));

    const result = await EmissionFactor.bulkWrite(operations, { ordered: false });
    const inserted = result.upsertedCount || 0;

    // 统一已有绿地碳汇因子的单位为标准写法 tCO₂e/亩·年
    const unitResult = await EmissionFactor.updateMany(
      { category: 'greenSink' },
      { $set: { unit: GREEN_SINK_UNIT, lastUpdated: new Date() } }
    );

    console.log('乔木 (tree):', greenSinkDefaults.tree, GREEN_SINK_UNIT);
    console.log('灌木 (shrub):', greenSinkDefaults.shrub, GREEN_SINK_UNIT);
    console.log('草本 (herb):', greenSinkDefaults.herb, GREEN_SINK_UNIT);
    console.log('\n结果: 新增', inserted, '条；单位已统一为', GREEN_SINK_UNIT);
    if (unitResult.modifiedCount > 0) {
      console.log('已更新', unitResult.modifiedCount, '条已有记录的单位。');
    }
    console.log('\n绿地碳汇因子初始化完成。');
  } catch (err) {
    console.error('初始化失败:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('已断开数据库连接。');
  }
}

initGreenSinkFactors();
