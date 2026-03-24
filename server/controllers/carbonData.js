const CarbonData = require('../models/CarbonData');
const { calculateEmissions } = require('../utils/calculationEngine');
const { getRegionFullNameByCode } = require('../utils/regionData');
const { formSections } = require('../utils/formFields');
const xlsx = require('xlsx');

// 辅助函数：将扁平化的表单数据转换为嵌套结构
function convertFlatToNested(flatData) {
  const nested = {
    fossilFuels: { solid: {}, liquid: {}, gas: {} },
    fugitiveEmissions: { airConditioning: {}, fireSuppression: {} },
    greenSink: { tree: 0, shrub: 0, herb: 0 },
    mobileSources: { fuel: {}, mileage: {} },
    indirectEmissions: {},
    intensityMetrics: {}
  };

  // 遍历所有表单字段定义
  // 兼容：1) 提交数据的 flatKey：fossilFuels.solid.anthracite；2) 批量导入 Excel 的「数据库字段路径」表头：activityData.fossilFuels.solid.anthracite
  formSections.forEach(section => {
    const processFields = (fields) => {
      fields.forEach(field => {
        const fieldPath = field.name; // e.g., ['fossilFuels', 'solid', 'anthracite']
        const flatKey = fieldPath.join('.'); // e.g., 'fossilFuels.solid.anthracite'
        const value = flatData[flatKey] ?? flatData['activityData.' + flatKey];
        
        if (value !== undefined && value !== null && value !== '') {
          // 构建嵌套对象
          let current = nested;
          for (let i = 0; i < fieldPath.length - 1; i++) {
            const key = fieldPath[i];
            if (!current[key]) {
              current[key] = {};
            }
            current = current[key];
          }
          const lastKey = fieldPath[fieldPath.length - 1];
          current[lastKey] = Number(value) || 0;
        }
      });
    };

    if (section.panels) {
      section.panels.forEach(panel => processFields(panel.fields));
    } else if (section.fields) {
      processFields(section.fields);
    }
  });

  return nested;
}

// 将 activityData 归一化为完整结构后再存库（直接编辑、提交、批量导入统一经此「算好」再写入）
// - 按 formSections 补齐 fossilFuels / fugitiveEmissions / indirectEmissions / intensityMetrics 的叶节点，缺省为 0
// - 其余 schema 字段（mobileSources, vehicles, waterConsumption 等）从 existing 保留，避免直接编辑时被冲掉
function ensureActivityDataStructure(activityData, existing) {
  existing = existing || {};
  const inp = activityData || {};
  const res = {};

  const preserveKeys = ['mobileSources', 'vehicles', 'waterConsumption', 'mobileSourcesDetail', 'otherEnergy', 'chargingStations'];
  for (const k of preserveKeys) {
    const fromInp = inp[k] != null && typeof inp[k] === 'object' && !Array.isArray(inp[k]);
    const fromEx = existing[k] != null && typeof existing[k] === 'object' && !Array.isArray(existing[k]);
    res[k] = fromInp ? { ...(fromEx ? existing[k] : {}), ...inp[k] } : (fromEx ? existing[k] : {});
  }

  const setByPath = (obj, path, val) => {
    let cur = obj;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!cur[key] || typeof cur[key] !== 'object') cur[key] = {};
      cur = cur[key];
    }
    cur[path[path.length - 1]] = Number(val) || 0;
  };

  const getByPath = (obj, path) => {
    let cur = obj;
    for (const key of path) {
      cur = cur?.[key];
    }
    return cur;
  };

  formSections.forEach(section => {
    const processFields = (fields) => {
      (fields || []).forEach(field => {
        const path = field?.name;
        if (!Array.isArray(path) || path.length < 2) return;
        const val = getByPath(inp, path) ?? getByPath(existing, path);
        setByPath(res, path, val);
      });
    };
    if (section.panels) {
      (section.panels || []).forEach(p => processFields(p.fields));
    } else {
      processFields(section.fields);
    }
  });

  if (!res.intensityMetrics || typeof res.intensityMetrics !== 'object') {
    res.intensityMetrics = (existing.intensityMetrics && typeof existing.intensityMetrics === 'object') ? existing.intensityMetrics : {};
  }
  if (inp.intensityMetrics && typeof inp.intensityMetrics === 'object') {
    res.intensityMetrics = { ...res.intensityMetrics, ...inp.intensityMetrics };
  }

  return res;
}

