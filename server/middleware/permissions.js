const { rolePermissions, PERMISSIONS } = require('../config/permissions');

// 更新个人资料：本人可更新自己的资料，或拥有 USERS_WRITE 的管理员可更新他人资料
const checkProfileUpdatePermission = (req, res, next) => {
  const user = req.user;
  const targetId = req.params.id;

  if (!user || !user.role) {
    return res.status(401).json({ message: '喵~ 身份不明，禁止入内！' });
  }

  // 用户更新自己的资料：仅需登录即可，不要求 USERS_WRITE（机构用户可更新自己的账号信息）
  if (user._id.toString() === targetId) {
    return next();
  }

  // 更新他人资料：需要 USERS_WRITE 权限
  let userRole = user.role;
  if (userRole === 'editor') userRole = 'organization_user';
  else if (userRole === 'admin') userRole = 'province_admin';
  else if (userRole === 'viewer') userRole = 'organization_user';

  const userPermissions = rolePermissions[userRole];
  if (userPermissions && userPermissions.includes(PERMISSIONS.USERS_WRITE)) {
    return next();
  }

  return res.status(403).json({ message: '喵呜！权限不足，这个你不能碰哦！' });
};

// 这是一个高阶函数，它接收一个"所需权限"作为参数，
// 然后返回一个真正的 Express 中间件函数。
const checkPermission = (requiredPermission) => {
    return (req, res, next) => {
        // **前提**: 你的认证中间件已验证了 token，并将用户信息挂载到了 req.user
        const user = req.user;

        if (!user || !user.role) {
            return res.status(401).json({ message: '喵~ 身份不明，禁止入内！' });
        }

        // 兼容性处理：如果用户是旧角色，临时映射到新角色（实际升级在登录时完成）
        let userRole = user.role;
        if (userRole === 'editor') {
            userRole = 'organization_user';
        } else if (userRole === 'admin') {
            userRole = 'province_admin';
        } else if (userRole === 'viewer') {
            userRole = 'organization_user';
        }

        // 从配置中获取当前用户角色所拥有的所有权限
        const userPermissions = rolePermissions[userRole];

        // 检查用户的权限列表里，是否包含当前路由所要求的权限
        if (userPermissions && userPermissions.includes(requiredPermission)) {
            // 拥有权限，放行！
            return next();
        } else {
            // 没有权限，拦截！
            return res.status(403).json({ message: '喵呜！权限不足，这个你不能碰哦！' });
        }
    };
};

module.exports = { checkPermission, checkProfileUpdatePermission };
