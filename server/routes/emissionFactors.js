const express = require('express');
const router = express.Router();
const emissionFactorsController = require('../controllers/emissionFactors');
const { protect, authorize } = require('../middleware/auth'); // 假设有认证和授权中间件

// 获取所有排放因子 (所有登录用户可访问)
router.get('/', protect, emissionFactorsController.getAllFactors);

// 初始化排放因子（从硬编码文件导入到数据库）- 需要管理员权限，放在 /:id 之前
router.post('/initialize', protect, authorize('admin'), emissionFactorsController.initializeFactors);

// 迁移新系统的排放因子数据 - 需要管理员权限，放在 /:id 之前
router.post('/migrate', protect, authorize('admin'), emissionFactorsController.migrateNewSystemFactors);

// 以下路由需要管理员权限
router.use(protect);
router.use(authorize('admin'));

// 根据ID获取单个排放因子
router.get('/:id', emissionFactorsController.getFactorById);

// 创建新的排放因子
router.post('/', emissionFactorsController.createFactor);

// 更新现有排放因子
router.put('/:id', emissionFactorsController.updateFactor);

// 删除排放因子
router.delete('/:id', emissionFactorsController.deleteFactor);

module.exports = router;