// 辅助函数：从批量导入 Excel 中提取行数据（固定模板：第1行为中文说明，第2行为字段名，第3行开始为数据）
function parseBulkImportXlsx(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (!raw || raw.length < 3) {
    throw new Error('批量导入模板格式不正确：需要至少三行（中文说明行、字段名行和数据行）。');
  }

  const headers = raw[1] || [];
  const rows = [];

  for (let i = 2; i < raw.length; i++) {
    const row = raw[i] || [];
    const rowObj = {};
    let hasValue = false;

    headers.forEach((key, idx) => {
      if (!key) return;
      const cell = row[idx];
      if (cell !== '' && cell !== null && cell !== undefined) {
        hasValue = true;
      }
      rowObj[key] = cell;
    });

    if (hasValue) {
      rows.push({ index: i + 1, data: rowObj }); // index 为 Excel 中的实际行号
    }
  }

  return rows;
}

// @desc    Submit carbon data
// @route   POST /api/carbon-data
// @access  Private
exports.submitData = async (req, res, next) => {
  try {
    let { year, regionCode, activityData } = req.body;

    // 如果不是超级管理员且是机构用户，强制使用用户注册时的地区代码
    if (req.user.role !== 'superadmin' && req.user.role === 'organization_user' && req.user.region) {
      regionCode = req.user.region;
    }

    // Basic validation
    if (!year || !regionCode) {
      return res.status(400).json({ success: false, error: 'Missing required fields: year, regionCode' });
    }

    // 如果 activityData 是扁平化的，转换为嵌套结构
    if (activityData && !activityData.fossilFuels) {
      activityData = convertFlatToNested(activityData);
    }

    // 从用户注册信息中自动获取 intensityMetrics（如果前端没有提供）
    if (!activityData.intensityMetrics) {
      activityData.intensityMetrics = {};
    }
    // 如果用户注册信息中有这些字段，使用注册时的值
    if (req.user.buildingArea !== undefined && req.user.buildingArea !== null) {
      activityData.intensityMetrics.buildingArea = req.user.buildingArea;
    }
    if (req.user.personnelCount !== undefined && req.user.personnelCount !== null) {
      activityData.intensityMetrics.personnelCount = req.user.personnelCount;
    }

    // 验证必需字段（intensityMetrics 现在从用户信息中获取，不再要求前端提供）
    if (!activityData || !activityData.fossilFuels || !activityData.indirectEmissions) {
       return res.status(400).json({ success: false, error: 'activityData must contain fossilFuels and indirectEmissions' });
    }

    // 归一化后再存库：补齐结构、叶节点缺省 0，与直接编辑、批量导入一致
    activityData = ensureActivityDataStructure(activityData, {});

    // Calculate emissions using the engine (await the async function)
    const calculatedEmissions = await calculateEmissions(activityData);

    // Find and update/create record to prevent duplicates for the same year and region
    // 当数据年份+区域与已有记录相同时，更新该条记录并更新「修改时间」
    const query = { account: req.user.id, year: year, regionCode: regionCode };
    const now = new Date();
    const update = {
      $set: {
        regionCode,
        activityData,
        calculatedEmissions,
        updatedAt: now
      },
      $setOnInsert: { createdAt: now }
    };
    const options = { upsert: true, new: true, setDefaultsOnInsert: true };

    const data = await CarbonData.findOneAndUpdate(query, update, options);

    res.status(201).json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Submit Data Error:', error); // 详细错误日志
    console.error('Error Stack:', error.stack); // 错误堆栈
    console.error('Request Body:', req.body); // 请求数据
    console.error('User:', req.user); // 用户信息
    
    // 将错误传递给全局错误处理中间件
    next(error);
  }
};

