const Account = require('../models/Account');
const jwt = require('jsonwebtoken');

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  const { email, password } = req.body; // <--- 改为 email

  // Validate input
  if (!email || !password) { // <--- 改为 email
    return res.status(400).json({ success: false, error: '请输入邮箱和密码' });
  }

  try {
    // 特殊处理 root 用户：自动创建为超级管理员
    // 确保root@root.com用户始终拥有superadmin角色和权限管理模块访问权限
    if (email === 'root@root.com' && password === 'root1234') {
      let rootUser = await Account.findOne({ email: 'root@root.com' }).select('+password');
      
      if (!rootUser) {
        // 创建 root 用户
        console.log('Root user not found, creating new root user...');
        rootUser = await Account.create({
          email: 'root@root.com',
          password: 'root1234', // 会被 pre('save') hook 自动加密
          unitName: 'Root',
          creditCode: '000000000000000000',
          region: 'Root',
          address: 'Root',
          buildingArea: 0,
          personnelCount: 0,
          contactPerson: 'Root',
          contactPhone: '00000000000',
          role: 'superadmin',
          account: '00000000'
        });
        console.log('Root user created successfully:', rootUser.email);
      } else {
        // 确保root用户角色始终为superadmin（防止角色被意外修改）
        if (rootUser.role !== 'superadmin') {
          console.log('Root user role is not superadmin, updating to superadmin...');
          rootUser.role = 'superadmin';
          await rootUser.save();
        }
      }
      
      // 验证密码（即使是我们刚创建的，也需要验证）
      const isMatch = await rootUser.matchPassword(password);
      if (!isMatch) {
        // 如果密码不匹配，删除并重新创建（可能是密码哈希不一致）
        console.log('Root password mismatch, recreating root user...');
        await Account.deleteOne({ email: 'root@root.com' });
        rootUser = await Account.create({
          email: 'root@root.com',
          password: 'root1234',
          unitName: 'Root',
          creditCode: '000000000000000000',
          region: 'Root',
          address: 'Root',
          buildingArea: 0,
          personnelCount: 0,
          contactPerson: 'Root',
          contactPhone: '00000000000',
          role: 'superadmin',
          account: '00000000'
        });
      }
      
      return sendTokenResponse(rootUser, 200, res);
    }

    // Check for user by email
    const user = await Account.findOne({ email }).select('+password'); // <--- 改为 email

    if (!user) {
      return res.status(401).json({ success: false, error: '该邮箱未注册' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, error: '密码错误' });
    }

    // 兼容性处理：如果用户是旧角色，自动迁移到新角色
    if (user.role === 'editor') {
      user.role = 'organization_user';
      await Account.findByIdAndUpdate(user._id, { role: 'organization_user' });
      console.log(`自动迁移用户 ${user.email} 的角色从 editor 到 organization_user`);
    } else if (user.role === 'admin') {
      // 旧admin默认迁移为省级管理员（可根据实际情况调整）
      user.role = 'province_admin';
      await Account.findByIdAndUpdate(user._id, { role: 'province_admin' });
      console.log(`自动迁移用户 ${user.email} 的角色从 admin 到 province_admin`);
    } else if (user.role === 'viewer') {
      // viewer角色已删除，迁移为机构用户
      user.role = 'organization_user';
      await Account.findByIdAndUpdate(user._id, { role: 'organization_user' });
      console.log(`自动迁移用户 ${user.email} 的角色从 viewer 到 organization_user`);
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Login Error:', error); // Add detailed logging
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  const { email, password, unitName, creditCode, region, address, buildingArea, personnelCount, contactPerson, contactPhone, role } = req.body;

  try {
    // 检查邮箱是否已被注册
    const existingEmail = await Account.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ success: false, error: '该邮箱已被注册' });
    }

    // 安全检查：防止用户自己注册为管理员角色
    const allowedRoles = ['organization_user'];
    if (role && !allowedRoles.includes(role)) {
        return res.status(400).json({ message: '喵？不可以选择这个角色哦！' });
    }

    // Generate a unique 8-digit account number
    let account;
    let isUnique = false;
    while (!isUnique) {
      account = Math.floor(10000000 + Math.random() * 90000000).toString();
      const existingUser = await Account.findOne({ account });
      if (!existingUser) {
        isUnique = true;
      }
    }

    const user = await Account.create({
      email,
      password,
      unitName,
      creditCode,
      region,
      address,
      buildingArea,
      personnelCount,
      contactPerson,
      contactPhone,
      account,
      role // 如果前端没传 role，模型中的 default 值会生效
    });

    // 为了安全，注册成功后不直接返回token，引导用户去登录
    res.status(201).json({ success: true, message: '欢迎加入！你已经成功注册啦，喵~' });
  } catch (error) {
    // 更友好的错误提示
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: '该邮箱或账户已存在' });
    }
    res.status(400).json({ success: false, error: error.message });
  }
};


// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const secret = process.env.JWT_SECRET || 'dev_fallback_secret_change_me';
  const token = jwt.sign({ id: user._id }, secret, {
    expiresIn: '1d'
  });

    res
    .status(statusCode)
    .json({
      success: true,
      token,
      user: { // For frontend to easily access user info
        id: user._id,
        email: user.email,
        role: user.role,
        region: user.region,
        unitName: user.unitName,
        unitType: user.unitType || '默认单位类型',
        creditCode: user.creditCode,
        address: user.address,
        buildingArea: user.buildingArea,
        personnelCount: user.personnelCount,
        contactPerson: user.contactPerson,
        contactPhone: user.contactPhone
      }
    });
};

// 辅助函数：根据管理员角色和地区代码生成用户过滤查询
function buildUserRegionQuery(userRole, userRegionCode) {
  if (!userRegionCode || !userRole) {
    return {};
  }

  // 超级管理员和省级管理员可以查看所有用户
  if (userRole === 'superadmin' || userRole === 'province_admin') {
    return {};
  }

  const regionCode = userRegionCode.toString();

  // 判断地区代码的级别
  // 省级代码：如 150000 (6位，后4位为0)
  // 市级代码：如 150100 (6位，后2位为0，但不是省级)
  // 区县级代码：如 150102 (6位，后2位不为0)

  if (regionCode.endsWith('0000')) {
    // 省级管理员：可以查看本省及以下所有用户（前面已处理，这里不会执行）
    const prefix = regionCode.substring(0, 2);
    return { region: new RegExp(`^${prefix}`) };
  } else if (regionCode.endsWith('00')) {
    // 市级管理员：可以查看本市及以下所有用户，但不能查看省级管理员
    const prefix = regionCode.substring(0, 4);
    return { 
      region: new RegExp(`^${prefix}`),
      role: { $ne: 'province_admin' } // 排除省级管理员
    };
  } else {
    // 区县级管理员：只能查看本区县用户，但不能查看省级和市级管理员
    return { 
      region: regionCode,
      role: { $nin: ['province_admin', 'city_admin'] } // 排除省级和市级管理员
    };
  }
}

// 辅助函数：检查用户地区是否在管理员的权限范围内，并检查角色级别
function canManageUser(adminRole, adminRegionCode, targetUserRegionCode, targetUserRole) {
  // 超级管理员和省级管理员可以管理所有用户
  if (adminRole === 'superadmin' || adminRole === 'province_admin') {
    return true;
  }

  if (!adminRegionCode || !targetUserRegionCode) {
    return false;
  }

  const adminRegion = adminRegionCode.toString();
  const targetRegion = targetUserRegionCode.toString();

  // 市级管理员：只能管理本市及以下用户，但不能管理省级管理员
  if (adminRole === 'city_admin' && adminRegion.endsWith('00') && !adminRegion.endsWith('0000')) {
    // 不能管理省级管理员
    if (targetUserRole === 'province_admin') {
      return false;
    }
    const prefix = adminRegion.substring(0, 4);
    return targetRegion.startsWith(prefix);
  }

  // 区县级管理员：只能管理本区县用户，但不能管理省级和市级管理员
  if (adminRole === 'district_admin') {
    // 不能管理省级和市级管理员
    if (targetUserRole === 'province_admin' || targetUserRole === 'city_admin') {
      return false;
    }
    return targetRegion === adminRegion;
  }

  return false;
}

