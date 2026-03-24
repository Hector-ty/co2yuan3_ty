const mongoose = require('mongoose');

const CarbonDataSchema = new mongoose.Schema({
  account: {
    type: mongoose.Schema.ObjectId,
    ref: 'Account',
    required: true
  },
  year: {
    type: Number,
    required: [true, 'Please add a year for the data']
  },
  regionCode: {
    type: String,
    required: true
  },
  // Raw activity data
  activityData: {
    fossilFuels: {
      solid: {
        anthracite: { type: Number, default: 0 },
        bituminousCoal: { type: Number, default: 0 },
        lignite: { type: Number, default: 0 }
      },
      liquid: {
        fuelOil: { type: Number, default: 0 },
        gasoline: { type: Number, default: 0 },
        diesel: { type: Number, default: 0 },
        kerosene: { type: Number, default: 0 },
        lpg: { type: Number, default: 0 },
        lng: { type: Number, default: 0 }
      },
      gas: {
        naturalGas: { type: Number, default: 0 },
        cokeOvenGas: { type: Number, default: 0 },
        pipelineGas: { type: Number, default: 0 }
      }
    },
    fugitiveEmissions: {
      airConditioning: {
        'HCFC-22': { type: Number, default: 0 },
        'HFC-32': { type: Number, default: 0 },
        'HFC-125': { type: Number, default: 0 },
        'HFC-134a': { type: Number, default: 0 },
        'HFC-143a': { type: Number, default: 0 },
        'HFC-227a': { type: Number, default: 0 },
        'HFC-245fa': { type: Number, default: 0 }
      },
      fireSuppression: {
        'CO2': { type: Number, default: 0 },
        'HFC-227ea': { type: Number, default: 0 }
      }
    },
    greenSink: {
      tree: { type: Number, default: 0 },
      shrub: { type: Number, default: 0 },
      herb: { type: Number, default: 0 }
    },
    mobileSources: {
      fuel: {
        gasoline: { type: Number, default: 0 },
        diesel: { type: Number, default: 0 }
      },
      mileage: {
        gasolineCar: { type: Number, default: 0 },
        dieselCar: { type: Number, default: 0 }
      }
    },
    indirectEmissions: {
      purchasedElectricity: { type: Number, default: 0 }, // in 10^4 kWh
      purchasedHeat: { type: Number, default: 0 } // in GJ
    },
    intensityMetrics: {
      buildingArea: { type: Number, default: 0 }, // in m^2
      landArea: { type: Number, default: 0 }, // 用地面积 (平方米)
      personnelCount: { type: Number, default: 0 }, // 用能人数 (人)
      staffCount: { type: Number, default: 0 } // 编制人数 (人)
    },
    // 车辆信息
    vehicles: {
      total: { type: Number, default: 0 }, // 车辆总数 (辆)
      gasoline: { type: Number, default: 0 }, // 汽油车数量 (辆)
      diesel: { type: Number, default: 0 }, // 柴油车数量 (辆)
      newEnergy: { type: Number, default: 0 } // 新能源汽车数量 (辆)
    },
    // 水消费
    waterConsumption: {
      volume: { type: Number, default: 0 } // 水消费量 (立方米)
    },
    // 移动源详细分类
    mobileSourcesDetail: {
      gasoline: {
        vehicle: { type: Number, default: 0 }, // 车辆用油量 (升)
        other: { type: Number, default: 0 } // 其他用油量 (升)
      },
      diesel: {
        vehicle: { type: Number, default: 0 }, // 车辆用油量 (升)
        other: { type: Number, default: 0 } // 其他用油量 (升)
      }
    },
    // 其他能源
    otherEnergy: {
      consumption: { type: Number, default: 0 } // 其他能源消费量 (吨标准煤)
    },
    // 充电桩
    chargingStations: {
      count: { type: Number, default: 0 } // 充电桩数量 (个)
    }
  },
  // Calculated results
  calculatedEmissions: {
    breakdown: {
      fossilFuels: { type: Number, default: 0 },
      fugitiveEmissions: { type: Number, default: 0 },
      airConditioning: { type: Number, default: 0 },
      fireSuppression: { type: Number, default: 0 },
      mobileSources: { type: Number, default: 0 },
      electricity: { type: Number, default: 0 },
      heat: { type: Number, default: 0 },
      // 供前端“排放源细分构成图”使用的更细分字段
      anthraciteGroup: { type: Number, default: 0 },   // 无烟煤及同级固体燃料
      fuelOilGroup: { type: Number, default: 0 },      // 燃料油及同级液体燃料
      naturalGasGroup: { type: Number, default: 0 },   // 天然气及同级气体燃料
      hcfc22Group: { type: Number, default: 0 },       // HCFC-22 及同级制冷剂
      co2Group: { type: Number, default: 0 },          // CO₂ 及同级灭火系统气体
      totalGreenSink: { type: Number, default: 0 },  // 绿地碳汇量（扣减项）
    },
    // 23个详细数据项的排放量（tCO₂）- 用于前端环状图外层显示
    detailedBreakdown: {
      // 固体燃料
      anthracite: { type: Number, default: 0 },        // 无烟煤
      bituminousCoal: { type: Number, default: 0 },    // 烟煤
      lignite: { type: Number, default: 0 },           // 褐煤
      // 液体燃料
      fuelOil: { type: Number, default: 0 },           // 燃料油
      gasoline: { type: Number, default: 0 },          // 汽油
      diesel: { type: Number, default: 0 },            // 柴油
      kerosene: { type: Number, default: 0 },          // 煤油
      lpg: { type: Number, default: 0 },               // 液化石油气
      lng: { type: Number, default: 0 },               // 液化天然气
      // 气体燃料
      naturalGas: { type: Number, default: 0 },        // 天然气
      cokeOvenGas: { type: Number, default: 0 },       // 焦炉煤气
      pipelineGas: { type: Number, default: 0 },       // 管道煤气
      // 空调系统逸散排放
      'HCFC-22': { type: Number, default: 0 },
      'HFC-32': { type: Number, default: 0 },
      'HFC-125': { type: Number, default: 0 },
      'HFC-134a': { type: Number, default: 0 },
      'HFC-143a': { type: Number, default: 0 },
      'HFC-227a': { type: Number, default: 0 },
      'HFC-245fa': { type: Number, default: 0 },
      // 灭火系统逸散排放
      'CO2': { type: Number, default: 0 },
      'HFC-227ea': { type: Number, default: 0 },
      // 间接排放
      purchasedElectricity: { type: Number, default: 0 },  // 净外购电量
      purchasedHeat: { type: Number, default: 0 }          // 净外购热力
    },
    totalDirect: Number,
    totalIndirect: Number,
    totalEmissions: Number,
    emissionIntensityByArea: Number,
    emissionIntensityByPerson: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  }
});

module.exports = mongoose.model('CarbonData', CarbonDataSchema);
