const mongoose = require('mongoose');

const TeachingVideoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    // 存储视频文件的访问 URL（可为本地静态路径或对象存储地址）
    url: {
      type: String,
      required: true,
    },
    // 预留：存储原始文件名等信息
    originalFilename: {
      type: String,
    },
    // 上传人
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('TeachingVideo', TeachingVideoSchema);