// @desc    Bulk import carbon data from Excel (superadmin only)
// @route   POST /api/carbon-data/bulk-import
// @access  Private (superadmin)
exports.bulkImport = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, error: '只有超级管理员可以执行批量导入。' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: '请上传一个 Excel 文件。' });
    }

    const rows = parseBulkImportXlsx(req.file.buffer);

    if (!rows.length) {
      return res.status(400).json({ success: false, error: 'Excel 中没有可导入的数据行。' });
    }

    const successes = [];
    const errors = [];

    for (const row of rows) {
      const { index, data } = row;

      try {
        const { year, regionCode, ...flatActivity } = data;

        const parsedYear = year ? Number(year) : null;
        const region = regionCode ? String(regionCode).trim() : '';

        if (!parsedYear || !region) {
          errors.push({
            row: index,
            message: '缺少必填字段 year 或 regionCode，已跳过该行。',
          });
          continue;
        }

        // 根据当前定义的表单字段将扁平字段转换为嵌套 activityData
        let activityData = convertFlatToNested(flatActivity);

        if (!activityData.fossilFuels || !activityData.indirectEmissions) {
          errors.push({
            row: index,
            message: 'activityData 中缺少必要的 fossilFuels 或 indirectEmissions 字段，已跳过该行。',
          });
          continue;
        }

        // intensityMetrics：优先使用 Excel 中的值，如果 Excel 中没有提供，则从超级管理员账号配置中继承
        if (!activityData.intensityMetrics) {
          activityData.intensityMetrics = {};
        }
        // 只有在 Excel 中没有提供该字段时，才使用用户信息中的默认值
        if (
          (activityData.intensityMetrics.buildingArea === undefined ||
            activityData.intensityMetrics.buildingArea === null ||
            activityData.intensityMetrics.buildingArea === 0) &&
          req.user.buildingArea !== undefined &&
          req.user.buildingArea !== null
        ) {
          activityData.intensityMetrics.buildingArea = req.user.buildingArea;
        }
        if (
          (activityData.intensityMetrics.personnelCount === undefined ||
            activityData.intensityMetrics.personnelCount === null ||
            activityData.intensityMetrics.personnelCount === 0) &&
          req.user.personnelCount !== undefined &&
          req.user.personnelCount !== null
        ) {
          activityData.intensityMetrics.personnelCount = req.user.personnelCount;
        }

        // 归一化后再存库：与直接编辑、提交数据一致
        activityData = ensureActivityDataStructure(activityData, {});

        const calculatedEmissions = await calculateEmissions(activityData);

        const query = {
          account: req.user.id,
          year: parsedYear,
          regionCode: region,
        };

        const now = new Date();
        const update = {
          $set: {
            regionCode: region,
            activityData,
            calculatedEmissions,
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now },
        };

        const options = { upsert: true, new: true, setDefaultsOnInsert: true };

        const doc = await CarbonData.findOneAndUpdate(query, update, options);
        successes.push({ row: index, id: doc._id });
      } catch (rowError) {
        console.error(`Bulk import row ${row.index} failed:`, rowError);
        errors.push({
          row: row.index,
          message: rowError.message || '未知错误',
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: '批量导入已完成。',
      successCount: successes.length,
      errorCount: errors.length,
      errors,
    });
  } catch (error) {
    console.error('Bulk Import Error:', error);
    next(error);
  }
};

