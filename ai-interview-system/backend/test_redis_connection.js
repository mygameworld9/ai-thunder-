#!/usr/bin/env node

const { testConnection } = require('./src/config/redis');

/**
 * 测试Redis连接
 */
async function testRedisConnection() {
  console.log('🔍 测试Redis连接...');
  
  try {
    const isConnected = await testConnection();
    
    if (isConnected) {
      console.log('✅ Redis连接成功！');
      console.log('🎉 面试功能现在应该可以正常工作了！');
      return true;
    } else {
      console.log('❌ Redis连接失败');
      console.log('⚠️  面试功能可能仍然无法正常工作');
      return false;
    }
  } catch (error) {
    console.error('❌ Redis连接测试错误:', error.message);
    return false;
  }
}

// 运行测试
testRedisConnection().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('测试脚本执行失败:', error);
  process.exit(1);
});
