const express = require('express');
const router = express.Router();
const emissionFactorsController = require('../controllers/emissionFactors');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { PERMISSIONS } = require('../config/permissions');

// 获取所有排放因子 (所有登录用户可访问)
router.get('/', protect, checkPermission(PERMISSIONS.EMISSION_FACTORS_READ), emissionFactorsController.getAllFactors);

// 初始化排放因子（从硬编码文件导入到数据库）- 需要管理员权限，放在 /:id 之前
router.post('/initialize', protect, checkPermission(PERMISSIONS.EMISSION_FACTORS_WRITE), emissionFactorsController.initializeFactors);

// 迁移新系统的排放因子数据 - 需要管理员权限，放在 /:id 之前
router.post('/migrate', protect, checkPermission(PERMISSIONS.EMISSION_FACTORS_WRITE), emissionFactorsController.migrateNewSystemFactors);

// 批量删除已弃用的排放因子 - 需要管理员权限，放在 /:id 之前
router.post('/delete-deprecated', protect, checkPermission(PERMISSIONS.EMISSION_FACTORS_WRITE), emissionFactorsController.deleteDeprecatedFactors);

// 检查数据库与项目代码的一致性 - 需要管理员权限，放在 /:id 之前
router.get('/check', protect, checkPermission(PERMISSIONS.EMISSION_FACTORS_WRITE), emissionFactorsController.checkFactors);

// 以下路由需要管理员权限
router.use(protect);
router.use(checkPermission(PERMISSIONS.EMISSION_FACTORS_WRITE));

// 根据ID获取单个排放因子
router.get('/:id', emissionFactorsController.getFactorById);

// 创建新的排放因子
router.post('/', emissionFactorsController.createFactor);

// 更新现有排放因子
router.put('/:id', emissionFactorsController.updateFactor);

// 删除排放因子
router.delete('/:id', emissionFactorsController.deleteFactor);

module.exports = router;