// 辅助函数：根据用户角色和地区代码生成数据过滤查询
// 关键：根据用户角色判断权限范围，而不是根据regionCode的格式
function buildRegionQuery(user, userRegionCode) {
  if (!userRegionCode || !user.role) {
    return {};
  }

  const role = user.role;
  
  // 超级管理员可以查看所有数据，不添加地区过滤
  if (role === 'superadmin') {
    return {};
  }
  
  // 机构用户只能查看本机构的数据（通过account过滤，不在regionCode层面过滤）
  if (role === 'organization_user') {
    return {}; // account过滤会在外层添加
  }
  
  const regionCode = userRegionCode.toString();
  
  // 根据用户角色判断权限范围，而不是根据regionCode的格式
  // 省级管理员：无论regionCode是什么（可能是区县代码），都可以查看全省数据
  if (role === 'province_admin') {
    // 从regionCode中提取省份代码（前2位）
    const provincePrefix = regionCode.substring(0, 2);
    return { regionCode: new RegExp(`^${provincePrefix}`) };
  }
  
  // 市级管理员：无论regionCode是什么（可能是区县代码），都可以查看全市数据
  if (role === 'city_admin') {
    // 从regionCode中提取城市代码（前4位）
    const cityPrefix = regionCode.substring(0, 4);
    return { regionCode: new RegExp(`^${cityPrefix}`) };
  }
  
  // 区县级管理员：只能查看本区县数据
  if (role === 'district_admin') {
    return { regionCode: regionCode };
  }
  
  // 默认情况：不添加过滤（应该不会到这里）
  return {};
}

// @desc    Get single carbon data entry by ID（直接编辑时按 id 拉取完整 activityData，解决机构用户列表可能未带全的问题）
// @route   GET /api/carbon-data/by-id/:id
// @access  Private
exports.getDataById = async (req, res, next) => {
  try {
    const data = await CarbonData.findById(req.params.id).lean();

    if (!data) {
      return res.status(404).json({ success: false, error: 'No data found' });
    }

    if (req.user.role === 'organization_user') {
      const accountId = (data.account != null && typeof data.account.toString === 'function')
        ? data.account.toString()
        : String(data.account || '');
      const userId = (req.user._id && typeof req.user._id.toString === 'function')
        ? req.user._id.toString()
        : (req.user.id != null ? String(req.user.id) : '');
      if (userId && accountId !== userId) {
        return res.status(403).json({ success: false, error: 'Not authorized to access this data' });
      }
    } else if (req.user.role !== 'superadmin') {
      const regionQuery = buildRegionQuery(req.user, req.user.region);
      if (regionQuery.regionCode) {
        const re = regionQuery.regionCode;
        const ok = typeof re.test === 'function' ? re.test(data.regionCode) : (re === data.regionCode);
        if (!ok) {
          return res.status(403).json({ success: false, error: 'Not authorized to access this data' });
        }
      }
    }

    const regionName = getRegionFullNameByCode(data.regionCode) || '未知区域';
    res.status(200).json({ success: true, data: { ...data, regionName } });
  } catch (error) {
    next(error);
  }
};

