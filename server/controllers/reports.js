const CarbonData = require('../models/CarbonData');
const { formSections } = require('../utils/formFields'); // 导入前端表单字段定义
const { getRegionFullNameByCode } = require('../utils/regionData'); // 导入获取地区全名的方法
const ExcelJS = require('exceljs'); // 导入 exceljs 库

// A simple utility to convert a flat JSON object to a CSV row
function jsonToCsv(items) {
  if (!items || items.length === 0) {
    return ''; // Return empty string if no items
  }
  const header = Object.keys(items[0]);
  const headerString = header.join(',');

  // Build the CSV string
  const replacer = (key, value) => value === null || value === undefined ? '' : value;
  const rowItems = items.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','));
  
  return [headerString, ...rowItems].join('\r\n');
}

// Helper to get nested value safely
const getNestedValue = (obj, path) => {
  return path.reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), obj);
};

// Helper to flatten activity data based on formSections
const flattenActivityData = (activityData) => {
  const flat = {};
  formSections.forEach(section => {
    const processFields = (fields) => {
      fields.forEach(field => {
        const fieldPath = field.name; // e.g., ['fossilFuels', 'solid', 'anthracite']
        const flatKey = fieldPath.join('_'); // e.g., 'fossilFuels_solid_anthracite'
        flat[flatKey] = getNestedValue(activityData, fieldPath) || '';
      });
    };

    if (section.panels) {
      section.panels.forEach(panel => processFields(panel.fields));
    } else {
      processFields(section.fields);
    }
  });
  return flat;
};

// @desc    Export user data to CSV
// @route   GET /api/reports/csv
// @access  Private
exports.exportCsv = async (req, res, next) => {
  try {
    const data = await CarbonData.find({ account: req.user.id }).lean();

    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, error: 'No data found to export' });
    }

    // We need to flatten the complex data structure for CSV export
    const flattenedData = data.map(entry => {
      const activityFlat = flattenActivityData(entry.activityData); // Flatten all activity data

      return {
        year: entry.year,
        regionCode: entry.regionCode,
        regionName: getRegionFullNameByCode(entry.regionCode) || entry.regionCode, // 添加地区全名
        ...activityFlat, // 展开所有活动数据字段
        // Calculated Emissions
        totalEmissions_tCO2: entry.calculatedEmissions?.totalEmissions || 0,
        totalDirect_tCO2: entry.calculatedEmissions?.totalDirect || 0,
        totalIndirect_tCO2: entry.calculatedEmissions?.totalIndirect || 0,
        intensityByArea_tCO2_per_m2: entry.calculatedEmissions?.emissionIntensityByArea || 0,
        intensityByPerson_tCO2_per_person: entry.calculatedEmissions?.emissionIntensityByPerson || 0,
        // Breakdown
        breakdown_fossilFuels_tCO2: entry.calculatedEmissions?.breakdown?.fossilFuels || 0,
        breakdown_electricity_tCO2: entry.calculatedEmissions?.breakdown?.electricity || 0,
        breakdown_heat_tCO2: entry.calculatedEmissions?.breakdown?.heat || 0,
        createdAt: entry.createdAt ? entry.createdAt.toISOString() : ''
      };
    });

    const csv = jsonToCsv(flattenedData);

    res.header('Content-Type', 'text/csv');
    res.attachment(`carbon_report_${req.user.id}.csv`);
    res.send(csv);

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// 定义每个sheet的中文表头和对应的字段映射
const sheetConfigs = {
  '直接排放(化石燃料燃烧)': {
    sectionName: 'fossilFuels',
    headers: {
      'year': '年份',
      'regionName': '行政区',
      'fossilFuels_solid_anthracite': '化石燃料-固体-无烟煤 (吨)',
      'fossilFuels_solid_bituminous': '化石燃料-固体-烟煤 (吨)',
      'fossilFuels_solid_lignite': '化石燃料-固体-褐煤 (吨)',
      'fossilFuels_liquid_gasoline': '化石燃料-液体-汽油 (吨)',
      'fossilFuels_liquid_diesel': '化石燃料-液体-柴油 (吨)',
      'fossilFuels_liquid_kerosene': '化石燃料-液体-煤油 (吨)',
      'fossilFuels_gas_naturalGas': '化石燃料-气体-天然气 (万立方米)',
      'fossilFuels_gas_LPG': '化石燃料-气体-液化石油气 (吨)',
      'breakdown_fossilFuels_tCO2': '化石燃料排放总量 (tCO2)',
      'totalEmissions_tCO2': '总排放量 (tCO2)',
      'createdAt': '创建时间'
    },
    fields: [
      'year', 'regionName',
      'fossilFuels_solid_anthracite', 'fossilFuels_solid_bituminous', 'fossilFuels_solid_lignite',
      'fossilFuels_liquid_gasoline', 'fossilFuels_liquid_diesel', 'fossilFuels_liquid_kerosene',
      'fossilFuels_gas_naturalGas', 'fossilFuels_gas_LPG',
      'breakdown_fossilFuels_tCO2', 'totalEmissions_tCO2', 'createdAt'
    ]
  },
  '直接排放(移动源)': {
    sectionName: 'mobileSources',
    headers: {
      'year': '年份',
      'regionName': '行政区',
      'mobileSources_road_passengerCars_gasoline': '移动源-道路-乘用车-汽油 (辆)',
      'mobileSources_road_passengerCars_diesel': '移动源-道路-乘用车-柴油 (辆)',
      'mobileSources_road_buses_diesel': '移动源-道路-公共汽车-柴油 (辆)',
      'mobileSources_road_trucks_diesel': '移动源-道路-货车-柴油 (辆)',
      'mobileSources_rail_dieselLocomotives': '移动源-铁路-内燃机车-柴油 (辆)',
      'mobileSources_aviation_jetFuel': '移动源-航空-航空煤油 (吨)',
      'mobileSources_shipping_diesel': '移动源-水运-柴油 (吨)',
      'breakdown_mobileSources_tCO2': '移动源排放总量 (tCO2)',
      'totalEmissions_tCO2': '总排放量 (tCO2)',
      'createdAt': '创建时间'
    },
    fields: [
      'year', 'regionName',
      'mobileSources_road_passengerCars_gasoline', 'mobileSources_road_passengerCars_diesel',
      'mobileSources_road_buses_diesel', 'mobileSources_road_trucks_diesel',
      'mobileSources_rail_dieselLocomotives', 'mobileSources_aviation_jetFuel',
      'mobileSources_shipping_diesel', 'breakdown_mobileSources_tCO2', 'totalEmissions_tCO2', 'createdAt'
    ]
  },
  '外购电力': {
    sectionName: 'purchasedElectricity',
    headers: {
      'year': '年份',
      'regionName': '行政区',
      'purchasedElectricity_consumption': '外购电力-消费量 (万千瓦时)',
      'breakdown_electricity_tCO2': '外购电力排放总量 (tCO2)',
      'totalEmissions_tCO2': '总排放量 (tCO2)',
      'createdAt': '创建时间'
    },
    fields: [
      'year', 'regionName', 'purchasedElectricity_consumption',
      'breakdown_electricity_tCO2', 'totalEmissions_tCO2', 'createdAt'
    ]
  },
  '外购热力': {
    sectionName: 'purchasedHeat',
    headers: {
      'year': '年份',
      'regionName': '行政区',
      'purchasedHeat_consumption': '外购热力-消费量 (GJ)',
      'breakdown_heat_tCO2': '外购热力排放总量 (tCO2)',
      'totalEmissions_tCO2': '总排放量 (tCO2)',
      'createdAt': '创建时间'
    },
    fields: [
      'year', 'regionName', 'purchasedHeat_consumption',
      'breakdown_heat_tCO2', 'totalEmissions_tCO2', 'createdAt'
    ]
  }
};

