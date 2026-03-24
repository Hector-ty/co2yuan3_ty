const express = require('express');
const router = express.Router();
const { submitData, getData, getDataById, getDataByYear, deleteDataById, updateDataById, bulkImport } = require('../controllers/carbonData');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { PERMISSIONS } = require('../config/permissions');
const multer = require('multer');

// 配置 multer 用于批量导入 Excel
const upload = multer({
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB 文件大小限制
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel'
    ) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传 Excel (.xlsx/.xls) 文件！'), false);
    }
  },
});

// POST route to submit data
router.post('/', protect, checkPermission(PERMISSIONS.CARBON_DATA_CREATE), submitData);

// POST route for bulk import (superadmin only, but仍然复用创建权限)
router.post(
  '/bulk-import',
  protect,
  checkPermission(PERMISSIONS.CARBON_DATA_CREATE),
  upload.single('file'),
  bulkImport
);

// GET route to fetch all data (requires authentication)
router.get('/', protect, checkPermission(PERMISSIONS.CARBON_DATA_READ), getData);

// GET 按 id 拉取单条（直接编辑用，须在 /:year 之前）
router.get('/by-id/:id', protect, checkPermission(PERMISSIONS.CARBON_DATA_READ), getDataById);

// GET route to fetch single data entry by year
router.get('/:year', protect, checkPermission(PERMISSIONS.CARBON_DATA_READ), getDataByYear);

// PUT route to update a single data entry by its ID
router.put('/:id', protect, checkPermission(PERMISSIONS.CARBON_DATA_UPDATE), updateDataById);

// DELETE route to delete a single data entry by its ID
router.delete('/:id', protect, checkPermission(PERMISSIONS.CARBON_DATA_DELETE), deleteDataById);

module.exports = router;