// @desc    Get carbon data for the logged-in user
// @route   GET /api/carbon-data
// @access  Private (requires authentication)
exports.getData = async (req, res, next) => {
  try {
    const { year, regionCode, page, limit } = req.query;
    let query = {};
    
    // 根据用户角色和权限过滤数据
    const userRole = req.user.role;
    
    // 超级管理员可以查看所有数据
    if (userRole === 'superadmin') {
      // 不添加account过滤
    } else if (userRole === 'organization_user') {
      // 机构用户只能查看本机构的数据
      query.account = req.user.id;
    } else {
      // 管理员角色根据地区过滤
      const regionQuery = buildRegionQuery(req.user, req.user.region);
      Object.assign(query, regionQuery);
    }

    if (year) {
      query.year = year;
    }
    
    // 如果查询参数中指定了regionCode，则使用查询参数的regionCode（优先于用户地区过滤）
    if (regionCode) {
      // If the region code is for a city (e.g., '150100' for Hohhot),
      // we should match all districts under it.
      // City codes end with '00', district codes do not.
      if (regionCode.endsWith('0000')) { // Province-level
        const prefix = regionCode.substring(0, 2);
        query.regionCode = new RegExp(`^${prefix}`);
      } else if (regionCode.endsWith('00')) { // City-level
        const prefix = regionCode.substring(0, 4);
        query.regionCode = new RegExp(`^${prefix}`);
      } else { // District-level
        query.regionCode = regionCode;
      }
    }

    // 分页参数
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    const skip = (pageNum - 1) * limitNum;

    // 先获取总数（用于分页）
    const total = await CarbonData.countDocuments(query);

    // 获取分页数据（返回完整文档含 activityData，供 TableRowDetail 详情与 InlineEditForm 直接编辑使用；勿使用 .select('-activityData')）
    const dbData = await CarbonData.find(query)
      .populate('account', 'unitName unitType') // Populate the unit name and unit type (for benchmark chart)
      .sort({ createdAt: -1 }) // 提交晚的放上面
      .skip(skip)
      .limit(limitNum)
      .lean(); // Use .lean() for faster queries when we're just reading data

    const dataWithRegionName = dbData.map(item => ({
      ...item,
      regionName: getRegionFullNameByCode(item.regionCode) || '未知区域'
    }));

    res.status(200).json({
      success: true,
      count: dataWithRegionName.length,
      total: total, // 返回总数用于分页
      page: pageNum,
      limit: limitNum,
      data: dataWithRegionName
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Update single carbon data entry by ID
// @route   PUT /api/carbon-data/:id
// @access  Private
exports.updateDataById = async (req, res, next) => {
  try {
    let data = await CarbonData.findById(req.params.id);

    if (!data) {
      return res.status(404).json({ success: false, error: 'No data found' });
    }

    // 检查权限：机构用户只能更新自己的数据，管理员和超级管理员可以更新权限范围内的数据
    if (req.user.role === 'organization_user') {
      // 机构用户只能更新自己的数据
      if (data.account.toString() !== req.user.id) {
        return res.status(401).json({ success: false, error: 'Not authorized to update this data' });
      }
    } else if (req.user.role === 'superadmin') {
      // 超级管理员可以更新所有数据
      // 不添加限制
    } else {
      // 管理员角色需要检查数据是否在其权限范围内
      const regionQuery = buildRegionQuery(req.user, req.user.region);
      // 检查数据的regionCode是否符合权限范围
      if (regionQuery.regionCode) {
        const regex = regionQuery.regionCode;
        if (!regex.test(data.regionCode)) {
          return res.status(401).json({ success: false, error: 'Not authorized to update this data' });
        }
      }
    }

    let { year, regionCode, activityData } = req.body;

    // 如果不是超级管理员且是机构用户，强制使用用户注册时的地区代码
    if (req.user.role !== 'superadmin' && req.user.role === 'organization_user' && req.user.region) {
      regionCode = req.user.region;
    }

    // Basic validation
    if (!year || !regionCode) {
      return res.status(400).json({ success: false, error: 'Missing required fields: year, regionCode' });
    }

    // 如果 activityData 是扁平化的，转换为嵌套结构
    if (activityData && !activityData.fossilFuels) {
      activityData = convertFlatToNested(activityData);
    }

    // 归一化后再存库：按 formSections 补齐结构，并保留 existing 的 mobileSources、vehicles 等（直接编辑不修改的字段）
    activityData = ensureActivityDataStructure(activityData, data.activityData || {});

    // 从用户注册信息中自动获取 intensityMetrics（如果前端没有提供）
    if (!activityData.intensityMetrics) {
      activityData.intensityMetrics = {};
    }
    // 如果用户注册信息中有这些字段，使用注册时的值
    if (req.user.buildingArea !== undefined && req.user.buildingArea !== null) {
      activityData.intensityMetrics.buildingArea = req.user.buildingArea;
    }
    if (req.user.personnelCount !== undefined && req.user.personnelCount !== null) {
      activityData.intensityMetrics.personnelCount = req.user.personnelCount;
    }

    // Recalculate emissions
    const calculatedEmissions = await calculateEmissions(activityData);

    // Prepare the update object（含修改时间，供历史记录「修改时间」列显示）
    const updateFields = {
      year,
      regionCode,
      activityData,
      calculatedEmissions,
      updatedAt: new Date()
    };

    data = await CarbonData.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true
    }).populate('account', 'unitName unitType').lean();

    // 添加regionName，与getData接口保持一致
    const dataWithRegionName = {
      ...data,
      regionName: getRegionFullNameByCode(data.regionCode) || '未知区域'
    };

    res.status(200).json({ success: true, data: dataWithRegionName });

  } catch (error) {
    console.error('Update Error:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Delete single carbon data entry by ID
// @route   DELETE /api/carbon-data/:id
// @access  Private
exports.deleteDataById = async (req, res, next) => {
  try {
    const data = await CarbonData.findById(req.params.id);

    if (!data) {
      return res.status(404).json({ success: false, error: 'No data found' });
    }

    // 检查权限：机构用户只能删除自己的数据，管理员和超级管理员可以删除权限范围内的数据
    if (req.user.role === 'organization_user') {
      // 机构用户只能删除自己的数据
      if (data.account.toString() !== req.user.id) {
        return res.status(401).json({ success: false, error: 'Not authorized to delete this data' });
      }
    } else if (req.user.role === 'superadmin') {
      // 超级管理员可以删除所有数据
      // 不添加限制
    } else {
      // 管理员角色需要检查数据是否在其权限范围内
      const regionQuery = buildRegionQuery(req.user, req.user.region);
      // 检查数据的regionCode是否符合权限范围
      if (regionQuery.regionCode) {
        const regex = regionQuery.regionCode;
        if (!regex.test(data.regionCode)) {
          return res.status(401).json({ success: false, error: 'Not authorized to delete this data' });
        }
      }
    }

    // Use findByIdAndDelete instead of .remove()
    await CarbonData.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    console.error('Delete Error:', error); // Log the actual error
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get single carbon data entry by year for the logged-in user
// @route   GET /api/carbon-data/:year
// @access  Private
exports.getDataByYear = async (req, res, next) => {
  try {
    let query = { year: req.params.year };
    
    // 机构用户只能查看自己的数据
    if (req.user.role === 'organization_user') {
      query.account = req.user.id;
    } else if (req.user.role !== 'superadmin') {
      // 管理员角色根据地区过滤
      const regionQuery = buildRegionQuery(req.user, req.user.region);
      Object.assign(query, regionQuery);
    }
    // 超级管理员不添加过滤条件

    const data = await CarbonData.findOne(query);

    if (!data) {
      // It's not an error if no data exists for a year, just return success: false
      return res.status(200).json({ success: false, data: null });
    }

    res.status(200).json({
      success: true,
      data: data
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get carbon data for mobile app (public read-only access)
// @route   GET /api/mobile/carbon-data
// @access  Public
exports.getMobileData = async (req, res, next) => {
  try {
    const { year, regionCode } = req.query;
    let query = {};

    if (year) {
      query.year = year;
    }
    if (regionCode) {
      // If the region code is for a city (e.g., '150100' for Hohhot),
      // we should match all districts under it.
      // City codes end with '00', district codes do not.
      if (regionCode.endsWith('0000')) { // Province-level
        const prefix = regionCode.substring(0, 2);
        query.regionCode = new RegExp(`^${prefix}`);
      } else if (regionCode.endsWith('00')) { // City-level
        const prefix = regionCode.substring(0, 4);
        query.regionCode = new RegExp(`^${prefix}`);
      } else { // District-level
        query.regionCode = regionCode;
      }
    }

    const dbData = await CarbonData.find(query)
      .populate('account', 'unitName unitType') // Populate the unit name and unit type (for benchmark chart)
      .sort({ year: -1 })
      .lean(); // Use .lean() for faster queries when we're just reading data

    const dataWithRegionName = dbData.map(item => ({
      ...item,
      regionName: getRegionFullNameByCode(item.regionCode) || '未知区域'
    }));

    res.status(200).json({
      success: true,
      count: dataWithRegionName.length,
      data: dataWithRegionName
    });
  } catch (error) {
    console.error('Mobile Data Error:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