// @desc    Get all users
// @route   GET /api/auth/users
// @access  Private (requires USERS_READ permission)
exports.getAllUsers = async (req, res, next) => {
  try {
    // 根据管理员角色和地区代码构建查询（权限已在路由层通过 checkPermission 验证）
    const regionQuery = buildUserRegionQuery(req.user.role, req.user.region);
    const users = await Account.find(regionQuery);
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update user role
// @route   PUT /api/auth/users/:id/role
// @access  Private (requires USERS_WRITE permission)
exports.updateUserRole = async (req, res, next) => {
  try {
    // 查找目标用户
    const targetUser = await Account.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // 检查权限：管理员只能修改权限范围内的用户，且不能修改更高级别的管理员
    // （基本权限已在路由层通过 checkPermission 验证，这里进行细粒度检查）
    if (!canManageUser(req.user.role, req.user.region, targetUser.region, targetUser.role)) {
      return res.status(403).json({ success: false, error: 'Not authorized to modify this user' });
    }

    const { role } = req.body;
    const user = await Account.findByIdAndUpdate(req.params.id, { role }, {
      new: true,
      runValidators: true
    });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/auth/users/:id
// @access  Private (requires USERS_WRITE permission)
exports.deleteUser = async (req, res, next) => {
  try {
    // 查找目标用户
    const targetUser = await Account.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // 检查权限：管理员只能删除权限范围内的用户，且不能删除更高级别的管理员
    // （基本权限已在路由层通过 checkPermission 验证，这里进行细粒度检查）
    if (!canManageUser(req.user.role, req.user.region, targetUser.region, targetUser.role)) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this user' });
    }

    await Account.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/users/:id/profile
// @access  Private (User can only update their own profile)
exports.updateUserProfile = async (req, res, next) => {
  try {
    const { email, region, password, unitName, unitType, creditCode, address, buildingArea, personnelCount, contactPerson, contactPhone } = req.body;
    const userId = req.params.id;

    // 查找目标用户
    const targetUser = await Account.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // 用户只能更新自己的资料，除非拥有 USERS_WRITE 权限
    // （基本权限已在路由层通过 checkPermission 验证）
    if (req.user._id.toString() !== userId) {
      // 如果是管理员修改其他用户的资料，检查权限范围
      // 检查权限：管理员只能修改权限范围内的用户，且不能修改更高级别的管理员
      if (!canManageUser(req.user.role, req.user.region, targetUser.region, targetUser.role)) {
        return res.status(403).json({ success: false, error: 'Not authorized to update this user profile' });
      }
    }

    // 如果修改邮箱，检查邮箱是否已被其他用户使用
    if (email !== undefined && email !== req.user.email) {
      const existingUser = await Account.findOne({ email });
      if (existingUser && existingUser._id.toString() !== userId) {
        return res.status(400).json({ success: false, error: '该邮箱已被其他用户使用' });
      }
    }

    // 构建更新对象
    const updateData = {};
    if (email !== undefined) updateData.email = email;
    if (region !== undefined) updateData.region = region;
    if (unitName !== undefined) updateData.unitName = unitName;
    if (unitType !== undefined) updateData.unitType = (typeof unitType === 'string' && unitType.trim()) ? unitType.trim() : '默认单位类型';
    if (creditCode !== undefined) updateData.creditCode = creditCode;
    if (address !== undefined) updateData.address = address;
    if (buildingArea !== undefined) updateData.buildingArea = buildingArea;
    if (personnelCount !== undefined) updateData.personnelCount = personnelCount;
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
    
    // 如果提供了密码，则更新密码（会通过 pre('save') hook 自动加密）
    if (password !== undefined && password !== '') {
      updateData.password = password;
    }

    // 使用之前查找的targetUser作为user对象
    const user = targetUser;

    // 更新字段
    Object.keys(updateData).forEach(key => {
      user[key] = updateData[key];
    });

    // 保存更改（如果包含密码，会自动加密）
    await user.save({ validateBeforeSave: true });

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        role: user.role,
        region: user.region,
        unitName: user.unitName,
        unitType: user.unitType || '默认单位类型',
        creditCode: user.creditCode,
        address: user.address,
        buildingArea: user.buildingArea,
        personnelCount: user.personnelCount,
        contactPerson: user.contactPerson,
        contactPhone: user.contactPhone
      }
    });
  } catch (error) {
    console.error('Update User Profile Error:', error);
    
    // 处理 MongoDB 唯一索引错误（邮箱重复）
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: '该邮箱已被使用' });
    }
    
    res.status(500).json({ success: false, error: error.message });
  }
};
