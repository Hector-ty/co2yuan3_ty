module.exports.formSections = [
  {
    key: '1',
    header: '直接排放(化石燃料燃烧)',
    panels: [
      {
        key: '1-1',
        header: '固体燃料 (吨)',
        fields: [
          { name: ['fossilFuels', 'solid', 'anthracite'], label: '无烟煤' },
          { name: ['fossilFuels', 'solid', 'bituminousCoal'], label: '烟煤' },
          { name: ['fossilFuels', 'solid', 'lignite'], label: '褐煤' },
          { name: ['fossilFuels', 'solid', 'cokingCoal'], label: '炼焦煤' },
          { name: ['fossilFuels', 'solid', 'briquettes'], label: '型煤' },
          { name: ['fossilFuels', 'solid', 'coke'], label: '焦炭' },
          { name: ['fossilFuels', 'solid', 'otherCokingProducts'], label: '其它焦化产品' },
        ]
      },
      {
        key: '1-2',
        header: '液体燃料 (吨)',
        fields: [
          { name: ['fossilFuels', 'liquid', 'crudeOil'], label: '原油' },
          { name: ['fossilFuels', 'liquid', 'fuelOil'], label: '燃料油' },
          { name: ['fossilFuels', 'liquid', 'gasoline'], label: '汽油(非车辆)' },
          { name: ['fossilFuels', 'liquid', 'diesel'], label: '柴油(非车辆)' },
          { name: ['fossilFuels', 'liquid', 'kerosene'], label: '煤油' },
          { name: ['fossilFuels', 'liquid', 'lpg'], label: '液化石油气' },
          { name: ['fossilFuels', 'liquid', 'lng'], label: '液化天然气' },
          { name: ['fossilFuels', 'liquid', 'naphtha'], label: '石脑油' },
          { name: ['fossilFuels', 'liquid', 'asphalt'], label: '沥青' },
          { name: ['fossilFuels', 'liquid', 'lubricants'], label: '润滑油' },
          { name: ['fossilFuels', 'liquid', 'petroleumCoke'], label: '石油焦' },
          { name: ['fossilFuels', 'liquid', 'petrochemicalFeedstock'], label: '石化原料油' },
          { name: ['fossilFuels', 'liquid', 'otherOils'], label: '其它油品' },
        ]
      },
      {
        key: '1-3',
        header: '气体燃料 (立方米)',
        fields: [
          { name: ['fossilFuels', 'gas', 'naturalGas'], label: '天然气' },
          { name: ['fossilFuels', 'gas', 'refineryGas'], label: '炼厂干气' },
          { name: ['fossilFuels', 'gas', 'cokeOvenGas'], label: '焦炉煤气' },
          { name: ['fossilFuels', 'gas', 'pipelineGas'], label: '管道煤气' },
        ]
      }
    ]
  },
  {
    key: '2',
    header: '直接排放(移动源)',
    panels: [
      {
        key: '2-1',
        header: '按燃料消耗量计算',
        fields: [
          { name: ['mobileSources', 'fuel', 'gasoline'], label: '汽油 (升)' },
          { name: ['mobileSources', 'fuel', 'diesel'], label: '柴油 (升)' },
        ]
      },
      {
        key: '2-2',
        header: '按行驶里程计算',
        fields: [
          { name: ['mobileSources', 'mileage', 'gasolineCar'], label: '汽油车 (公里)' },
          { name: ['mobileSources', 'mileage', 'dieselCar'], label: '柴油车 (公里)' },
        ]
      }
    ]
  },
  {
    key: '3',
    header: '间接排放',
    fields: [
      { name: ['indirectEmissions', 'purchasedElectricity'], label: '净外购电量 (万千瓦时)' },
      { name: ['indirectEmissions', 'purchasedHeat'], label: '净外购热力 (吉焦)' },
    ]
  },
  {
    key: '4',
    header: '单位基本情况',
    fields: [
      { name: ['intensityMetrics', 'buildingArea'], label: '机关单位建筑面积 (平方米)' },
      { name: ['intensityMetrics', 'personnelCount'], label: '机关人员数量 (人)' },
    ]
  }
];
