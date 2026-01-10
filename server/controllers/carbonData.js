const CarbonData = require('../models/CarbonData');
const { calculateEmissions } = require('../utils/calculationEngine');
const { getRegionFullNameByCode } = require('../utils/regionData');

// @desc    Submit carbon data
// @route   POST /api/carbon-data
// @access  Private
exports.submitData = async (req, res, next) => {
  try {
    let { year, regionCode, activityData } = req.body;

    // If not root user, enforce regionCode from user's registered region
    if (req.user.email !== 'root@root.com' && req.user.region) {
      regionCode = req.user.region;
    }

    // Basic validation
    if (!year || !regionCode || !activityData) {
      return res.status(400).json({ success: false, error: 'Missing required fields: year, regionCode, activityData' });
    }
    if (!activityData.fossilFuels || !activityData.indirectEmissions || !activityData.intensityMetrics) {
       return res.status(400).json({ success: false, error: 'activityData must contain fossilFuels, indirectEmissions, and intensityMetrics' });
    }

    // Calculate emissions using the engine (await the async function)
    const calculatedEmissions = await calculateEmissions(activityData);

    // Find and update/create record to prevent duplicates for the same year and region
    const query = { account: req.user.id, year: year, regionCode: regionCode };
    const update = {
      regionCode,
      activityData,
      calculatedEmissions
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

// @desc    Get carbon data for the logged-in user (or all data if no auth)
// @route   GET /api/carbon-data
// @access  Private/Public (optional auth)
exports.getData = async (req, res, next) => {
  try {
    const { year, regionCode } = req.query;
    let query = {};
    
    // 如果已认证且不是 root 用户，则只查询自己的数据
    if (req.user && req.user.email !== 'root@root.com') {
      query.account = req.user.id;
    }
    // 如果没有认证，查询所有数据（移动端公开访问）

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
      .populate('account', 'unitName') // Populate the unit name
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

    // Make sure user is the owner of the data, or user is root
    if (data.account.toString() !== req.user.id && req.user.email !== 'root@root.com') {
      return res.status(401).json({ success: false, error: 'Not authorized to update this data' });
    }

    const { year, regionCode, activityData } = req.body;

    // Basic validation
    if (!year || !regionCode || !activityData) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Recalculate emissions
    const calculatedEmissions = calculateEmissions(activityData);

    // Prepare the update object
    const updateFields = {
      year,
      regionCode,
      activityData,
      calculatedEmissions
    };

    data = await CarbonData.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ success: true, data: data });

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

    // Make sure user is the owner of the data, or user is root
    if (data.account.toString() !== req.user.id && req.user.email !== 'root@root.com') {
      return res.status(401).json({ success: false, error: 'Not authorized to delete this data' });
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
    const data = await CarbonData.findOne({ 
      account: req.user.id, 
      year: req.params.year 
    });

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
      .populate('account', 'unitName') // Populate the unit name
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