// @desc    Export user data to Excel with multiple sheets
// @route   GET /api/reports/excel
// @access  Private
exports.exportExcel = async (req, res, next) => {
  try {
    const data = await CarbonData.find({ account: req.user.id }).lean();

    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, error: 'No data found to export' });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Carbon Emission Monitoring System';
    workbook.lastModifiedBy = 'Carbon Emission Monitoring System';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Prepare flattened data for all entries
    const allFlattenedData = data.map(entry => {
      const activityFlat = flattenActivityData(entry.activityData);
      return {
        year: entry.year,
        regionCode: entry.regionCode,
        regionName: getRegionFullNameByCode(entry.regionCode) || entry.regionCode,
        ...activityFlat,
        totalEmissions_tCO2: entry.calculatedEmissions?.totalEmissions || 0,
        totalDirect_tCO2: entry.calculatedEmissions?.totalDirect || 0,
        totalIndirect_tCO2: entry.calculatedEmissions?.totalIndirect || 0,
        intensityByArea_tCO2_per_m2: entry.calculatedEmissions?.emissionIntensityByArea || 0,
        intensityByPerson_tCO2_per_person: entry.calculatedEmissions?.emissionIntensityByPerson || 0,
        breakdown_fossilFuels_tCO2: entry.calculatedEmissions?.breakdown?.fossilFuels || 0,
        breakdown_mobileSources_tCO2: entry.calculatedEmissions?.breakdown?.mobileSources || 0, // Added mobile sources breakdown
        breakdown_electricity_tCO2: entry.calculatedEmissions?.breakdown?.electricity || 0,
        breakdown_heat_tCO2: entry.calculatedEmissions?.breakdown?.heat || 0,
        createdAt: entry.createdAt ? entry.createdAt.toISOString() : ''
      };
    });

    for (const sheetName in sheetConfigs) {
      const config = sheetConfigs[sheetName];
      const worksheet = workbook.addWorksheet(sheetName);

      // Set columns with Chinese headers
      worksheet.columns = config.fields.map(field => ({
        header: config.headers[field] || field, // Use Chinese header if defined, otherwise use field name
        key: field,
        width: 20
      }));

      // Filter and add rows based on sectionName
      const sheetData = allFlattenedData.filter(entry => {
        // Check if the entry has any data relevant to this section
        // This is a simplified check; a more robust check might iterate through config.fields
        const relevantFields = config.fields.filter(f => !['year', 'regionName', 'totalEmissions_tCO2', 'createdAt'].includes(f));
        return relevantFields.some(field => entry[field] !== '' && entry[field] !== 0);
      });

      worksheet.addRows(sheetData);
    }

    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment(`carbon_report_${req.user.id}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get comparison data for a given year and region
// @route   GET /api/reports/compare
// @access  Private
exports.compareData = async (req, res, next) => {
  try {
    const { year, regionCode } = req.query;

    if (!year || !regionCode) {
      return res.status(400).json({ success: false, error: 'Year and regionCode are required' });
    }

    // Determine the city-level prefix (e.g., '150102' -> '1501')
    const cityPrefix = regionCode.substring(0, 4);
    const regionRegex = new RegExp(`^${cityPrefix}`);

    const comparisonData = await CarbonData.find({
      year: parseInt(year),
      regionCode: { $regex: regionRegex }
    }).populate('account', 'unitName'); // Populate the unit name from the Account model

    res.status(200).json({
      success: true,
      data: comparisonData
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
