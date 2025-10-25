#!/usr/bin/env node

const { testConnection } = require('./src/config/database');

/**
 * 数据库连接测试脚本
 */
async function testDatabaseConnection() {
  console.log('🎯 AI面试系统数据库连接测试');
  console.log('================================\n');
  
  try {
    console.log('🔍 正在测试数据库连接...');
    const isConnected = await testConnection();
    
    if (isConnected) {
      console.log('✅ 数据库连接成功！');
      console.log('\n🎉 现在可以运行数据库迁移和启动服务器了：');
      console.log('   node src/migrations/migrate.js  # 运行数据库迁移');
      console.log('   node src/server.js             # 启动服务器');
      return true;
    } else {
      console.log('❌ 数据库连接失败！');
      console.log('\n🔧 请按以下步骤解决：');
      console.log('\n1. 确保Docker Desktop正在运行');
      console.log('2. 在 backend 目录下执行：');
      console.log('   docker-compose up -d');
      console.log('3. 等待PostgreSQL容器启动完成');
      console.log('4. 重新运行此测试脚本');
      return false;
    }
  } catch (error) {
    console.error('❌ 连接测试失败:', error.message);
    console.log('\n💡 常见问题排查：');
    console.log('- 检查 .env 文件中的数据库配置');
    console.log('- 确保PostgreSQL服务正在运行');
    console.log('- 检查端口5432是否被占用');
    return false;
  }
}

// 运行测试
if (require.main === module) {
  testDatabaseConnection().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('测试脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = { testDatabaseConnection };
