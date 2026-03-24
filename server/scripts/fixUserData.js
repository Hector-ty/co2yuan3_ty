/**
 * 修复MongoDB数据库中用户缺失的数据字段
 * 为缺失字段的用户设置默认值
 * 运行方式：node server/scripts/fixUserData.js
 * 
 * 注意：此脚本会为缺失字段设置默认值，建议先运行 checkUserData.js 查看问题
 */

const mongoose = require('mongoose');
const Account = require('../models/Account');

// 确保 MONGODB_URI 可用
if (!process.env.MONGODB_URI) {
  console.error('错误: MONGODB_URI 未定义。请确保在环境变量或 docker-compose.yml 中设置。');
  process.exit(1);
}

// 默认值配置
const defaultValues = {
  creditCode: '000000000000000000', // 统一社会信用代码默认值
  address: '未填写', // 详细地址默认值
  buildingArea: 0, // 建筑面积默认值
  personnelCount: 0, // 用能人数默认值
  contactPerson: '未填写', // 填报联系人默认值
  contactPhone: '00000000000' // 联系电话默认值
};

const fixUserData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB 连接成功\n');
    console.log('='.repeat(80));
    console.log('开始修复用户数据...\n');

    // 获取所有用户
    const users = await Account.find({});
    
    if (users.length === 0) {
      console.log('数据库中没有用户数据');
      await mongoose.disconnect();
      return;
    }

    console.log(`总共找到 ${users.length} 个用户\n`);

    let fixedCount = 0;
    const fixedUsers = [];

    // 检查并修复每个用户
    for (const user of users) {
      const updates = {};
      const fixedFields = [];

      // 检查并修复每个字段
      if (!user.creditCode || user.creditCode === '') {
        updates.creditCode = defaultValues.creditCode;
        fixedFields.push('统一社会信用代码');
      }
      
      if (!user.address || user.address === '') {
        updates.address = defaultValues.address;
        fixedFields.push('详细地址');
      }
      
      if (user.buildingArea === null || user.buildingArea === undefined || isNaN(user.buildingArea)) {
        updates.buildingArea = defaultValues.buildingArea;
        fixedFields.push('建筑面积');
      }
      
      if (user.personnelCount === null || user.personnelCount === undefined || isNaN(user.personnelCount)) {
        updates.personnelCount = defaultValues.personnelCount;
        fixedFields.push('用能人数');
      }
      
      if (!user.contactPerson || user.contactPerson === '') {
        updates.contactPerson = defaultValues.contactPerson;
        fixedFields.push('填报联系人');
      }
      
      if (!user.contactPhone || user.contactPhone === '') {
        updates.contactPhone = defaultValues.contactPhone;
        fixedFields.push('联系电话');
      }

      // 如果有需要修复的字段，执行更新
      if (Object.keys(updates).length > 0) {
        await Account.findByIdAndUpdate(user._id, { $set: updates });
        fixedCount++;
        fixedUsers.push({
          email: user.email,
          fixedFields: fixedFields
        });
        console.log(`✓ 修复用户: ${user.email}`);
        console.log(`  修复字段: ${fixedFields.join(', ')}`);
      }
    }

    // 汇总报告
    console.log('\n');
    console.log('='.repeat(80));
    console.log('修复汇总报告');
    console.log('='.repeat(80));
    console.log(`总用户数: ${users.length}`);
    console.log(`已修复用户数: ${fixedCount}`);
    console.log(`无需修复用户数: ${users.length - fixedCount}`);

    if (fixedUsers.length > 0) {
      console.log('\n已修复的用户列表:');
      fixedUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   修复字段: ${user.fixedFields.join(', ')}`);
      });
    } else {
      console.log('\n✓ 所有用户数据完整，无需修复！');
    }

    console.log('\n注意: 修复后的默认值可能需要用户手动更新为真实数据');
    console.log('建议: 通知相关用户更新其个人信息');

    await mongoose.disconnect();
    console.log('\nMongoDB 连接已关闭');
  } catch (error) {
    console.error('修复用户数据时出错:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// 运行修复
fixUserData();
