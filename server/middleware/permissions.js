const { rolePermissions } = require('../config/permissions');

// 这是一个高阶函数，它接收一个“所需权限”作为参数，
// 然后返回一个真正的 Express 中间件函数。
const checkPermission = (requiredPermission) => {
    return (req, res, next) => {
        // **前提**: 你的认证中间件已验证了 token，并将用户信息挂载到了 req.user
        const user = req.user;

        if (!user || !user.role) {
            return res.status(401).json({ message: '喵~ 身份不明，禁止入内！' });
        }

        // 从配置中获取当前用户角色所拥有的所有权限
        const userPermissions = rolePermissions[user.role];

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

module.exports = { checkPermission };
