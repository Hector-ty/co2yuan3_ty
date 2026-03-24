const csv = require('csv-parser');
const xlsx = require('xlsx');
const { Readable } = require('stream');
const DataMappingTemplate = require('../models/DataMappingTemplate');
const CarbonData = require('../models/CarbonData');
const { calculateEmissions } = require('../utils/calculationEngine');

// 辅助函数：解析 CSV 文件
const parseCsv = async (buffer) => {
  const results = [];
  const stream = Readable.from(buffer.toString());

  return new Promise((resolve, reject) => {
    stream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

// 辅助函数：解析 Excel 文件（支持多级表头）
const parseXlsx = (buffer) => {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // 先读取原始数据（包含表头）
  const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  if (rawData.length < 2) {
    // 单级表头，直接解析
    return xlsx.utils.sheet_to_json(sheet);
  }
  
  // 检查是否为多级表头（第二行包含"上年"、"当年"等关键词）
  const row1 = rawData[0] || [];
  const row2 = rawData[1] || [];
  const isMultiLevelHeader = row2.some(cell => 
    typeof cell === 'string' && (cell.includes('上年') || cell.includes('当年') || cell.includes('费用'))
  );
  
  if (isMultiLevelHeader) {
    // 多级表头：合并前两行作为列名，从第三行开始读取数据
    const headers = row1.map((col1, index) => {
      const col2 = row2[index] || '';
      if (col2 && col2 !== col1) {
        return `${col1}_${col2}`;
      }
      return col1 || col2 || `列${index + 1}`;
    });
    
    // 从第三行开始转换为对象数组
    const data = [];
    for (let i = 2; i < rawData.length; i++) {
      const row = rawData[i];
      const rowObj = {};
      headers.forEach((header, index) => {
        rowObj[header] = row[index] !== undefined ? row[index] : '';
      });
      // 只添加非空行
      if (Object.values(rowObj).some(val => val !== '' && val !== null && val !== undefined)) {
        data.push(rowObj);
      }
    }
    return data;
  } else {
    // 单级表头，直接解析
    return xlsx.utils.sheet_to_json(sheet);
  }
};

// 辅助函数：根据映射和 CarbonData Schema 校验并转换数据
const mapAndValidateData = async (rawData, mappingTemplate, userAccount, defaultYear = null) => {
  const mappedData = [];
  const errors = [];
  const schemaPaths = Object.keys(CarbonData.schema.paths); // 获取所有 CarbonData 字段路径

  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    const newCarbonData = {
      account: userAccount,
      activityData: {
        fossilFuels: { solid: {}, liquid: {}, gas: {} },
        fugitiveEmissions: { airConditioning: {}, fireSuppression: {} },
        mobileSources: { fuel: {}, mileage: {} },
        indirectEmissions: {},
        intensityMetrics: {}
      },
      calculatedEmissions: {} // 预留计算结果
    };
    const rowErrors = [];

    for (const fileColumn in mappingTemplate.mappings) {
      const dbPath = mappingTemplate.mappings[fileColumn];
      const value = row[fileColumn];

      if (!dbPath) continue; // 如果没有映射，则跳过

      // 已弃用的字段列表
      const deprecatedFields = [
        'activityData.fossilFuels.solid.cokingCoal',
        'activityData.fossilFuels.solid.briquettes',
        'activityData.fossilFuels.solid.coke',
        'activityData.fossilFuels.solid.otherCokingProducts',
        'activityData.fossilFuels.liquid.crudeOil',
        'activityData.fossilFuels.liquid.naphtha',
        'activityData.fossilFuels.liquid.asphalt',
        'activityData.fossilFuels.liquid.lubricants',
        'activityData.fossilFuels.liquid.petroleumCoke',
        'activityData.fossilFuels.liquid.petrochemicalFeedstock',
        'activityData.fossilFuels.liquid.otherOils',
        'activityData.fossilFuels.gas.refineryGas'
      ];
      
      // 检查是否是已弃用的字段
      if (deprecatedFields.includes(dbPath)) {
        rowErrors.push(`列 '${fileColumn}' 映射到的字段 '${dbPath}' 已被弃用，请使用其他字段。`);
        continue;
      }
      
      // 检查数据库路径是否存在于 CarbonData Schema 中
      if (!schemaPaths.includes(dbPath) && !dbPath.startsWith('activityData.')) {
        rowErrors.push(`列 '${fileColumn}' 映射到的数据库字段 '${dbPath}' 无效。`);
        continue;
      }

      // 单位转换函数
      const convertUnit = (val, fileColumn, dbPath) => {
        if (val === '' || val === null || val === undefined) return null;
        
        const numValue = parseFloat(val);
        if (isNaN(numValue)) return null;
        
        // 电消费量：kWh -> 10^4 kWh
        if (fileColumn.includes('电消费量') && fileColumn.includes('千瓦时')) {
          return numValue / 10000;
        }
        
        // 天然气消费量：m³ -> 10^4 m³
        if (fileColumn.includes('天然气消费量') && fileColumn.includes('立方米')) {
          return numValue / 10000;
        }
        
        // 汽油消费量：升 -> 千克（密度约 0.75 kg/L）
        if (fileColumn.includes('汽油消费量') && fileColumn.includes('升')) {
          return numValue * 0.75;
        }
        
        // 柴油消费量：升 -> 千克（密度约 0.85 kg/L）
        if (fileColumn.includes('柴油消费量') && fileColumn.includes('升')) {
          return numValue * 0.85;
        }
        
        // 液化石油气：千克 -> 吨
        if (fileColumn.includes('液化石油气') && fileColumn.includes('千克')) {
          return numValue / 1000;
        }
        
        return numValue; // 其他情况直接返回数值
      };
      
      // 尝试将值设置到嵌套对象中
      const pathParts = dbPath.split('.');
      let current = newCarbonData;
      for (let j = 0; j < pathParts.length; j++) {
        const part = pathParts[j];
        if (j === pathParts.length - 1) {
          // 最终字段赋值和基本类型校验
          const schemaType = CarbonData.schema.path(dbPath);
          if (schemaType && schemaType.instance === 'Number') {
            // 进行单位转换
            const convertedValue = convertUnit(value, fileColumn, dbPath);
            if (convertedValue === null) {
              if (value !== '' && value !== null && value !== undefined) {
                rowErrors.push(`行 ${i + 1}, 列 '${fileColumn}' ('${value}') 不是有效的数字。`);
              }
            } else {
              current[part] = convertedValue;
            }
          } else if (schemaType && schemaType.instance === 'String') {
            current[part] = String(value);
          } else if (schemaType && schemaType.instance === 'Date') {
            const dateValue = new Date(value);
            if (isNaN(dateValue.getTime())) {
              rowErrors.push(`行 ${i + 1}, 列 '${fileColumn}' ('${value}') 不是有效的日期格式。`);
            } else {
              current[part] = dateValue;
            }
          } else {
            current[part] = value; // 默认赋值
          }
        } else {
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }
      }
    }

    // 设置年份：优先使用默认年份（从文件名提取），如果没有则报错
    if (!newCarbonData.year) {
      if (defaultYear) {
        newCarbonData.year = defaultYear;
      } else {
        rowErrors.push(`行 ${i + 1}, '年份' 为必填项。`);
      }
    }
    if (!newCarbonData.regionCode) {
      rowErrors.push(`行 ${i + 1}, '行政区划代码' 为必填项。`);
    }

    if (rowErrors.length > 0) {
      errors.push({ row: i + 1, messages: rowErrors });
    } else {
      // 计算排放量
      try {
        newCarbonData.calculatedEmissions = await calculateEmissions(newCarbonData.activityData);
        mappedData.push(newCarbonData);
      } catch (calcError) {
        errors.push({ row: i + 1, messages: [`计算排放量失败: ${calcError.message}`] });
      }
    }
  }
  return { mappedData, errors };
};


exports.uploadData = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: '没有文件被上传。' });
  }

  const { templateId } = req.body; // 从请求体中获取映射模板ID
  if (!templateId) {
    return res.status(400).json({ message: '请提供数据映射模板ID。' });
  }

  const mappingTemplate = await DataMappingTemplate.findById(templateId);
  if (!mappingTemplate || mappingTemplate.account.toString() !== req.user.id) {
    return res.status(404).json({ message: '未找到或无权访问该映射模板。' });
  }

  const uploadedFiles = req.files;
  const overallResults = [];
  const overallErrors = [];

  for (const file of uploadedFiles) {
    try {
      let rawData;
      if (file.mimetype === 'text/csv') {
        rawData = await parseCsv(file.buffer);
      } else if (
        file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel'
      ) {
        rawData = parseXlsx(file.buffer);
      } else {
        throw new Error('不支持的文件类型。');
      }

      // 从文件名提取年份（例如：呼和浩特2024年1月.xls -> 2024）
      const extractYearFromFilename = (filename) => {
        const yearMatch = filename.match(/(\d{4})年/);
        return yearMatch ? parseInt(yearMatch[1]) : null;
      };
      
      const extractedYear = extractYearFromFilename(file.originalname);
      
      // 映射和校验数据
      const { mappedData, errors } = await mapAndValidateData(rawData, mappingTemplate, req.user.id, extractedYear);

      if (errors.length > 0) {
        overallErrors.push({
          filename: file.originalname,
          message: '文件包含错误，部分数据未能导入。',
          errors: errors,
        });
      }

      if (mappedData.length > 0) {
        // 批量插入有效数据
        const insertResult = await CarbonData.insertMany(mappedData, { ordered: false });
        overallResults.push({
          filename: file.originalname,
          status: 'success',
          insertedCount: insertResult.length,
          failedCount: errors.length,
          errors: errors,
        });
      } else {
        overallErrors.push({
          filename: file.originalname,
          message: '文件中的所有数据都包含错误，未能导入任何记录。',
          errors: errors,
        });
      }

    } catch (error) {
      overallErrors.push({
        filename: file.originalname,
        status: 'failed',
        message: error.message,
      });
    }
  }

  if (overallErrors.length > 0) {
    return res.status(200).json({ // 即使有错误也返回 200，但提供详细错误报告
      message: '部分或所有文件处理完成，但存在错误。',
      results: overallResults,
      errors: overallErrors,
    });
  }

  res.status(200).json({
    message: '所有文件处理成功并导入数据库。',
    results: overallResults,
  });
};
