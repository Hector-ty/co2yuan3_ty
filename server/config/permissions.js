// 定义所有可用的角色
const ROLES = {
    ADMIN: 'admin',
    EDITOR: 'editor',
    VIEWER: 'viewer'
};

// 定义所有可用的权限 (推荐格式: 资源:操作)
const PERMISSIONS = {
    USERS_READ: 'users:read',
    USERS_WRITE: 'users:write',
    CARBON_DATA_READ: 'carbonData:read',
    CARBON_DATA_CREATE: 'carbonData:create',
    CARBON_DATA_UPDATE: 'carbonData:update',
    CARBON_DATA_DELETE: 'carbonData:delete',
    REPORTS_GENERATE: 'reports:generate'
};

// 核心！将权限分配给角色
const rolePermissions = {
    [ROLES.ADMIN]: [ /* 管理员拥有所有权限... */
        PERMISSIONS.USERS_READ, PERMISSIONS.USERS_WRITE,
        PERMISSIONS.CARBON_DATA_READ, PERMISSIONS.CARBON_DATA_CREATE,
        PERMISSIONS.CARBON_DATA_UPDATE, PERMISSIONS.CARBON_DATA_DELETE,
        PERMISSIONS.REPORTS_GENERATE
    ],
    [ROLES.EDITOR]: [ /* 编辑员可以读、写、更新碳数据和生成报告 */
        PERMISSIONS.CARBON_DATA_READ, PERMISSIONS.CARBON_DATA_CREATE,
        PERMISSIONS.CARBON_DATA_UPDATE, PERMISSIONS.REPORTS_GENERATE
    ],
    [ROLES.VIEWER]: [ /* 观察员只能读取碳数据和生成报告 */
        PERMISSIONS.CARBON_DATA_READ, PERMISSIONS.REPORTS_GENERATE
    ]
};

module.exports = {
    ROLES,
    PERMISSIONS,
    rolePermissions
};
