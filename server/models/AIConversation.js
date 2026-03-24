const mongoose = require('mongoose');

const AIConversationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
    index: true,
  },
  conversationId: {
    type: String,
    default: null,
  },
  title: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// 按用户 + 创建时间倒序查询
AIConversationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('AIConversation', AIConversationSchema);
