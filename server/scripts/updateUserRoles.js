/**
 * 数据库迁移脚本：将所有 viewer 角色的用户升级为 editor
 * 运行方式：node server/scripts/updateUserRoles.js
 */

const mongoose = require('mongoose');
const Account = require('../models/Account');

// 确保 MONGODB_URI 可用
if (!process.env.MONGODB_URI) {
  console.error('错误: MONGODB_URI 未定义。请确保在环境变量或 docker-compose.yml 中设置。');
  process.exit(1);
}

const updateUserRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB 连接成功');

    // 查找所有 viewer 角色的用户
    const viewerUsers = await Account.find({ role: 'viewer' });
    console.log(`找到 ${viewerUsers.length} 个 viewer 角色的用户`);

    if (viewerUsers.length === 0) {
      console.log('没有需要更新的用户');
      await mongoose.disconnect();
      return;
    }

    // 更新所有 viewer 用户为 editor
    const result = await Account.updateMany(
      { role: 'viewer' },
      { $set: { role: 'editor' } }
    );

    console.log(`成功更新 ${result.modifiedCount} 个用户的角色从 viewer 到 editor`);
    console.log('用户角色更新完成！');

    // 验证更新结果
    const remainingViewers = await Account.find({ role: 'viewer' });
    console.log(`更新后，仍有 ${remainingViewers.length} 个 viewer 角色的用户`);

    await mongoose.disconnect();
    console.log('MongoDB 连接已关闭');
  } catch (error) {
    console.error('更新用户角色时出错:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// 运行迁移
updateUserRoles();
