const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { checkPermission, checkProfileUpdatePermission } = require('../middleware/permissions');
const { PERMISSIONS } = require('../config/permissions');

// Import controller
const { login, register, getAllUsers, updateUserRole, deleteUser, updateUserProfile } = require('../controllers/auth');

// Define routes
router.post('/login', login);
router.post('/register', register); // Optional: for creating accounts
router.get('/users', protect, checkPermission(PERMISSIONS.USERS_READ), getAllUsers);
router.put('/users/:id/role', protect, checkPermission(PERMISSIONS.USERS_WRITE), updateUserRole);
// 个人资料：本人可更新（含机构用户），管理员需 USERS_WRITE 才能更新他人
router.put('/users/:id/profile', protect, checkProfileUpdatePermission, updateUserProfile);
router.delete('/users/:id', protect, checkPermission(PERMISSIONS.USERS_WRITE), deleteUser);


module.exports = router;
