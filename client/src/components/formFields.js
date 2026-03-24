export const formSections = [
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
          { name: ['fossilFuels', 'solid', 'lignite'], label: '褐煤' }
        ]
      },
      {
        key: '1-2',
        header: '液体燃料 (吨)',
        fields: [
          { name: ['fossilFuels', 'liquid', 'fuelOil'], label: '燃料油' },
          { name: ['fossilFuels', 'liquid', 'gasoline'], label: '汽油' },
          { name: ['fossilFuels', 'liquid', 'diesel'], label: '柴油' },
          { name: ['fossilFuels', 'liquid', 'kerosene'], label: '煤油' },
          { name: ['fossilFuels', 'liquid', 'lpg'], label: '液化石油气' },
          { name: ['fossilFuels', 'liquid', 'lng'], label: '液化天然气' }
        ]
      },
      {
        key: '1-3',
        header: '气体燃料 (立方米)',
        fields: [
          { name: ['fossilFuels', 'gas', 'naturalGas'], label: '天然气' },
          { name: ['fossilFuels', 'gas', 'cokeOvenGas'], label: '焦炉煤气' },
          { name: ['fossilFuels', 'gas', 'pipelineGas'], label: '管道煤气' },
        ]
      }
    ]
  },
  {
    key: '2',
    header: '直接排放(逸散排放)',
    panels: [
      {
        key: '2-1',
        header: '空调系统',
        fields: [
          { name: ['fugitiveEmissions', 'airConditioning', 'HCFC-22'], label: 'HCFC-22' },
          { name: ['fugitiveEmissions', 'airConditioning', 'HFC-32'], label: 'HFC-32' },
          { name: ['fugitiveEmissions', 'airConditioning', 'HFC-125'], label: 'HFC-125' },
          { name: ['fugitiveEmissions', 'airConditioning', 'HFC-134a'], label: 'HFC-134a' },
          { name: ['fugitiveEmissions', 'airConditioning', 'HFC-143a'], label: 'HFC-143a' },
          { name: ['fugitiveEmissions', 'airConditioning', 'HFC-227a'], label: 'HFC-227a' },
          { name: ['fugitiveEmissions', 'airConditioning', 'HFC-245fa'], label: 'HFC-245fa' },
        ]
      },
      {
        key: '2-2',
        header: '灭火系统',
        fields: [
          { name: ['fugitiveEmissions', 'fireSuppression', 'CO2'], label: 'CO2' },
          { name: ['fugitiveEmissions', 'fireSuppression', 'HFC-227ea'], label: 'HFC-227ea' },
        ]
      }
    ]
  },
  {
    key: '3',
    header: '间接排放',
    fields: [
      { name: ['indirectEmissions', 'purchasedElectricity'], label: '净外购电量' },
      { name: ['indirectEmissions', 'purchasedHeat'], label: '净外购热力' },
    ]
  },
  {
    key: '4',
    header: '绿地碳汇',
    fields: [
      { name: ['greenSink', 'tree'], label: '乔木绿地面积 (亩)' },
      { name: ['greenSink', 'shrub'], label: '灌木绿地面积 (亩)' },
      { name: ['greenSink', 'herb'], label: '草本绿地面积 (亩)' },
    ]
  }
];
