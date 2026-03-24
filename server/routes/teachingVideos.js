const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');
const teachingVideosController = require('../controllers/teachingVideos');
const TeachingVideo = require('../models/TeachingVideo');

// 确保上传目录存在（使用绝对路径，避免 Docker/多环境差异）
const uploadDir = path.resolve(__dirname, '..', 'uploads', 'videos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer 用于视频文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const timestamp = Date.now();
    cb(null, `${baseName}-${timestamp}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB 上限，按需调整
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传视频文件'), false);
    }
  },
});

// 获取单个视频文件流（用于播放，需登录）——必须放在 GET / 之前，否则 /:id 可能被误匹配
router.get('/:id/file', protect, async (req, res, next) => {
  try {
    const video = await TeachingVideo.findById(req.params.id);
    if (!video || !video.url) {
      return res.status(404).json({ success: false, error: '视频不存在', code: 'VIDEO_NOT_FOUND' });
    }
    const filename = path.basename(String(video.url).replace(/\\/g, '/'));
    const filePath = path.join(uploadDir, filename);
    const resolvedPath = path.resolve(filePath);
    // 防止路径逃逸：必须落在 uploadDir 内
    if (!resolvedPath.startsWith(path.resolve(uploadDir))) {
      return res.status(400).json({ success: false, error: '非法路径' });
    }
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ success: false, error: '视频文件不存在', code: 'FILE_NOT_FOUND' });
    }
    const ext = path.extname(filename).toLowerCase();
    const mime = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.ogg': 'video/ogg', '.mov': 'video/quicktime' }[ext] || 'video/mp4';
    res.sendFile(resolvedPath, { headers: { 'Content-Type': mime } });
  } catch (err) {
    next(err);
  }
});

// 获取教学视频列表（所有登录用户）
router.get('/', protect, teachingVideosController.getTeachingVideos);

// 上传教学视频（仅超级管理员，在控制器中检查角色）
router.post('/', protect, upload.single('file'), teachingVideosController.createTeachingVideo);

// 修改教学视频（仅超级管理员，在控制器中检查角色）
router.put('/:id', protect, upload.single('file'), teachingVideosController.updateTeachingVideo);

// 删除教学视频（仅超级管理员，在控制器中检查角色）
router.delete('/:id', protect, teachingVideosController.deleteTeachingVideo);

module.exports = router;

