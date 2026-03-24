/**
 * 检查MongoDB数据库中每个用户的数据完整性
 * 检查字段：邮箱、密码、单位名称、统一社会信用代码、详细地址、建筑面积、用能人数、填报联系人、联系电话
 * 运行方式：node server/scripts/checkUserData.js
 */

const mongoose = require('mongoose');
const Account = require('../models/Account');

// 确保 MONGODB_URI 可用
if (!process.env.MONGODB_URI) {
  console.error('错误: MONGODB_URI 未定义。请确保在环境变量或 docker-compose.yml 中设置。');
  process.exit(1);
}

// 定义需要检查的字段
const requiredFields = [
  { key: 'email', name: '邮箱' },
  { key: 'password', name: '密码' },
  { key: 'unitName', name: '单位名称' },
  { key: 'creditCode', name: '统一社会信用代码' },
  { key: 'address', name: '详细地址' },
  { key: 'buildingArea', name: '建筑面积(平方米)' },
  { key: 'personnelCount', name: '用能人数(人)' },
  { key: 'contactPerson', name: '填报联系人' },
  { key: 'contactPhone', name: '联系电话' }
];

const checkUserData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB 连接成功\n');
    console.log('='.repeat(80));
    console.log('开始检查用户数据完整性...\n');

    // 获取所有用户（包括密码字段）
    const users = await Account.find({}).select('+password');
    
    if (users.length === 0) {
      console.log('数据库中没有用户数据');
      await mongoose.disconnect();
      return;
    }

    console.log(`总共找到 ${users.length} 个用户\n`);
    console.log('='.repeat(80));

    let totalIssues = 0;
    const usersWithIssues = [];

    // 检查每个用户
    users.forEach((user, index) => {
      console.log(`\n用户 ${index + 1}: ${user.email || '未知邮箱'}`);
      console.log('-'.repeat(80));
      
      const missingFields = [];
      const emptyFields = [];
      const issues = [];

      // 检查每个必需字段
      requiredFields.forEach(field => {
        const value = user[field.key];
        const hasField = user.hasOwnProperty(field.key);
        
        if (!hasField) {
          missingFields.push(field.name);
          issues.push(`❌ ${field.name}: 字段不存在`);
        } else if (value === null || value === undefined) {
          emptyFields.push(field.name);
          issues.push(`⚠️  ${field.name}: 值为 null 或 undefined`);
        } else if (typeof value === 'string' && value.trim() === '') {
          emptyFields.push(field.name);
          issues.push(`⚠️  ${field.name}: 值为空字符串`);
        } else if (typeof value === 'number' && (isNaN(value) || value < 0)) {
          emptyFields.push(field.name);
          issues.push(`⚠️  ${field.name}: 值无效 (${value})`);
        } else {
          // 字段存在且有效
          let displayValue = value;
          
          // 特殊处理：密码字段只显示是否存在的提示
          if (field.key === 'password') {
            displayValue = value ? '***已设置***' : '未设置';
          } else if (typeof value === 'number') {
            displayValue = value;
          } else {
            // 字符串字段，如果太长则截断
            displayValue = String(value).length > 50 
              ? String(value).substring(0, 50) + '...' 
              : value;
          }
          
          console.log(`✓ ${field.name}: ${displayValue}`);
        }
      });

      // 显示问题
      if (issues.length > 0) {
        console.log('\n发现问题:');
        issues.forEach(issue => console.log(`  ${issue}`));
        totalIssues += issues.length;
        usersWithIssues.push({
          email: user.email,
          id: user._id,
          missingFields,
          emptyFields,
          issues
        });
      } else {
        console.log('\n✓ 所有字段完整且有效');
      }

      // 显示其他信息
      console.log(`\n其他信息:`);
      console.log(`  - 账户号: ${user.account || '未设置'}`);
      console.log(`  - 地区: ${user.region || '未设置'}`);
      console.log(`  - 角色: ${user.role || '未设置'}`);
      console.log(`  - 用户ID: ${user._id}`);
    });

    // 汇总报告
    console.log('\n');
    console.log('='.repeat(80));
    console.log('检查汇总报告');
    console.log('='.repeat(80));
    console.log(`总用户数: ${users.length}`);
    console.log(`完整用户数: ${users.length - usersWithIssues.length}`);
    console.log(`有问题用户数: ${usersWithIssues.length}`);
    console.log(`总问题数: ${totalIssues}`);

    if (usersWithIssues.length > 0) {
      console.log('\n有问题的用户列表:');
      usersWithIssues.forEach((userIssue, index) => {
        console.log(`\n${index + 1}. ${userIssue.email} (ID: ${userIssue.id})`);
        if (userIssue.missingFields.length > 0) {
          console.log(`   缺失字段: ${userIssue.missingFields.join(', ')}`);
        }
        if (userIssue.emptyFields.length > 0) {
          console.log(`   空值字段: ${userIssue.emptyFields.join(', ')}`);
        }
      });

      console.log('\n建议:');
      console.log('1. 对于缺失字段的用户，需要补充完整信息');
      console.log('2. 对于空值字段的用户，需要填写有效数据');
      console.log('3. 可以考虑运行数据修复脚本或让用户重新注册');
    } else {
      console.log('\n✓ 所有用户数据完整！');
    }

    await mongoose.disconnect();
    console.log('\nMongoDB 连接已关闭');
  } catch (error) {
    console.error('检查用户数据时出错:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// 运行检查
checkUserData();
