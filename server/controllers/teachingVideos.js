const path = require('path');
const fs = require('fs');
const TeachingVideo = require('../models/TeachingVideo');

const uploadDir = path.resolve(__dirname, '..', 'uploads', 'videos');

// 获取教学视频列表 - 所有登录用户可访问
exports.getTeachingVideos = async (req, res, next) => {
  try {
    const videos = await TeachingVideo.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: videos,
    });
  } catch (err) {
    next(err);
  }
};

// 上传或新增教学视频 - 仅超级管理员
exports.createTeachingVideo = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: '只有超级管理员可以上传教学视频',
      });
    }

    const { title, description } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: '视频标题不能为空',
      });
    }

    // 简化处理：前端应通过 form-data 上传文件，multer 已将文件信息放入 req.file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请上传视频文件',
      });
    }

    // 此处仅使用本地路径作为 URL，实际项目中可以替换为对象存储等
    const videoUrl = `/uploads/videos/${req.file.filename}`;

    const video = await TeachingVideo.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      url: videoUrl,
      originalFilename: req.file.originalname,
      createdBy: user.id,
    });

    res.status(201).json({
      success: true,
      data: video,
    });
  } catch (err) {
    next(err);
  }
};

// 更新教学视频信息或文件 - 仅超级管理员
exports.updateTeachingVideo = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: '只有超级管理员可以修改教学视频',
      });
    }

    const { id } = req.params;
    const { title, description } = req.body;

    const video = await TeachingVideo.findById(id);
    if (!video) {
      return res.status(404).json({
        success: false,
        error: '未找到对应的教学视频',
      });
    }

    if (title && title.trim()) {
      video.title = title.trim();
    }
    if (typeof description === 'string') {
      video.description = description.trim();
    }

    // 如果上传了新文件，则更新 URL
    if (req.file) {
      video.url = `/uploads/videos/${req.file.filename}`;
      video.originalFilename = req.file.originalname;
    }

    await video.save();

    res.json({
      success: true,
      data: video,
    });
  } catch (err) {
    next(err);
  }
};

// 删除教学视频 - 仅超级管理员
exports.deleteTeachingVideo = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: '只有超级管理员可以删除教学视频',
      });
    }

    const { id } = req.params;
    const video = await TeachingVideo.findById(id);
    if (!video) {
      return res.status(404).json({
        success: false,
        error: '未找到对应的教学视频',
      });
    }

    // 若存在本地文件则删除
    if (video.url) {
      const filename = path.basename(String(video.url).replace(/\\/g, '/'));
      const filePath = path.join(uploadDir, filename);
      const resolvedPath = path.resolve(filePath);
      if (resolvedPath.startsWith(path.resolve(uploadDir)) && fs.existsSync(resolvedPath)) {
        fs.unlinkSync(resolvedPath);
      }
    }

    await TeachingVideo.findByIdAndDelete(id);

    res.json({
      success: true,
      message: '教学视频已删除',
    });
  } catch (err) {
    next(err);
  }
};

