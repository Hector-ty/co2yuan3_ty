// All factors are in tCO2 per unit, unless specified otherwise.
// Units for fuels are 't' for solid/liquid and 'm^3' for gas.

const factors = {
  // Solid Fuels (tCO2/t)
  solid: {
    anthracite: 2.09,
    bituminousCoal: 1.79,
    lignite: 1.21
  },
  // Liquid Fuels (tCO2/t)
  liquid: {
    fuelOil: 3.05,
    gasoline: 3.04,
    diesel: 3.14,
    kerosene: 3.16,
    lpg: 2.92,
    lng: 2.59
  },
  // Gaseous Fuels (tCO2 / 10^4 Nm^3)
  gas: {
    naturalGas: 21.62,
    cokeOvenGas: 8.57,
    pipelineGas: 7.00
  },
  // Indirect Emissions
  indirect: {
    // tCO2 / MWh -> converted to tCO2 / (10^4 kWh) in calculation
    electricity: 0.6849, 
    // kgCO2e / GJ -> converted to tCO2 / GJ in calculation
    heat: 0.11 
  },
  // 绿地碳汇因子 (tCO₂e/亩·年) - 植被类型：乔木、灌木、草本
  greenSink: {
    tree: 0.25,   // 乔木
    shrub: 0.1,   // 灌木
    herb: 0.05    // 草本
  }
};

module.exports = factors;
