const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload');
const { protect, authorize } = require('../middleware/auth');
const multer = require('multer');

// 配置 multer 用于文件上传
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB 文件大小限制
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('只允许上传 CSV 或 Excel 文件！'), false);
    }
  }
});

// 保护上传路由，只有登录用户可以访问
router.post('/data', protect, upload.array('files'), uploadController.uploadData);

module.exports = router;
