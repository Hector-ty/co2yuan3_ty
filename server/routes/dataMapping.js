const express = require('express');
const router = express.Router();
const dataMappingController = require('../controllers/dataMapping');
const { protect, authorize } = require('../middleware/auth');

// 所有数据映射路由都需要登录认证
router.use(protect);

// 获取 CarbonData 数据库字段路径 (所有登录用户可访问)
router.get('/fields', dataMappingController.getCarbonDataFields);

// 获取所有数据映射模板 (所有登录用户可访问自己的模板)
router.get('/', dataMappingController.getAllMappingTemplates);

// 根据ID获取单个数据映射模板 (所有登录用户可访问自己的模板)
router.get('/:id', dataMappingController.getMappingTemplateById);

// 创建新的数据映射模板 (所有登录用户可创建)
router.post('/', dataMappingController.createMappingTemplate);

// 更新现有数据映射模板 (所有登录用户可更新自己的模板)
router.put('/:id', dataMappingController.updateMappingTemplate);

// 删除数据映射模板 (所有登录用户可删除自己的模板)
router.delete('/:id', dataMappingController.deleteMappingTemplate);

module.exports = router;
