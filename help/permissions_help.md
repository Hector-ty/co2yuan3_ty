# 权限管理功能开发文档

本文档详细说明了为`root`用户实现的权限管理功能，包括后端API和前端组件的实现细节。

---

## 1. 功能概述

为了实现对用户权限的集中管理，我们引入了一个特殊的`root`用户，该用户拥有超级管理员权限，可以查看、编辑和删除系统中的所有其他用户。

- **`root`用户**:
    - **邮箱**: `root@root.com`
    - **密码**: `root1234`
    - 首次使用此凭据登录时，系统会自动在数据库中创建该用户。
- **权限管理页面**:
    - 仅对`root`用户可见，在仪表盘页面以“权限管理”标签页的形式出现。
    - 显示所有非`root`用户的列表，包括邮箱、单位名称、地区和当前角色。
    - `root`用户可以通过下拉菜单更改任何用户的角色（管理员、编辑员、观察员）。
    - `root`用户可以删除任何用户，删除前有二次确认对话框。

---

## 2. 后端实现

### 2.1. `root`用户特殊处理

为了方便部署和初始化，我们没有使用一次性脚本来创建`root`用户，而是在登录逻辑中加入了特殊处理。

- **文件**: `server/controllers/auth.js`
- **函数**: `login`
- **逻辑**:
    - 在函数开头检查登录凭据是否为`root@root.com`和`root1234`。
    - 如果是，则检查数据库中是否存在该用户。
    - 如果不存在，则自动创建该用户，并赋予`admin`角色。
    - 无论用户是否存在，都为其颁发token并成功登录。

### 2.2. 数据访问权限

`root`用户需要能够访问所有用户的数据。我们通过在相关控制器中添加特殊逻辑来实现这一点。

- **文件**: `server/controllers/carbonData.js`
- **逻辑**:
    - 在`getData`函数中，如果当前登录用户是`root@root.com`，则查询时不添加`account: req.user.id`的过滤条件，从而返回所有用户的数据。
    - 在`updateDataById`和`deleteDataById`函数中，跳过所有权检查，允许`root`用户修改或删除任何数据。

### 2.3. 用户管理API

我们添加了三个新的API端点来支持用户管理功能。

- **文件**: `server/routes/auth.js`
- **端点**:
    - `GET /api/auth/users`: 获取所有非`root`用户的列表。
    - `PUT /api/auth/users/:id/role`: 更新指定ID用户的角色。
    - `DELETE /api/auth/users/:id`: 删除指定ID的用户。
- **文件**: `server/controllers/auth.js`
- **函数**:
    - `getAllUsers`: 实现获取用户列表的逻辑。
    - `updateUserRole`: 实现更新用户角色的逻辑。
    - `deleteUser`: 实现删除用户的逻辑。
- **访问控制**:
    - 所有这些端点都受`protect`中间件保护，确保用户已登录。
    - 在每个函数的开头，都检查`req.user.email`是否为`root@root.com`，确保只有`root`用户可以访问这些功能。

---

## 3. 前端实现

### 3.1. 用户管理页面

我们创建了一个新的React组件来作为权限管理的用户界面。

- **文件**: `client/src/pages/UserManagementPage.jsx`
- **功能**:
    - 使用`useEffect`在组件加载时从`/api/auth/users`获取用户列表。
    - 使用MUI的`Table`组件来显示用户数据。
    - 使用`useRegions` hook来获取地区数据，并通过`useMemo`创建一个从地区代码到地区名称的映射，以便在表格中显示可读的地区名称。
    - 为每行用户提供一个`Select`下拉菜单，用于更改用户角色。当值改变时，调用`handleRoleChange`函数，该函数会向`/api/auth/users/:id/role`发送`PUT`请求。
    - 为每行用户提供一个删除按钮。点击按钮会弹出一个MUI的`Dialog`组件作为二次确认。如果用户确认，则调用`handleDeleteConfirm`函数，该函数会向`/api/auth/users/:id`发送`DELETE`请求。

### 3.2. 在仪表盘中集成

我们将用户管理页面作为一个新的标签页集成到主仪表盘中，并确保它只对`root`用户可见。

- **文件**: `client/src/pages/DashboardPage.jsx`
- **逻辑**:
    - 在`useEffect`中，从`localStorage`中读取当前登录的用户信息。
    - 创建一个`isRoot`状态变量，用于检查当前用户的邮箱是否为`root@root.com`。
    - 在渲染`Tabs`组件时，使用条件渲染 `{isRoot && <Tab label="权限管理" />}` 来决定是否显示“权限管理”标签页。
    - 在渲染标签页内容时，同样使用条件渲染 `{activeTab === 4 && isRoot && <UserManagementPage />}` 来加载`UserManagementPage`组件。

### 3.3. 状态管理

为了确保`DashboardPage`能够正确识别`root`用户，我们对登录和登出逻辑进行了改进。

- **文件**: `client/src/pages/LoginPage.jsx`
- **函数**: `handleLogin`
- **逻辑**:
    - 在登录成功后，除了将`token`存入`localStorage`，还将从后端返回的`user`对象也存入`localStorage`。
- **文件**: `client/src/App.jsx`
- **函数**: `handleLogout`
- **逻辑**:
    - 在用户登出时，除了删除`token`，还同时删除`localStorage`中的`user`对象，以防止在下次登录时读取到旧的用户数据。

---

通过以上步骤，我们成功地实现了一个功能完善且安全的权限管理模块，为`root`用户提供了强大的后台管理能力。
